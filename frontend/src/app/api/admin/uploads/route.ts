import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, badRequest } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { storage } from "@/server/storage";

const MAX_BYTES = 25 * 1024 * 1024; // 25MB

// Allowed MIME types → media kind. Anything not listed is rejected.
const ALLOWED: Record<string, "image" | "video" | "document"> = {
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "image/gif": "image",
  "image/avif": "image",
  "image/svg+xml": "image",
  "video/mp4": "video",
  "video/webm": "video",
  "video/ogg": "video",
  "video/quicktime": "video",
  "application/pdf": "document",
  "application/msword": "document", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document", // .docx
};

export async function POST(req: NextRequest) {
  try {
    await requirePermission("products", "content");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw badRequest("No file uploaded (field name: file)");
    if (file.size > MAX_BYTES) throw badRequest("File too large (max 25MB)");
    const kind = ALLOWED[file.type];
    if (!kind) throw badRequest("Unsupported file type. Allowed: images, video (mp4/webm/mov), PDF and Word documents.");

    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storage.save(buffer, file.name, file.type);

    // Record it in the Media library (best-effort: never fail the upload if the
    // bookkeeping insert errors — the URL is already valid and returned).
    const media = await prisma.media
      .create({
        data: { url: stored.url, storageKey: stored.key, filename: file.name, mimeType: file.type, kind, size: file.size },
      })
      .catch(() => null);

    return NextResponse.json(
      { url: stored.url, key: stored.key, id: media?.id ?? null, kind, filename: file.name },
      { status: 201 },
    );
  } catch (err) {
    return handleError(err);
  }
}
