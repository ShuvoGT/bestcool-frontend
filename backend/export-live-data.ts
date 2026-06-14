/**
 * One-off: export ALL live data from Neon Postgres → live-data.json, for the
 * Next.js consolidation migration into MySQL. READ-ONLY on the live DB.
 * Run from backend/: `npx tsx export-live-data.ts`
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();

async function main() {
  const data = {
    users: await prisma.user.findMany(),
    categories: await prisma.category.findMany(),
    products: await prisma.product.findMany(),
    productImages: await prisma.productImage.findMany(),
    productVariants: await prisma.productVariant.findMany(),
    addresses: await prisma.address.findMany(),
    passwordResetTokens: await prisma.passwordResetToken.findMany(),
    reviews: await prisma.review.findMany(),
    pages: await prisma.page.findMany(),
    pageBlocks: await prisma.pageBlock.findMany(),
    settings: await prisma.setting.findMany(),
    deliveryZones: await prisma.deliveryZone.findMany(),
    cartItems: await prisma.cartItem.findMany(),
    wishlistItems: await prisma.wishlistItem.findMany(),
    flashSales: await prisma.flashSale.findMany(),
    flashSaleProducts: await prisma.flashSaleProduct.findMany(),
    orders: await prisma.order.findMany(),
    orderItems: await prisma.orderItem.findMany(),
    orderStatusHistory: await prisma.orderStatusHistory.findMany(),
    paymentTransactions: await prisma.paymentTransaction.findMany(),
  };
  writeFileSync("live-data.json", JSON.stringify(data, null, 2));
  console.log("Exported to backend/live-data.json:");
  for (const [k, v] of Object.entries(data)) console.log(`  ${k}: ${(v as unknown[]).length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
