import express from "express";
import { verifyWooWebhook } from "../server/middleware/webhook.js";
import {
  handleProductCreated,
  // handleProductUpdated,
} from "../controllers/webhook_controller.js";

const router = express.Router();

router.post("/webhook", verifyWooWebhook, async (req, res) => {
  // console.log("Headers:", req.headers);
  // console.log("Body:", req.body);
  const rawBody = req.rawBody;

  // console.log("Raw Body:", rawBody);
  const eventType = req.headers["x-wc-webhook-topic"];

  const payload = JSON.parse(rawBody);
  console.log("Payload ", payload);

  console.log(`Received WooCommerce event: ${eventType}`);

  switch (eventType) {
    case "product.created":
      await handleProductCreated(payload);
      break;
    // case "product.updated":
    //   await handleProductUpdated(payload);
    //   break;

    default:
      console.log("Unhandled WooCommerce event type:", eventType);
  }

  res.status(200).send("Webhook received");
});

export default router;
