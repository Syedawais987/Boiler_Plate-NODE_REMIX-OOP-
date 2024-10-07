export const productCreate = `#graphql
mutation productCreate($input: ProductInput!) {
  productCreate(input: $input) {
    product {
      id
      title
     descriptionHtml
      productType
      
      metafields(first: 50) {
        edges {
          node {
            key
            namespace
            value
            type
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;

export const productCreateMedia = `#graphql
mutation productCreateMedia($media: [CreateMediaInput!]!, $productId: ID!) {
  productCreateMedia(media: $media, productId: $productId) {
    media {
      alt
      mediaContentType
      status
    }
    mediaUserErrors {
      field
      message
    }
    product {
      id
      title
    }
  }
}
`;

export const metafieldsSet = `#graphql
mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      key
      namespace
      value
      createdAt
      updatedAt
    }
    userErrors {
      field
      message
      code
    }
  }
}
`;
export const productVariantsBulkCreate = `#graphql
mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkCreate(productId: $productId, variants: $variants) {
    userErrors {
      field
      message
    }
    product {
      id
      options {
        id
        name
        values
        position
        optionValues {
          id
          name
          hasVariants
        }
      }
    }
    productVariants {
      id
      title
      selectedOptions {
        name
        value
      }
    }
  }
}


`;

export const productUpdateWithMedia = `#graphql
mutation UpdateProductWithNewMedia($input: ProductInput!, $media: [CreateMediaInput!]) {
  productUpdate(input: $input, media: $media) {
    product {
      id
      title
      media(first: 10) {
        nodes {
          alt
          mediaContentType
          preview {
            status
          }
        }
      }
    }
    userErrors {
      field
      message
    }
  }
}
`;
export const productDelete = `
  mutation productDelete($input: ProductDeleteInput!) {
    productDelete(input: $input) {
      deletedProductId
      userErrors {
        field
        message
      }
    }
  }
`;

export const fetchActiveProducts = `#graphql
query {
  products(first: 100, query: "published_status:published") {
    edges {
      node {
        id
        title
        description
        tags # Retrieve tags to map them to WooCommerce categories
        vendor # Fetch vendor as a potential brand
        productType # Fetch product type for categorization
        priceRange {
          minVariantPrice {
            amount
          }
        }
        images(first: 5) { # Retrieve more images
          edges {
            node {
              url
            }
          }
        }
        variants(first: 100) {
          edges {
            node {
              id
              sku
              presentmentPrices(first: 1) {
                edges {
                  node {
                    price {
                      amount
                    }
                  }
                }
              }
              selectedOptions {
                name
                value
              }
            }
          }
        }
        publishedAt
      }
    }
  }
}`;
