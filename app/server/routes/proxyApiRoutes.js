import { Router } from "express";
import errorHandler from "../middleware/errorHandler.js";
// import { verifyShopifyWebhook } from "../middleware/webhook.js";
// import {
//   checkout,
//   fetchorder,
//   order_checkout,
// } from "../controllers/order_controller.js";
// import { handleProductDeletedFromShopify } from "../controllers//product_controller.js";
import { dfin_pay } from "../controllers/dfin_controller.js";
const router = Router();

// router.post("/checkout", async (req, res) => {
//   await checkout(req, res);
// });
// router.get("/order", async (req, res) => {
//   await fetchorder(req, res);
// });
// router.post("/order_checkout", async (req, res) => {
//   console.log("Order Checkout Called:", req.body);
//   await order_checkout(req, res);
// });
router.post("/dfin", async (req, res) => {
  console.log("Test Route Called:", req.body);
  await dfin_pay(req, res);
});

// router.post(
//   "/webhook/product/delete",
//   verifyShopifyWebhook,
//   async (req, res) => {
//     try {
//       const payload = req.body;

//       if (!payload || !payload.id) {
//         return res.status(400).json({ error: "Invalid webhook payload" });
//       }

//       console.log(payload.id);

//       const result = await handleProductDeletedFromShopify(payload);

//       if (result.error) {
//         return res.status(500).json({ error: result.error });
//       }

//       return res.status(200).json({
//         message: "Product deleted successfully from  WooCommerce",
//         result,
//       });
//     } catch (error) {
//       console.error("Error handling Shopify webhook:", error);
//       return res.status(500).json({ error: "Internal Server Error" });
//     }
//   }
// );

router.use(errorHandler);

export default router;
