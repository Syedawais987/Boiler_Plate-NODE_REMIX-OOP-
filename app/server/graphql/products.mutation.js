
class ProductMutations { 
 
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