import { Router } from "express";
import errorHandler from "../middleware/errorHandler.js";

const router = Router();




router.use(errorHandler);

export default router;
