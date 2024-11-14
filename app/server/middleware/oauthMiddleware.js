import dotenv from "dotenv";
import querystring from "querystring";
import prisma from "../../db.server.js";
import crypto from "crypto";
import axios from "axios";

dotenv.config();

const generateNonce = () => {
  return crypto.randomBytes(16).toString("hex");
};

const registerWebhooks = async ({ session, webhookData }) => {
  try {
    await axios.post(
      `https://${session.shop}/admin/api/${process.env.API_VERSION}/webhooks.json`,
      webhookData,
      {
        headers: {
          "X-Shopify-Access-Token": session.accessToken,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(
      "Error registering app uninstalled webhook:",
      error.response ? error.response.data : error.message
    );
  } finally {
    return "webhook complete";
  }
};

export const authorize = async (req, res) => {
  const shop = req.query.shop;
  console.log("SHOP:",shop)

  const stateExpire = req.cookies["state_expire"];

  if (!shop) {
    return res.status(400).send("Missing shop parameter");
  }

  if (stateExpire) {
    return res.redirect(`/app?shop=${shop}`);
  }

  const state = generateNonce();

  const queryString = querystring.stringify({
    client_id: process.env.SHOPIFY_API_KEY,
    scope: process.env.SCOPES,
    redirect_uri: `${process.env.SHOPIFY_APP_URL}/api/auth/callback`,
    state: state,
  });

  const shopname = shop.replace(".myshopify.com", "");

  const authUrl = `https://admin.shopify.com/store/${shopname}/oauth/authorize?${queryString}`;
  res.cookie("state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  });
  res.cookie("state_expire", state, {
    httpOnly: true,
    secure: true,
    sameSite: "None",
    maxAge: 5000,
  });

  return res.redirect(authUrl);
};

export const oauthCallback = async (req, res) => {
  const { code, shop, state } = req.query;
  const stateCookie = req.cookies["state"];

  if (state !== stateCookie) {
    return res.status(400).send("State mismatch");
  }

  if (!code || !shop || !state) {
    console.error("Missing code, shop, or state parameter");
    return res.status(400).send("Missing code, shop, or state parameter");
  }

  try {
    // Exchange the authorization code for an access token
    const response = await axios.post(
      `https://${shop}/admin/oauth/access_token`,
      {
        client_id: process.env.SHOPIFY_API_KEY,
        client_secret: process.env.SHOPIFY_API_SECRET,
        code,
      }
    );

    const { access_token, scope } = response.data;
    // Save the access token in your database
    const session = await prisma.session.upsert({
      where: { id: `offline_${shop}` },
      update: { accessToken: access_token, scope, state },
      create: {
        shop,
        accessToken: access_token,
        scope,
        state,
        id: `offline_${shop}`,
      },
    });

    const webhooks = [
      {
        topic: "app/uninstalled",
        address: `${process.env.SHOPIFY_APP_URL}/api/webhooks/app-uninstalled`,
      },
      {
        topic: "products/delete",
        address: `${process.env.SHOPIFY_APP_URL}/proxy/api/webhook/product/delete`,
      },
    ];

    for (const webhook of webhooks) {
      const webhookData = {
        webhook: {
          topic: webhook.topic,
          address: webhook.address,
          format: "json",
        },
      };
      await registerWebhooks({ session, webhookData });
    }

    return res.redirect(`/app?shop=${shop}`);
  } catch (error) {
    console.error(
      "Error during OAuth token exchange:",
      error.response ? error.response.data : error.message
    );
    res.status(500).send("Error during OAuth token exchange");
  }
};
