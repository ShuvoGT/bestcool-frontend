import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleError } from "@/server/errors";
import { requireAuth } from "@/server/auth";

const schema = z.object({ productIds: z.array(z.string()).max(200) });

// Merges the guest localStorage wishlist after login.
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { productIds } = schema.parse(await req.json());
    const valid = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: { id: true },
    });
    for (const { id } of valid) {
      await prisma.wishlistItem.upsert({
        where: { userId_productId: { userId: user.id, productId: id } },
        update: {},
        create: { userId: user.id, productId: id },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
