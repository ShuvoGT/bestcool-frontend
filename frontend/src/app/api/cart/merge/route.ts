import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleError } from "@/server/errors";
import { requireAuth } from "@/server/auth";
import { cartItemBody, serializeCart, upsertCartItem } from "@/server/cart";

const schema = z.object({ items: z.array(cartItemBody).max(100) });

// Merges the guest localStorage cart into the DB cart after login.
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const { items } = schema.parse(await req.json());
    for (const item of items) {
      await upsertCartItem(user.id, item, "merge").catch(() => undefined); // skip dead products silently
    }
    return NextResponse.json(await serializeCart(user.id));
  } catch (err) {
    return handleError(err);
  }
}
