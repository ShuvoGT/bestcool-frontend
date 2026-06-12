import rateLimit from "express-rate-limit";

const FIFTEEN_MIN = 15 * 60 * 1000;

/** Login / register / password endpoints — brute-force protection. */
export const authLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again in 15 minutes" },
});

/** Order placement — abuse protection without blocking real shoppers. */
export const checkoutLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many orders placed, please try again later" },
});

/** Payment/courier callback endpoints (used from Phase 6/7). */
export const callbackLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests" },
});
