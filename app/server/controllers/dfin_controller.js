import { shopify_graphql } from "../utils/shopifyGraphql";
import {
  getOrderDetails,
  ORDER_MARK_AS_PAID_MUTATION,
} from "../graphql/order.mutation.js";
import axios from "axios";
import prisma from "../../db.server.js";

export const dfin_pay = async (req, res) => {
  const { orderId, redirectUrl } = req.body;

  if (!orderId || !redirectUrl) {
    return res
      .status(400)
      .json({ error: "Order ID and Redirect URL are required" });
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

    const paymentRequestData = {
      api_secret: process.env.DFIN_SECRET_KEY,
      first_name: customerDetails.firstName,
      last_name: customerDetails.lastName,
      request_for: customerDetails.email,
      country_code: "1",
      amount: orderDetails.totalPriceSet.shopMoney.amount,
      redirect_url: redirectUrl,
      redirect_time: "5",
      ip_address: req.ip || "192.168.1.1",
      meta_data: JSON.stringify({
        source: "Shopify Order",
        order_id: orderId,
      }),
      send_notifications: "yes",
      source: "web",
      billing_address_line1: orderDetails.billingAddress.address1,
      billing_address_line2: orderDetails.billingAddress.address2 || "",
      billing_city: orderDetails.billingAddress.city,
      billing_state: orderDetails.billingAddress.province,
      billing_postal_code: orderDetails.billingAddress.zip,
      billing_country: orderDetails.billingAddress.country,
    };

    const paymentRequest = new PaymentRequest(process.env.DFIN_PUBLIC_KEY);

    const dfinResponse = await paymentRequest.post(paymentRequestData);
    // console.log(dfinResponse);
    await prisma.paymentMapping.create({
      data: {
        orderId,
        payId: dfinResponse.data.pay_id,
        status: "pending",
      },
    });

    return res.status(200).json({
      //   orderDetails,
      //   customerDetails,
      //   lineItems,
      //   dfinPaymentResponse: dfinResponse,
      paymentLink: dfinResponse.data.payment_link,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

class PaymentRequest {
  constructor(token) {
    this.token = token;
    this.baseUrl = process.env.DFIN_BASE_URL;
  }

  async post(data) {
    const config = {
      method: "post",
      url: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Content-Type": "multipart/form-data",
      },
      data,
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(
        "Error response:",
        error.response ? error.response.data : error.message
      );

      throw new Error(
        `Payment request failed: ${
          error.response ? JSON.stringify(error.response.data) : error.message
        }`
      );
    }
  }
}

export const handleDfinWebhook = async (req, res) => {
  try {
    const authHeader = req.headers["authorization"];
    const secret = process.env.DFIN_WEBHOOK_SECRET;

    if (authHeader !== secret) {
      return res.status(401).json({ error: "Invalid authorization" });
    }

    const { data, status, type } = req.body;

    if (type === "save_payment.success" && status === "succeeded") {
      const { metadata } = data;

      const orderMetadata = metadata && JSON.parse(metadata[0]);

      if (!orderMetadata || !orderMetadata.order_id) {
        return res
          .status(400)
          .json({ error: "Invalid metadata: No order_id found" });
      }

      const orderId = orderMetadata.order_id;
      console.log("Order ID from metadata:", orderId);

      const paymentMapping = await prisma.paymentMapping.findFirst({
        where: { orderId },
      });

      if (!paymentMapping) {
        return res.status(404).json({ error: "Payment mapping not found" });
      }

      const payId = paymentMapping.payId;

      const session = req.shop.session;
      if (!session) {
        return res.status(401).json({ error: "No session found for the shop" });
      }
      const shopifyOrderId = orderId.split("/").pop();
      const updateOrderResponse = await updateShopifyOrderFinancialStatus(
        shopifyOrderId,
        session
      );

      if (updateOrderResponse.errors) {
        console.error(
          "Error updating Shopify order:",
          updateOrderResponse.errors
        );
        return res.status(409).json({
          error: "Order already marked as PAID",
        });
      } else {
        console.log("Shopify order financial status updated successfully");

        await prisma.paymentMapping.update({
          where: { payId },
          data: { status: "paid" },
        });

        return res
          .status(200)
          .json({ message: "Order financial status updated successfully" });
      }
    } else {
      return res
        .status(400)
        .json({ error: "Unsupported event type or status" });
    }
  } catch (error) {
    console.error("Error processing Dfin webhook:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error.message,
    });
  }
};

const updateShopifyOrderFinancialStatus = async (orderId, session) => {
  try {
    const variables = {
      input: {
        id: `gid://shopify/Order/${orderId}`,
      },
    };

    const response = await shopify_graphql({
      session,
      query: ORDER_MARK_AS_PAID_MUTATION,
      variables,
    });

    if (response.errors) {
      console.error("GraphQL errors:", response.errors);
      return { errors: response.errors };
    }

    const { orderMarkAsPaid } = response.data;
    if (orderMarkAsPaid.userErrors.length) {
      console.error("User errors:", orderMarkAsPaid.userErrors);
      return { errors: orderMarkAsPaid.userErrors };
    }

    console.log(
      `Updated financial status for Shopify order ${orderId} to 'paid'`
    );
    return orderMarkAsPaid.order;
  } catch (error) {
    console.error(
      `Failed to update financial status for Shopify order ${orderId}:`,
      error.message
    );
    return { errors: error.message };
  }
};

// export const getSessionFromDB = async (shop) => {
//   const session = await prisma.session.findFirst({
//     where: { shop },
//   });
//   return session;
// };
// const updateShopifyOrderFinancialStatus = async (orderId, session) => {
// //   const accessToken = session.accessToken;
// const session = req.shop.session;
//   const SHOP = session.shop;

//   const url = `https://${SHOP}/admin/api/2024-01/orders/${orderId}.json`;

//   const data = {
//     order: {
//       id: orderId,
//       financial_status: "paid",
//     },
//   };

//   try {
//     const response = await axios.put(url, data, {
//       headers: {
//         "X-Shopify-Access-Token": accessToken,
//         "Content-Type": "application/json",
//       },
//     });
//     console.log(
//       `Updated financial status for Shopify order ${orderId} to 'paid'`
//     );
//     return response.data;
//   } catch (error) {
//     console.error(
//       `Failed to update financial status for Shopify order ${orderId}:`,
//       error.response ? error.response.data : error.message
//     );
//     return { errors: error.message };
//   }
// };

// async function capturePayment(orderId, amount, session, transaction_id) {
//   const accessToken = session.accessToken;
// const session = req.shop.session;
//   const SHOP = session.shop;

//   const url = `https://${SHOP}/admin/api/2023-10/orders/${orderId}/transactions.json`;

//   const data = {
//     transaction: {
//       currency: "USD",
//       amount: amount,
//       kind: "capture",
//       parent_id: transaction_id,
//     },
//   };

//   try {
//     const response = await axios.post(url, data, {
//       headers: {
//         "X-Shopify-Access-Token": accessToken,
//         "Content-Type": "application/json",
//       },
//     });
//     console.log(
//       `Captured payment for Shopify order ${orderId} with amount ${amount}`
//     );
//     return response;
//   } catch (error) {
//     console.error(
//       `Failed to capture payment for Shopify order ${orderId}:`,
//       error.response ? error.response.data : error.message
//     );
//     throw error;
//   }
// }

// export const checkOrderPaymentStatus = async (orderId, session) => {
//   const SHOP = session.shop;
//   const accessToken = session.accessToken;

//   const url = `https://${SHOP}/admin/api/2024-04/orders/${orderId}/transactions.json`;
//   try {
//     const response = await axios.get(url, {
//       headers: {
//         "X-Shopify-Access-Token": accessToken,
//         "Content-Type": "application/json",
//       },
//     });
//     return response.data.transactions;
//   } catch (error) {
//     console.error(
//       "Failed to fetch transactions:",
//       error.response?.data || error.message
//     );
//     return null;
//   }
// };
