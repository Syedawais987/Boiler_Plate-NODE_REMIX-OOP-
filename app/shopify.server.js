import "dotenv/config";
import "./logger.js";
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
// import webhooksRoutes from "./server/routes/webhooksRoutes.js";
import apiRoutes from "./server/routes/apiRoutes.js";
import proxyApiRoutes from "./server/routes/proxyApiRoutes.js";

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
      PRODUCTS_DELETE: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: "/proxy/api/webhook/product/delete",
      },
      APP_UNINSTALLED: {
        deliveryMethod: DeliveryMethod.Http,
        callbackUrl: "/webhooks",
      },
    },
    hooks: {
      afterAuth: async ({ session }) => {
        console.log("AfterAuth: Registering webhooks");
        await registerWebhooks({ session });
        console.log("Webhooks registered successfully after authentication");
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
app.use(
  cors({
    origin: [
      "https://muscled-tests.myshopify.com",
      "https://amplifiedamino.com",
      "https://enhanced-amino-f8e98bc8c6ae.herokuapp.com",
      "https://admin.shopify.com",
      "https://b01b-203-82-53-3.ngrok-free.app",
    ],
    methods: "GET,POST,OPTIONS",
    credentials: true,
  })
);
app.options("*", (req, res) => {
  console.log("Received OPTIONS request from:", req.headers.origin);
  const origin = req.headers.origin;
  const allowedOrigins = [
    "https://muscled-tests.myshopify.com",
    "https://amplifiedamino.com",
    "https://enhanced-amino-f8e98bc8c6ae.herokuapp.com",
    "https://admin.shopify.com",
    "https://b01b-203-82-53-3.ngrok-free.app",
  ];
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(204);
});

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
app.use(
  session({
    secret: process.env.SESSION_COOKIE_KEY,
    resave: false,
    saveUninitialized: true,
  })
);

// Oauth
app.get("/api/auth", authorize);
app.get("/api/auth/callback", oauthCallback);

// load app session
app.use(loadSession);
// app.use("/api", webhooksRoutes);
app.use("/api", apiRoutes);
app.use("/proxy/api", proxyApiRoutes);

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
