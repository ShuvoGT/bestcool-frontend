/**
 * One-off: import live-data.json (exported from Neon Postgres) into the local
 * MySQL DB for the consolidation. Wipes existing rows first, then inserts in
 * FK-dependency order. Run from frontend/ with DATABASE_URL passed inline:
 *   DATABASE_URL="mysql://root@127.0.0.1:3306/bestcool" node import-live-data.mjs ../backend/live-data.json
 */
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";

const prisma = new PrismaClient();
const file = process.argv[2] ?? "../backend/live-data.json";
const data = JSON.parse(readFileSync(file, "utf8"));

// Top-level ISO-datetime strings → Date (Prisma DateTime inputs). Strict regex
// so JSON-column string values (settings, etc.) are never misconverted.
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/;
const fix = (rows) =>
  rows.map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) out[k] = typeof v === "string" && ISO.test(v) ? new Date(v) : v;
    return out;
  });

// [prisma delegate, json key] in FK-safe insert order.
const ORDER = [
  ["user", "users"],
  ["category", "categories"],
  ["product", "products"],
  ["productImage", "productImages"],
  ["productVariant", "productVariants"],
  ["address", "addresses"],
  ["passwordResetToken", "passwordResetTokens"],
  ["review", "reviews"],
  ["page", "pages"],
  ["pageBlock", "pageBlocks"],
  ["setting", "settings"],
  ["deliveryZone", "deliveryZones"],
  ["cartItem", "cartItems"],
  ["wishlistItem", "wishlistItems"],
  ["flashSale", "flashSales"],
  ["flashSaleProduct", "flashSaleProducts"],
  ["order", "orders"],
  ["orderItem", "orderItems"],
  ["orderStatusHistory", "orderStatusHistory"],
  ["paymentTransaction", "paymentTransactions"],
];

async function main() {
  // Wipe in reverse FK order.
  console.log("Wiping local tables…");
  for (const [model] of [...ORDER].reverse()) {
    await prisma[model].deleteMany();
  }
  // Insert in FK order.
  console.log("Importing live data…");
  for (const [model, key] of ORDER) {
    const rows = data[key] ?? [];
    if (!rows.length) {
      console.log(`  ${key}: 0 (skip)`);
      continue;
    }
    const res = await prisma[model].createMany({ data: fix(rows) });
    console.log(`  ${key}: ${res.count}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
