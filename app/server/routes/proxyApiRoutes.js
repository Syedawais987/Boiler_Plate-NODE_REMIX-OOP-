import { Router } from "express";
import errorHandler from "../middleware//errorHandler.js";
import { checkout } from "../controllers/order_controller.js";
const router = Router();

router.post("/checkout ", async (req, res) => {
  await checkout(req, res);
});

router.use(errorHandler);

export default router;
