export const fetchCart = `#graphql
  query fetchCart($cartId: ID!) {
    cart(id: $cartId) {
      id
      lines(first: 100) {
        edges {
          node {
            id
            quantity
            merchandise {
              ... on ProductVariant {
                product {
                  id
                  title
                  handle
                }
                priceV2 {
                  amount
                  currencyCode
                }
              }
            }
            attributes {
              key
              value
            }
          }
        }
      }
      attributes {
        key
        value
      }
      buyerIdentity {
        email
        phone
        customer {
          id
        }
        countryCode
        deliveryAddressPreferences {
          address1
          address2
          city
          provinceCode
          countryCodeV2
          zip
        }
      }
      checkoutUrl
      cost {
        totalAmount {
          amount
          currencyCode
        }
        subtotalAmount {
          amount
          currencyCode
        }
        totalTaxAmount {
          amount
          currencyCode
        }
        totalDutyAmount {
          amount
          currencyCode
        }
      }
      totalQuantity
      createdAt
      updatedAt
    }
  }
`;
