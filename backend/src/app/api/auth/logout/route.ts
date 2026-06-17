import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/server/auth";
import { handleError } from "@/server/errors";

export async function POST() {
  try {
    await clearAuthCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
