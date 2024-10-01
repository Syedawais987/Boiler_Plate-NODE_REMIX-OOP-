import crypto from "crypto";

export const verifyWooWebhook = async (req, res, next) => {
  console.log("REQ received in middleware ");

  const woocommerceSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;
  const rawBody = req.rawBody;
  // console.log("RAw Body ", rawBody);
  const signature = req.headers["x-wc-webhook-signature"];

  if (woocommerceSecret && signature) {
    const hash = crypto
      .createHmac("sha256", woocommerceSecret)
      .update(rawBody)
      .digest("base64");

    if (hash !== signature) {
      console.log("Invalid Webhook Signature");
      return res.status(403).send("Invalid Webhook Signature");
    }
  }
  next();
};
