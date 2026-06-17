import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { requireAuth } from "@/server/auth";

type Ctx = { params: Promise<{ productId: string }> };

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireAuth();
    const { productId } = await params;
    await prisma.wishlistItem.deleteMany({ where: { userId: user.id, productId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
