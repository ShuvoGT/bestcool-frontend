import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, notFound } from "@/server/errors";
import { requireAuth } from "@/server/auth";
import { addressBody } from "../route";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = addressBody.parse(await req.json());
    const existing = await prisma.address.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw notFound("Address not found");
    if (body.isDefault) {
      await prisma.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    }
    const address = await prisma.address.update({ where: { id: existing.id }, data: body });
    return NextResponse.json({ address });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const existing = await prisma.address.findFirst({ where: { id, userId: user.id } });
    if (!existing) throw notFound("Address not found");
    await prisma.address.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
