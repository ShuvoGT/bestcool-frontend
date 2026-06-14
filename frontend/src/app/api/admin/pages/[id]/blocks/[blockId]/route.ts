import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleError, notFound } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { sanitizeBlockContent } from "@/server/sanitize";
import { blockBody } from "../route";

type Ctx = { params: Promise<{ id: string; blockId: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("content");
    const { id, blockId } = await params;
    const body = blockBody.partial().parse(await req.json());
    const existing = await prisma.pageBlock.findFirst({ where: { id: blockId, pageId: id } });
    if (!existing) throw notFound("Block not found");
    const block = await prisma.pageBlock.update({
      where: { id: existing.id },
      data: {
        ...(body.type ? { type: body.type } : {}),
        ...(body.content ? { content: sanitizeBlockContent(body.content) as Prisma.InputJsonValue } : {}),
        ...(body.isEnabled !== undefined ? { isEnabled: body.isEnabled } : {}),
      },
    });
    return NextResponse.json({ block });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("content");
    const { id, blockId } = await params;
    const deleted = await prisma.pageBlock.deleteMany({ where: { id: blockId, pageId: id } });
    if (deleted.count === 0) throw notFound("Block not found");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
