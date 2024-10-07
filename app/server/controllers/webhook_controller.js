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
import { orderCreate, OrderDelete } from "../graphql/order.mutation.js";

const getSessionFromDB = async (shop) => {
  const session = await prisma.session.findFirst({ where: { shop } });
  return session;
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
  if (!payload) {
    console.error("Payload is undefined");
    return;
  }

  try {
    const shop = process.env.SHOP;
    const session = await getSessionFromDB(shop);

    if (!session) {
      console.error("No session found for the shop");
      throw new Error("No session found for the shop.");
    }

    const orderVariables = {
      order: {
        currency: payload.currency || "USD",

        lineItems: (payload.line_items || []).map((item) => ({
          title: item.name,
          quantity: item.quantity,
          priceSet: {
            shopMoney: {
              amount: item.total || item.price,
              currencyCode: payload.currency || "USD",
            },
          },
          taxLines:
            (item.tax_lines || []).map((tax) => ({
              title: tax.title || "",
              rate: tax.rate || 0,
              priceSet: {
                shopMoney: {
                  amount: tax.price || 0,
                  currencyCode: payload.currency || "USD",
                },
              },
            })) || [],
        })),
        transactions: [
          {
            kind: "SALE",
            status: "SUCCESS",
            amountSet: {
              shopMoney: {
                amount: payload.total,
                currencyCode: payload.currency || "USD",
              },
            },
          },
        ],
        billingAddress: {
          firstName: payload.billing.first_name || "",
          lastName: payload.billing.last_name || "",
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
          firstName: payload.shipping.first_name || "",
          lastName: payload.shipping.last_name || "",
          company: payload.shipping.company || "",
          address1: payload.shipping.address_1 || "",
          address2: payload.shipping.address_2 || "",
          city: payload.shipping.city || "",
          province: payload.shipping.state || "",
          country: payload.shipping.country || "",
          zip: payload.shipping.postcode || "",
        },
      },
    };

    const orderResponse = await shopify_graphql({
      session,
      query: orderCreate,
      variables: { order: orderVariables.order, options: {} },
    });
    console.log("Order response", orderResponse);
    if (orderResponse.errors) {
      console.error("GraphQL error:", orderResponse.errors);
      return {
        error: "Failed to create order",
        details: JSON.stringify(orderResponse.errors),
      };
    }

    const createdOrder = orderResponse.data.orderCreate.order;
    console.log("Order created in Shopify:", createdOrder);
    await prisma.orderMapping.create({
      data: {
        woocommerceOrderId: String(payload.id),
        shopifyOrderId: createdOrder.id,
      },
    });

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
