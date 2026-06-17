"use client";

import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { bdt } from "@/lib/format";
import type { GeoSegmentsResult } from "@/lib/analytics/queries";
import { PageHeader, GlassCard, EmptyState } from "@/components/admin/ui";
import { AnalyticsControls, AnalyticsTabs, useAnalyticsRange } from "@/components/admin/analytics/controls";
import { KpiCard, Sk } from "@/components/admin/analytics/kpi";
import { HBarChart } from "@/components/admin/analytics/charts";

const num = (n: number) => n.toLocaleString("en-IN");
const pct = (f: number) => `${(f * 100).toFixed(1)}%`;

export default function GeoAnalyticsPage() {
  const ctrl = useAnalyticsRange();
  const { data, loading } = useLoad(() => api<GeoSegmentsResult>(`/admin/analytics/geo?${ctrl.query}`), [ctrl.query]);

  const prevSeg = (key: string) => (ctrl.compare ? data?.previous?.newVsReturning.find((s) => s.key === key)?.revenue : undefined);
  const seg = (key: string) => data?.newVsReturning.find((s) => s.key === key);

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Geographic & customer segments" />
      <AnalyticsTabs />
      <AnalyticsControls ctrl={ctrl} />

      {/* New vs Returning */}
      <div className="grid gap-4 sm:grid-cols-2">
        {(["new", "returning"] as const).map((key) => {
          const s = seg(key);
          return (
            <KpiCard
              key={key}
              loading={loading}
              label={key === "new" ? "New customers" : "Returning customers"}
              value={bdt(s?.revenue ?? 0)}
              current={s?.revenue}
              previous={prevSeg(key)}
              sub={s ? `${num(s.orders)} orders · AOV ${bdt(Math.round(s.aov))}` : undefined}
            />
          );
        })}
      </div>

      {/* Geographic */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <h2 className="mb-4 text-sm font-semibold text-zinc-200">Revenue by division</h2>
          {loading ? (
            <div className="space-y-2.5">{Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-6 w-full" />)}</div>
          ) : data && data.byDivision.length ? (
            <HBarChart rows={data.byDivision.map((d) => ({ label: d.key, value: d.revenue, sub: `${num(d.orders)} ord` }))} format={bdt} />
          ) : (
            <EmptyState message="No orders in this period." />
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-200">Top districts</h2>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Sk key={i} className="h-7 w-full" />)}</div>
          ) : data && data.byCity.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8 text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="pb-2 font-medium">District</th>
                  <th className="pb-2 text-right font-medium">Revenue</th>
                  <th className="pb-2 text-right font-medium">Orders</th>
                  <th className="pb-2 text-right font-medium">AOV</th>
                </tr>
              </thead>
              <tbody>
                {data.byCity.map((c) => (
                  <tr key={c.key} className="border-b border-white/5 last:border-0">
                    <td className="py-2 text-zinc-200">{c.key}</td>
                    <td className="py-2 text-right tabular-nums text-zinc-100">{bdt(c.revenue)}</td>
                    <td className="py-2 text-right tabular-nums text-zinc-400">{num(c.orders)}</td>
                    <td className="py-2 text-right tabular-nums text-zinc-400">{bdt(Math.round(c.aov))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState message="No orders in this period." />
          )}
        </GlassCard>
      </div>

      {/* Payment methods */}
      <GlassCard className="mt-6 p-5">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Payment methods</h2>
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-7 w-full" />)}</div>
        ) : data && data.byPaymentMethod.length ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-left text-xs uppercase tracking-wider text-zinc-500">
                <th className="pb-2 font-medium">Method</th>
                <th className="pb-2 font-medium">Type</th>
                <th className="pb-2 text-right font-medium">Orders</th>
                <th className="pb-2 text-right font-medium">Revenue</th>
                <th className="pb-2 text-right font-medium">Return rate</th>
              </tr>
            </thead>
            <tbody>
              {data.byPaymentMethod.map((m) => (
                <tr key={m.method} className="border-b border-white/5 last:border-0">
                  <td className="py-2 text-zinc-200">{m.method}</td>
                  <td className="py-2">
                    <span className={m.group === "COD" ? "rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300" : "rounded-full bg-sky-500/15 px-2 py-0.5 text-xs text-sky-300"}>{m.group}</span>
                  </td>
                  <td className="py-2 text-right tabular-nums text-zinc-400">{num(m.orders)}</td>
                  <td className="py-2 text-right tabular-nums text-zinc-100">{bdt(m.revenue)}</td>
                  <td className="py-2 text-right tabular-nums text-zinc-400">{pct(m.returnRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState message="No orders in this period." />
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Device breakdown (mobile/desktop/tablet) isn&apos;t shown here — device isn&apos;t captured on orders. It is captured on
          storefront visits and could be added to the funnel later.
        </p>
      </GlassCard>
    </div>
  );
}
