import { shopify_graphql } from "../utils/shopifyGraphql.js";
import { fetchActiveProducts } from "../graphql/products.mutation.js";
import prisma from "../../db.server.js";

import WooCommerce from "../init.js";

export const productsSync = async (req, res) => {
  const session = req.shop.session;

  try {
    const response = await shopify_graphql({
      session,
      query: fetchActiveProducts,
    });

    if (response.errors) {
      return res.status(400).json({ errors: response.errors });
    }

    const products = response.data.products.edges.map((edge) => {
      const product = edge.node;

      const variants = product.variants.edges.map((variantEdge) => {
        const variant = variantEdge.node;
        const options = variant.selectedOptions
          .map((option) => `${option.name}: ${option.value}`)
          .join(", ");

        return {
          id: variant.id,
          sku: variant.sku || "No SKU",
          price:
            (
              variant.presentmentPrices.edges[0]?.node.price.amount / 100
            ).toFixed(2) || "No price",
          options: options || "No options",
          weight: variant.weight ? variant.weight.toString() : "0",
        };
      });

      const images = product.images.edges.map((imgEdge) => ({
        src: imgEdge.node.url,
      }));

      return {
        id: product.id,
        title: product.title,
        description: product.description,
        price: (product.priceRange.minVariantPrice.amount / 100).toFixed(2),
        sku: variants[0]?.sku || "",
        weight: variants[0]?.weight || "0",
        imageUrl: product.images.edges[0]?.node.url,
        categories: product.tags.map((tag) => ({
          name: tag,
        })),
        tags: product.tags,
        shortDescription: product.description.substring(0, 100),
        images,
        active: true,
        variants,
      };
    });

    for (let product of products) {
      const existingMapping = await prisma.productMapping.findUnique({
        where: {
          shopifyProductId: product.id.toString(),
        },
      });

      if (existingMapping) {
        console.log(
          `Product ${product.title} already synced with WooCommerce. Skipping...`
        );
        continue;
      }

      const wooProductData = {
        name: product.title,
        type: "simple",
        regular_price: product.price.toString(),
        description: product.description,
        short_description: product.shortDescription,
        categories: product.categories,
        images: product.images,
        weight: product.weight.toString(),
        sku: product.sku,
        tags: product.tags.map((tag) => ({ name: tag })),
        variations: product.variants.map((variant) => ({
          regular_price: variant.price.toString(),
          sku: variant.sku,
          weight: variant.weight.toString() || "0",
          attributes: [
            {
              name: "options",
              option: variant.options,
            },
          ],
        })),
      };

      try {
        const wooResponse = await WooCommerce.post("products", wooProductData);
        const wooCommerceProductId = wooResponse.data.id;

        console.log(
          `Product ${product.title} created successfully in WooCommerce`
        );

        await prisma.productMapping.create({
          data: {
            wooCommerceId: wooCommerceProductId.toString(),
            shopifyProductId: product.id.toString(),
          },
        });

        console.log(`ProductMapping created successfully for ${product.title}`);
      } catch (error) {
        console.error(
          `Failed to create product ${product.title}:`,
          error.response?.data || error.message
        );
      }
    }

    return res.status(200).json({
      message: "Sync completed. ",
    });
  } catch (error) {
    console.error("Failed to fetch products from Shopify:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export const handleProductDeletedFromShopify = async (payload) => {
  if (!payload) {
    console.error("Payload is undefined");
    return;
  }

  try {
    const productMapping = await prisma.productMapping.findUnique({
      where: {
        shopifyProductId: String(payload.id),
      },
    });

    if (!productMapping) {
      console.log("No product mapping found for Shopify ID:", payload.id);
      return { error: "No product mapping found" };
    }

    const wooCommerceId = productMapping.wooCommerceId;

    const wooResponse = await WooCommerce.delete(`products/${wooCommerceId}`);
    console.log(
      `Product deleted from WooCommerce: ID ${wooCommerceId}`,
      wooResponse.data
    );

    await prisma.productMapping.delete({
      where: {
        shopifyProductId: String(payload.id),
      },
    });
    console.log("Product mapping deleted for Shopify ID:", payload.id);

    return { success: true, deletedWooCommerceId: wooCommerceId };
  } catch (error) {
    console.error("Error deleting product from WooCommerce or DB:", error);
    return { error: "Failed to delete product", details: error.message };
  }
};
