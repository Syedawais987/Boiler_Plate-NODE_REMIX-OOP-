export const orderCreate = `
mutation OrderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
  orderCreate(order: $order, options: $options) {
    userErrors {
      field
      message
    }
    order {
      id
      email
      totalTaxSet {
        shopMoney {
          amount
         
        }
      }
      lineItems(first: 5) {
        nodes {
          variant {
            id
          }
          id
          title
          quantity
          taxLines {
            title
            rate
            priceSet {
              shopMoney {
                amount
             
              }
            }
          }
        }
      }
      billingAddress {
        firstName
        lastName
        address1
        address2
        city
        province
        country
        zip
        phone
      }
      shippingAddress {
        firstName
        lastName
        address1
        address2
        city
        province
        country
        zip
        phone
      }
    }
  }
}
`;

export const OrderDelete = `
mutation OrderDelete($orderId: ID!) {
  orderDelete(orderId: $orderId) {
    userErrors {
      field
      message
    }
    deletedId
  }
}`;
export const getOrderDetails = `
query GetOrderDetails($orderId: ID!) {
  order(id: $orderId) {
    id
    name
    email
    totalPriceSet {
      shopMoney {
        amount
        currencyCode
      }
    }
    customer {
      id
      firstName
      lastName
      email
      phone
      defaultAddress {
        address1
        address2
        city
        province
        country
        zip
      }
    }
    billingAddress {
      firstName
      lastName
      address1
      address2
      city
      province
      country
      zip
      phone
    }
    shippingAddress {
      firstName
      lastName
      address1
      address2
      city
      province
      country
      zip
      phone
    }
    lineItems(first: 10) {
      edges {
        node {
          id
          title
          quantity
          variant {
            id
            title
            price
            product {
              id  # Added product ID
            }
          }
        }
      }
    }
    transactions {
      id
      kind
      status
      amountSet {
        shopMoney {
          amount
          currencyCode
        }
      }
    }
  }
}
`;
