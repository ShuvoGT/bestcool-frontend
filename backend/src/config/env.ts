/** Centralized, typed access to environment variables. */
export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
  apiUrl: process.env.API_URL || "http://localhost:5000",

  jwtSecret: process.env.JWT_SECRET || "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",

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
