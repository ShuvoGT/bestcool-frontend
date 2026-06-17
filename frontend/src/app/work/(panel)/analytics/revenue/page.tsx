"use client";

import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { bdt } from "@/lib/format";
import type { RevenueResult } from "@/lib/analytics/queries";
import { PageHeader, GlassCard, EmptyState } from "@/components/admin/ui";
import { AnalyticsControls, AnalyticsTabs, useAnalyticsRange } from "@/components/admin/analytics/controls";
import { KpiCard, Sk } from "@/components/admin/analytics/kpi";
import { AreaLineChart, BarChart } from "@/components/admin/analytics/charts";

const num = (n: number) => n.toLocaleString("en-IN");
const pct = (f: number) => `${(f * 100).toFixed(1)}%`;

export default function RevenueAnalyticsPage() {
  const ctrl = useAnalyticsRange();
  const { data, loading } = useLoad(() => api<RevenueResult>(`/admin/analytics/revenue?${ctrl.query}`), [ctrl.query]);

  const k = data?.kpis;
  const p = ctrl.compare ? data?.previous ?? undefined : undefined;
  const prev = <T,>(sel: (x: NonNullable<typeof p>) => T) => (p ? sel(p) : undefined);

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Revenue & orders performance" />
      <AnalyticsTabs />
      <AnalyticsControls ctrl={ctrl} />

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard loading={loading} label="Gross Sales" value={bdt(k?.grossSales ?? 0)} current={k?.grossSales} previous={prev((x) => x.grossSales)} />
        <KpiCard loading={loading} label="Net Sales" value={bdt(k?.netSales ?? 0)} current={k?.netSales} previous={prev((x) => x.netSales)} sub="gross − refunds − discount" />
        <KpiCard loading={loading} label="Total Orders" value={num(k?.totalOrders ?? 0)} current={k?.totalOrders} previous={prev((x) => x.totalOrders)} />
        <KpiCard loading={loading} label="Avg Order Value" value={bdt(Math.round(k?.avgOrderValue ?? 0))} current={k?.avgOrderValue} previous={prev((x) => x.avgOrderValue)} />
        <KpiCard loading={loading} label="Units Sold" value={num(k?.unitsSold ?? 0)} current={k?.unitsSold} previous={prev((x) => x.unitsSold)} />
        <KpiCard loading={loading} label="Refund Rate" value={pct(k?.refundRate ?? 0)} current={k?.refundRate} previous={prev((x) => x.refundRate)} invert sub={`${bdt(k?.refundAmount ?? 0)} refunded`} />
        <KpiCard loading={loading} label="Total Discount" value={bdt(k?.totalDiscount ?? 0)} current={k?.totalDiscount} previous={prev((x) => x.totalDiscount)} sub={`${pct(k?.discountedOrderShare ?? 0)} of orders`} />
        <KpiCard loading={loading} label="Refunded Orders" value={num(k?.refundedOrders ?? 0)} current={k?.refundedOrders} previous={prev((x) => x.refundedOrders)} invert />
      </div>

      {/* Trends */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">Revenue trend</h2>
            <span className="text-xs text-zinc-500 capitalize">{data?.bucket ?? ""} buckets</span>
          </div>
          {loading ? <Sk className="h-48 w-full" /> : data && data.trend.some((t) => t.revenue > 0) ? (
            <AreaLineChart points={data.trend.map((t) => ({ label: t.label, value: t.revenue }))} format={bdt} />
          ) : (
            <EmptyState message="No revenue in this period." />
          )}
        </GlassCard>
        <GlassCard className="p-5">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-200">Orders trend</h2>
            <span className="text-xs text-zinc-500 capitalize">{data?.bucket ?? ""} buckets</span>
          </div>
          {loading ? <Sk className="h-48 w-full" /> : data && data.trend.some((t) => t.orders > 0) ? (
            <BarChart points={data.trend.map((t) => ({ label: t.label, value: t.orders }))} format={num} />
          ) : (
            <EmptyState message="No orders in this period." />
          )}
        </GlassCard>
      </div>

      {/* Top products */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <TopTable title="Top 10 products by revenue" rows={data?.topByRevenue} loading={loading} valueLabel="Revenue" render={(r) => bdt(r.revenue)} />
        <TopTable title="Top 10 products by units sold" rows={data?.topByUnits} loading={loading} valueLabel="Units" render={(r) => num(r.units)} />
      </div>
    </div>
  );
}

function TopTable({
  title,
  rows,
  loading,
  valueLabel,
  render,
}: {
  title: string;
  rows?: RevenueResult["topByRevenue"];
  loading: boolean;
  valueLabel: string;
  render: (r: RevenueResult["topByRevenue"][number]) => string;
}) {
  return (
    <GlassCard className="p-5">
      <h2 className="mb-3 text-sm font-semibold text-zinc-200">{title}</h2>
      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-7 w-full" />)}</div>
      ) : !rows || rows.length === 0 ? (
        <EmptyState message="No sales in this period." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8 text-left text-xs uppercase tracking-wider text-zinc-500">
              <th className="pb-2 font-medium">#</th>
              <th className="pb-2 font-medium">Product</th>
              <th className="pb-2 text-right font-medium">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={(r.productId ?? "") + i} className="border-b border-white/5 last:border-0">
                <td className="py-2 text-zinc-500">{i + 1}</td>
                <td className="py-2 pr-2 text-zinc-200">{r.name}</td>
                <td className="py-2 text-right tabular-nums text-zinc-100">{render(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </GlassCard>
  );
}
