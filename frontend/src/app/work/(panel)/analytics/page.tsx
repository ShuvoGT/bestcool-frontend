"use client";

import Link from "next/link";
import { TrendingUp, Filter, MapPin, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { bdt } from "@/lib/format";
import type { RevenueResult } from "@/lib/analytics/queries";
import { PageHeader, GlassCard } from "@/components/admin/ui";
import { AnalyticsControls, AnalyticsTabs, useAnalyticsRange } from "@/components/admin/analytics/controls";
import { KpiCard } from "@/components/admin/analytics/kpi";

const num = (n: number) => n.toLocaleString("en-IN");

const SECTIONS = [
  { href: "/work/analytics/revenue", icon: TrendingUp, title: "Revenue & Orders", desc: "Gross/net sales, AOV, units, refunds, discounts, trends and top products." },
  { href: "/work/analytics/funnel", icon: Filter, title: "Conversion Funnel", desc: "Sessions → product views → cart → checkout → order, with abandonment rates." },
  { href: "/work/analytics/geo", icon: MapPin, title: "Geographic & Segments", desc: "Revenue by division & district, new vs returning, payment methods." },
];

export default function AnalyticsOverviewPage() {
  const ctrl = useAnalyticsRange();
  const { data, loading } = useLoad(() => api<RevenueResult>(`/admin/analytics/revenue?${ctrl.query}`), [ctrl.query]);
  const k = data?.kpis;
  const p = ctrl.compare ? data?.previous ?? undefined : undefined;

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Sales overview & insights" />
      <AnalyticsTabs />
      <AnalyticsControls ctrl={ctrl} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard loading={loading} label="Gross Sales" value={bdt(k?.grossSales ?? 0)} current={k?.grossSales} previous={p?.grossSales} />
        <KpiCard loading={loading} label="Net Sales" value={bdt(k?.netSales ?? 0)} current={k?.netSales} previous={p?.netSales} />
        <KpiCard loading={loading} label="Total Orders" value={num(k?.totalOrders ?? 0)} current={k?.totalOrders} previous={p?.totalOrders} />
        <KpiCard loading={loading} label="Avg Order Value" value={bdt(Math.round(k?.avgOrderValue ?? 0))} current={k?.avgOrderValue} previous={p?.avgOrderValue} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href}>
            <GlassCard className="group h-full p-5 transition-colors hover:border-cyan-400/30 hover:bg-white/6">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">
                  <s.icon className="h-5 w-5" />
                </span>
                <ArrowRight className="h-4 w-4 text-zinc-600 transition-colors group-hover:text-cyan-300" />
              </div>
              <h3 className="mt-3 text-sm font-semibold text-zinc-100">{s.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">{s.desc}</p>
            </GlassCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
