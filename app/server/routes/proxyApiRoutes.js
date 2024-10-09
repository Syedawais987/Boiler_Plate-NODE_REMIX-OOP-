import { Router } from "express";
import errorHandler from "../middleware/errorHandler.js";
import { verifyShopifyWebhook } from "../middleware/webhook.js";
import { checkout } from "../controllers/order_controller.js";
import { handleProductDeletedFromShopify } from "../controllers//product_controller.js";
const router = Router();

router.post("/checkout", async (req, res) => {
  await checkout(req, res);
});

router.post(
  "/webhook/product/delete",
  verifyShopifyWebhook,
  async (req, res) => {
    try {
      const payload = req.body;

      if (!payload || !payload.id) {
        return res.status(400).json({ error: "Invalid webhook payload" });
      }

      console.log(payload.id);

      const result = await handleProductDeletedFromShopify(payload);

      if (result.error) {
        return res.status(500).json({ error: result.error });
      }

      return res.status(200).json({
        message: "Product deleted successfully from  WooCommerce",
        result,
      });
    } catch (error) {
      console.error("Error handling Shopify webhook:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

router.use(errorHandler);

export default router;
