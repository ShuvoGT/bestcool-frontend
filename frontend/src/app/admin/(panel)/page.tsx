"use client";

import Link from "next/link";
import { ShoppingCart, Banknote, TrendingUp, Users, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { bdt, formatDateTime } from "@/lib/format";
import { GlassCard, PageHeader, Spinner, StatusBadge, EmptyState } from "@/components/admin/ui";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Stats = {
  todayOrders: number;
  todayRevenue: number;
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  recentOrders: { id: string; orderNumber: string; shipping: { name: string }; total: number; status: string; paymentStatus: string; createdAt: string }[];
  lowStockProducts: { id: string; name: string; slug: string; stock: number; lowStockThreshold: number }[];
};

const STAT_CARDS = [
  { key: "todayOrders", label: "Today's Orders", icon: ShoppingCart, accent: "from-cyan-500/20 to-cyan-500/0 text-cyan-400", fmt: (s: Stats) => String(s.todayOrders) },
  { key: "todayRevenue", label: "Today's Revenue", icon: Banknote, accent: "from-emerald-500/20 to-emerald-500/0 text-emerald-400", fmt: (s: Stats) => bdt(s.todayRevenue) },
  { key: "totalRevenue", label: "Total Revenue", icon: TrendingUp, accent: "from-violet-500/20 to-violet-500/0 text-violet-400", fmt: (s: Stats) => bdt(s.totalRevenue) },
  { key: "totalCustomers", label: "Customers", icon: Users, accent: "from-fuchsia-500/20 to-fuchsia-500/0 text-fuchsia-400", fmt: (s: Stats) => String(s.totalCustomers) },
];

export default function AdminDashboard() {
  const { data, loading } = useLoad(() => api<Stats>("/admin/dashboard/stats"));

  if (loading || !data) return <Spinner />;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Live overview of your store" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, accent, fmt }) => (
          <GlassCard key={key} className="relative overflow-hidden p-5">
            <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accent.split(" text-")[0]}`} />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">{fmt(data)}</p>
              </div>
              <Icon className={`h-6 w-6 text-${accent.split("text-")[1]}`} />
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {/* Recent orders */}
        <GlassCard className="xl:col-span-2">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <h2 className="font-semibold text-zinc-100">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs font-medium text-cyan-400 hover:text-cyan-300">View all →</Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <EmptyState message="No orders yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/8 hover:bg-transparent">
                  <TableHead className="text-zinc-400">Order</TableHead>
                  <TableHead className="text-zinc-400">Customer</TableHead>
                  <TableHead className="text-zinc-400">Total</TableHead>
                  <TableHead className="text-zinc-400">Status</TableHead>
                  <TableHead className="text-zinc-400">Payment</TableHead>
                  <TableHead className="text-zinc-400">Placed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.recentOrders.map((o) => (
                  <TableRow key={o.id} className="border-white/5 hover:bg-white/3">
                    <TableCell>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-cyan-400 hover:text-cyan-300">
                        {o.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-zinc-300">{o.shipping.name}</TableCell>
                    <TableCell className="font-medium text-zinc-100">{bdt(o.total)}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell><StatusBadge status={o.paymentStatus} /></TableCell>
                    <TableCell className="text-xs text-zinc-500">{formatDateTime(o.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </GlassCard>

        {/* Low stock alerts */}
        <GlassCard>
          <div className="flex items-center gap-2 border-b border-white/8 px-5 py-4">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h2 className="font-semibold text-zinc-100">Low Stock Alerts</h2>
          </div>
          {data.lowStockProducts.length === 0 ? (
            <EmptyState message="All products are well stocked 🎉" />
          ) : (
            <ul className="divide-y divide-white/5">
              {data.lowStockProducts.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="truncate text-sm text-zinc-300">{p.name}</span>
                  <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                    {p.stock} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
