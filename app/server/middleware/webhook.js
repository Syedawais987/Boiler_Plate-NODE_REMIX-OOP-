import crypto from "crypto";

export const verifyWooWebhook = async (req, res, next) => {
  console.log("REQ received in middleware ");
  // console.log("Headers:", req.headers);

  const woocommerceSecret = process.env.WOOCOMMERCE_WEBHOOK_SECRET;
  // console.log("Secret", woocommerceSecret);
  const rawBody = req.rawBody;
  // console.log("RAw Body ", rawBody);
  const signature = req.headers["x-wc-webhook-signature"];

  if (woocommerceSecret && signature) {
    const hash = crypto
      .createHmac("sha256", woocommerceSecret)
      .update(rawBody)
      .digest("base64");
    console.log("Received Signature:", signature);
    console.log("Generated Signature:", hash);
    if (hash !== signature) {
      console.log("Invalid Webhook Signature");
      return res.status(403).send("Invalid Webhook Signature");
    }
  }
  next();
};
