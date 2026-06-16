// Minimal seed for the consolidated app — admin, settings, zones, sample catalog.
// Run with: node prisma/seed.mjs   (DATABASE_URL must be set, e.g. from .env.local)
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "admin@nextmart.com.bd" },
    update: {},
    create: {
      name: "Best Cool Electronics Admin",
      username: "admin",
      email: "admin@nextmart.com.bd",
      password: await bcrypt.hash("Admin@12345", 10),
      role: "ADMIN",
      isActive: true,
    },
  });

  const settings = {
    "site.name": "Best Cool Electronics",
    "site.tagline": "Genuine Electronics in Bangladesh",
    "site.indexable": true,
    "maintenance.enabled": false,
    "maintenance.title": "We'll be right back",
    "maintenance.message": "Our store is undergoing scheduled maintenance. Please check back soon.",
    "maintenance.until": null,
    "payment.mode": "sandbox",
    "courier.mode": "sandbox",
    "email.smtp": {
      enabled: true,
      host: "smtp.gmail.com",
      port: "587",
      secure: false,
      user: "",
      pass: "",
      from: "Best Cool Electronics <no-reply@bestcoolelectronics.com>",
    },
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  for (const z of [
    { name: "Inside Dhaka", charge: 60, sortOrder: 0 },
    { name: "Outside Dhaka", charge: 120, sortOrder: 1 },
  ]) {
    const existing = await prisma.deliveryZone.findFirst({ where: { name: z.name } });
    if (!existing) await prisma.deliveryZone.create({ data: { ...z, isActive: true } });
  }

  const category = await prisma.category.upsert({
    where: { slug: "air-conditioners" },
    update: {},
    create: { name: "Air Conditioners", slug: "air-conditioners" },
  });

  const product = await prisma.product.upsert({
    where: { slug: "haier-hsu-24-intellicool" },
    update: {},
    create: {
      name: "Haier HSU-24 IntelliCool (Inverter)",
      slug: "haier-hsu-24-intellicool",
      brand: "Haier",
      description: "<p>Energy-efficient inverter air conditioner.</p>",
      regularPrice: 94990,
      salePrice: 84500,
      stock: 25,
      categoryId: category.id,
      isActive: true,
    },
  });
  const imgCount = await prisma.productImage.count({ where: { productId: product.id } });
  if (imgCount === 0) {
    await prisma.productImage.create({
      data: { productId: product.id, url: "https://akijce.com/wp-content/uploads/2026/01/imageSADADAWD.webp" },
    });
  }

  await prisma.page.upsert({ where: { slug: "home" }, update: {}, create: { slug: "home", title: "Home" } });

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
