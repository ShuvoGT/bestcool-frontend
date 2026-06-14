import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";

export async function GET() {
  try {
    const zones = await prisma.deliveryZone.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } });
    return NextResponse.json({ zones: zones.map((z) => ({ id: z.id, name: z.name, charge: Number(z.charge) })) });
  } catch (err) {
    return handleError(err);
  }
}
