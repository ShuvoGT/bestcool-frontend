import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { requirePermission } from "@/server/auth";

export function computedStatus(sale: { startsAt: Date; endsAt: Date; isActive: boolean }): "Scheduled" | "Running" | "Ended" | "Inactive" {
  const now = new Date();
  if (!sale.isActive) return "Inactive";
  if (now < sale.startsAt) return "Scheduled";
  if (now > sale.endsAt) return "Ended";
  return "Running";
}

export const campaignBody = z
  .object({
    title: z.string().min(2).max(120),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    isActive: z.boolean().default(true),
  })
  .refine((b) => b.endsAt > b.startsAt, { message: "endsAt must be after startsAt" });

export async function GET() {
  try {
    await requirePermission("flashSales");
    const sales = await prisma.flashSale.findMany({
      orderBy: { startsAt: "desc" },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({
      flashSales: sales.map((s) => ({
        id: s.id,
        title: s.title,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        isActive: s.isActive,
        productCount: s._count.products,
        status: computedStatus(s),
      })),
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission("flashSales");
    const body = campaignBody.parse(await req.json());
    const sale = await prisma.flashSale.create({ data: body });
    return NextResponse.json({ flashSale: { ...sale, status: computedStatus(sale) } }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
