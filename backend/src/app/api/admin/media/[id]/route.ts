import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, notFound } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { storage } from "@/server/storage";

type Ctx = { params: Promise<{ id: string }> };

// Deletes a media file from the backing store and its library record. (Existing
// references that already embedded the URL — products, settings — are left as-is.)
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("products", "content");
    const { id } = await params;
    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) throw notFound("Media not found");
    await storage.delete(media.storageKey).catch(() => undefined);
    await prisma.media.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
