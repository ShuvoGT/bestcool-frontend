import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, notFound } from "@/server/errors";
import { requirePermission } from "@/server/auth";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("content");
    const { id } = await params;
    const page = await prisma.page.findUnique({
      where: { id },
      include: { blocks: { orderBy: { sortOrder: "asc" } } },
    });
    if (!page) throw notFound("Page not found");
    return NextResponse.json({ page });
  } catch (err) {
    return handleError(err);
  }
}

const seoBody = z.object({
  title: z.string().min(1).max(120),
  metaTitle: z.string().max(160).nullable().optional(),
  metaDescription: z.string().max(320).nullable().optional(),
  ogImage: z.string().url().nullable().optional(),
});

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("content");
    const { id } = await params;
    const body = seoBody.parse(await req.json());
    const page = await prisma.page.update({
      where: { id },
      data: {
        title: body.title,
        metaTitle: body.metaTitle ?? null,
        metaDescription: body.metaDescription ?? null,
        ogImage: body.ogImage ?? null,
      },
    });
    return NextResponse.json({ page });
  } catch (err) {
    return handleError(err);
  }
}
