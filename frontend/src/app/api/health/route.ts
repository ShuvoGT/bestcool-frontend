import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Consolidated-app health check: confirms the route handler + Prisma/MySQL work.
export async function GET() {
  try {
    const [products, users] = await Promise.all([prisma.product.count(), prisma.user.count()]);
    return NextResponse.json({ status: "ok", database: "connected", products, users });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}
