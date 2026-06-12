/**
 * Next Mart API — entry point.
 * Phase 1: minimal skeleton (health check + DB connectivity check).
 * Routes, middleware and providers are added in later phases.
 */
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { prisma } from "./lib/prisma";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// Uploaded files are served statically; writes go through the storage
// interface (Phase 2) so the backend can later swap local disk for S3.
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.get("/api/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok", database: "connected" });
  } catch {
    res.status(503).json({ status: "error", database: "unreachable" });
  }
});

app.listen(PORT, () => {
  console.log(`Next Mart API running on http://localhost:${PORT}`);
});
