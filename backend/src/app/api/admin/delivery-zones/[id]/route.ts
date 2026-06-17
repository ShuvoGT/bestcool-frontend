import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError, notFound } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { zoneBody } from "../route";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("deliveryZones");
    const { id } = await params;
    const body = zoneBody.parse(await req.json());
    const existing = await prisma.deliveryZone.findUnique({ where: { id } });
    if (!existing) throw notFound("Delivery zone not found");
    const zone = await prisma.deliveryZone.update({ where: { id: existing.id }, data: body });
    return NextResponse.json({ zone: { ...zone, charge: Number(zone.charge) } });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("deliveryZones");
    const { id } = await params;
    await prisma.deliveryZone.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
