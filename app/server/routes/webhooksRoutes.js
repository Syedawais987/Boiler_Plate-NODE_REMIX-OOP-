import express from "express";
import { verifyWooWebhook } from "../middleware/webhook.js";
import {
  handleProductCreated,
  handleProductUpdated,
  handleOrderCreated,
  handleProductDeleted,
  handleDeleteOrder,
} from "../controllers/webhook_controller.js";

const router = express.Router();

router.post("/webhook", async (req, res) => {
  console.log("Headers:", req.headers);
  // console.log("Body:", req.body);
  const rawBody = req.rawBody;

  // console.log("Raw Body:", rawBody);
  const eventType = req.headers["x-wc-webhook-topic"];

  const contentType = req.headers["content-type"];
  let payload;

  if (contentType === "application/json") {
    try {
      payload = JSON.parse(req.rawBody);
    } catch (error) {
      console.error("Invalid JSON payload:", error);
      return res.status(400).json({ error: "Invalid JSON format" });
    }
  } else if (contentType === "application/x-www-form-urlencoded") {
    payload = req.body;
  } else {
    return res.status(415).json({ error: "Unsupported content type" });
  }

  console.log("Payload ", payload);

  console.log(`Received WooCommerce event: ${eventType}`);
  let result;

  switch (eventType) {
    case "product.created":
      result = await handleProductCreated(payload);
      break;
    case "product.updated":
      result = await handleProductUpdated(payload);
      break;
    case "product.deleted":
      result = await handleProductDeleted(payload);
      break;
    case "order.created":
      result = await handleOrderCreated(payload);
      break;
    case "order.deleted":
      result = await handleDeleteOrder(payload);
      break;
    default:
      result = {
        status: 400,
        message: `Unhandled WooCommerce event type: ${eventType}`,
      };
  }

  if (result && result.error) {
    res.status(500).json({ error: result.error, details: result.details });
  } else if (result && result.success) {
    res
      .status(200)
      .json({ success: true, message: result.message || "Success" });
  } else {
    res
      .status(result.status || 200)
      .json({ message: result.message || "Webhook received" });
  }
});

export default router;
