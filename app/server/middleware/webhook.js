import crypto from "crypto";
export const verifyWooWebhook = async (req, res, next) => {
  const woocommerceSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;
  const requestBody = JSON.stringify(req.body);
  const signature = req.headers["x-wc-webhook-signature"];

  if (woocommerceSecret && signature) {
    const hash = crypto
      .createHmac("sha256", woocommerceSecret)
      .update(requestBody)
      .digest("base64");

    if (hash !== signature) {
      return res.status(403).send("Invalid Webhook Signature");
    }
  }
  next();
};
