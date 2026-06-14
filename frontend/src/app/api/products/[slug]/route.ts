import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, notFound } from "@/server/errors";
import { getRunningFlashMap } from "@/server/pricing";
import { serializeProductDetail } from "@/server/serializers";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { slug } = await params;
    const product = await prisma.product.findFirst({
      where: { slug, isActive: true },
      include: { images: true, category: true, variants: true, reviews: { select: { rating: true } } },
    });
    if (!product) throw notFound("Product not found");
    const flashMap = await getRunningFlashMap([product.id]);
    return NextResponse.json({ product: serializeProductDetail(product, flashMap.get(product.id)) });
  } catch (err) {
    return handleError(err);
  }
}
