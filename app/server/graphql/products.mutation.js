
class ProductMutations { 
  static productCreate = `#graphql
mutation populateProduct($input: ProductInput!) {
  productCreate(input: $input) {
    product {
      id
    }
  }
}`;

static createProductWithNewMedia = `#graphql
mutation CreateProductWithNewMedia($input: ProductInput!, $media: [CreateMediaInput!]) {
  productCreate(input: $input, media: $media) {
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
}`;

static productUpdate = `#graphql
mutation productUpdate($input: ProductInput!, $media: [CreateMediaInput!]) {
  productUpdate(input: $input, media: $media) {
    product {
      id
    }
  }
}`;

static productMediadelete = `#graphql
mutation productDeleteMedia($mediaIds: [ID!]!, $productId: ID!) {
  productDeleteMedia(mediaIds: $mediaIds, productId: $productId) {
    deletedMediaIds
    deletedProductImageIds
    mediaUserErrors {
      field
      message
    }
    product {
      id
      title
      media(first: 5) {
        nodes {
          alt
          mediaContentType
          status
        }
      }
    }
  }
}`;

static deleteProductMutation = `#graphql
mutation productDelete($input: ProductDeleteInput!) {
  productDelete(input: $input) {
    deletedProductId
    userErrors {
      field
      message
    }
  }
}`;

static inventoryAdjustQuantity = `#graphql
mutation inventoryAdjustQuantities($input: InventoryAdjustQuantitiesInput!) {
  inventoryAdjustQuantities(input: $input) {
    userErrors {
      field
      message
    }
    inventoryAdjustmentGroup {
      createdAt
      reason
      changes {
        name
        delta
      }
    }
  }
}`;

static metafieldsSet = `#graphql
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
}`;

static productPublish = `#graphql
mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) {
    publishable {
      availablePublicationCount
      publicationCount
    }
    shop {
      publicationCount
    }
    userErrors {
      field
      message
    }
  }
}`;

static productChangeStatus = `#graphql
mutation productChangeStatus($productId: ID!, $status: ProductStatus!) {
  productChangeStatus(productId: $productId, status: $status) {
    product {
      id
      status
    }
    userErrors {
      field
      message
    }
  }
}`;

  static fetchActiveProducts() {
    return `#graphql
    query {
      products(first: 100, query: "published_status:published") {
        edges {
          node {
            id
            handle
            title
            description
            priceRange {
              minVariantPrice {
                amount
              }
            }
            images(first: 1) {
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
  }


static fetchProductById(id) {
  return `#graphql
  query ($id: ID!) {
  node(id: $id) {
    id
    ... on Product {
      title
      handle
      description
      priceRange {
        minVariantPrice {
          amount
        }
      }
      images(first: 1) {
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
    }
  }
}`;

}
  
};
export default ProductMutations;