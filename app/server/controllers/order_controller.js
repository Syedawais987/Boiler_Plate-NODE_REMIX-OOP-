import prisma from "../../db.server.js";
import { shopify_graphql } from "../utils/shopifyGraphql";
import WooCommerce from "../init.js";
import { getOrderDetails } from "../graphql/order.mutation.js";

export const order_checkout = async (req, res) => {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required" });
  }

  try {
    // const shop = process.env.SHOP;
    // const session = await getSessionFromDB(shop);
    const session = req.shop.session;

    if (!session) {
      return res.status(401).json({ error: "No session found for the shop" });
    }

    const response = await shopify_graphql({
      session,
      query: getOrderDetails,
      variables: { orderId },
    });
    // console.log("reponse data", response.data);
    if (response.errors) {
      console.error("Error fetching order details:", response.errors);
      return res.status(500).json({ error: "Failed to fetch order details" });
    }

    const orderDetails = response.data.order;
    if (!orderDetails) {
      return res.status(404).json({ error: "Order not found" });
    }

    const customerDetails = orderDetails.customer || {};
    const billingAddress = orderDetails.billingAddress || {};
    const shippingAddress = orderDetails.shippingAddress || {};

    const wooCommerceItems = [];
    const lineItems = orderDetails.lineItems.edges.map((edge) => edge.node);
    // console.log("lineitems:", lineItems);

    for (const item of lineItems) {
      const shopifyVariantId = item.variant.id;
      const quantity = item.quantity;
      const shopifyProductId = item.variant?.product?.id;

      if (!shopifyProductId) {
        console.error(`Product ID not found for variant: ${item.variant.id}`);
        continue;
      }

      const productMapping = await prisma.productMapping.findUnique({
        where: { shopifyProductId: shopifyProductId.toString() },
      });

      if (productMapping && productMapping.wooCommerceId) {
        wooCommerceItems.push({
          product_id: productMapping.wooCommerceId,
          quantity: quantity,
        });
      } else {
        console.error(
          `Product with Shopify ID ${shopifyProductId} not found in WooCommerce`
        );
      }
    }

    if (wooCommerceItems.length === 0) {
      return res
        .status(400)
        .json({ error: "No matching products found in WooCommerce" });
    }

    const orderData = {
      payment_method: "dfin",
      payment_method_title: "DFIN Payment",
      set_paid: false,
      billing: {
        first_name: billingAddress.firstName || customerDetails.firstName,
        last_name: billingAddress.lastName || customerDetails.lastName,
        address_1: billingAddress.address1 || "",
        address_2: billingAddress.address2 || "",
        city: billingAddress.city || "",
        state: billingAddress.province || "",
        postcode: billingAddress.zip || "",
        country: billingAddress.country || "",
        email: orderDetails.email || customerDetails.email,
        phone: billingAddress.phone || "",
      },
      shipping: {
        first_name: shippingAddress.firstName || "",
        last_name: shippingAddress.lastName || "",
        address_1: shippingAddress.address1 || "",
        address_2: shippingAddress.address2 || "",
        city: shippingAddress.city || "",
        state: shippingAddress.province || "",
        postcode: shippingAddress.zip || "",
        country: shippingAddress.country || "",
        phone: shippingAddress.phone || "",
      },
      line_items: wooCommerceItems,
    };

    const wooOrderResponse = await WooCommerce.post("orders", orderData);
    const wooOrderId = wooOrderResponse.data.id;
    const paymentLink = wooOrderResponse.data.payment_url;

    try {
      await prisma.orderMapping.create({
        data: {
          shopifyOrderId: orderId,
          woocommerceOrderId: wooOrderId.toString(),
        },
      });
    } catch (error) {
      if (error.code === "P2002") {
        console.error("Unique constraint violation:", error.meta?.target);

        if (error.meta?.target?.includes("shopifyOrderId")) {
          return res.status(409).json({
            error: `Order with Shopify Order ID ${orderId} already exists.`,
          });
        } else if (error.meta?.target?.includes("woocommerceOrderId")) {
          return res.status(409).json({
            error: `Order with WooCommerce Order ID ${wooOrderId} already exists.`,
          });
        }
      } else {
        console.error("Error creating order mapping:", error);
        return res.status(500).json({ error: "Internal Server Error" });
      }
    }

    // console.log("WooCommerce checkout created:", wooOrderResponse.data);

    return res.status(200).json({ paymentLink });
    // return res.redirect(303, paymentLink);
  } catch (error) {
    console.error("Error creating WooCommerce checkout:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
export const getSessionFromDB = async (shop) => {
  const session = await prisma.session.findUnique({
    where: { shop },
  });
  return session;
};

// with customer fetch and create on woo  commerce if not exist on woo from the customer data reecived from shopify

// export const order_checkout = async (req, res) => {
//   const { orderId } = req.body;

//   if (!orderId) {
//     return res.status(400).json({ error: "Order ID is required" });
//   }

//   try {
//     const shop = process.env.SHOP;
//     const session = await getSessionFromDB(shop);

//     if (!session) {
//       return res.status(401).json({ error: "No session found for the shop" });
//     }

//     const response = await shopify_graphql({
//       session,
//       query: getOrderDetails,
//       variables: { orderId },
//     });

//     if (response.errors) {
//       console.error("Error fetching order details:", response.errors);
//       return res.status(500).json({ error: "Failed to fetch order details" });
//     }

//     const orderDetails = response.data.order;
//     if (!orderDetails) {
//       return res.status(404).json({ error: "Order not found" });
//     }

//     const customerDetails = orderDetails.customer || {};
//     const billingAddress = orderDetails.billingAddress || {};
//     const shippingAddress = orderDetails.shippingAddress || {};

//     const wooCustomersResponse = await WooCommerce.get("customers");
//     const wooCustomers = wooCustomersResponse.data || [];

//     let wooCustomer = wooCustomers.find(
//       (c) => c.email === customerDetails.email
//     );

//     if (!wooCustomer) {
//       const newCustomerData = {
//         email: customerDetails.email,
//         first_name: customerDetails.firstName || billingAddress.firstName,
//         last_name: customerDetails.lastName || billingAddress.lastName,
//         billing: {
//           first_name: billingAddress.firstName,
//           last_name: billingAddress.lastName,
//           address_1: billingAddress.address1,
//           address_2: billingAddress.address2,
//           city: billingAddress.city,
//           state: billingAddress.province,
//           postcode: billingAddress.zip,
//           country: billingAddress.country,
//           email: customerDetails.email,
//           phone: billingAddress.phone || "",
//         },
//         shipping: {
//           first_name: shippingAddress.firstName,
//           last_name: shippingAddress.lastName,
//           address_1: shippingAddress.address1,
//           address_2: shippingAddress.address2,
//           city: shippingAddress.city,
//           state: shippingAddress.province,
//           postcode: shippingAddress.zip,
//           country: shippingAddress.country,
//           phone: shippingAddress.phone || "",
//         },
//       };

//       const createCustomerResponse = await WooCommerce.post(
//         "customers",
//         newCustomerData
//       );
//       wooCustomer = createCustomerResponse.data;
//     }

//     const wooCommerceItems = [];
//     const lineItems = orderDetails.lineItems.edges.map((edge) => edge.node);

//     for (const item of lineItems) {
//       const shopifyProductId = item.variant?.product?.id;
//       if (!shopifyProductId) continue;

//       const productMapping = await prisma.productMapping.findUnique({
//         where: { shopifyProductId: shopifyProductId.toString() },
//       });

//       if (productMapping && productMapping.wooCommerceId) {
//         wooCommerceItems.push({
//           product_id: productMapping.wooCommerceId,
//           quantity: item.quantity,
//         });
//       }
//     }

//     if (wooCommerceItems.length === 0) {
//       return res
//         .status(400)
//         .json({ error: "No matching products found in WooCommerce" });
//     }

//     const orderData = {
//       customer_id: wooCustomer.id,
//       payment_method: "dfin",
//       payment_method_title: "DFIN Payment",
//       set_paid: false,
//       billing: wooCustomer.billing,
//       shipping: wooCustomer.shipping,
//       line_items: wooCommerceItems,
//     };

//     const wooOrderResponse = await WooCommerce.post("orders", orderData);
//     const paymentLink = wooOrderResponse.data.payment_url;

//     return res.redirect(303, paymentLink);
//   } catch (error) {
//     console.error("Error creating WooCommerce checkout:", error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };
export const checkout = async (req, res) => {
  // console.log("REQ BODY", req.body);

  const products = req.body.products;
  const user_email = req.body.customer;

  try {
    const wooCommerceItems = [];

    for (const product of products) {
      const shopifyProductId = product.productId;
      const quantity = product.quantity;

      const productMapping = await prisma.productMapping.findUnique({
        where: { shopifyProductId: shopifyProductId.toString() },
      });

      if (productMapping) {
        wooCommerceItems.push({
          product_id: productMapping.wooCommerceId,
          quantity: quantity,
        });
      } else {
        console.error(
          `Product with Shopify ID ${shopifyProductId} not found in WooCommerce`
        );
      }
    }

    if (wooCommerceItems.length === 0) {
      return res
        .status(400)
        .json({ message: "No matching products found in WooCommerce" });
    }

    const orderData = {
      payment_method: "dfin",
      payment_method_title: "DFIN Payment",
      set_paid: false,
      billing: {
        email: user_email,
      },
      line_items: wooCommerceItems,
    };

    const wooOrderResponse = await WooCommerce.post("orders", orderData);
    const wooOrderId = wooOrderResponse.data.id;
    const paymentLink = wooOrderResponse.data.payment_url;

    console.log("WooCommerce checkout created:", wooOrderResponse.data);

    return res.status(200).json({ paymentLink });
  } catch (error) {
    console.error("Error creating WooCommerce checkout:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const fetchorder = async (req, res) => {
  const { orderId } = req.query;

  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required" });
  }

  try {
    // const shop = process.env.SHOP;

    // const session = await getSessionFromDB(shop);
    const session = req.shop.session;

    if (!session) {
      return res.status(401).json({ error: "No session found for the shop" });
    }

    const response = await shopify_graphql({
      session,
      query: getOrderDetails,
      variables: { orderId },
    });

    if (response.errors) {
      console.error("Error fetching order details:", response.errors);
      return res.status(500).json({ error: "Failed to fetch order details" });
    }

    const orderDetails = response.data.order;

    if (!orderDetails) {
      return res.status(404).json({ error: "Order not found" });
    }

    const customerDetails = orderDetails.customer || null;

    const lineItems = orderDetails.lineItems.edges.map((edge) => {
      const item = edge.node;
      return {
        id: item.id,
        title: item.title,
        quantity: item.quantity,
        variant: {
          id: item.variant.id,
          title: item.variant.title,
          price: item.variant.price,
          productId: item.variant.product.id,
        },
      };
    });

    return res.status(200).json({
      orderDetails,
      customerDetails,
      lineItems,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
