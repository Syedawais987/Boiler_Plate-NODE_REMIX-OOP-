import prisma from "../../db.server.js";
import { shopify_graphql } from "../utils/shopifyGraphql";
import {
  productCreate,
  productVariantsBulkCreate,
  metafieldsSet,
  productCreateMedia,
  productUpdateWithMedia,
  productDelete,
} from "../graphql/products.mutation";
import {
  orderCreate,
  OrderDelete,
  updateOrderStatusMutation,
} from "../graphql/order.mutation.js";
import axios from "axios";

const getSessionFromDB = async (shop) => {
  const session = await prisma.session.findUnique({
    where: { shop },
  });
  return session;
};

const checkIfProductExists = async (wooCommerceId) => {
  const existingProduct = await prisma.productMapping.findUnique({
    where: { wooCommerceId: wooCommerceId.toString() },
  });
  return existingProduct !== null;
};
const fetchOrderDetails = async (shopifyOrderId, accessToken) => {
  const url = `https://${process.env.SHOP}/admin/api/2024-04/orders/${shopifyOrderId}.json`;
  try {
    const response = await axios.get(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });
    return response.data.order;
  } catch (error) {
    console.error(
      "Failed to fetch order details:",
      error.response?.data || error.message
    );
    return null;
  }
};
const fetchOrderTransactions = async (shopifyOrderId, accessToken) => {
  const shop = process.env.SHOP;
  const url = `https://${shop}/admin/api/2024-04/orders/${shopifyOrderId}/transactions.json`;
  try {
    const response = await axios.get(url, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });
    return response.data.transactions;
  } catch (error) {
    console.error(
      "Failed to fetch transactions:",
      error.response?.data || error.message
    );
    return null;
  }
};

const markOrderAsPaid = async (shopifyOrderId) => {
  const shop = process.env.SHOP;
  const session = await getSessionFromDB(shop);
  const accessToken = session.accessToken;

  const transactions = await fetchOrderTransactions(
    shopifyOrderId,
    accessToken
  );

  if (!transactions || transactions.length === 0) {
    console.log(`No transactions found for order ${shopifyOrderId}`);
    return { error: "No authorized transaction found to capture" };
  }

  const authorizedTransaction = transactions.find(
    (tx) => tx.kind === "authorization" && tx.status === "success"
  );
  if (!authorizedTransaction) {
    console.log(
      `No authorized transaction to capture for order ${shopifyOrderId}`
    );
    return { error: "Unable to capture payment, no authorization found" };
  }

  const url = `https://${shop}/admin/api/2024-04/orders/${shopifyOrderId}/transactions.json`;

  const data = {
    transaction: {
      kind: "capture",
      status: "success",
      amount: authorizedTransaction.amount,
    },
  };

  try {
    const response = await axios.post(url, data, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    console.log(`Order ${shopifyOrderId} marked as paid`);
    return response.data;
  } catch (error) {
    console.error(
      `Failed to mark order as paid:`,
      error.response?.data || error.message
    );
    return { error: "Failed to update financial status" };
  }
};

export const handleOrderUpdated = async (payload) => {
  const wooOrderPayload = payload;
  const wooOrderId = wooOrderPayload.id;
  const newStatus = wooOrderPayload.status;

  try {
    const orderMapping = await prisma.orderMapping.findUnique({
      where: { woocommerceOrderId: wooOrderId.toString() },
    });

    if (!orderMapping) {
      return { error: "Order mapping not found." };
    }

    const shopifyOrderId = orderMapping.shopifyOrderId.split("/").pop();

    console.log("Shopify Order id:", shopifyOrderId);

    if (newStatus === "completed" || newStatus === "processing") {
      const paymentResponse = await markOrderAsPaid(shopifyOrderId);

      if (paymentResponse.error) {
        return paymentResponse;
      }

      console.log(`Order ${shopifyOrderId} marked as paid`);

      const session = await getSessionFromDB(process.env.SHOP);
      const accessToken = session.accessToken;
      const orderDetails = await fetchOrderDetails(shopifyOrderId, accessToken);

      if (orderDetails) {
        console.log("Fetched Shopify order details:", orderDetails);
      } else {
        console.log("Failed to fetch Shopify order details.");
      }

      return {
        success: true,
        message: "Order status updated and details fetched successfully",
      };
    } else {
      console.log(`Order status ${newStatus} is not handled`);
      return { message: "No action needed for this status" };
    }
  } catch (error) {
    console.error("Error handling WooCommerce webhook:", error);
    return { error: "Internal Server Error" };
  }
};

export const handleProductCreated = async (payload) => {
  if (!payload) {
    console.error("Payload is undefined");
    return;
  }

  try {
    const shop = process.env.SHOP;
    const session = await getSessionFromDB(shop);

    if (!session) {
      console.log("No session");
      throw new Error("No session found for the shop.");
    }
    const productExists = await checkIfProductExists(payload.id);
    if (productExists) {
      console.log(
        `Product with WooCommerce ID ${payload.id} already exists in Shopify. Skipping creation.`
      );
      return { success: false, message: "Product already exists in Shopify" };
    }

    const productVariables = {
      input: {
        title: payload.name,
        descriptionHtml: payload.description
          ? payload.description.replace(/<[^>]*>/g, "")
          : "",

        productType: payload.type || "simple",
      },
    };

    const productResponse = await shopify_graphql({
      session,
      query: productCreate,
      variables: productVariables,
    });

    if (productResponse.errors) {
      console.error("GraphQL error:", productResponse.errors);
      return {
        error: "Failed to create product",
        details: JSON.stringify(productResponse.errors),
      };
    }

    const createdProduct = productResponse.data.productCreate.product;
    console.log("Product created in Shopify:", createdProduct);
    await prisma.productMapping.create({
      data: {
        wooCommerceId: String(payload.id),
        shopifyProductId: createdProduct.id,
      },
    });
    const variantsData = [
      {
        optionValues: [
          {
            name: payload.sku || "",
            optionName: "Default Title",
          },
          {
            name: payload.price ? payload.price.toString() : null,
            optionName: "Regular Price",
          },
          {
            name: payload.regular_price
              ? payload.regular_price.toString()
              : null,
            optionName: "Compare At Price",
          },
        ],
        price: payload.price ? parseFloat(payload.price) : null,
        compareAtPrice: payload.regular_price
          ? parseFloat(payload.regular_price)
          : null,
      },
    ];

    const variantsVariables = {
      productId: createdProduct.id,
      variants: variantsData,
    };

    const variantsResponse = await shopify_graphql({
      session,
      query: productVariantsBulkCreate,
      variables: variantsVariables,
    });

    if (variantsResponse.errors) {
      console.error(
        "GraphQL error creating variants:",
        variantsResponse.errors
      );
    } else {
      console.log(
        "Variants created for product:",
        variantsResponse.data.productVariantsBulkCreate.productVariants
      );
    }

    if (payload.images && payload.images.length > 0) {
      const mediaVariables = {
        media: payload.images.map((image) => ({
          alt: image.alt || "",
          mediaContentType: "IMAGE",
          originalSource: image.src,
        })),
        productId: createdProduct.id,
      };

      const mediaResponse = await shopify_graphql({
        session,
        query: productCreateMedia,
        variables: mediaVariables,
      });

      if (mediaResponse.errors) {
        console.error("GraphQL error setting media:", mediaResponse.errors);
      } else {
        console.log(
          "Media set for product:",
          mediaResponse.data.productCreateMedia.media
        );
      }
    }

    if (payload.metafields && payload.metafields.length > 0) {
      const metafieldsVariables = {
        metafields: payload.metafields.map((metafield) => ({
          key: metafield.key,
          namespace: metafield.namespace,
          value: metafield.value,
          type: metafield.type,
          ownerId: createdProduct.id,
        })),
      };

      const metafieldsResponse = await shopify_graphql({
        session,
        query: metafieldsSet,
        variables: metafieldsVariables,
      });

      if (metafieldsResponse.errors) {
        console.error(
          "GraphQL error in setting metafields:",
          metafieldsResponse.errors
        );
        return {
          error: "Failed to set metafields",
          details: JSON.stringify(metafieldsResponse.errors),
        };
      }

      console.log("Metafields set for product:", metafieldsResponse.data);
    }

    return { success: true, product: createdProduct };
  } catch (error) {
    console.error("Error creating product in Shopify:", error);
    return { error: "Failed to create product", details: error.message };
  }
};

export const handleProductUpdated = async (payload) => {
  if (!payload || !payload.id) {
    console.error("Payload or payload.id is undefined");
    return;
  }

  try {
    const shop = process.env.SHOP;
    const session = await getSessionFromDB(shop);

    if (!session) {
      console.log("No session");
      throw new Error("No session found for the shop.");
    }

    const productMapping = await prisma.productMapping.findUnique({
      where: {
        wooCommerceId: payload.id.toString(),
      },
    });

    if (!productMapping || !productMapping.shopifyProductId) {
      console.error("Product not found in DB for WooCommerce ID:", payload.id);
      return { error: "Product not found in the database" };
    }

    const shopifyProductId = productMapping.shopifyProductId;

    const productVariables = {
      input: {
        id: shopifyProductId,
        title: payload.name || "Untitled product",
        descriptionHtml: payload.description
          ? payload.description.replace(/<[^>]*>/g, "")
          : "",
        productType: payload.type || "simple",
      },
    };

    const mediaVariables =
      payload.images && payload.images.length > 0
        ? payload.images.map((image) => ({
            originalSource: image.src,
            alt: image.alt || "",
            mediaContentType: "IMAGE",
          }))
        : [];

    const productResponse = await shopify_graphql({
      session,
      query: productUpdateWithMedia,
      variables: { input: productVariables.input, media: mediaVariables },
    });

    if (productResponse.errors) {
      console.error("GraphQL error:", productResponse.errors);
      return {
        error: "Failed to update product",
        details: JSON.stringify(productResponse.errors),
      };
    }

    console.log(
      "Product updated in Shopify:",
      productResponse.data.productUpdate.product
    );

    return {
      success: true,
      product: productResponse.data.productUpdate.product,
    };
  } catch (error) {
    console.error("Error updating product in Shopify:", error);
    return { error: "Failed to update product", details: error.message };
  }
};

export const handleProductDeleted = async (payload) => {
  if (!payload) {
    console.error("Payload is undefined");
    return;
  }

  try {
    const shop = process.env.SHOP;
    const session = await getSessionFromDB(shop);

    if (!session) {
      console.log("No session");
      throw new Error("No session found for the shop.");
    }

    const productMapping = await prisma.productMapping.findUnique({
      where: {
        wooCommerceId: String(payload.id),
      },
    });

    if (!productMapping) {
      console.log("No product mapping found for WooCommerce ID:", payload.id);
      return {
        error: "No product mapping found",
        details: `No mapping found for WooCommerce ID: ${payload.id}`,
      };
    }

    const productVariables = {
      input: {
        id: productMapping.shopifyProductId,
      },
    };

    const productResponse = await shopify_graphql({
      session,
      query: productDelete,
      variables: productVariables,
    });

    if (productResponse.errors) {
      console.error("GraphQL error:", productResponse.errors);
      return {
        error: "Failed to delete product",
        details: JSON.stringify(productResponse.errors),
      };
    }

    console.log(
      "Product deleted in Shopify:",
      productResponse.data.productDelete.deletedProductId
    );
    await prisma.productMapping.delete({
      where: {
        wooCommerceId: String(payload.id),
      },
    });

    console.log(
      "Product mapping deleted from the database for WooCommerce ID:",
      payload.id
    );

    return {
      success: true,
      deletedProductId: productResponse.data.productDelete.deletedProductId,
    };
  } catch (error) {
    console.error("Error deleting product in Shopify:", error);
    return { error: "Failed to delete product", details: error.message };
  }
};
export const handleOrderCreated = async (payload) => {
  console.log("Received Payload:", payload);
  if (!payload) {
    console.error("Payload is undefined");
    return { error: "Payload is undefined" };
  }

  try {
    const shop = process.env.SHOP;
    const session = await getSessionFromDB(shop);

    if (!session) {
      console.error("No session found for the shop");
      throw new Error("No session found for the shop.");
    }

    const lineItems = await Promise.all(
      (payload.line_items || []).map(async (item) => {
        const variants = await getVariantIdFromProductId(
          session,
          item.product_id
        );
        const variantId = variants.length > 0 ? variants[0].id : null;

        return {
          title: item.name,
          quantity: item.quantity,
          variantId: variantId,
          taxLines: (item.tax_lines || []).map((tax) => ({
            title: tax.title || "Tax",
            rate: tax.rate || 0,
            priceSet: {
              shopMoney: {
                amount: tax.price || 0,
              },
            },
          })),
        };
      })
    );

    const orderVariables = {
      order: {
        email: payload.billing.email || "",
        lineItems: lineItems,
        transactions: [
          {
            kind: "SALE",
            status: payload.status,
            amountSet: {
              shopMoney: {
                amount: payload.total || "0.00",
                currencyCode: payload.currency || "USD",
              },
            },
          },
        ],
        billingAddress: {
          firstName: payload.billing.first_name || "Unknown",
          lastName: payload.billing.last_name || "Unknown",
          company: payload.billing.company || "",
          address1: payload.billing.address_1 || "",
          address2: payload.billing.address_2 || "",
          city: payload.billing.city || "",
          province: payload.billing.state || "",
          country: payload.billing.country || "",
          zip: payload.billing.postcode || "",
          phone: payload.billing.phone || "",
        },
        shippingAddress: {
          firstName:
            payload.shipping.first_name ||
            payload.billing.first_name ||
            "Unknown",
          lastName:
            payload.shipping.last_name ||
            payload.billing.last_name ||
            "Unknown",
          company: payload.shipping.company || payload.billing.company || "",
          address1:
            payload.shipping.address_1 || payload.billing.address_1 || "",
          address2:
            payload.shipping.address_2 || payload.billing.address_2 || "",
          city: payload.shipping.city || payload.billing.city || "",
          province: payload.shipping.state || payload.billing.state || "",
          country: payload.shipping.country || payload.billing.country || "",
          zip: payload.shipping.postcode || payload.billing.postcode || "",
          phone: payload.shipping.phone || payload.billing.phone || "",
        },
      },
    };

    const orderResponse = await shopify_graphql({
      session,
      query: orderCreate,
      variables: { order: orderVariables.order, options: {} },
    });

    console.log("Order response", orderResponse);

    if (orderResponse.data.orderCreate.userErrors.length > 0) {
      console.error(
        "Order creation user errors:",
        orderResponse.data.orderCreate.userErrors
      );
      return {
        error: "Failed to create order",
        details: JSON.stringify(orderResponse.data.orderCreate.userErrors),
      };
    }

    const createdOrder = orderResponse.data.orderCreate.order;
    console.log("Order created in Shopify:", createdOrder);

    // await prisma.orderMapping.create({
    //   data: {
    //     woocommerceOrderId: String(payload.id),
    //     shopifyOrderId: createdOrder.id,
    //   },
    // });

    return { success: true, order: createdOrder };
  } catch (error) {
    console.error("Error creating order in Shopify:", error);
    return { error: "Failed to create order", details: error.message };
  }
};

export const handleDeleteOrder = async (payload) => {
  try {
    const shop = process.env.SHOP;
    const session = await getSessionFromDB(shop);

    if (!session) {
      console.error("No session found for the shop");
      throw new Error("No session found for the shop.");
    }
    const woocommerceOrderId = payload.id;
    const orderMapping = await prisma.orderMapping.findUnique({
      where: {
        woocommerceOrderId: woocommerceOrderId.toString(),
      },
    });

    if (!orderMapping) {
      console.error(
        `No mapping found for WooCommerce order ID: ${woocommerceOrderId}`
      );
      return { error: "Order mapping not found." };
    }

    const shopifyOrderId = orderMapping.shopifyOrderId;

    const deleteResponse = await shopify_graphql({
      session,
      query: OrderDelete,
      variables: { orderId: shopifyOrderId },
    });

    if (deleteResponse.errors) {
      console.error("GraphQL error:", deleteResponse.errors);
      return {
        error: "Failed to delete order",
        details: JSON.stringify(deleteResponse.errors),
      };
    }

    console.log(`Order deleted from Shopify: ${shopifyOrderId}`);

    return { success: true, message: "Order deleted successfully." };
  } catch (error) {
    console.error("Error deleting order in Shopify:", error);
    return { error: "Failed to delete order", details: error.message };
  }
};
export const getVariantIdFromProductId = async (session, productId) => {
  const productQuery = `
    query GetProductVariants($productId: ID!) {
      product(id: $productId) {
        variants(first: 100) {
          edges {
            node {
              id
              title
              sku
              price
            }
          }
        }
      }
    }
  `;

  try {
    const response = await shopify_graphql({
      session,
      query: productQuery,
      variables: { productId },
    });

    if (response.errors) {
      console.error("GraphQL error fetching variants:", response.errors);
      throw new Error("Failed to fetch variants");
    }

    const variants = response.data.product.variants.edges.map((edge) => ({
      id: edge.node.id,
      title: edge.node.title,
      sku: edge.node.sku,
      price: edge.node.price,
    }));

    return variants;
  } catch (error) {
    console.error("Error fetching variant ID:", error);
    throw new Error(error.message);
  }
};
