/**
 * Date-range presets + previous-period maths for the analytics pages.
 * Pure functions (safe in client and server). All ranges are inclusive of the
 * full end day. Times are in the server/host local timezone (BD store).
 */
export type RangePreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "last90"
  | "thisMonth"
  | "lastMonth"
  | "custom";

export const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 days" },
  { key: "last30", label: "Last 30 days" },
  { key: "last90", label: "Last 90 days" },
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "custom", label: "Custom" },
];

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export function resolveRange(preset: RangePreset, customFrom?: string, customTo?: string): { from: Date; to: Date } {
  const now = new Date();
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = addDays(now, -1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "last7":
      return { from: startOfDay(addDays(now, -6)), to: endOfDay(now) };
    case "last30":
      return { from: startOfDay(addDays(now, -29)), to: endOfDay(now) };
    case "last90":
      return { from: startOfDay(addDays(now, -89)), to: endOfDay(now) };
    case "thisMonth":
      return { from: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: endOfDay(now) };
    case "lastMonth": {
      const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: startOfDay(first), to: endOfDay(last) };
    }
    case "custom": {
      const from = customFrom ? startOfDay(new Date(customFrom)) : startOfDay(addDays(now, -29));
      const to = customTo ? endOfDay(new Date(customTo)) : endOfDay(now);
      return { from, to };
    }
  }
}

/** Equal-length window immediately preceding [from, to]. */
export function previousPeriod(from: Date, to: Date): { from: Date; to: Date } {
  const span = to.getTime() - from.getTime();
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - span);
  return { from: prevFrom, to: prevTo };
}

export function rangeDays(from: Date, to: Date): number {
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

/** Trend bucket granularity: daily ≤31d, weekly ≤90d, monthly beyond. */
export function bucketUnit(from: Date, to: Date): "day" | "week" | "month" {
  const days = rangeDays(from, to);
  if (days <= 31) return "day";
  if (days <= 90) return "week";
  return "month";
}

/** Percentage change current vs previous; null when previous is 0 (no base). */
export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
