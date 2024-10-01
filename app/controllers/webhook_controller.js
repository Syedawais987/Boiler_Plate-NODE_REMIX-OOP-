import prisma from "../db.server.js";
import { shopify_graphql } from "../utils/shopifyGraphql";
import {
  productCreate,
  metafieldsSet,
  productCreateMedia,
} from "../graphql/products.mutation";

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
        bodyHtml: payload.description
          ? payload.description.replace(/<[^>]*>/g, "")
          : "",
        productType: payload.type || "simple",
        variants: [
          {
            sku: payload.sku || "",
            price: payload.price || null,
            compareAtPrice: payload.regular_price || null,
          },
        ],
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
