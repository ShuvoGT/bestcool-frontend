import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { requirePermission } from "@/server/auth";

export const zoneBody = z.object({
  name: z.string().min(2).max(100),
  charge: z.number().min(0),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

export async function GET() {
  try {
    await requirePermission("deliveryZones");
    const zones = await prisma.deliveryZone.findMany({ orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ zones: zones.map((zn) => ({ ...zn, charge: Number(zn.charge) })) });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requirePermission("deliveryZones");
    const body = zoneBody.parse(await req.json());
    const zone = await prisma.deliveryZone.create({ data: body });
    return NextResponse.json({ zone: { ...zone, charge: Number(zone.charge) } }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
