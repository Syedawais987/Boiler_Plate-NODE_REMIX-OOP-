import prisma from "../../db.server.js";

import WooCommerce from "../init.js";
// import fetch from "node-fetch";
export const checkout = async (req, res) => {
  console.log("REQ BODY", req.body);

  const products = req.body.products || [
    { productId: "gid://shopify/Product/7657475801169", quantity: 1 },
  ];
  const user_email = req.body.email || "customer@gmail.com";

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

    // console.log("WooCommerce checkout created:", wooOrderResponse.data);

    return res.status(200).json({ paymentLink });
  } catch (error) {
    console.error("Error creating WooCommerce checkout:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

// const getSessionFromDB = async (shop) => {
//   const session = await prisma.session.findUnique({
//     where: { shop },
//   });
//   return session;
// };

// export const checkout = async (req, res) => {
//   const shop = process.env.SHOP;
//   const session = await getSessionFromDB(shop);
//   const storefrontAccessToken = process.env.STOREFRONT_ACCESS_TOKEN;

//   const cartId =
//     req.body.cartId ||
//     "gid://shopify/Cart/Z2NwLXVzLWVhc3QxOjAxSjlTOE4xWDg…U0YwRjBWVlc2?key=06796953c7c92fbc4ca4bd9391e0db7b";
//   console.log("Cart ID:", cartId);

//   try {
//     const cartResponse = await fetchCartFromShopify(
//       cartId,
//       storefrontAccessToken
//     );

//     console.log("cart query response", cartResponse);
//     if (cartResponse.errors) {
//       return res.status(400).json({ errors: cartResponse.errors });
//     }

//     const shopifyCart = cartResponse.data.cart;
//     const cartItems = shopifyCart.lines.edges.map((edge) => ({
//       shopifyProductId: edge.node.merchandise.product.id,
//       quantity: edge.node.quantity,
//     }));

//     // const cartItems = [
//     //   { shopifyProductId: "gid://shopify/Product/7657475801169", quantity: 1 },
//     // ];

//     const wooCommerceItems = [];
//     for (const item of cartItems) {
//       const productMapping = await prisma.productMapping.findUnique({
//         where: { shopifyProductId: item.shopifyProductId.toString() },
//       });

//       if (productMapping) {
//         wooCommerceItems.push({
//           product_id: productMapping.wooCommerceId,
//           quantity: item.quantity,
//         });
//       } else {
//         console.error(
//           `Product with Shopify ID ${item.shopifyProductId} not found in WooCommerce`
//         );
//       }
//     }

//     if (wooCommerceItems.length === 0) {
//       return res
//         .status(400)
//         .json({ message: "No matching products found in WooCommerce" });
//     }

//     const orderData = {
//       payment_method: "dfin",
//       payment_method_title: "DFIN Payment",
//       set_paid: false,
//       billing: {
//         email: "syedawaishussain987@gmail.com",
//       },
//       line_items: wooCommerceItems,
//     };

//     const wooOrderResponse = await WooCommerce.post("orders", orderData);
//     const wooOrderId = wooOrderResponse.data.id;
//     const paymentLink = wooOrderResponse.data.payment_url;

//     // await prisma.orderMapping.create({
//     //   data: {
//     //     woocommerceOrderId: String(payload.id),
//     //     shopifyOrderId: .id,
//     //   },
//     // });

//     console.log("WooCommerce checkout created:", wooOrderResponse.data);

//     return res.status(200).json({ paymentLink });
//   } catch (error) {
//     console.error("Error creating WooCommerce checkout:", error);
//     return res.status(500).json({ error: "Internal Server Error" });
//   }
// };

// const fetchCartFromShopify = async (cartId, storefrontAccessToken) => {
//   const query = `#graphql
//     query fetchCart($cartId: ID!) {
//       cart(id: $cartId) {
//         id
//         lines(first: 100) {
//           edges {
//             node {
//               id
//               quantity
//               merchandise {
//                 ... on ProductVariant {
//                   product {
//                     id
//                     title
//                     handle
//                   }
//                   priceV2 {
//                     amount
//                     currencyCode
//                   }
//                 }
//               }
//               attributes {
//                 key
//                 value
//               }
//             }
//           }
//         }
//         attributes {
//           key
//           value
//         }
//         buyerIdentity {
//           email
//           phone
//           customer {
//             id
//           }
//           countryCode
//           deliveryAddressPreferences {
//             address1
//             address2
//             city
//             provinceCode
//             countryCodeV2
//             zip
//           }
//         }
//         checkoutUrl
//         cost {
//           totalAmount {
//             amount
//             currencyCode
//           }
//           subtotalAmount {
//             amount
//             currencyCode
//           }
//           totalTaxAmount {
//             amount
//             currencyCode
//           }
//           totalDutyAmount {
//             amount
//             currencyCode
//           }
//         }
//         totalQuantity
//         createdAt
//         updatedAt
//       }
//     }`;

//   const response = await fetch(
//     `https://${process.env.SHOP}.myshopify.com/api/2024-10/graphql.json`,
//     {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "X-Shopify-Storefront-Access-Token": storefrontAccessToken,
//       },
//       body: JSON.stringify({
//         query,
//         variables: { cartId },
//       }),
//     }
//   );

//   const data = await response.json();
//   return data;
// };
