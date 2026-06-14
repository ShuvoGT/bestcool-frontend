import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/server/errors";
import { requireAuth } from "@/server/auth";
import { cartItemBody, serializeCart, upsertCartItem } from "@/server/cart";

export async function GET() {
  try {
    const user = await requireAuth();
    return NextResponse.json(await serializeCart(user.id));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = cartItemBody.parse(await req.json());
    await upsertCartItem(user.id, body, "add");
    return NextResponse.json(await serializeCart(user.id), { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
