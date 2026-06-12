"use client";

/** Account overview: recent orders + profile summary. */
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { bdt, formatDate } from "@/lib/format";
import { OrderStatusBadge } from "@/components/store/OrderStatusBadge";
import { Skeleton } from "@/components/ui/skeleton";

type Order = { id: string; orderNumber: string; total: number; status: string; paymentStatus: string; createdAt: string };

export default function AccountOverview() {
  const { user } = useAuth();
  const { data, loading } = useLoad(() => api<{ orders: Order[] }>("/orders/my").then((r) => r.orders));

  return (
    <div>
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight text-zinc-900">Hi, {user?.name?.split(" ")[0]} 👋</h1>
      <p className="mb-7 text-sm text-zinc-500">Here&apos;s what&apos;s happening with your orders.</p>

      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-400">Total orders</div>
          <div className="mt-1 text-2xl font-extrabold text-zinc-900">{data?.length ?? "—"}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-400">In progress</div>
          <div className="mt-1 text-2xl font-extrabold text-zinc-900">
            {data ? data.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status)).length : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 p-4">
          <div className="text-xs font-medium uppercase tracking-wider text-zinc-400">Email</div>
          <div className="mt-1 truncate text-sm font-semibold text-zinc-900">{user?.email}</div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-bold text-zinc-900">Recent orders</h2>
        <Link href="/account/orders" className="text-sm font-medium text-blue-600 hover:underline">View all</Link>
      </div>
      <div className="mt-3 space-y-3">
        {loading ? (
          [1, 2].map((n) => <Skeleton key={n} className="h-16 w-full rounded-xl" />)
        ) : !data?.length ? (
          <p className="rounded-xl border border-zinc-200 p-6 text-center text-sm text-zinc-500">
            No orders yet — <Link href="/shop" className="text-blue-600 hover:underline">start shopping</Link>
          </p>
        ) : (
          data.slice(0, 4).map((o) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.orderNumber}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 p-4 transition-colors hover:border-blue-300"
            >
              <div>
                <div className="font-semibold text-blue-600">{o.orderNumber}</div>
                <div className="text-xs text-zinc-400">{formatDate(o.createdAt)}</div>
              </div>
              <div className="flex items-center gap-3">
                <OrderStatusBadge status={o.status} />
                <span className="font-bold text-zinc-900">{bdt(o.total)}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
