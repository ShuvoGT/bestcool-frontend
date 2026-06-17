import { NextResponse } from "next/server";
import { handleError } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { listCouriers, loadCourierConfig } from "@/server/couriers";

const LABELS: Record<string, string> = {
  STEADFAST: "Steadfast",
  PATHAO: "Pathao",
  REDX: "RedX",
};

// Only configured couriers are returned, so the admin order page hides any
// courier that hasn't been set up in Settings → Couriers.
export async function GET() {
  try {
    await requirePermission("couriers");
    const cfg = await loadCourierConfig();
    const couriers = listCouriers(cfg)
      .filter((c) => c.configured)
      .map((c) => ({ name: c.name, label: LABELS[c.name] ?? c.name }));
    return NextResponse.json({ couriers });
  } catch (err) {
    return handleError(err);
  }
}
