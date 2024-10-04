export const orderCreate = `
mutation OrderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
  orderCreate(order: $order, options: $options) {
    userErrors {
      field
      message
    }
    order {
      id
      totalTaxSet {
        shopMoney {
          amount
          currencyCode
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
                currencyCode
              }
            }
          }
        }
      }
    }
  }
}`;
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
