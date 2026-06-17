import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { refreshCourierStatus } from "@/server/couriers";

type Ctx = { params: Promise<{ id: string }> };

// Pull the latest parcel status from the courier API.
export async function POST(_req: NextRequest, { params }: Ctx) {
  try {
    await requirePermission("orders");
    const { id } = await params;
    return NextResponse.json(await refreshCourierStatus(id));
  } catch (err) {
    return handleError(err);
  }
}
