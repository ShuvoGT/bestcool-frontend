import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { badRequest, handleError, notFound } from "@/server/errors";
import { requireAuth } from "@/server/auth";
import { sanitizePlainText } from "@/server/sanitize";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  try {
    const { slug } = await params;
    const product = await prisma.product.findUnique({ where: { slug } });
    if (!product) throw notFound("Product not found");
    const reviews = await prisma.review.findMany({
      where: { productId: product.id, isApproved: true },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    });
    return NextResponse.json({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        author: r.user.name,
        createdAt: r.createdAt,
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().max(2000).default("") });

export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireAuth();
    const { slug } = await params;
    const body = reviewSchema.parse(await req.json());
    const product = await prisma.product.findFirst({ where: { slug, isActive: true } });
    if (!product) throw notFound("Product not found");
    if (user.role === "ADMIN") throw badRequest("Admins cannot review products");
    // One review per customer per product — repeat submissions update it.
    const review = await prisma.review.upsert({
      where: { productId_userId: { productId: product.id, userId: user.id } },
      update: { rating: body.rating, comment: sanitizePlainText(body.comment) },
      create: {
        productId: product.id,
        userId: user.id,
        rating: body.rating,
        comment: sanitizePlainText(body.comment),
      },
    });
    return NextResponse.json({ review: { id: review.id, rating: review.rating, comment: review.comment } }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
