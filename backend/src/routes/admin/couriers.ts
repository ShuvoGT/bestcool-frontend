/** Admin: list couriers available for the "Send to Courier" selector. */
import { Router } from "express";
import { asyncHandler } from "../../lib/errors";
import { listCouriers } from "../../couriers";
import { loadCourierConfig } from "../../couriers/config";

export const adminCouriersRouter = Router();

const LABELS: Record<string, string> = {
  STEADFAST: "Steadfast",
  PATHAO: "Pathao",
  REDX: "RedX",
};

// Only configured couriers are returned, so the admin order page hides any
// courier that hasn't been set up in Settings → Couriers.
adminCouriersRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const cfg = await loadCourierConfig();
    const couriers = listCouriers(cfg)
      .filter((c) => c.configured)
      .map((c) => ({ name: c.name, label: LABELS[c.name] ?? c.name }));
    res.json({ couriers });
  })
);
