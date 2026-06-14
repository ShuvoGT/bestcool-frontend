import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, notFound } from "@/server/errors";
import { requirePermission } from "@/server/auth";

type Ctx = { params: Promise<{ id: string; productId: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("flashSales");
    const { id, productId } = await params;
    const deleted = await prisma.flashSaleProduct.deleteMany({
      where: { flashSaleId: id, productId },
    });
    if (deleted.count === 0) throw notFound("Product is not in this campaign");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
