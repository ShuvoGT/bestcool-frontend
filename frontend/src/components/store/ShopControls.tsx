"use client";

/** Filter / sort / search bar for the shop — state lives in the URL. */
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; slug: string; productCount: number };
type Current = { category: string; search: string; minPrice: string; maxPrice: string; sort: string };

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "popularity", label: "Most popular" },
  { value: "price_asc", label: "Price: low → high" },
  { value: "price_desc", label: "Price: high → low" },
];

export function ShopControls({ categories, current, total }: { categories: Category[]; current: Current; total: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [minPrice, setMinPrice] = useState(current.minPrice);
  const [maxPrice, setMaxPrice] = useState(current.maxPrice);

  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page"); // any filter change resets pagination
    router.push(`/shop?${next.toString()}`);
  }

  const hasFilters = current.category || current.search || current.minPrice || current.maxPrice;

  return (
    <div className="py-6">
      <div className="flex flex-wrap items-center gap-2">
        {/* Category pills */}
        <button
          onClick={() => update({ category: "" })}
          className={cn(
            "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
            !current.category ? "border-brand bg-brand text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
          )}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => update({ category: c.slug })}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              current.category === c.slug ? "border-brand bg-brand text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
            )}
          >
            {c.name} <span className="opacity-60">({c.productCount})</span>
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Price
          </Button>
          <Select value={current.sort} onValueChange={(v) => update({ sort: v })}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {showFilters && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update({ minPrice, maxPrice });
          }}
          className="mt-3 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Min price (৳)</label>
            <Input type="number" min={0} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-32 bg-white" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">Max price (৳)</label>
            <Input type="number" min={0} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-32 bg-white" />
          </div>
          <Button type="submit" size="sm" className="bg-brand text-white hover:bg-brand-dark">Apply</Button>
        </form>
      )}

      <div className="mt-4 flex items-center gap-3 text-sm text-zinc-500">
        <span>{total} product{total === 1 ? "" : "s"}</span>
        {current.search && (
          <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs">
            “{current.search}”
            <button onClick={() => update({ search: "" })} aria-label="Clear search"><X className="h-3 w-3" /></button>
          </span>
        )}
        {hasFilters && (
          <button onClick={() => router.push("/shop")} className="text-xs font-medium text-brand hover:underline">
            Clear all filters
          </button>
        )}
      </div>
    </div>
  );
}

export function ShopPagination({ page, pages }: { page: number; pages: number }) {
  const router = useRouter();
  const params = useSearchParams();
  if (pages <= 1) return null;

  function go(n: number) {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(n));
    router.push(`/shop?${next.toString()}`);
  }

  return (
    <div className="mt-10 flex items-center justify-center gap-2">
      {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => go(n)}
          className={cn(
            "h-9 w-9 rounded-lg border text-sm font-medium transition-colors",
            n === page ? "border-brand bg-brand text-white" : "border-zinc-200 text-zinc-600 hover:border-zinc-300"
          )}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
