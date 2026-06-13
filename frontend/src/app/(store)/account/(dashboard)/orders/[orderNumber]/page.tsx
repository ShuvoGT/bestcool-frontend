"use client";

/** Customer order detail: items, totals, payment, address, status timeline,
 *  and courier + tracking ID once shipped (spec §7). */
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CreditCard, Loader2, Truck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { bdt, formatDateTime } from "@/lib/format";
import { OrderStatusBadge } from "@/components/store/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Order = {
  id: string; orderNumber: string; status: string; paymentMethod: string; paymentStatus: string;
  subtotal: number; shippingCharge: number; total: number;
  shipping: { name: string; phone: string; email: string; address: string; district: string; notes: string | null; deliveryZone: string };
  courier: { name: string; consignmentId: string | null; status: string | null; trackingUrl: string | null } | null;
  items: { id: string; name: string; variantName: string | null; image: string | null; unitPrice: number; quantity: number; lineTotal: number }[];
  timeline: { status: string; note: string | null; at: string }[];
  createdAt: string;
};

export default function OrderDetailPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>();
  const { data: order, loading } = useLoad(
    () => api<{ order: Order }>(`/orders/my/${orderNumber}`).then((r) => r.order),
    [orderNumber]
  );
  const [paying, setPaying] = useState(false);

  async function payNow() {
    setPaying(true);
    try {
      const res = await api<{ redirectUrl: string }>(`/orders/my/${orderNumber}/pay`, { method: "POST" });
      window.location.href = res.redirectUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start payment");
      setPaying(false);
    }
  }

  if (loading) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (!order) return <p className="text-sm text-zinc-500">Order not found.</p>;

  // Online order still awaiting payment → allow retry.
  const canPay = order.paymentMethod !== "COD" && ["PENDING", "FAILED"].includes(order.paymentStatus) && order.status !== "CANCELLED";

  return (
    <div>
      <Link href="/account/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">{order.orderNumber}</h1>
          <p className="text-xs text-zinc-400">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.paymentStatus} />
          <OrderStatusBadge status={order.status} />
        </div>
      </div>

      {canPay && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand/30 bg-brand-soft p-4">
          <p className="text-sm text-ink">
            This order is awaiting payment via <strong>{order.paymentMethod}</strong>.
          </p>
          <Button onClick={payNow} disabled={paying} className="gap-1.5 bg-brand text-white hover:bg-brand-dark">
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />} Pay now — {bdt(order.total)}
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          {/* Items */}
          <div className="rounded-xl border border-zinc-200">
            <div className="border-b border-zinc-100 px-5 py-3.5 font-bold text-zinc-900">Items</div>
            <ul className="divide-y divide-zinc-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-5 py-3.5">
                  {item.image && (
                    <div className="relative h-13 w-13 shrink-0 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
                      <Image src={item.image} alt="" fill unoptimized className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-1 text-sm font-semibold text-zinc-900">{item.name}</div>
                    <div className="text-xs text-zinc-500">
                      {item.variantName ? `${item.variantName} · ` : ""}{bdt(item.unitPrice)} × {item.quantity}
                    </div>
                  </div>
                  <span className="shrink-0 font-bold text-zinc-900">{bdt(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className="space-y-1.5 border-t border-zinc-100 px-5 py-4 text-sm">
              <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span>{bdt(order.subtotal)}</span></div>
              <div className="flex justify-between text-zinc-500"><span>Delivery ({order.shipping.deliveryZone})</span><span>{bdt(order.shippingCharge)}</span></div>
              <div className="flex justify-between pt-1 text-base font-extrabold text-zinc-900"><span>Total</span><span>{bdt(order.total)}</span></div>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-zinc-200 p-5">
            <h2 className="mb-4 font-bold text-zinc-900">Order Timeline</h2>
            <ol className="relative ml-2 space-y-5 border-l-2 border-zinc-100 pl-5">
              {order.timeline.map((t, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-brand ring-2 ring-brand/20" />
                  <div className="text-sm font-semibold text-zinc-900">{t.status.replace(/_/g, " ")}</div>
                  {t.note && <div className="text-xs text-zinc-500">{t.note}</div>}
                  <div className="text-xs text-zinc-400">{formatDateTime(t.at)}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="space-y-6">
          {/* Courier */}
          {order.courier && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-5">
              <h2 className="mb-2 flex items-center gap-2 font-bold text-violet-900">
                <Truck className="h-4.5 w-4.5" /> Shipment
              </h2>
              <div className="space-y-1 text-sm text-violet-900">
                <p>Courier: <strong>{order.courier.name}</strong></p>
                {order.courier.consignmentId && <p>Tracking ID: <strong className="font-mono">{order.courier.consignmentId}</strong></p>}
                {order.courier.trackingUrl && (
                  <a href={order.courier.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
                    Track parcel →
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Shipping + payment */}
          <div className="space-y-2 rounded-xl border border-zinc-200 p-5 text-sm">
            <h2 className="mb-2 font-bold text-zinc-900">Delivery Address</h2>
            <p className="font-semibold text-zinc-800">{order.shipping.name}</p>
            <p className="text-zinc-500">{order.shipping.phone}</p>
            <p className="text-zinc-500">{order.shipping.address}, {order.shipping.district}</p>
            {order.shipping.notes && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">📝 {order.shipping.notes}</p>}
            <p className="border-t border-zinc-100 pt-2 text-zinc-500">
              Payment: <strong className="text-zinc-800">{order.paymentMethod === "COD" ? "Cash on Delivery" : order.paymentMethod}</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
