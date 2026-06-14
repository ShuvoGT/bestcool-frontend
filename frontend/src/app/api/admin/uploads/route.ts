import { NextRequest, NextResponse } from "next/server";
import { handleError, badRequest } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { storage } from "@/server/storage";

export async function POST(req: NextRequest) {
  try {
    await requirePermission("products", "content");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw badRequest("No file uploaded (field name: file)");
    if (file.size > 5 * 1024 * 1024) throw badRequest("File too large (max 5MB)");
    if (!/^image\/(png|jpe?g|webp|gif|avif|svg\+xml)$/.test(file.type)) throw badRequest("Only image files are allowed");
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await storage.save(buffer, file.name, file.type);
    return NextResponse.json(stored, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
