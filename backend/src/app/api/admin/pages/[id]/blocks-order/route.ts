import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, badRequest } from "@/server/errors";
import { requirePermission } from "@/server/auth";

type Ctx = { params: Promise<{ id: string }> };

const orderBody = z.object({ blockIds: z.array(z.string()).min(1) });

// Reorder: the editor sends the complete list of block ids in display order.
export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("content");
    const { id } = await params;
    const { blockIds } = orderBody.parse(await req.json());
    const blocks = await prisma.pageBlock.findMany({ where: { pageId: id }, select: { id: true } });
    const known = new Set(blocks.map((b) => b.id));
    const ids = blockIds;
    if (ids.length !== known.size || ids.some((bid) => !known.has(bid))) {
      throw badRequest("blockIds must contain exactly the ids of this page's blocks");
    }
    await prisma.$transaction(ids.map((bid, i) => prisma.pageBlock.update({ where: { id: bid }, data: { sortOrder: i } })));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
