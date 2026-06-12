/** Admin global settings + delivery zone management. */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { asyncHandler, badRequest, notFound } from "../../lib/errors";
import { validate } from "../../middleware/validate";

export const adminSettingsRouter = Router();

adminSettingsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const rows = await prisma.setting.findMany({ orderBy: { key: "asc" } });
    const settings: Record<string, unknown> = {};
    for (const row of rows) settings[row.key] = row.value;
    res.json({ settings });
  })
);

// Bulk upsert: { "site.name": "...", "analytics.ga4MeasurementId": "...", ... }
adminSettingsRouter.put(
  "/",
  validate({ body: z.record(z.string().min(1).max(100), z.unknown()) }),
  asyncHandler(async (req, res) => {
    const entries = Object.entries(req.body as Record<string, unknown>);
    if (!entries.length) throw badRequest("No settings provided");
    if (entries.length > 100) throw badRequest("Too many settings in one request");
    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: value as any },
          create: { key, value: value as any },
        })
      )
    );
    res.json({ ok: true });
  })
);

// ---------------------------------------------------------------------------
// Delivery zones
// ---------------------------------------------------------------------------
export const adminDeliveryZonesRouter = Router();

const zoneBody = z.object({
  name: z.string().min(2).max(100),
  charge: z.number().min(0),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});

adminDeliveryZonesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const zones = await prisma.deliveryZone.findMany({ orderBy: { sortOrder: "asc" } });
    res.json({ zones: zones.map((zn) => ({ ...zn, charge: Number(zn.charge) })) });
  })
);

adminDeliveryZonesRouter.post(
  "/",
  validate({ body: zoneBody }),
  asyncHandler(async (req, res) => {
    const zone = await prisma.deliveryZone.create({ data: req.body });
    res.status(201).json({ zone: { ...zone, charge: Number(zone.charge) } });
  })
);

adminDeliveryZonesRouter.put(
  "/:id",
  validate({ body: zoneBody }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.deliveryZone.findUnique({ where: { id: req.params.id } });
    if (!existing) throw notFound("Delivery zone not found");
    const zone = await prisma.deliveryZone.update({ where: { id: existing.id }, data: req.body });
    res.json({ zone: { ...zone, charge: Number(zone.charge) } });
  })
);

adminDeliveryZonesRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.deliveryZone.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  })
);
