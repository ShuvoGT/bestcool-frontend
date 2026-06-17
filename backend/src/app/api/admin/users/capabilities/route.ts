import { NextResponse } from "next/server";
import { handleError } from "@/server/errors";
import { requireAdmin } from "@/server/auth";
import { PERMISSIONS, PERMISSION_LABELS, ROLE_PRESETS } from "@/server/permissions";

// --- Capabilities & presets (for the form) --------------------------------
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({
      permissions: PERMISSIONS.map((key) => ({ key, label: PERMISSION_LABELS[key] })),
      presets: ROLE_PRESETS,
    });
  } catch (err) {
    return handleError(err);
  }
}
