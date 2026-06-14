import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, notFound } from "@/server/errors";
import { getRunningFlashMap } from "@/server/pricing";
import { serializeProductCard } from "@/server/serializers";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { slug } = await params;
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) throw notFound("Product not found");
    const related = await prisma.product.findMany({
      where: { categoryId: product.categoryId, isActive: true, id: { not: product.id } },
      orderBy: { soldCount: "desc" },
      take: 8,
      include: { images: true, category: true, variants: true, reviews: { select: { rating: true } } },
    });
    const flashMap = await getRunningFlashMap(related.map((p) => p.id));
    return NextResponse.json({ items: related.map((p) => serializeProductCard(p, flashMap.get(p.id))) });
  } catch (err) {
    return handleError(err);
  }
}
