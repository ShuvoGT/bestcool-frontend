"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/admin/ui";
import { pctChange } from "@/lib/analytics/dateRange";

/** Dark-theme skeleton block. */
export function Sk({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-white/5", className)} />;
}

export function KpiCard({
  label,
  value,
  current,
  previous,
  invert = false,
  sub,
  loading,
}: {
  label: string;
  value: string;
  current?: number;
  previous?: number | null;
  /** When true, an INCREASE is "bad" (red) — for refund rate, abandonment, etc. */
  invert?: boolean;
  sub?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <GlassCard className="p-4">
        <Sk className="h-3 w-24" />
        <Sk className="mt-3 h-7 w-28" />
        <Sk className="mt-3 h-3 w-16" />
      </GlassCard>
    );
  }

  const comparing = current != null && previous != null;
  const delta = comparing ? pctChange(current, previous) : null;
  const dir = delta == null ? 0 : delta > 0 ? 1 : delta < 0 ? -1 : 0;
  const good = dir === 0 ? null : invert ? dir < 0 : dir > 0;

  return (
    <GlassCard className="p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-50">{value}</p>
      <div className="mt-1.5 flex items-center gap-2">
        {delta != null ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-semibold",
              good == null ? "text-zinc-400" : good ? "text-emerald-400" : "text-red-400"
            )}
          >
            {dir > 0 ? <ArrowUp className="h-3 w-3" /> : dir < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        ) : comparing ? (
          <span className="text-xs text-zinc-600">— vs prev</span>
        ) : null}
        {sub && <span className="text-xs text-zinc-500">{sub}</span>}
      </div>
    </GlassCard>
  );
}
