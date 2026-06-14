import { NextResponse } from "next/server";
import { publicUser, requireAuth } from "@/server/auth";
import { handleError } from "@/server/errors";

export async function GET() {
  try {
    const user = await requireAuth();
    return NextResponse.json({ user: publicUser(user) });
  } catch (err) {
    return handleError(err);
  }
}
