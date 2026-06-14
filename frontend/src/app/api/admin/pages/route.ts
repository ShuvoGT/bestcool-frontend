import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { requirePermission } from "@/server/auth";

export async function GET() {
  try {
    await requirePermission("content");
    const pages = await prisma.page.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { blocks: true } } },
    });
    return NextResponse.json({
      pages: pages.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        blockCount: p._count.blocks,
        updatedAt: p.updatedAt,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}
