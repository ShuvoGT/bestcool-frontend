"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Search, Trash2, Pencil, Zap } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { bdt } from "@/lib/format";
import { GlassCard, PageHeader, Spinner, EmptyState } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type ProductRow = {
  id: string; name: string; slug: string; sku: string | null;
  regularPrice: number; salePrice: number | null; price: number;
  flashSale: { title: string } | null;
  stock: number; lowStockThreshold: number; isActive: boolean; image: string | null;
  category: { name: string } | null;
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "low-stock", label: "Low stock" },
];

export default function AdminProductsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, reload } = useLoad(
    () =>
      api<{ items: ProductRow[]; total: number; pages: number }>("/admin/products", {
        query: { search, status, page, limit: 15 },
      }),
    [search, status, page]
  );

  async function remove(p: ProductRow) {
    if (!confirm(`Delete "${p.name}" permanently?`)) return;
    try {
      await api(`/admin/products/${p.id}`, { method: "DELETE" });
      toast.success("Product deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={data ? `${data.total} product${data.total === 1 ? "" : "s"}` : undefined}
        actions={
          <Link href="/admin/products/new">
            <Button className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-violet-500">
              <Plus className="mr-1 h-4 w-4" /> New product
            </Button>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Search name or SKU…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-64 border-white/10 bg-white/5 pl-9 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => { setStatus(f.value); setPage(1); }}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-all",
              status === f.value
                ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300"
                : "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <GlassCard>
        {loading || !data ? (
          <Spinner />
        ) : data.items.length === 0 ? (
          <EmptyState message="No products found" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/8 hover:bg-transparent">
                <TableHead className="text-zinc-400">Product</TableHead>
                <TableHead className="text-zinc-400">Category</TableHead>
                <TableHead className="text-zinc-400">Price</TableHead>
                <TableHead className="text-zinc-400">Stock</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((p) => (
                <TableRow key={p.id} className="border-white/5 hover:bg-white/3">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {p.image && (
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-white/10">
                          <Image src={p.image} alt="" fill unoptimized className="object-cover" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-zinc-100">{p.name}</span>
                          {p.flashSale && <Zap className="h-3.5 w-3.5 shrink-0 text-amber-400" />}
                        </div>
                        <div className="text-xs text-zinc-500">{p.sku}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400">{p.category?.name}</TableCell>
                  <TableCell>
                    <span className="font-medium text-zinc-100">{bdt(p.price)}</span>
                    {p.price < p.regularPrice && (
                      <span className="ml-1.5 text-xs text-zinc-500 line-through">{bdt(p.regularPrice)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className={cn("font-medium", p.stock <= p.lowStockThreshold ? "text-amber-400" : "text-zinc-300")}>
                      {p.stock}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      p.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-400"
                    )}>
                      {p.isActive ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Link href={`/admin/products/${p.id}`}>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-cyan-300">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-red-400" onClick={() => remove(p)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={cn(
                "h-8 w-8 rounded-md border text-sm font-medium",
                n === page ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300" : "border-white/10 bg-white/5 text-zinc-400"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
