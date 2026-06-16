import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { requirePermission } from "@/server/auth";

// Lists uploaded media for the admin Media library + picker. Paginated, with an
// optional kind filter (image | video | document) and a filename search.
export async function GET(req: NextRequest) {
  try {
    await requirePermission("products", "content");
    const sp = req.nextUrl.searchParams;
    const kind = sp.get("kind") || undefined;
    const search = sp.get("search")?.trim() || undefined;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(60, Math.max(1, Number(sp.get("limit")) || 40));

    const where = {
      ...(kind && ["image", "video", "document"].includes(kind) ? { kind } : {}),
      ...(search ? { filename: { contains: search } } : {}),
    };

    const [total, items] = await Promise.all([
      prisma.media.count({ where }),
      prisma.media.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
    ]);

    return NextResponse.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (err) {
    return handleError(err);
  }
}
