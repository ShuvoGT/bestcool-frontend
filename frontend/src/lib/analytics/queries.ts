/**
 * Sales-analytics data layer. Every heavy aggregation happens in SQL (Prisma
 * aggregate/groupBy or `$queryRaw`); JS only does light final roll-ups (e.g.
 * district→division). Each public function takes { from, to, compareFrom?,
 * compareTo? } and returns a typed, client-safe result (no raw rows).
 *
 * Revenue convention (matches the dashboard): an order counts as realised sales
 * when status != CANCELLED AND paymentStatus IN (PAID, COD_PENDING).
 *
 * Note: there is no order-level coupon/discount field, so "discount" is derived
 * as product markdown — SUM(max(regularPrice − unitPrice, 0) × qty) — i.e. money
 * given away via sale/flash pricing. Timezone: buckets group by the DB date.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bucketUnit } from "@/lib/analytics/dateRange";
import { districtToDivision, type Division } from "@/lib/analytics/divisions";

export type RangeArgs = { from: Date; to: Date; compareFrom?: Date; compareTo?: Date };

const n = (v: unknown): number => (v == null ? 0 : Number(v));

// Reusable "realised sales" order filter.
const paidWhere = (from: Date, to: Date): Prisma.OrderWhereInput => ({
  createdAt: { gte: from, lte: to },
  status: { not: "CANCELLED" },
  paymentStatus: { in: ["PAID", "COD_PENDING"] },
});

// ───────────────────────────── Revenue & Orders ─────────────────────────────

export type RevenueKpis = {
  grossSales: number;
  netSales: number;
  totalOrders: number;
  avgOrderValue: number;
  unitsSold: number;
  refundAmount: number;
  refundedOrders: number;
  refundRate: number; // 0..1
  totalDiscount: number;
  discountedOrderShare: number; // 0..1
};
export type TrendPoint = { key: string; label: string; revenue: number; orders: number };
export type TopProduct = { productId: string | null; name: string; revenue: number; units: number };
export type RevenueResult = {
  kpis: RevenueKpis;
  previous: RevenueKpis | null;
  bucket: "day" | "week" | "month";
  trend: TrendPoint[];
  topByRevenue: TopProduct[];
  topByUnits: TopProduct[];
};

async function revenueKpis(from: Date, to: Date): Promise<RevenueKpis> {
  const base = paidWhere(from, to);
  const refundWhere: Prisma.OrderWhereInput = { createdAt: { gte: from, lte: to }, paymentStatus: "REFUNDED" };

  const [grossAgg, totalOrders, unitsAgg, refundAgg, refundedOrders, discountRows] = await Promise.all([
    prisma.order.aggregate({ _sum: { total: true }, where: base }),
    prisma.order.count({ where: base }),
    prisma.orderItem.aggregate({ _sum: { quantity: true }, where: { order: base } }),
    prisma.order.aggregate({ _sum: { total: true }, where: refundWhere }),
    prisma.order.count({ where: refundWhere }),
    prisma.$queryRaw<{ discount: unknown; discountedOrders: unknown }[]>(Prisma.sql`
      SELECT COALESCE(SUM(GREATEST(p.regularPrice - oi.unitPrice, 0) * oi.quantity), 0) AS discount,
             COUNT(DISTINCT CASE WHEN p.regularPrice > oi.unitPrice THEN o.id END) AS discountedOrders
      FROM \`OrderItem\` oi
      JOIN \`Order\` o ON o.id = oi.orderId
      JOIN \`Product\` p ON p.id = oi.productId
      WHERE o.createdAt >= ${from} AND o.createdAt <= ${to}
        AND o.status <> 'CANCELLED' AND o.paymentStatus IN ('PAID', 'COD_PENDING')
    `),
  ]);

  const grossSales = n(grossAgg._sum.total);
  const unitsSold = n(unitsAgg._sum.quantity);
  const refundAmount = n(refundAgg._sum.total);
  const totalDiscount = n(discountRows[0]?.discount);
  const discountedOrders = n(discountRows[0]?.discountedOrders);

  return {
    grossSales,
    netSales: grossSales - refundAmount - totalDiscount,
    totalOrders,
    avgOrderValue: totalOrders ? grossSales / totalOrders : 0,
    unitsSold,
    refundAmount,
    refundedOrders,
    refundRate: totalOrders + refundedOrders ? refundedOrders / (totalOrders + refundedOrders) : 0,
    totalDiscount,
    discountedOrderShare: totalOrders ? discountedOrders / totalOrders : 0,
  };
}

function bucketExpr(unit: "day" | "week" | "month"): Prisma.Sql {
  if (unit === "day") return Prisma.sql`DATE_FORMAT(o.createdAt, '%Y-%m-%d')`;
  if (unit === "week") return Prisma.sql`DATE_FORMAT(DATE_SUB(o.createdAt, INTERVAL WEEKDAY(o.createdAt) DAY), '%Y-%m-%d')`;
  return Prisma.sql`DATE_FORMAT(o.createdAt, '%Y-%m-01')`;
}

async function trendQuery(from: Date, to: Date, unit: "day" | "week" | "month") {
  const rows = await prisma.$queryRaw<{ k: string; revenue: unknown; orders: unknown }[]>(Prisma.sql`
    SELECT ${bucketExpr(unit)} AS k, COALESCE(SUM(o.total), 0) AS revenue, COUNT(*) AS orders
    FROM \`Order\` o
    WHERE o.createdAt >= ${from} AND o.createdAt <= ${to}
      AND o.status <> 'CANCELLED' AND o.paymentStatus IN ('PAID', 'COD_PENDING')
    GROUP BY k ORDER BY k
  `);
  const map = new Map(rows.map((r) => [String(r.k).slice(0, 10), { revenue: n(r.revenue), orders: n(r.orders) }]));
  return fillTrend(map, from, to, unit);
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function fillTrend(map: Map<string, { revenue: number; orders: number }>, from: Date, to: Date, unit: "day" | "week" | "month"): TrendPoint[] {
  const out: TrendPoint[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  if (unit === "week") cursor.setDate(cursor.getDate() - ((cursor.getDay() + 6) % 7)); // back to Monday
  if (unit === "month") cursor.setDate(1);

  let guard = 0;
  while (cursor <= to && guard++ < 400) {
    const key = ymd(cursor);
    const hit = map.get(key) ?? { revenue: 0, orders: 0 };
    const label =
      unit === "month"
        ? cursor.toLocaleDateString("en-GB", { month: "short", year: "numeric" })
        : cursor.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    out.push({ key, label, revenue: hit.revenue, orders: hit.orders });
    if (unit === "day") cursor.setDate(cursor.getDate() + 1);
    else if (unit === "week") cursor.setDate(cursor.getDate() + 7);
    else cursor.setMonth(cursor.getMonth() + 1);
  }
  return out;
}

async function topProducts(from: Date, to: Date, by: "revenue" | "units"): Promise<TopProduct[]> {
  const order = by === "revenue" ? Prisma.sql`revenue DESC` : Prisma.sql`units DESC`;
  const rows = await prisma.$queryRaw<{ productId: string | null; name: string; revenue: unknown; units: unknown }[]>(Prisma.sql`
    SELECT oi.productId AS productId, MAX(oi.name) AS name,
           COALESCE(SUM(oi.unitPrice * oi.quantity), 0) AS revenue,
           COALESCE(SUM(oi.quantity), 0) AS units
    FROM \`OrderItem\` oi
    JOIN \`Order\` o ON o.id = oi.orderId
    WHERE o.createdAt >= ${from} AND o.createdAt <= ${to}
      AND o.status <> 'CANCELLED' AND o.paymentStatus IN ('PAID', 'COD_PENDING')
    GROUP BY oi.productId
    ORDER BY ${order}
    LIMIT 10
  `);
  return rows.map((r) => ({ productId: r.productId, name: r.name ?? "(deleted product)", revenue: n(r.revenue), units: n(r.units) }));
}

export async function getRevenueAnalytics({ from, to, compareFrom, compareTo }: RangeArgs): Promise<RevenueResult> {
  const unit = bucketUnit(from, to);
  const [kpis, previous, trend, topByRevenue, topByUnits] = await Promise.all([
    revenueKpis(from, to),
    compareFrom && compareTo ? revenueKpis(compareFrom, compareTo) : Promise.resolve(null),
    trendQuery(from, to, unit),
    topProducts(from, to, "revenue"),
    topProducts(from, to, "units"),
  ]);
  return { kpis, previous, bucket: unit, trend, topByRevenue, topByUnits };
}

// ───────────────────────────── Conversion Funnel ─────────────────────────────

export type FunnelStep = { key: string; label: string; count: number; tracked: boolean };
export type FunnelKpis = {
  sessions: number;
  productViews: number;
  addToCart: number;
  checkout: number;
  orders: number;
  overallConversion: number; // orders / sessions
  cartAbandonment: number | null;
  checkoutAbandonment: number | null;
};
export type FunnelResult = {
  steps: FunnelStep[];
  kpis: FunnelKpis;
  previous: FunnelKpis | null;
  eventsTracked: boolean;
  firstEventAt: string | null;
};

async function funnelKpis(from: Date, to: Date): Promise<FunnelKpis> {
  const [rows, orders] = await Promise.all([
    prisma.$queryRaw<{ sessions: unknown; productViews: unknown; addToCart: unknown; checkout: unknown }[]>(Prisma.sql`
      SELECT COUNT(DISTINCT sessionId) AS sessions,
             COUNT(DISTINCT CASE WHEN type = 'PRODUCT_VIEW' THEN sessionId END) AS productViews,
             COUNT(DISTINCT CASE WHEN type = 'ADD_TO_CART' THEN sessionId END) AS addToCart,
             COUNT(DISTINCT CASE WHEN type = 'CHECKOUT_STARTED' THEN sessionId END) AS checkout
      FROM \`AnalyticsEvent\`
      WHERE createdAt >= ${from} AND createdAt <= ${to}
    `),
    prisma.order.count({ where: paidWhere(from, to) }),
  ]);
  const r = rows[0] ?? {};
  const sessions = n(r.sessions);
  const addToCart = n(r.addToCart);
  const checkout = n(r.checkout);
  // Clamp to [0,1]: orders come from the Order table while funnel events only
  // exist since tracking started, so ratios can be nonsensical (e.g. negative
  // abandonment) during the bootstrap window. Clamping keeps the display sane.
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  return {
    sessions,
    productViews: n(r.productViews),
    addToCart,
    checkout,
    orders,
    overallConversion: sessions ? clamp(orders / sessions) : 0,
    cartAbandonment: addToCart ? clamp(1 - orders / addToCart) : null,
    checkoutAbandonment: checkout ? clamp(1 - orders / checkout) : null,
  };
}

export async function getFunnelAnalytics({ from, to, compareFrom, compareTo }: RangeArgs): Promise<FunnelResult> {
  const [kpis, previous, first] = await Promise.all([
    funnelKpis(from, to),
    compareFrom && compareTo ? funnelKpis(compareFrom, compareTo) : Promise.resolve(null),
    prisma.analyticsEvent.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ]);
  const hasEvents = kpis.sessions > 0 || kpis.productViews > 0 || kpis.addToCart > 0 || kpis.checkout > 0;
  const steps: FunnelStep[] = [
    { key: "sessions", label: "Sessions", count: kpis.sessions, tracked: hasEvents },
    { key: "productViews", label: "Product views", count: kpis.productViews, tracked: hasEvents },
    { key: "addToCart", label: "Add to cart", count: kpis.addToCart, tracked: hasEvents },
    { key: "checkout", label: "Checkout started", count: kpis.checkout, tracked: hasEvents },
    { key: "orders", label: "Order placed", count: kpis.orders, tracked: true },
  ];
  return { steps, kpis, previous, eventsTracked: !!first, firstEventAt: first ? first.createdAt.toISOString() : null };
}

// ──────────────────────────── Geographic & Segments ────────────────────────────

export type GeoRow = { key: string; revenue: number; orders: number; aov: number };
export type SegmentRow = { key: string; label: string; revenue: number; orders: number; aov: number };
export type PaymentRow = { method: string; group: "COD" | "Prepaid"; revenue: number; orders: number; returnRate: number };
export type GeoSegmentsResult = {
  byDivision: GeoRow[];
  byCity: GeoRow[];
  newVsReturning: SegmentRow[];
  byPaymentMethod: PaymentRow[];
  previous: { newVsReturning: SegmentRow[]; byPaymentMethod: PaymentRow[] } | null;
};

async function geoByDistrict(from: Date, to: Date): Promise<{ byDivision: GeoRow[]; byCity: GeoRow[] }> {
  const rows = await prisma.$queryRaw<{ district: string; revenue: unknown; orders: unknown }[]>(Prisma.sql`
    SELECT o.shippingDistrict AS district, COALESCE(SUM(o.total), 0) AS revenue, COUNT(*) AS orders
    FROM \`Order\` o
    WHERE o.createdAt >= ${from} AND o.createdAt <= ${to}
      AND o.status <> 'CANCELLED' AND o.paymentStatus IN ('PAID', 'COD_PENDING')
    GROUP BY o.shippingDistrict
  `);

  const byCity: GeoRow[] = rows
    .map((r) => ({ key: r.district || "Unknown", revenue: n(r.revenue), orders: n(r.orders), aov: n(r.orders) ? n(r.revenue) / n(r.orders) : 0 }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Roll up districts into the 8 divisions (light JS over ≤64 rows).
  const div = new Map<Division, { revenue: number; orders: number }>();
  for (const r of rows) {
    const d = districtToDivision(r.district);
    const cur = div.get(d) ?? { revenue: 0, orders: 0 };
    cur.revenue += n(r.revenue);
    cur.orders += n(r.orders);
    div.set(d, cur);
  }
  const byDivision: GeoRow[] = [...div.entries()]
    .map(([key, v]) => ({ key, revenue: v.revenue, orders: v.orders, aov: v.orders ? v.revenue / v.orders : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  return { byDivision, byCity };
}

async function newVsReturning(from: Date, to: Date): Promise<SegmentRow[]> {
  const rows = await prisma.$queryRaw<{ segment: string; revenue: unknown; orders: unknown }[]>(Prisma.sql`
    SELECT CASE WHEN o.createdAt > u.firstOrder THEN 'returning' ELSE 'new' END AS segment,
           COALESCE(SUM(o.total), 0) AS revenue, COUNT(*) AS orders
    FROM \`Order\` o
    JOIN (SELECT userId, MIN(createdAt) AS firstOrder FROM \`Order\` WHERE status <> 'CANCELLED' GROUP BY userId) u
      ON u.userId = o.userId
    WHERE o.createdAt >= ${from} AND o.createdAt <= ${to}
      AND o.status <> 'CANCELLED' AND o.paymentStatus IN ('PAID', 'COD_PENDING')
    GROUP BY segment
  `);
  const get = (seg: string) => rows.find((r) => r.segment === seg);
  return (["new", "returning"] as const).map((seg) => {
    const r = get(seg);
    const revenue = n(r?.revenue);
    const orders = n(r?.orders);
    return { key: seg, label: seg === "new" ? "New customers" : "Returning customers", revenue, orders, aov: orders ? revenue / orders : 0 };
  });
}

async function byPaymentMethod(from: Date, to: Date): Promise<PaymentRow[]> {
  const rows = await prisma.$queryRaw<{ method: string; revenue: unknown; paidOrders: unknown; refunded: unknown; totalOrders: unknown }[]>(Prisma.sql`
    SELECT o.paymentMethod AS method,
           COALESCE(SUM(CASE WHEN o.paymentStatus IN ('PAID','COD_PENDING') THEN o.total ELSE 0 END), 0) AS revenue,
           SUM(CASE WHEN o.paymentStatus IN ('PAID','COD_PENDING') THEN 1 ELSE 0 END) AS paidOrders,
           SUM(CASE WHEN o.paymentStatus = 'REFUNDED' THEN 1 ELSE 0 END) AS refunded,
           COUNT(*) AS totalOrders
    FROM \`Order\` o
    WHERE o.createdAt >= ${from} AND o.createdAt <= ${to} AND o.status <> 'CANCELLED'
    GROUP BY o.paymentMethod
  `);
  return rows
    .map((r) => ({
      method: r.method,
      group: (r.method === "COD" ? "COD" : "Prepaid") as "COD" | "Prepaid",
      revenue: n(r.revenue),
      orders: n(r.paidOrders),
      returnRate: n(r.totalOrders) ? n(r.refunded) / n(r.totalOrders) : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export async function getGeoSegments({ from, to, compareFrom, compareTo }: RangeArgs): Promise<GeoSegmentsResult> {
  const [geo, seg, pay, prev] = await Promise.all([
    geoByDistrict(from, to),
    newVsReturning(from, to),
    byPaymentMethod(from, to),
    compareFrom && compareTo
      ? Promise.all([newVsReturning(compareFrom, compareTo), byPaymentMethod(compareFrom, compareTo)]).then(([nvr, pm]) => ({ newVsReturning: nvr, byPaymentMethod: pm }))
      : Promise.resolve(null),
  ]);
  return { byDivision: geo.byDivision, byCity: geo.byCity, newVsReturning: seg, byPaymentMethod: pay, previous: prev };
}
