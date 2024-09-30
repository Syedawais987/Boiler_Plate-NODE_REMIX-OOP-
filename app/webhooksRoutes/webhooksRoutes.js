import express from "express";
import { verifyWooWebhook } from "../server/middleware/webhook.js";
const router = express.Router();
import {
  handleProductCreated,
  handleProductUpdated,
  handleProductDeleted,
  handleProductRestored,
} from "../controllers/webhook_controller.js";

router.post("/webhook", verifyWooWebhook, async (req, res) => {
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("Received WooCommerce webhook payload:", req.body);
  console.log("Raw Body:", JSON.stringify(req.body));
  const eventType = req.headers["x-wc-webhook-topic"];

  const { payload, topic } = req.body;

  console.log(`Received WooCommerce event: ${eventType}`);

  switch (eventType) {
    case "product.created":
      await handleProductCreated(payload);
      console.log("Handling product.created event");
      break;
    case "product.updated":
      await handleProductUpdated(payload);
      console.log("Handling product.updated event");
      break;
    case "product.deleted":
      await handleProductDeleted(payload);
      console.log("Handling product.deleted event");
      break;
    case "product.restored":
      await handleProductRestored(payload);
      console.log("Handling product.restored event");
      break;
    default:
      console.log("Unhandled WooCommerce event type:", eventType);
  }

  res.status(200).send("Webhook received");
});

export default router;
