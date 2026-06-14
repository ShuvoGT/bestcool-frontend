import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, badRequest } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { categoryBody } from "../route";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("products");
    const { id } = await params;
    const body = categoryBody.parse(await req.json());
    const category = await prisma.category.update({
      where: { id },
      data: { name: body.name, ...(body.slug ? { slug: body.slug } : {}), image: body.image ?? null },
    });
    return NextResponse.json({ category });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("products");
    const { id } = await params;
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) throw badRequest(`Cannot delete: ${productCount} product(s) still use this category`);
    await prisma.category.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
