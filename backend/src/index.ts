/**
 * Next Mart API — entry point.
 * Public routes are mounted under /api/*, admin routes under /api/admin/*
 * (all admin routes sit behind requireAdmin).
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { env } from "./config/env";
import { prisma } from "./lib/prisma";
import { attachUser, requireAdmin } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/error";

import { authRouter } from "./routes/auth";
import { productsRouter } from "./routes/products";
import { categoriesRouter, pagesRouter, settingsRouter, deliveryZonesRouter, flashSalesRouter } from "./routes/catalogPublic";
import { cartRouter, wishlistRouter } from "./routes/cartWishlist";
import { ordersRouter } from "./routes/orders";

import { adminProductsRouter, adminCategoriesRouter, adminUploadsRouter } from "./routes/admin/products";
import { adminPagesRouter } from "./routes/admin/pages";
import { adminFlashSalesRouter } from "./routes/admin/flashSales";
import { adminOrdersRouter, adminCustomersRouter, adminDashboardRouter } from "./routes/admin/orders";
import { adminSettingsRouter, adminDeliveryZonesRouter } from "./routes/admin/settings";

const app = express();

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use(attachUser);

// Uploaded files are served statically; writes go through the storage
// interface so local disk can be swapped for S3 later.
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

// --- Public / customer API --------------------------------------------------
app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/pages", pagesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/delivery-zones", deliveryZonesRouter);
app.use("/api/flash-sales", flashSalesRouter);
app.use("/api/cart", cartRouter);
app.use("/api/wishlist", wishlistRouter);
app.use("/api/orders", ordersRouter);

// --- Admin API (role-gated) ---------------------------------------------------
app.use("/api/admin", requireAdmin);
app.use("/api/admin/products", adminProductsRouter);
app.use("/api/admin/categories", adminCategoriesRouter);
app.use("/api/admin/uploads", adminUploadsRouter);
app.use("/api/admin/pages", adminPagesRouter);
app.use("/api/admin/flash-sales", adminFlashSalesRouter);
app.use("/api/admin/orders", adminOrdersRouter);
app.use("/api/admin/customers", adminCustomersRouter);
app.use("/api/admin/dashboard", adminDashboardRouter);
app.use("/api/admin/settings", adminSettingsRouter);
app.use("/api/admin/delivery-zones", adminDeliveryZonesRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Next Mart API running on http://localhost:${env.port} (${env.nodeEnv})`);
});
