import { Router } from "express";
import errorHandler from "../middleware/errorHandler.js";

import  ProductService  from "../controllers/product-service.js"

const router = Router();

const extractSession = (req, res, next) => {

  console.log("Extracting session:", req.shop.session);
  const session = req.shop.session
  if (!session) {
    return res.status(401).json({ error: "Unauthorized: Session missing" });
  }
  next();
};
// products

router.get("/products", extractSession, async (req, res) => {
  try {
    const productService = new ProductService(req.shop.session); 
    const products = await productService.getAllProducts();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/product/:id", extractSession, async (req, res) => {
  try {
    const productService = new ProductService(req.shop.session); 
    const product = await productService.getProductById(req);
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/products/delete", extractSession, async (req, res) => {
  try {
    const productService = new ProductService(req.shop.session);
    await productService.deleteProduct(req.body.productId);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
router.use(errorHandler);

export default router;
