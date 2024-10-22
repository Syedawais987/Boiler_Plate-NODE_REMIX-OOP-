import { Router } from "express";
import errorHandler from "../middleware/errorHandler.js";

// import { productsSync } from "../controllers/product_controller.js";
import { handleDfinWebhook } from "../controllers/dfin_controller.js";
import { RewardIcon } from "@shopify/polaris-icons";

const router = Router();

// router.post("/products/sync", async (req, res) => {
//   await productsSync(req, res);
// });
router.post("/webhook/dfinin", async (req, res) => {
  console.log("Webhook Route Called: BODY", req.body, "Headers:", req.headers);
  console.log("Raw Body ", req.rawBody);

  await handleDfinWebhook(req, res);
});

router.use(errorHandler);

export default router;
