import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";

// Brands for the shop "filter by brand", optionally scoped to a category.
export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get("category") || undefined;
    const grouped = await prisma.product.groupBy({
      by: ["brand"],
      where: { isActive: true, brand: { not: null }, ...(category ? { category: { slug: category } } : {}) },
      _count: { _all: true },
    });
    const brands = grouped
      .map((g) => ({ name: g.brand as string, count: g._count._all }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ brands });
  } catch (err) {
    return handleError(err);
  }
}
