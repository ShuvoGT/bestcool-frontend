import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError, badRequest } from "@/server/errors";
import { requirePermission } from "@/server/auth";

export async function GET() {
  try {
    await requirePermission("settings");
    const rows = await prisma.setting.findMany({ orderBy: { key: "asc" } });
    const settings: Record<string, unknown> = {};
    for (const row of rows) settings[row.key] = row.value;
    return NextResponse.json({ settings });
  } catch (err) {
    return handleError(err);
  }
}

const bulkBody = z.record(z.string().min(1).max(100), z.unknown());

// Bulk upsert: { "site.name": "...", "analytics.ga4MeasurementId": "...", ... }
export async function PUT(req: NextRequest) {
  try {
    await requirePermission("settings");
    const body = bulkBody.parse(await req.json());
    const entries = Object.entries(body as Record<string, unknown>);
    if (!entries.length) throw badRequest("No settings provided");
    if (entries.length > 100) throw badRequest("Too many settings in one request");
    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          update: { value: value as any },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          create: { key, value: value as any },
        })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
