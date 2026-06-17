import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { rateLimit } from "@/server/rateLimit";

// Public, unauthenticated funnel-event ingestion from the storefront. No PII —
// just an anonymous session id, event type, path and (optionally) a product id.
const bodySchema = z.object({
  type: z.enum(["PAGE_VIEW", "PRODUCT_VIEW", "ADD_TO_CART", "CHECKOUT_STARTED"]),
  sessionId: z.string().min(6).max(64),
  path: z.string().max(512).optional(),
  productId: z.string().max(64).optional(),
});

function deviceFromUa(ua: string): "mobile" | "tablet" | "desktop" {
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk|kindle|(android(?!.*mobi))/.test(s)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobi|windows phone|blackberry/.test(s)) return "mobile";
  return "desktop";
}

export async function POST(req: NextRequest) {
  try {
    rateLimit(req, "events", 300, 60_000); // generous: ~5/sec per IP
    const body = bodySchema.parse(await req.json().catch(() => null));
    await prisma.analyticsEvent.create({
      data: {
        type: body.type,
        sessionId: body.sessionId,
        path: body.path ?? null,
        productId: body.productId ?? null,
        device: deviceFromUa(req.headers.get("user-agent") ?? ""),
      },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
