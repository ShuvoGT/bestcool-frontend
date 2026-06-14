import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, handleError } from "@/server/errors";
import { requireAuth } from "@/server/auth";
import { getRunningFlashMap } from "@/server/pricing";
import { serializeProductCard } from "@/server/serializers";

const productInclude = {
  images: true,
  category: true,
  variants: true,
  reviews: { select: { rating: true as const } },
};

export async function GET() {
  try {
    const user = await requireAuth();
    const items = await prisma.wishlistItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { product: { include: productInclude } },
    });
    const flashMap = await getRunningFlashMap(items.map((i) => i.productId));
    return NextResponse.json({
      items: items.map((i) => ({
        id: i.id,
        addedAt: i.createdAt,
        product: serializeProductCard(i.product, flashMap.get(i.productId)),
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

const schema = z.object({ productId: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { productId } = schema.parse(await req.json());
    const product = await prisma.product.findFirst({ where: { id: productId, isActive: true } });
    if (!product) throw badRequest("Product is unavailable");
    await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: user.id, productId: product.id } },
      update: {},
      create: { userId: user.id, productId: product.id },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
