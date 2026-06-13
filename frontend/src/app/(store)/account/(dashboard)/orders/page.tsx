"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { bdt, formatDateTime } from "@/lib/format";
import { OrderStatusBadge } from "@/components/store/OrderStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

type Order = {
  id: string; orderNumber: string; total: number; status: string;
  paymentStatus: string; paymentMethod: string; createdAt: string;
  items: { quantity: number }[];
};

export default function MyOrdersPage() {
  const { data, loading } = useLoad(() => api<{ orders: Order[] }>("/orders/my").then((r) => r.orders));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-zinc-900">My Orders</h1>
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((n) => <Skeleton key={n} className="h-20 w-full rounded-xl" />)}</div>
      ) : !data?.length ? (
        <p className="rounded-xl border border-zinc-200 p-10 text-center text-sm text-zinc-500">
          You haven&apos;t placed any orders yet.{" "}
          <Link href="/shop" className="text-brand hover:underline">Start shopping</Link>
        </p>
      ) : (
        <div className="space-y-3">
          {data.map((o) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.orderNumber}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 p-4 transition-colors hover:border-brand/40 sm:p-5"
            >
              <div>
                <div className="font-bold text-brand">{o.orderNumber}</div>
                <div className="mt-0.5 text-xs text-zinc-400">
                  {formatDateTime(o.createdAt)} · {o.items.reduce((s, i) => s + i.quantity, 0)} item(s) · {o.paymentMethod}
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <OrderStatusBadge status={o.paymentStatus} />
                <OrderStatusBadge status={o.status} />
                <span className="text-base font-extrabold text-zinc-900">{bdt(o.total)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
