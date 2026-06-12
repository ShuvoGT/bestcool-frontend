"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { bdt, formatDateTime } from "@/lib/format";
import { GlassCard, PageHeader, Spinner, StatusBadge, EmptyState } from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type OrderRow = {
  id: string; orderNumber: string; status: string; paymentMethod: string; paymentStatus: string;
  total: number; shipping: { name: string; phone: string }; createdAt: string;
  items: { quantity: number }[];
};

const ALL = "__all__";
const STATUSES = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
const METHODS = ["COD", "BKASH", "NAGAD", "SSLCOMMERZ"];

export default function AdminOrdersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [method, setMethod] = useState(ALL);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const { data, loading } = useLoad(
    () =>
      api<{ items: OrderRow[]; total: number; pages: number }>("/admin/orders", {
        query: {
          search,
          status: status === ALL ? undefined : status,
          paymentMethod: method === ALL ? undefined : method,
          from: from || undefined,
          to: to ? `${to}T23:59:59` : undefined,
          page,
          limit: 20,
        },
      }),
    [search, status, method, from, to, page]
  );

  const selectCls = "w-36 border-white/10 bg-white/5 text-zinc-100";

  return (
    <div>
      <PageHeader title="Orders" subtitle={data ? `${data.total} order${data.total === 1 ? "" : "s"}` : undefined} />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            placeholder="Order #, name, phone, email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-64 border-white/10 bg-white/5 pl-9 text-zinc-100 placeholder:text-zinc-600"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className={selectCls}><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100">
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={method} onValueChange={(v) => { setMethod(v); setPage(1); }}>
          <SelectTrigger className={selectCls}><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100">
            <SelectItem value={ALL}>All methods</SelectItem>
            {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-38 border-white/10 bg-white/5 text-zinc-100" />
        <span className="text-zinc-600">→</span>
        <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-38 border-white/10 bg-white/5 text-zinc-100" />
      </div>

      <GlassCard>
        {loading || !data ? (
          <Spinner />
        ) : data.items.length === 0 ? (
          <EmptyState message="No orders match these filters" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/8 hover:bg-transparent">
                <TableHead className="text-zinc-400">Order</TableHead>
                <TableHead className="text-zinc-400">Customer</TableHead>
                <TableHead className="text-zinc-400">Items</TableHead>
                <TableHead className="text-zinc-400">Total</TableHead>
                <TableHead className="text-zinc-400">Method</TableHead>
                <TableHead className="text-zinc-400">Payment</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400">Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((o) => (
                <TableRow key={o.id} className="border-white/5 hover:bg-white/3">
                  <TableCell>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-cyan-400 hover:text-cyan-300">
                      {o.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="text-zinc-200">{o.shipping.name}</div>
                    <div className="text-xs text-zinc-500">{o.shipping.phone}</div>
                  </TableCell>
                  <TableCell className="text-zinc-400">{o.items.reduce((a, i) => a + i.quantity, 0)}</TableCell>
                  <TableCell className="font-medium text-zinc-100">{bdt(o.total)}</TableCell>
                  <TableCell className="text-zinc-300">{o.paymentMethod}</TableCell>
                  <TableCell><StatusBadge status={o.paymentStatus} /></TableCell>
                  <TableCell><StatusBadge status={o.status} /></TableCell>
                  <TableCell className="text-xs text-zinc-500">{formatDateTime(o.createdAt)}</TableCell>
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
