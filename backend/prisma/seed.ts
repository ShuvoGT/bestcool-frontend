/**
 * Best Cool Electronics seed script.
 *
 * Creates: 1 admin user, 4 electronics categories, 10 sample products
 * (with variants on several), 1 running flash sale (ends ~7 days from now),
 * default content blocks for all 8 CMS pages, global settings, and
 * delivery zones (Inside/Outside Dhaka).
 *
 * Run with: npm run seed   (idempotent — safe to re-run, never overwrites
 * admin-edited pages or settings)
 */
import { PrismaClient, BlockType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Placeholder images (next.config.ts allows these hosts).
const img = (text: string, w = 800, h = 800, bg = "1e293b", fg = "f8fafc") =>
  `https://placehold.co/${w}x${h}/${bg}/${fg}/png?text=${encodeURIComponent(text)}`;

async function seedAdmin() {
  const password = await bcrypt.hash("Admin@12345", 10);
  await prisma.user.upsert({
    where: { email: "admin@nextmart.com.bd" },
    update: {},
    create: {
      name: "Best Cool Electronics Admin",
      email: "admin@nextmart.com.bd",
      phone: "01700000000",
      password,
      role: "ADMIN",
    },
  });
  console.log("✔ Admin user: admin@nextmart.com.bd / Admin@12345");
}

async function seedCategories() {
  const categories = [
    { name: "Smartphones", slug: "smartphones" },
    { name: "Laptops", slug: "laptops" },
    { name: "Accessories", slug: "accessories" },
    { name: "Smart Watches", slug: "smart-watches" },
  ];
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: { ...c, image: img(c.name, 600, 400) },
    });
  }
  console.log("✔ 4 categories");
  return prisma.category.findMany();
}

type SeedProduct = {
  name: string;
  slug: string;
  category: string;
  regularPrice: number;
  salePrice?: number;
  stock: number;
  sku: string;
  description: string;
  variants?: { name: string; attributes: Record<string, string>; priceDiff: number; stock: number }[];
};

async function seedProducts(categories: { id: string; slug: string }[]) {
  const catId = (slug: string) => categories.find((c) => c.slug === slug)!.id;

  const products: SeedProduct[] = [
    {
      name: "Samsung Galaxy A56 5G",
      slug: "samsung-galaxy-a56-5g",
      category: "smartphones",
      regularPrice: 49999,
      salePrice: 46500,
      stock: 35,
      sku: "NM-SP-001",
      description:
        "<p>The <strong>Samsung Galaxy A56 5G</strong> brings flagship-grade features at a mid-range price. 6.7\" Super AMOLED 120Hz display, Exynos 1580 chipset, 50MP OIS triple camera and a 5000mAh battery with 45W fast charging.</p><ul><li>6.7\" FHD+ Super AMOLED, 120Hz</li><li>8GB RAM, 50MP OIS camera</li><li>5000mAh, 45W charging</li><li>Official warranty: 1 year</li></ul>",
      variants: [
        { name: "Awesome Graphite / 128GB", attributes: { Color: "Awesome Graphite", Storage: "128GB" }, priceDiff: 0, stock: 20 },
        { name: "Awesome Graphite / 256GB", attributes: { Color: "Awesome Graphite", Storage: "256GB" }, priceDiff: 4000, stock: 10 },
        { name: "Awesome Lightgray / 256GB", attributes: { Color: "Awesome Lightgray", Storage: "256GB" }, priceDiff: 4000, stock: 5 },
      ],
    },
    {
      name: "Xiaomi Redmi Note 14 Pro",
      slug: "xiaomi-redmi-note-14-pro",
      category: "smartphones",
      regularPrice: 34999,
      salePrice: 32999,
      stock: 50,
      sku: "NM-SP-002",
      description:
        "<p>The <strong>Redmi Note 14 Pro</strong> packs a 200MP main camera, 6.67\" 1.5K AMOLED display and IP68 dust/water resistance — the best value flagship-killer in Bangladesh.</p><ul><li>200MP OIS camera</li><li>5500mAh battery, 45W turbo charge</li><li>MediaTek Dimensity 7300 Ultra</li></ul>",
      variants: [
        { name: "Midnight Black / 8GB+256GB", attributes: { Color: "Midnight Black", Storage: "8GB+256GB" }, priceDiff: 0, stock: 30 },
        { name: "Ocean Blue / 8GB+256GB", attributes: { Color: "Ocean Blue", Storage: "8GB+256GB" }, priceDiff: 0, stock: 20 },
      ],
    },
    {
      name: "iPhone 16",
      slug: "iphone-16",
      category: "smartphones",
      regularPrice: 145000,
      stock: 12,
      sku: "NM-SP-003",
      description:
        "<p>The <strong>iPhone 16</strong> with A18 chip, Camera Control button, 48MP Fusion camera and Apple Intelligence. Brand-new, non-activated, with 1-year warranty.</p>",
      variants: [
        { name: "Black / 128GB", attributes: { Color: "Black", Storage: "128GB" }, priceDiff: 0, stock: 6 },
        { name: "Ultramarine / 128GB", attributes: { Color: "Ultramarine", Storage: "128GB" }, priceDiff: 0, stock: 3 },
        { name: "Black / 256GB", attributes: { Color: "Black", Storage: "256GB" }, priceDiff: 15000, stock: 3 },
      ],
    },
    {
      name: "ASUS Vivobook 16 (Core i5 13th Gen)",
      slug: "asus-vivobook-16-i5-13gen",
      category: "laptops",
      regularPrice: 92500,
      salePrice: 89000,
      stock: 15,
      sku: "NM-LP-001",
      description:
        "<p>The <strong>ASUS Vivobook 16</strong> is the perfect everyday productivity laptop: Intel Core i5-1335U, 16GB DDR4 RAM, 512GB NVMe SSD and a 16\" WUXGA anti-glare display.</p><ul><li>Intel Core i5-1335U (13th Gen)</li><li>16GB RAM / 512GB SSD</li><li>16\" WUXGA IPS display</li><li>2 years international warranty</li></ul>",
    },
    {
      name: "MacBook Air 13\" M4",
      slug: "macbook-air-13-m4",
      category: "laptops",
      regularPrice: 165000,
      stock: 8,
      sku: "NM-LP-002",
      description:
        "<p>The <strong>MacBook Air 13\" with M4 chip</strong> — incredibly thin, all-day battery life, and a stunning Liquid Retina display. 16GB unified memory, 256GB SSD.</p>",
      variants: [
        { name: "Midnight", attributes: { Color: "Midnight" }, priceDiff: 0, stock: 4 },
        { name: "Starlight", attributes: { Color: "Starlight" }, priceDiff: 0, stock: 4 },
      ],
    },
    {
      name: "Lenovo IdeaPad Slim 3 (Ryzen 5)",
      slug: "lenovo-ideapad-slim-3-ryzen-5",
      category: "laptops",
      regularPrice: 67500,
      salePrice: 64999,
      stock: 20,
      sku: "NM-LP-003",
      description:
        "<p><strong>Lenovo IdeaPad Slim 3</strong> with AMD Ryzen 5 7530U, 16GB RAM, 512GB SSD and a 15.6\" FHD display. Great value for students and office work.</p>",
    },
    {
      name: "Anker Soundcore Q20i Headphones",
      slug: "anker-soundcore-q20i",
      category: "accessories",
      regularPrice: 5500,
      salePrice: 4790,
      stock: 60,
      sku: "NM-AC-001",
      description:
        "<p><strong>Anker Soundcore Q20i</strong> hybrid active noise cancelling wireless headphones with Hi-Res audio, 40-hour playtime in ANC mode, and multipoint connection.</p>",
      variants: [
        { name: "Black", attributes: { Color: "Black" }, priceDiff: 0, stock: 40 },
        { name: "Blue", attributes: { Color: "Blue" }, priceDiff: 0, stock: 20 },
      ],
    },
    {
      name: "Baseus 65W GaN Charger",
      slug: "baseus-65w-gan-charger",
      category: "accessories",
      regularPrice: 3200,
      salePrice: 2850,
      stock: 100,
      sku: "NM-AC-002",
      description:
        "<p><strong>Baseus 65W GaN5 Pro</strong> fast charger with 2× USB-C + 1× USB-A ports. Charges a laptop, phone and earbuds simultaneously. BD plug, 6-month warranty.</p>",
    },
    {
      name: "Apple Watch SE (2nd Gen) 40mm",
      slug: "apple-watch-se-2nd-gen-40mm",
      category: "smart-watches",
      regularPrice: 38500,
      salePrice: 36500,
      stock: 18,
      sku: "NM-SW-001",
      description:
        "<p><strong>Apple Watch SE (2nd Gen)</strong> — all the essentials: heart-rate notifications, crash detection, sleep tracking, and seamless iPhone integration.</p>",
      variants: [
        { name: "Midnight / GPS", attributes: { Color: "Midnight", Connectivity: "GPS" }, priceDiff: 0, stock: 10 },
        { name: "Starlight / GPS", attributes: { Color: "Starlight", Connectivity: "GPS" }, priceDiff: 0, stock: 8 },
      ],
    },
    {
      name: "Amazfit GTS 4 Mini",
      slug: "amazfit-gts-4-mini",
      category: "smart-watches",
      regularPrice: 12500,
      salePrice: 10990,
      stock: 40,
      sku: "NM-SW-002",
      description:
        "<p><strong>Amazfit GTS 4 Mini</strong> — 1.65\" AMOLED display, built-in GPS, 120+ sports modes, SpO2 & heart-rate monitoring, and 15-day battery life.</p>",
      variants: [
        { name: "Midnight Black", attributes: { Color: "Midnight Black" }, priceDiff: 0, stock: 25 },
        { name: "Mint Blue", attributes: { Color: "Mint Blue" }, priceDiff: 0, stock: 15 },
      ],
    },
  ];

  // Brand per product (powers the shop "filter by brand").
  const BRANDS: Record<string, string> = {
    "samsung-galaxy-a56-5g": "Samsung",
    "xiaomi-redmi-note-14-pro": "Xiaomi",
    "iphone-16": "Apple",
    "asus-vivobook-16-i5-13gen": "ASUS",
    "macbook-air-13-m4": "Apple",
    "lenovo-ideapad-slim-3-ryzen-5": "Lenovo",
    "anker-soundcore-q20i": "Anker",
    "baseus-65w-gan-charger": "Baseus",
    "apple-watch-se-2nd-gen-40mm": "Apple",
    "amazfit-gts-4-mini": "Amazfit",
  };

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        brand: BRANDS[p.slug] ?? null,
        description: p.description,
        sku: p.sku,
        regularPrice: p.regularPrice,
        salePrice: p.salePrice ?? null,
        stock: p.stock,
        lowStockThreshold: 5,
        isActive: true,
        soldCount: Math.floor(Math.random() * 50),
        categoryId: catId(p.category),
        images: {
          create: [
            { url: img(p.name), alt: p.name, sortOrder: 0 },
            { url: img(`${p.name} - 2`, 800, 800, "334155"), alt: `${p.name} alternate view`, sortOrder: 1 },
            { url: img(`${p.name} - 3`, 800, 800, "475569"), alt: `${p.name} detail view`, sortOrder: 2 },
          ],
        },
        variants: p.variants
          ? { create: p.variants.map((v) => ({ name: v.name, attributes: v.attributes, priceDiff: v.priceDiff, stock: v.stock })) }
          : undefined,
      },
    });
  }
  console.log(`✔ ${products.length} products`);
  return prisma.product.findMany();
}

async function seedFlashSale(products: { id: string; slug: string; salePrice: any; regularPrice: any }[]) {
  const existing = await prisma.flashSale.findFirst({ where: { title: "Mega Flash Sale" } });
  if (existing) {
    console.log("✔ Flash sale already exists, skipping");
    return;
  }
  const now = new Date();
  const pick = ["xiaomi-redmi-note-14-pro", "anker-soundcore-q20i", "amazfit-gts-4-mini", "baseus-65w-gan-charger"];
  const items = products.filter((p) => pick.includes(p.slug));
  await prisma.flashSale.create({
    data: {
      title: "Mega Flash Sale",
      startsAt: new Date(now.getTime() - 60 * 60 * 1000), // started 1h ago
      endsAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // ends in 7 days
      isActive: true,
      products: {
        create: items.map((p) => ({
          productId: p.id,
          // ~20% off the effective price
          flashPrice: Math.round(Number(p.salePrice ?? p.regularPrice) * 0.8),
        })),
      },
    },
  });
  console.log("✔ Flash sale (running, ends in 7 days, 4 products)");
}

async function seedDeliveryZones() {
  const count = await prisma.deliveryZone.count();
  if (count > 0) return;
  await prisma.deliveryZone.createMany({
    data: [
      { name: "Inside Dhaka", charge: 60, sortOrder: 0 },
      { name: "Outside Dhaka", charge: 120, sortOrder: 1 },
    ],
  });
  console.log("✔ Delivery zones (Inside Dhaka ৳60, Outside Dhaka ৳120)");
}

async function seedSettings() {
  const settings: Record<string, unknown> = {
    "site.name": "Best Cool Electronics",
    "site.tagline": "Your trusted electronics store in Bangladesh",
    "site.logo": null, // when null the storefront renders the site name as a text logo
    "site.favicon": null,
    "contact.phone": "+880 1700-000000",
    "contact.email": "support@nextmart.com.bd",
    "contact.address": "Level 4, House 12, Road 5, Dhanmondi, Dhaka 1205, Bangladesh",
    "social.links": [
      { platform: "facebook", url: "https://facebook.com/nextmartbd" },
      { platform: "instagram", url: "https://instagram.com/nextmartbd" },
      { platform: "youtube", url: "https://youtube.com/@nextmartbd" },
    ],
    "whatsapp.number": "8801700000000",
    "whatsapp.message": "Hello Best Cool Electronics! I have a question about a product.",
    "chat.embedCode": "",
    "analytics.facebookPixelId": "",
    "analytics.ga4MeasurementId": "",
    "sms.events": { orderPlaced: true, statusConfirmed: true, statusShipped: true, statusDelivered: true, paymentConfirmed: true },
    "nav.header": [
      { label: "Home", href: "/" },
      { label: "Shop", href: "/shop" },
      { label: "Showroom", href: "/showroom" },
      { label: "About Us", href: "/about-us" },
      { label: "Contact", href: "/contact-us" },
    ],
    "footer.columns": [
      {
        title: "Quick Links",
        links: [
          { label: "Shop", href: "/shop" },
          { label: "About Us", href: "/about-us" },
          { label: "Contact Us", href: "/contact-us" },
          { label: "Showroom", href: "/showroom" },
        ],
      },
      {
        title: "Customer Care",
        links: [
          { label: "My Account", href: "/account" },
          { label: "Terms & Conditions", href: "/terms" },
          { label: "Privacy Policy", href: "/privacy-policy" },
          { label: "Refund & Return Policy", href: "/refund-policy" },
        ],
      },
    ],
    "footer.text": "Best Cool Electronics — Bangladesh's trusted destination for genuine electronics. 100% authentic products with official warranty.",
  };

  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {}, // never overwrite admin-edited values on re-seed
      create: { key, value: value as any },
    });
  }
  console.log("✔ Global settings");
}

// --------------------------------------------------------------------------
// Pages CMS — default blocks for all 8 pages
// --------------------------------------------------------------------------
async function seedPages(
  categories: { id: string; slug: string }[],
  products: { id: string; slug: string }[]
) {
  const productIds = (slugs: string[]) => products.filter((p) => slugs.includes(p.slug)).map((p) => p.id);
  const categoryIds = categories.map((c) => c.id);

  type BlockSeed = { type: BlockType; content: unknown };
  const pages: { slug: string; title: string; metaTitle: string; metaDescription: string; blocks: BlockSeed[] }[] = [
    {
      slug: "home",
      title: "Home",
      metaTitle: "Best Cool Electronics — Genuine Electronics at the Best Price in Bangladesh",
      metaDescription:
        "Buy 100% authentic smartphones, laptops, smart watches and accessories with official warranty. Fast delivery across Bangladesh. Cash on delivery available.",
      blocks: [
        {
          type: BlockType.HERO_SLIDER,
          content: {
            slides: [
              {
                image: img("Latest Smartphones — Up to 20% Off", 1600, 600, "0f172a", "38bdf8"),
                heading: "Latest Smartphones",
                subheading: "Official warranty • Up to 20% off • Free delivery inside Dhaka",
                buttonText: "Shop Smartphones",
                buttonLink: "/shop?category=smartphones",
              },
              {
                image: img("Powerful Laptops for Work & Play", 1600, 600, "1e1b4b", "a5b4fc"),
                heading: "Powerful Laptops",
                subheading: "From students to creators — find your perfect machine",
                buttonText: "Shop Laptops",
                buttonLink: "/shop?category=laptops",
              },
              {
                image: img("Smart Watches — Track Every Move", 1600, 600, "052e16", "86efac"),
                heading: "Smart Watches",
                subheading: "Style meets health tracking, starting at ৳10,990",
                buttonText: "Explore Watches",
                buttonLink: "/shop?category=smart-watches",
              },
            ],
          },
        },
        { type: BlockType.FLASH_SALE, content: { heading: "⚡ Flash Sale", subheading: "Grab these deals before time runs out!" } },
        {
          type: BlockType.BANNER,
          content: {
            image: img("Free Delivery Inside Dhaka on Orders Over Tk 5,000", 1600, 300, "7c2d12", "fed7aa"),
            link: "/shop",
            alt: "Free delivery inside Dhaka promotional banner",
          },
        },
        { type: BlockType.FEATURED_CATEGORIES, content: { heading: "Shop by Category", categoryIds } },
        {
          type: BlockType.FEATURED_PRODUCTS,
          content: {
            heading: "Featured Products",
            subheading: "Hand-picked by our team",
            productIds: productIds([
              "samsung-galaxy-a56-5g",
              "iphone-16",
              "macbook-air-13-m4",
              "asus-vivobook-16-i5-13gen",
              "apple-watch-se-2nd-gen-40mm",
              "anker-soundcore-q20i",
              "xiaomi-redmi-note-14-pro",
              "amazfit-gts-4-mini",
            ]),
          },
        },
        {
          type: BlockType.TESTIMONIALS,
          content: {
            heading: "What Our Customers Say",
            items: [
              { name: "Rahim Ahmed", location: "Dhaka", rating: 5, text: "Ordered a Galaxy A56 at 11pm, received it the next afternoon. Genuine product with official warranty. Highly recommended!" },
              { name: "Fatema Khatun", location: "Chattogram", rating: 5, text: "Best price I found for the Amazfit GTS 4 Mini anywhere in Bangladesh. The COD option made it totally risk-free." },
              { name: "Sajid Hossain", location: "Sylhet", rating: 4, text: "The laptop arrived well-packaged in 3 days. Customer support on WhatsApp was super responsive." },
            ],
          },
        },
      ],
    },
    {
      slug: "about-us",
      title: "About Us",
      metaTitle: "About Best Cool Electronics — Who We Are",
      metaDescription: "Best Cool Electronics is Bangladesh's trusted online electronics store, delivering 100% genuine products with official warranty since 2020.",
      blocks: [
        {
          type: BlockType.BANNER,
          content: { image: img("About Best Cool Electronics", 1600, 400, "0f172a", "e2e8f0"), alt: "About Best Cool Electronics" },
        },
        {
          type: BlockType.RICH_TEXT,
          content: {
            html: "<h2>Our Story</h2><p>Founded in 2020 in Dhaka, <strong>Best Cool Electronics</strong> started with a simple mission: make genuine electronics accessible to everyone in Bangladesh at honest prices. Today we serve customers in all 64 districts with official-warranty smartphones, laptops, smart watches and accessories.</p><p>Every product we sell is sourced from authorized distributors — no grey-market imports, no clones, no compromises.</p>",
          },
        },
        {
          type: BlockType.IMAGE_TEXT,
          content: {
            image: img("Our Warehouse", 800, 600, "1e293b"),
            layout: "left",
            heading: "Why Choose Best Cool Electronics?",
            html: "<ul><li><strong>100% genuine products</strong> with official Bangladesh warranty</li><li><strong>Fast delivery</strong> — same-day inside Dhaka, 2–4 days nationwide</li><li><strong>Cash on delivery</strong> everywhere in Bangladesh</li><li><strong>Easy returns</strong> — 7-day replacement guarantee</li></ul>",
          },
        },
        {
          type: BlockType.FAQ,
          content: {
            heading: "Frequently Asked Questions",
            items: [
              { question: "Are your products original?", answer: "Yes — every product is sourced from authorized distributors and carries an official Bangladesh warranty." },
              { question: "Do you deliver outside Dhaka?", answer: "Yes, we deliver to all 64 districts via Steadfast, Pathao and RedX couriers." },
              { question: "Can I pay cash on delivery?", answer: "Absolutely. COD is available nationwide, along with bKash, Nagad and card payments." },
            ],
          },
        },
      ],
    },
    {
      slug: "contact-us",
      title: "Contact Us",
      metaTitle: "Contact Best Cool Electronics — We're Here to Help",
      metaDescription: "Reach Best Cool Electronics by phone, email, WhatsApp or visit our Dhanmondi showroom. Open 7 days a week, 10am–9pm.",
      blocks: [
        {
          type: BlockType.CONTACT_INFO,
          content: {
            heading: "Get in Touch",
            phone: "+880 1700-000000",
            email: "support@nextmart.com.bd",
            address: "Level 4, House 12, Road 5, Dhanmondi, Dhaka 1205",
            hours: "Open 7 days a week, 10:00 AM – 9:00 PM",
          },
        },
        {
          type: BlockType.MAP_EMBED,
          content: {
            embedUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3652.4!2d90.374!3d23.745!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDQ0JzQyLjAiTiA5MMKwMjInMjYuNCJF!5e0!3m2!1sen!2sbd!4v1700000000000",
            heading: "Find Us on the Map",
          },
        },
        {
          type: BlockType.RICH_TEXT,
          content: {
            html: "<h3>Prefer WhatsApp?</h3><p>Tap the green WhatsApp button at the bottom-right corner of any page and our team will reply within minutes during business hours.</p>",
          },
        },
      ],
    },
    {
      slug: "shop",
      title: "Shop",
      metaTitle: "Shop All Electronics — Best Cool Electronics Bangladesh",
      metaDescription: "Browse smartphones, laptops, smart watches and accessories. Filter by category and price, with nationwide delivery.",
      blocks: [
        {
          type: BlockType.BANNER,
          content: { image: img("Shop All Products", 1600, 250, "172554", "bfdbfe"), alt: "Shop banner" },
        },
      ],
    },
    {
      slug: "showroom",
      title: "Showroom",
      metaTitle: "Visit Our Showrooms — Best Cool Electronics",
      metaDescription: "Experience products hands-on at Best Cool Electronics showrooms in Dhanmondi and Uttara, Dhaka.",
      blocks: [
        {
          type: BlockType.BANNER,
          content: { image: img("Our Showrooms", 1600, 400, "082f49", "bae6fd"), alt: "Best Cool Electronics showrooms" },
        },
        {
          type: BlockType.IMAGE_TEXT,
          content: {
            image: img("Dhanmondi Showroom", 800, 600, "0c4a6e"),
            layout: "left",
            heading: "Dhanmondi Flagship Showroom",
            html: "<p>Our flagship showroom in the heart of Dhanmondi. Try the latest smartphones, laptops and wearables before you buy.</p><p><strong>Address:</strong> Level 4, House 12, Road 5, Dhanmondi, Dhaka 1205<br/><strong>Hours:</strong> 10:00 AM – 9:00 PM, 7 days a week<br/><strong>Phone:</strong> +880 1700-000000</p>",
          },
        },
        {
          type: BlockType.IMAGE_TEXT,
          content: {
            image: img("Uttara Showroom", 800, 600, "134e4a"),
            layout: "right",
            heading: "Uttara Branch",
            html: "<p>Serving customers in north Dhaka with the same hands-on experience and expert staff.</p><p><strong>Address:</strong> Shop 21, North Tower, Sector 7, Uttara, Dhaka 1230<br/><strong>Hours:</strong> 10:00 AM – 9:00 PM, 7 days a week<br/><strong>Phone:</strong> +880 1700-000001</p>",
          },
        },
        {
          type: BlockType.IMAGE_GALLERY,
          content: {
            heading: "Inside Our Showrooms",
            images: [
              { url: img("Showroom Interior 1", 600, 450, "1e3a8a"), alt: "Showroom interior" },
              { url: img("Showroom Interior 2", 600, 450, "312e81"), alt: "Display section" },
              { url: img("Showroom Interior 3", 600, 450, "3730a3"), alt: "Laptop corner" },
              { url: img("Showroom Interior 4", 600, 450, "1e40af"), alt: "Customer service desk" },
            ],
          },
        },
      ],
    },
    {
      slug: "terms",
      title: "Terms & Conditions",
      metaTitle: "Terms & Conditions — Best Cool Electronics",
      metaDescription: "Read the terms and conditions for shopping with Best Cool Electronics Bangladesh.",
      blocks: [
        {
          type: BlockType.RICH_TEXT,
          content: {
            html: "<h2>Terms & Conditions</h2><p>Welcome to Best Cool Electronics. By using our website and placing an order, you agree to the following terms.</p><h3>1. Orders & Pricing</h3><p>All prices are listed in Bangladeshi Taka (BDT) and include VAT where applicable. We reserve the right to cancel orders affected by obvious pricing errors.</p><h3>2. Delivery</h3><p>Standard delivery takes 1–2 business days inside Dhaka and 2–4 business days outside Dhaka. Delivery times are estimates, not guarantees.</p><h3>3. Warranty</h3><p>All products carry the official manufacturer warranty applicable in Bangladesh. Warranty claims are handled by the respective brand's authorized service centers.</p><h3>4. Payments</h3><p>We accept Cash on Delivery, bKash, Nagad and cards (via SSLCommerz). Online payments are confirmed only after gateway verification.</p>",
          },
        },
      ],
    },
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      metaTitle: "Privacy Policy — Best Cool Electronics",
      metaDescription: "How Best Cool Electronics collects, uses and protects your personal information.",
      blocks: [
        {
          type: BlockType.RICH_TEXT,
          content: {
            html: "<h2>Privacy Policy</h2><p>Your privacy matters to us. This policy explains what data we collect and how we use it.</p><h3>What We Collect</h3><p>Name, phone number, email address and delivery address — collected when you place an order or create an account.</p><h3>How We Use It</h3><p>To process and deliver orders, send order updates by email/SMS, and improve our service. We never sell your personal data to third parties.</p><h3>Payment Security</h3><p>We never store card details. All online payments are processed by PCI-DSS-compliant gateways (bKash, Nagad, SSLCommerz).</p><h3>Cookies</h3><p>We use cookies for login sessions, your cart, and analytics (Google Analytics, Facebook Pixel) when enabled.</p>",
          },
        },
      ],
    },
    {
      slug: "refund-policy",
      title: "Refund & Return Policy",
      metaTitle: "Refund & Return Policy — Best Cool Electronics",
      metaDescription: "Best Cool Electronics's 7-day replacement guarantee and refund process explained.",
      blocks: [
        {
          type: BlockType.RICH_TEXT,
          content: {
            html: "<h2>Refund & Return Policy</h2><h3>7-Day Replacement Guarantee</h3><p>If your product arrives damaged, defective, or different from what you ordered, contact us within 7 days of delivery for a free replacement.</p><h3>Conditions</h3><ul><li>The product must be unused with all original packaging, accessories and the invoice.</li><li>An unboxing video is strongly recommended for damage claims.</li><li>Software issues covered by the manufacturer's warranty are handled by the brand's service center.</li></ul><h3>Refunds</h3><p>If a replacement is unavailable, we issue a full refund within 7–10 business days via your original payment method (or bKash/Nagad for COD orders).</p>",
          },
        },
      ],
    },
  ];

  for (const page of pages) {
    const existing = await prisma.page.findUnique({ where: { slug: page.slug } });
    if (existing) continue; // never overwrite admin-edited pages on re-seed
    await prisma.page.create({
      data: {
        slug: page.slug,
        title: page.title,
        metaTitle: page.metaTitle,
        metaDescription: page.metaDescription,
        ogImage: img(`Best Cool Electronics — ${page.title}`, 1200, 630, "0f172a", "38bdf8"),
        blocks: {
          create: page.blocks.map((b, i) => ({ type: b.type, content: b.content as any, sortOrder: i, isEnabled: true })),
        },
      },
    });
  }
  console.log("✔ 8 CMS pages with default blocks");
}

async function main() {
  console.log("Seeding Best Cool Electronics database...\n");
  await seedAdmin();
  const categories = await seedCategories();
  const products = await seedProducts(categories);
  await seedFlashSale(products);
  await seedDeliveryZones();
  await seedSettings();
  await seedPages(categories, products);
  console.log("\nDone ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
