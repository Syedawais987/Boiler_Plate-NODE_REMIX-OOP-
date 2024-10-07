import { Router } from "express";
import errorHandler from "../middleware/errorHandler.js";

import { productsSync } from "../controllers/product_controller.js";

const router = Router();

router.post("/products/sync", async (req, res) => {
  await productsSync(req, res);
});
router.use(errorHandler);

export default router;
