import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BlockType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { handleError, notFound } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { sanitizeBlockContent } from "@/server/sanitize";

type Ctx = { params: Promise<{ id: string }> };

export const blockBody = z.object({
  type: z.nativeEnum(BlockType),
  content: z.record(z.string(), z.unknown()).default({}),
  isEnabled: z.boolean().default(true),
});

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("content");
    const { id } = await params;
    const body = blockBody.parse(await req.json());
    const page = await prisma.page.findUnique({ where: { id }, include: { blocks: true } });
    if (!page) throw notFound("Page not found");
    const block = await prisma.pageBlock.create({
      data: {
        pageId: page.id,
        type: body.type,
        content: sanitizeBlockContent(body.content) as Prisma.InputJsonValue,
        isEnabled: body.isEnabled,
        sortOrder: page.blocks.length ? Math.max(...page.blocks.map((b) => b.sortOrder)) + 1 : 0,
      },
    });
    return NextResponse.json({ block }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
