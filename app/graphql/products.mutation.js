// product.mutation.js

export const productCreate = `#graphql
mutation productCreate($input: ProductInput!) {
  productCreate(input: $input) {
    product {
      id
      title
      bodyHtml
      productType
      variants(first: 25) {
        edges {
          node {
            sku
            price
            compareAtPrice
          }
        }
      }
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
