"use client";

/** Shop page chrome (Akij style): category scroll strip, left filter sidebar
 *  (price / brand / category), and a top sort bar. State lives in the URL. */
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Category = { id: string; name: string; slug: string; image: string | null; productCount: number };
type Brand = { name: string; count: number };
type Current = { category: string; brand: string; search: string; minPrice: string; maxPrice: string; sort: string };

function useUrl() {
  const router = useRouter();
  const params = useSearchParams();
  function update(patch: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page"); // any filter change resets pagination
    router.push(`/shop?${next.toString()}`);
  }
  return { router, update };
}

/** Horizontal scrolling category strip at the top of the shop. */
export function CategoryStrip({ categories, active }: { categories: Category[]; active: string }) {
  if (!categories.length) return null;
  return (
    <div className="-mx-1 mb-6 flex gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
      <Link
        href="/shop"
        className={cn(
          "flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all",
          !active ? "border-brand bg-brand-soft" : "border-zinc-200 hover:border-brand/40"
        )}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-lg font-extrabold text-brand">All</div>
        <div className="text-xs font-bold text-ink">All</div>
      </Link>
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/shop?category=${c.slug}`}
          className={cn(
            "group flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all",
            active === c.slug ? "border-brand bg-brand-soft" : "border-zinc-200 hover:-translate-y-0.5 hover:border-brand/40"
          )}
        >
          <div className="relative h-16 w-16 overflow-hidden rounded-full bg-zinc-50 ring-1 ring-zinc-100">
            {c.image && <Image src={c.image} alt={c.name} fill unoptimized className="object-cover" />}
          </div>
          <div className="line-clamp-1 text-xs font-bold text-ink group-hover:text-brand">{c.name}</div>
          <div className="text-[10px] text-zinc-400">{c.productCount}</div>
        </Link>
      ))}
    </div>
  );
}

function FilterCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white">
      <h3 className="border-b border-zinc-100 px-4 py-3 text-sm font-bold text-ink">{title}</h3>
      <div className="p-4">{children}</div>
    </div>
  );
}

export function ShopSidebar({ categories, brands, current }: { categories: Category[]; brands: Brand[]; current: Current }) {
  const { router, update } = useUrl();
  const [open, setOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(current.minPrice);
  const [maxPrice, setMaxPrice] = useState(current.maxPrice);
  const selectedBrands = current.brand ? current.brand.split(",").filter(Boolean) : [];
  const hasFilters = current.category || current.brand || current.minPrice || current.maxPrice || current.search;

  function toggleBrand(name: string) {
    const set = new Set(selectedBrands);
    if (set.has(name)) set.delete(name);
    else set.add(name);
    update({ brand: [...set].join(",") });
  }

  return (
    <aside>
      <button
        onClick={() => setOpen((v) => !v)}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white py-2.5 text-sm font-bold text-ink lg:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" /> Filters
      </button>

      <div className={cn("space-y-4", !open && "hidden lg:block")}>
        {/* Price */}
        <FilterCard title="Filter by Price">
          <div className="flex items-center gap-2">
            <Input type="number" min={0} placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="h-9" />
            <span className="text-zinc-400">–</span>
            <Input type="number" min={0} placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="h-9" />
          </div>
          <Button onClick={() => update({ minPrice, maxPrice })} className="mt-3 w-full bg-brand text-white hover:bg-brand-dark">
            Filter
          </Button>
        </FilterCard>

        {/* Brand */}
        {brands.length > 0 && (
          <FilterCard title="Filter by Brand">
            <ul className="space-y-2.5">
              {brands.map((b) => (
                <li key={b.name}>
                  <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(b.name)}
                      onChange={() => toggleBrand(b.name)}
                      className="h-4 w-4 rounded border-zinc-300 text-brand accent-[#566590]"
                    />
                    <span className="flex-1">{b.name}</span>
                    <span className="text-xs text-zinc-400">({b.count})</span>
                  </label>
                </li>
              ))}
            </ul>
          </FilterCard>
        )}

        {/* Category */}
        <FilterCard title="Filter by Category">
          <ul className="space-y-1">
            <li>
              <Link href="/shop" className={cn("block rounded-md px-2 py-1.5 text-sm", !current.category ? "bg-brand-soft font-semibold text-brand" : "text-zinc-700 hover:text-brand")}>
                All Categories
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/shop?category=${c.slug}`}
                  className={cn(
                    "flex items-center justify-between rounded-md px-2 py-1.5 text-sm",
                    current.category === c.slug ? "bg-brand-soft font-semibold text-brand" : "text-zinc-700 hover:text-brand"
                  )}
                >
                  {c.name} <span className="text-xs text-zinc-400">{c.productCount}</span>
                </Link>
              </li>
            ))}
          </ul>
        </FilterCard>

        {hasFilters && (
          <button onClick={() => router.push("/shop")} className="text-sm font-semibold text-brand hover:underline">
            Clear all filters
          </button>
        )}
      </div>
    </aside>
  );
}

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "popularity", label: "Most popular" },
  { value: "price_asc", label: "Price: low → high" },
  { value: "price_desc", label: "Price: high → low" },
];

export function ShopTopBar({ total, sort }: { total: number; sort: string }) {
  const { update } = useUrl();
  return (
    <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5">
      <span className="text-sm text-zinc-600">
        <strong className="text-ink">{total}</strong> product{total === 1 ? "" : "s"}
      </span>
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-zinc-500 sm:inline">Sort:</span>
        <Select value={sort} onValueChange={(v) => update({ sort: v })}>
          <SelectTrigger size="sm" className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
