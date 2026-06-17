"use client";

import { Info } from "lucide-react";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { formatDate } from "@/lib/format";
import type { FunnelResult } from "@/lib/analytics/queries";
import { PageHeader, GlassCard } from "@/components/admin/ui";
import { AnalyticsControls, AnalyticsTabs, useAnalyticsRange } from "@/components/admin/analytics/controls";
import { KpiCard, Sk } from "@/components/admin/analytics/kpi";

const num = (n: number) => n.toLocaleString("en-IN");
const pct = (f: number | null | undefined) => (f == null ? "—" : `${(f * 100).toFixed(1)}%`);

export default function FunnelAnalyticsPage() {
  const ctrl = useAnalyticsRange();
  const { data, loading } = useLoad(() => api<FunnelResult>(`/admin/analytics/funnel?${ctrl.query}`), [ctrl.query]);

  const k = data?.kpis;
  const p = ctrl.compare ? data?.previous ?? undefined : undefined;
  const steps = data?.steps ?? [];
  const maxCount = Math.max(1, ...steps.map((s) => s.count));
  const noEvents = data && !data.eventsTracked;

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Conversion funnel" />
      <AnalyticsTabs />
      <AnalyticsControls ctrl={ctrl} />

      {noEvents && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            First-party visit tracking is now live but no events have been recorded yet. Sessions, product views, add-to-cart and
            checkout-started will populate as customers browse the storefront. <span className="text-amber-100">Order placed</span> is
            always shown from real orders.
          </p>
        </div>
      )}

      {/* Rate KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard loading={loading} label="Overall Conversion" value={pct(k?.overallConversion)} current={k?.overallConversion} previous={p?.overallConversion} sub="sessions → order" />
        <KpiCard loading={loading} label="Cart Abandonment" value={pct(k?.cartAbandonment)} current={k?.cartAbandonment ?? undefined} previous={p?.cartAbandonment ?? undefined} invert />
        <KpiCard loading={loading} label="Checkout Abandonment" value={pct(k?.checkoutAbandonment)} current={k?.checkoutAbandonment ?? undefined} previous={p?.checkoutAbandonment ?? undefined} invert />
      </div>

      {/* Funnel steps */}
      <GlassCard className="mt-6 p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-200">Funnel</h2>
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Sk key={i} className="h-12 w-full" />)}</div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, i) => {
              const prevCount = i > 0 ? steps[i - 1].count : null;
              const stepConv = i > 0 && prevCount ? step.count / prevCount : null;
              const widthPct = step.tracked ? (step.count / maxCount) * 100 : 0;
              return (
                <div key={step.key} className="flex items-center gap-4">
                  <div className="w-36 shrink-0">
                    <div className="text-sm font-medium text-zinc-200">{step.label}</div>
                    {i > 0 && <div className="text-xs text-zinc-500">{stepConv != null ? `${pct(stepConv)} of previous` : "step conv. —"}</div>}
                  </div>
                  <div className="relative h-9 flex-1 overflow-hidden rounded-lg bg-white/5">
                    <div
                      className="flex h-full items-center rounded-lg bg-gradient-to-r from-cyan-500/70 to-violet-500/70 px-3"
                      style={{ width: `${Math.max(widthPct, step.tracked ? 4 : 0)}%` }}
                    />
                    <span className="absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-zinc-100">
                      {step.tracked ? num(step.count) : "Not tracked yet"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {data?.firstEventAt && (
          <p className="mt-4 text-xs text-zinc-500">Event tracking active since {formatDate(data.firstEventAt)}.</p>
        )}
      </GlassCard>
    </div>
  );
}
