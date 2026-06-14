import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, notFound } from "@/server/errors";
import { requireAuth } from "@/server/auth";
import { serializeCart } from "@/server/cart";

type Ctx = { params: Promise<{ itemId: string }> };

const schema = z.object({ quantity: z.number().int().min(1).max(99) });

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireAuth();
    const { itemId } = await params;
    const { quantity } = schema.parse(await req.json());
    const item = await prisma.cartItem.findFirst({ where: { id: itemId, userId: user.id } });
    if (!item) throw notFound("Cart item not found");
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
    return NextResponse.json(await serializeCart(user.id));
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireAuth();
    const { itemId } = await params;
    await prisma.cartItem.deleteMany({ where: { id: itemId, userId: user.id } });
    return NextResponse.json(await serializeCart(user.id));
  } catch (err) {
    return handleError(err);
  }
}
