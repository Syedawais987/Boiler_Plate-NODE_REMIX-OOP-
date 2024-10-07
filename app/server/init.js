import WooCommerceRestApi from "@woocommerce/woocommerce-rest-api";

const WooCommerce = new WooCommerceRestApi({
  url: process.env.WOOCOMMERCE_URL,
  consumerKey: process.env.WOOCOMMERCE_API_KEY,
  consumerSecret: process.env.WOOCOMMERCE_SECRETKEY,
  version: process.env.WOOCOMMERCE_APIVERSION,
});

export default WooCommerce;
