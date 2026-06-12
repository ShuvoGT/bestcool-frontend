"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { formatDate } from "@/lib/format";
import { GlassCard, PageHeader, Spinner, EmptyState } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Customer = { id: string; name: string; email: string; phone: string | null; joinedAt: string; totalOrders: number };

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading } = useLoad(
    () => api<{ items: Customer[]; total: number; pages: number }>("/admin/customers", { query: { search, page, limit: 20 } }),
    [search, page]
  );

  return (
    <div>
      <PageHeader title="Customers" subtitle={data ? `${data.total} registered customer${data.total === 1 ? "" : "s"}` : undefined} />

      <div className="relative mb-4 w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          placeholder="Search name, email, phone…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border-white/10 bg-white/5 pl-9 text-zinc-100 placeholder:text-zinc-600"
        />
      </div>

      <GlassCard>
        {loading || !data ? (
          <Spinner />
        ) : data.items.length === 0 ? (
          <EmptyState message="No customers found" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/8 hover:bg-transparent">
                <TableHead className="text-zinc-400">Name</TableHead>
                <TableHead className="text-zinc-400">Email</TableHead>
                <TableHead className="text-zinc-400">Phone</TableHead>
                <TableHead className="text-zinc-400">Orders</TableHead>
                <TableHead className="text-zinc-400">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((c) => (
                <TableRow key={c.id} className="border-white/5 hover:bg-white/3">
                  <TableCell className="font-medium text-zinc-100">{c.name}</TableCell>
                  <TableCell className="text-zinc-300">{c.email}</TableCell>
                  <TableCell className="text-zinc-400">{c.phone ?? "—"}</TableCell>
                  <TableCell>
                    <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
                      {c.totalOrders}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500">{formatDate(c.joinedAt)}</TableCell>
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
