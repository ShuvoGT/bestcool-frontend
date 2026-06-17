import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/server/errors";
import { requirePermission } from "@/server/auth";
import { getGeoSegments } from "@/lib/analytics/queries";
import { parseRangeArgs, cacheKey } from "@/lib/analytics/range-from-request";
import { cached } from "@/lib/analytics/cache";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("orders");
    const args = parseRangeArgs(req.nextUrl);
    const data = await cached(cacheKey("geo", args), () => getGeoSegments(args));
    return NextResponse.json(data);
  } catch (err) {
    return handleError(err);
  }
}
