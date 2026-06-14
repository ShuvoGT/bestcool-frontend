import { NextResponse } from "next/server";
import { handleError } from "@/server/errors";
import { getCurrentFlashSale } from "@/server/pages";

export async function GET() {
  try {
    return NextResponse.json({ flashSale: await getCurrentFlashSale() });
  } catch (err) {
    return handleError(err);
  }
}
