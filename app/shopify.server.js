import "@shopify/shopify-app-remix/adapters/node";
import {
  AppDistribution,
  DeliveryMethod,
  shopifyApp,
  LATEST_API_VERSION,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2024-04";
import prisma from "./db.server.js";

import express from "express";
import { createRequestHandler } from "@remix-run/express";
import * as remixBuild from "@remix-run/dev/server-build";

import session from "express-session";
import { loadSession } from "./server/middleware/loadSession.js";
import {
  authorize,
  oauthCallback,
} from "./server/middleware/oauthMiddleware.js";
import cookieParser from "cookie-parser";
import webhooksRoutes from "./webhooksRoutes/webhooksRoutes.js";

import cors from "cors";

let shopify;
if (process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET) {
  shopify = shopifyApp({
    apiKey: process.env.SHOPIFY_API_KEY,
    apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
    apiVersion: process.env.API_VERSION || LATEST_API_VERSION,
    scopes: process.env.SCOPES?.split(","),
    appUrl: process.env.SHOPIFY_APP_URL || "",
    authPathPrefix: "/auth",
    sessionStorage: new PrismaSessionStorage(prisma),
    distribution: AppDistribution.AppStore,
    restResources,
    webhooks: {
      APP_UNINSTALLED: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: "/webhooks",
      },
    },
    hooks: {
      afterAuth: async ({ session }) => {
        shopify.registerWebhooks({ session });
      },
    },
    future: {
      v3_webhookAdminContext: true,
      v3_authenticatePublic: true,
    },
    ...(process.env.SHOP_CUSTOM_DOMAIN
      ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
      : {}),
  });
  console.log("Shopify app initialized successfully:");
} else {
  console.log("Shopify app initialization failed: Missing API Key or Secret.");
}
const app = express();
app.use(cookieParser());
// app.use(
//   cors({
//     origin: "https://admin.shopify.com",
//     credentials: true,
//   })
// );
app.use(express.static("public"));
// app.use(express.json());
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf.toString();
    },
  })
);
app.use(express.urlencoded({ extended: true }));

// Middleware for express-session
// app.use(
//   session({
//     secret: process.env.SESSION_COOKIE_KEY,
//     resave: false,
//     saveUninitialized: true,
//   })
// );

// Oauth
// app.get("/api/auth", authorize);
// app.get("/api/auth/callback", oauthCallback);

// load app session
// app.use(loadSession);
app.use("/api", webhooksRoutes);

app.get("/", (req, res) => {
  const shop = req.query.shop || req.cookies.shop;
  return res.redirect(`/app?shop=${shop}`);
});

app.all("*", createRequestHandler({ build: remixBuild }));

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

export default shopify;
export const apiVersion = process.env.API_VERSION || LATEST_API_VERSION;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
if (typeof globalThis !== "undefined") {
  globalThis.shopify = shopify;
}
