/** Admin Pages CMS — block editor backend (spec §2.1). */
import { Router } from "express";
import { z } from "zod";
import { BlockType } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { asyncHandler, badRequest, notFound } from "../../lib/errors";
import { validate } from "../../middleware/validate";
import { sanitizeBlockContent } from "../../utils/sanitize";

export const adminPagesRouter = Router();

adminPagesRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const pages = await prisma.page.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { blocks: true } } },
    });
    res.json({
      pages: pages.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        blockCount: p._count.blocks,
        updatedAt: p.updatedAt,
      })),
    });
  })
);

adminPagesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const page = await prisma.page.findUnique({
      where: { id: req.params.id },
      include: { blocks: { orderBy: { sortOrder: "asc" } } },
    });
    if (!page) throw notFound("Page not found");
    res.json({ page });
  })
);

// SEO / meta fields
adminPagesRouter.put(
  "/:id",
  validate({
    body: z.object({
      title: z.string().min(1).max(120),
      metaTitle: z.string().max(160).nullable().optional(),
      metaDescription: z.string().max(320).nullable().optional(),
      ogImage: z.string().url().nullable().optional(),
    }),
  }),
  asyncHandler(async (req, res) => {
    const page = await prisma.page.update({
      where: { id: req.params.id },
      data: {
        title: req.body.title,
        metaTitle: req.body.metaTitle ?? null,
        metaDescription: req.body.metaDescription ?? null,
        ogImage: req.body.ogImage ?? null,
      },
    });
    res.json({ page });
  })
);

// --- Blocks -----------------------------------------------------------------
const blockBody = z.object({
  type: z.nativeEnum(BlockType),
  content: z.record(z.string(), z.unknown()).default({}),
  isEnabled: z.boolean().default(true),
});

adminPagesRouter.post(
  "/:id/blocks",
  validate({ body: blockBody }),
  asyncHandler(async (req, res) => {
    const page = await prisma.page.findUnique({ where: { id: req.params.id }, include: { blocks: true } });
    if (!page) throw notFound("Page not found");
    const block = await prisma.pageBlock.create({
      data: {
        pageId: page.id,
        type: req.body.type,
        content: sanitizeBlockContent(req.body.content),
        isEnabled: req.body.isEnabled,
        sortOrder: page.blocks.length ? Math.max(...page.blocks.map((b) => b.sortOrder)) + 1 : 0,
      },
    });
    res.status(201).json({ block });
  })
);

adminPagesRouter.put(
  "/:id/blocks/:blockId",
  validate({ body: blockBody.partial() }),
  asyncHandler(async (req, res) => {
    const existing = await prisma.pageBlock.findFirst({ where: { id: req.params.blockId, pageId: req.params.id } });
    if (!existing) throw notFound("Block not found");
    const block = await prisma.pageBlock.update({
      where: { id: existing.id },
      data: {
        ...(req.body.type ? { type: req.body.type } : {}),
        ...(req.body.content ? { content: sanitizeBlockContent(req.body.content) } : {}),
        ...(req.body.isEnabled !== undefined ? { isEnabled: req.body.isEnabled } : {}),
      },
    });
    res.json({ block });
  })
);

adminPagesRouter.delete(
  "/:id/blocks/:blockId",
  asyncHandler(async (req, res) => {
    const deleted = await prisma.pageBlock.deleteMany({ where: { id: req.params.blockId, pageId: req.params.id } });
    if (deleted.count === 0) throw notFound("Block not found");
    res.json({ ok: true });
  })
);

// Reorder: the editor sends the complete list of block ids in display order.
adminPagesRouter.put(
  "/:id/blocks-order",
  validate({ body: z.object({ blockIds: z.array(z.string()).min(1) }) }),
  asyncHandler(async (req, res) => {
    const blocks = await prisma.pageBlock.findMany({ where: { pageId: req.params.id }, select: { id: true } });
    const known = new Set(blocks.map((b) => b.id));
    const ids = req.body.blockIds as string[];
    if (ids.length !== known.size || ids.some((id) => !known.has(id))) {
      throw badRequest("blockIds must contain exactly the ids of this page's blocks");
    }
    await prisma.$transaction(ids.map((id, i) => prisma.pageBlock.update({ where: { id }, data: { sortOrder: i } })));
    res.json({ ok: true });
  })
);
