import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";

// Storefront-readable settings only. Payment/courier secrets are excluded;
// code snippets + analytics are inherently client-side, so they're public.
const PUBLIC_SETTING_PREFIXES = [
  "site.", "contact.", "social.", "whatsapp.", "chat.", "analytics.", "code.", "nav.", "footer.",
];

export async function GET() {
  try {
    const rows = await prisma.setting.findMany();
    const settings: Record<string, unknown> = {};
    for (const row of rows) {
      if (PUBLIC_SETTING_PREFIXES.some((p) => row.key.startsWith(p))) settings[row.key] = row.value;
    }
    return NextResponse.json({ settings });
  } catch (err) {
    return handleError(err);
  }
}
