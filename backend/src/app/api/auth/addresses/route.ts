import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { requireAuth } from "@/server/auth";

export const addressBody = z.object({
  label: z.string().max(50).optional(),
  fullName: z.string().min(2).max(100),
  phone: z.string().min(11).max(15),
  address: z.string().min(5).max(500),
  district: z.string().min(2).max(100),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await requireAuth();
    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ addresses });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = addressBody.parse(await req.json());
    if (body.isDefault) {
      await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    }
    const address = await prisma.address.create({ data: { ...body, userId: user.id } });
    return NextResponse.json({ address }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
