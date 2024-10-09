import prisma from "../../db.server.js";
import { shopify_graphql } from "../utils/shopifyGraphql.js";
import { fetchCart } from "../graphql/cart.muatation.js";
import WooCommerce from "../init.js";

export const checkout = async (req, res) => {
  const session = req.shop.session;
  const cartId = req.body.cartId;

  try {
    const cartResponse = await shopify_graphql({
      session,
      query: fetchCart,
      variables: { cartId },
    });

    console.log("cart query response", cartResponse);
    if (cartResponse.errors) {
      return res.status(400).json({ errors: cartResponse.errors });
    }

    const shopifyCart = cartResponse.data.cart;
    const cartItems = shopifyCart.lines.edges.map((edge) => ({
      shopifyProductId: edge.node.merchandise.product.id,
      quantity: edge.node.quantity,
    }));

    // const cartItems = [
    //   { shopifyProductId: "gid://shopify/Product/7657475801169", quantity: 1 },
    // ];

    const wooCommerceItems = [];
    for (const item of cartItems) {
      const productMapping = await prisma.productMapping.findUnique({
        where: { shopifyProductId: item.shopifyProductId.toString() },
      });

      if (productMapping) {
        wooCommerceItems.push({
          product_id: productMapping.wooCommerceId,
          quantity: item.quantity,
        });
      } else {
        console.error(
          `Product with Shopify ID ${item.shopifyProductId} not found in WooCommerce`
        );
      }
    }

    if (wooCommerceItems.length === 0) {
      return res
        .status(400)
        .json({ message: "No matching products found in WooCommerce" });
    }

    const orderData = {
      payment_method: "dfin",
      payment_method_title: "DFIN Payment",
      set_paid: false,
      billing: {
        email: "syedawaishussain987@gmail.com",
      },
      line_items: wooCommerceItems,
    };

    const wooOrderResponse = await WooCommerce.post("orders", orderData);
    const wooOrderId = wooOrderResponse.data.id;
    const paymentLink = wooOrderResponse.data.payment_url;

    // await prisma.orderMapping.create({
    //   data: {
    //     woocommerceOrderId: String(payload.id),
    //     shopifyOrderId: .id,
    //   },
    // });

    console.log("WooCommerce checkout created:", wooOrderResponse.data);

    return res.status(200).json({ paymentLink });
  } catch (error) {
    console.error("Error creating WooCommerce checkout:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
