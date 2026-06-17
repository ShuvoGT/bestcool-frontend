import type { RangeArgs } from "@/lib/analytics/queries";

/** Parse from/to/compareFrom/compareTo (ISO strings) from an analytics request. */
export function parseRangeArgs(url: URL): RangeArgs {
  const sp = url.searchParams;
  const valid = (d: Date) => !Number.isNaN(d.getTime());
  const parse = (v: string | null): Date | undefined => {
    if (!v) return undefined;
    const d = new Date(v);
    return valid(d) ? d : undefined;
  };
  const from = parse(sp.get("from")) ?? new Date(Date.now() - 29 * 86_400_000);
  const to = parse(sp.get("to")) ?? new Date();
  const compareFrom = parse(sp.get("compareFrom"));
  const compareTo = parse(sp.get("compareTo"));
  return { from, to, compareFrom, compareTo };
}

export function cacheKey(name: string, a: RangeArgs): string {
  return `${name}:${a.from.getTime()}:${a.to.getTime()}:${a.compareFrom?.getTime() ?? 0}:${a.compareTo?.getTime() ?? 0}`;
}
