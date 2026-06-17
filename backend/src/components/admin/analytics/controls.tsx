"use client";

/** Shared date-range + compare controls and sub-navigation for analytics pages. */
import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { RANGE_PRESETS, type RangePreset, resolveRange, previousPeriod } from "@/lib/analytics/dateRange";
import { formatDate } from "@/lib/format";

export function useAnalyticsRange() {
  const [preset, setPreset] = useState<RangePreset>("last30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [compare, setCompare] = useState(false);

  const { from, to } = useMemo(() => resolveRange(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const prev = useMemo(() => previousPeriod(from, to), [from, to]);
  const query = useMemo(() => {
    const p = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    if (compare) {
      p.set("compareFrom", prev.from.toISOString());
      p.set("compareTo", prev.to.toISOString());
    }
    return p.toString();
  }, [from, to, compare, prev]);

  return { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, compare, setCompare, from, to, prev, query };
}
export type RangeCtrl = ReturnType<typeof useAnalyticsRange>;

export function AnalyticsControls({ ctrl }: { ctrl: RangeCtrl }) {
  const inputCls = "h-9 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-zinc-100 [color-scheme:dark] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400";
  return (
    <div className="mb-6 space-y-3 rounded-xl border border-white/8 bg-white/4 p-4">
      <div className="flex flex-wrap items-center gap-1.5">
        {RANGE_PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => ctrl.setPreset(p.key)}
            className={cn(
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              ctrl.preset === p.key ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300" : "border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {ctrl.preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400">
          <span>From</span>
          <input type="date" value={ctrl.customFrom} onChange={(e) => ctrl.setCustomFrom(e.target.value)} className={inputCls} />
          <span>to</span>
          <input type="date" value={ctrl.customTo} onChange={(e) => ctrl.setCustomTo(e.target.value)} className={inputCls} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">
          {formatDate(ctrl.from)} – {formatDate(ctrl.to)}
          {ctrl.compare && <span className="text-zinc-600"> · vs {formatDate(ctrl.prev.from)} – {formatDate(ctrl.prev.to)}</span>}
        </p>
        <button
          type="button"
          onClick={() => ctrl.setCompare(!ctrl.compare)}
          aria-pressed={ctrl.compare}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
            ctrl.compare ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300" : "border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200"
          )}
        >
          <ArrowLeftRight className="h-3.5 w-3.5" /> Compare to previous period
        </button>
      </div>
    </div>
  );
}

const TABS = [
  { href: "/work/analytics", label: "Overview", exact: true },
  { href: "/work/analytics/revenue", label: "Revenue & Orders" },
  { href: "/work/analytics/funnel", label: "Conversion Funnel" },
  { href: "/work/analytics/geo", label: "Geographic & Segments" },
];

export function AnalyticsTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-5 flex flex-wrap gap-1.5 border-b border-white/8 pb-3">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-cyan-500/15 text-cyan-300" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
