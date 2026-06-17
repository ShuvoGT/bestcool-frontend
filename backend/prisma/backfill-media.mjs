// One-time backfill: register already-uploaded files (product images, category
// images, logo, favicon) into the Media table so they show up in the new Media
// library + picker. Idempotent — skips URLs already recorded.
// Run: DATABASE_URL="mysql://…" node prisma/backfill-media.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EXT_KIND = {
  jpg: "image", jpeg: "image", png: "image", webp: "image", gif: "image", avif: "image", svg: "image",
  mp4: "video", webm: "video", mov: "video", ogg: "video",
  pdf: "document", doc: "document", docx: "document",
};
const EXT_MIME = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif",
  avif: "image/avif", svg: "image/svg+xml", mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime",
  ogg: "video/ogg", pdf: "application/pdf", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function info(url) {
  const clean = url.split("?")[0];
  const ext = (clean.split(".").pop() || "").toLowerCase();
  return {
    kind: EXT_KIND[ext] || "image",
    mime: EXT_MIME[ext] || "image/jpeg",
    filename: decodeURIComponent(clean.split("/").pop() || "file"),
    // Local files delete by basename; remote (Cloudinary) can't be derived → store url.
    key: url.startsWith("/uploads/") ? (clean.split("/").pop() || url) : url,
  };
}

async function main() {
  const urls = new Set();
  const add = (u) => {
    if (u && typeof u === "string" && /^(https?:|\/uploads\/)/.test(u)) urls.add(u);
  };

  (await prisma.productImage.findMany({ select: { url: true } })).forEach((r) => add(r.url));
  (await prisma.category.findMany({ select: { image: true } })).forEach((r) => add(r.image));
  for (const key of ["site.logo", "site.favicon"]) {
    const s = await prisma.setting.findUnique({ where: { key } });
    if (s && typeof s.value === "string") add(s.value);
  }

  const existing = new Set((await prisma.media.findMany({ select: { url: true } })).map((m) => m.url));

  let added = 0;
  for (const url of urls) {
    if (existing.has(url)) continue;
    const { kind, mime, filename, key } = info(url);
    await prisma.media.create({
      data: { url, storageKey: key, filename, mimeType: mime, kind, size: null },
    });
    added++;
  }
  console.log(`Backfill done: ${added} new media rows added (from ${urls.size} referenced URLs).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
