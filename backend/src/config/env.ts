/** Centralized, typed access to environment variables. */
export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  apiUrl: process.env.API_URL || "http://localhost:5000",

  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

  // Auth-cookie SameSite. When the storefront (e.g. *.vercel.app) and the API
  // (e.g. a Hostinger domain) are on DIFFERENT sites, the cookie must be
  // "none" + Secure or the browser won't send it. Defaults: cross-site in
  // production, "lax" in local dev. Override with COOKIE_SAMESITE=lax|none.
  cookieSameSite: ((process.env.COOKIE_SAMESITE || (process.env.NODE_ENV === "production" ? "none" : "lax")).toLowerCase()) as "lax" | "none" | "strict",

  smtp: {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "Next Mart <no-reply@nextmart.com.bd>",
  },

  sms: {
    baseUrl: process.env.SMS_API_BASE_URL || "",
    apiKey: process.env.SMS_API_KEY || "",
    senderId: process.env.SMS_SENDER_ID || "",
  },

  // --- Storage ---
  // When cloudName is set, uploads go to Cloudinary (required on hosts with an
  // ephemeral filesystem like Render); otherwise files are stored on local disk.
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    folder: process.env.CLOUDINARY_FOLDER || "bestcool",
  },

  // --- Payments ---
  // sandbox | live — selects each gateway's base URL (validated below).
  paymentMode: ((process.env.PAYMENT_MODE || "sandbox").trim().toLowerCase()) as "sandbox" | "live",
  payment: {
    bkash: {
      appKey: process.env.BKASH_APP_KEY || "",
      appSecret: process.env.BKASH_APP_SECRET || "",
      username: process.env.BKASH_USERNAME || "",
      password: process.env.BKASH_PASSWORD || "",
    },
    nagad: {
      merchantId: process.env.NAGAD_MERCHANT_ID || "",
      merchantPrivateKey: process.env.NAGAD_MERCHANT_PRIVATE_KEY || "",
      pgPublicKey: process.env.NAGAD_PG_PUBLIC_KEY || "",
    },
    sslcommerz: {
      storeId: process.env.SSLCOMMERZ_STORE_ID || "",
      storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || "",
    },
  },

  // --- Couriers ---
  // sandbox | live — selects each courier's base URL (validated below).
  courierMode: ((process.env.COURIER_MODE || "sandbox").trim().toLowerCase()) as "sandbox" | "live",
  courierWebhookSecret: process.env.COURIER_WEBHOOK_SECRET || "",
  courier: {
    steadfast: {
      apiKey: process.env.STEADFAST_API_KEY || "",
      secretKey: process.env.STEADFAST_SECRET_KEY || "",
    },
    pathao: {
      clientId: process.env.PATHAO_CLIENT_ID || "",
      clientSecret: process.env.PATHAO_CLIENT_SECRET || "",
      username: process.env.PATHAO_USERNAME || "",
      password: process.env.PATHAO_PASSWORD || "",
      storeId: process.env.PATHAO_STORE_ID || "",
    },
    redx: {
      apiToken: process.env.REDX_API_TOKEN || "",
    },
  },
};

if (!env.jwtSecret) {
  throw new Error("JWT_SECRET is required — set it in backend/.env");
}

// Fail fast on a misspelled PAYMENT_MODE — otherwise an unrecognised value
// would silently route live customers to sandbox gateways.
if (env.paymentMode !== "sandbox" && env.paymentMode !== "live") {
  throw new Error(`PAYMENT_MODE must be "sandbox" or "live" (got "${process.env.PAYMENT_MODE}")`);
}
if (env.isProd && env.paymentMode === "sandbox") {
  console.warn("⚠ PAYMENT_MODE=sandbox while NODE_ENV=production — real customers would hit sandbox gateways.");
}

if (env.courierMode !== "sandbox" && env.courierMode !== "live") {
  throw new Error(`COURIER_MODE must be "sandbox" or "live" (got "${process.env.COURIER_MODE}")`);
}
if (env.isProd && !env.courierWebhookSecret) {
  console.warn("⚠ COURIER_WEBHOOK_SECRET is empty — all courier webhooks will be rejected. Set it to enable push status updates.");
}
