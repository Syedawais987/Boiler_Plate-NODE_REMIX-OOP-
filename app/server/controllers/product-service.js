import { shopify_graphql } from "../utils/shopifyGraphql";

import ProductMutations from "../graphql/products.mutation";


class ProductService {
  constructor(session) 
  {
    this.session = session;
  }

  async getAllProducts() {
    try {
      const response = await shopify_graphql({
        session: this.session,
        query: ProductMutations.fetchActiveProducts(),
      });

      if (response.errors) {
        throw new Error("Failed to fetch products: " + response.errors);
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
              variant.presentmentPrices.edges[0]?.node.price.amount || "No price",
            options: options || "No options",
          };
        });

        return {
          id: product.id,
          handle: product.handle,
          title: product.title,
          description: product.description,
          price: product.priceRange.minVariantPrice.amount,
          imageUrl: product.images.edges[0]?.node.url,
          active: true,
          variants,
        };
      });

      return { products };
    } catch (error) {
      console.error("Failed to fetch products:", error);
      throw new Error("Internal Server Error");
    }
  }

  
  async getProductById(req) {
    let { id } = req.params;
  
    if (!id) {
      console.error("Product ID not found in request params");
      throw new Error("Product ID is required");
    }
  
    id = decodeURIComponent(id);
    console.log("Decoded Product ID:", id);
  
    try {
      const response = await shopify_graphql({
        session: this.session,
        query: ProductMutations.fetchProductById(),
        variables: { id },
      });
  
      console.log("GraphQL Response:", response);
  
      if (response.errors) {
        console.log("Error from Shopify:", response.errors);
        throw new Error("Error fetching product from Shopify");
      }
  
      const product = response.data.node;
      if (!product) {
        throw new Error("Product not found");
      }
  
      // Format the response as desired
      const formattedProduct = {
        id: product.id, // Changed from productNode to product
        handle: product.handle, // Changed from productNode to product
        title: product.title, // Changed from productNode to product
        description: product.description || "", // Ensure there's always a description
        price: product.priceRange?.minVariantPrice?.amount || "No price", // Default to "No price" if not available
        imageUrl: product.images?.edges[0]?.node?.url || "", // Default to empty string if no image
        active: true, // Assuming product is active by default
        variants: product.variants.edges.map((variantEdge) => {
          const variant = variantEdge.node;
          const options = variant.selectedOptions
            .map((option) => `${option.name}: ${option.value}`)
            .join(", ");
  
          return {
            id: variant.id,
            sku: variant.sku || "No SKU", // Default to "No SKU" if not available
            price:
              variant.presentmentPrices.edges[0]?.node.price.amount || "No price", // Default to "No price" if not available
            options: options || "No options", // Default to "No options" if not available
          };
        }),
      };
  
      return formattedProduct;
  
    } catch (error) {
      console.error("Failed to fetch product by ID:", error);
      throw error;
    }
  }
  
    
}

export default ProductService;
