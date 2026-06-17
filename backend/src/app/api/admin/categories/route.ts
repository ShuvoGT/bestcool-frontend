import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { slugify } from "@/server/slugify";

export const categoryBody = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().max(100).optional(),
  image: z.string().url().nullable().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requirePermission("products");
    const body = categoryBody.parse(await req.json());
    const category = await prisma.category.create({
      data: { name: body.name, slug: body.slug?.trim() || slugify(body.name), image: body.image ?? null },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
