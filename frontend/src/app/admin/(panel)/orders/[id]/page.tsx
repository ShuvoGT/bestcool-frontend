"use client";

/** Admin order detail: items, shipping, status flow, payment status, timeline.
 *  Phase 7 adds the "Send to Courier" panel here. */
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { bdt, formatDateTime } from "@/lib/format";
import { GlassCard, PageHeader, Spinner, StatusBadge } from "@/components/admin/ui";
import { CourierPanel } from "@/components/admin/CourierPanel";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OrderDetail = {
  id: string; orderNumber: string; status: string; paymentMethod: string; paymentStatus: string;
  subtotal: number; shippingCharge: number; total: number;
  shipping: { name: string; phone: string; email: string; address: string; district: string; notes: string | null; deliveryZone: string };
  courier: { name: string; consignmentId: string | null; status: string | null; trackingUrl: string | null } | null;
  customer: { id: string; name: string; email: string } | null;
  items: { id: string; name: string; variantName: string | null; image: string | null; unitPrice: number; quantity: number; lineTotal: number }[];
  timeline: { status: string; note: string | null; at: string }[];
  createdAt: string;
};

const NEXT_STATUS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};
const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "COD_PENDING", "REFUNDED"];

export default function AdminOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, loading, reload } = useLoad(
    () => api<{ order: OrderDetail }>(`/admin/orders/${id}`).then((r) => r.order),
    [id]
  );
  const [busy, setBusy] = useState(false);
  const [payStatus, setPayStatus] = useState<string>("");

  if (loading || !order) return <Spinner />;

  async function setStatus(status: string) {
    if (status === "CANCELLED" && !confirm("Cancel this order? Stock will be restored.")) return;
    setBusy(true);
    try {
      await api(`/admin/orders/${order!.id}/status`, { method: "PUT", body: { status } });
      toast.success(`Order ${status.toLowerCase()}`);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function savePaymentStatus() {
    if (!payStatus) return;
    setBusy(true);
    try {
      await api(`/admin/orders/${order!.id}/payment-status`, { method: "PUT", body: { paymentStatus: payStatus } });
      toast.success("Payment status updated");
      setPayStatus("");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-cyan-400">
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>
      <PageHeader
        title={order.orderNumber}
        subtitle={`Placed ${formatDateTime(order.createdAt)} · ${order.paymentMethod}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={order.paymentStatus} />
            <StatusBadge status={order.status} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Items */}
          <GlassCard>
            <div className="border-b border-white/8 px-5 py-4 font-semibold text-zinc-100">Items</div>
            <ul className="divide-y divide-white/5">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-5 py-3">
                  {item.image && (
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-white/10">
                      <Image src={item.image} alt="" fill unoptimized className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-zinc-100">{item.name}</div>
                    {item.variantName && <div className="text-xs text-zinc-500">{item.variantName}</div>}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm text-zinc-300">{bdt(item.unitPrice)} × {item.quantity}</div>
                    <div className="font-semibold text-zinc-100">{bdt(item.lineTotal)}</div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="space-y-1.5 border-t border-white/8 px-5 py-4 text-sm">
              <div className="flex justify-between text-zinc-400"><span>Subtotal</span><span>{bdt(order.subtotal)}</span></div>
              <div className="flex justify-between text-zinc-400"><span>Shipping ({order.shipping.deliveryZone})</span><span>{bdt(order.shippingCharge)}</span></div>
              <div className="flex justify-between text-base font-bold text-zinc-50"><span>Total</span><span>{bdt(order.total)}</span></div>
            </div>
          </GlassCard>

          {/* Timeline */}
          <GlassCard>
            <div className="border-b border-white/8 px-5 py-4 font-semibold text-zinc-100">Timeline</div>
            <ol className="space-y-4 px-5 py-4">
              {order.timeline.map((t, i) => (
                <li key={i} className="relative flex gap-3 pl-1">
                  <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br from-cyan-400 to-violet-500 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                  <div>
                    <div className="text-sm font-medium text-zinc-200">{t.status.replace(/_/g, " ")}</div>
                    {t.note && <div className="text-xs text-zinc-500">{t.note}</div>}
                    <div className="text-xs text-zinc-600">{formatDateTime(t.at)}</div>
                  </div>
                </li>
              ))}
            </ol>
          </GlassCard>
        </div>

        <div className="space-y-6">
          {/* Actions */}
          <GlassCard className="space-y-4 p-5">
            <h2 className="font-semibold text-zinc-100">Actions</h2>
            {NEXT_STATUS[order.status]?.length ? (
              <div className="space-y-2">
                {NEXT_STATUS[order.status].map((s) => (
                  <Button
                    key={s}
                    onClick={() => setStatus(s)}
                    disabled={busy}
                    className={
                      s === "CANCELLED"
                        ? "w-full bg-red-500/15 text-red-300 hover:bg-red-500/25"
                        : "w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-violet-500"
                    }
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Mark ${s.toLowerCase()}`}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No further status changes available.</p>
            )}
            <div className="space-y-2 border-t border-white/8 pt-4">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">Payment status</p>
              <div className="flex gap-2">
                <Select value={payStatus} onValueChange={setPayStatus}>
                  <SelectTrigger className="flex-1 border-white/10 bg-white/5 text-zinc-100">
                    <SelectValue placeholder={order.paymentStatus.replace(/_/g, " ")} />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100">
                    {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={savePaymentStatus} disabled={!payStatus || busy} variant="outline" className="border-white/10 bg-white/5">
                  Set
                </Button>
              </div>
            </div>
          </GlassCard>

          {/* Shipping */}
          <GlassCard className="space-y-2 p-5 text-sm">
            <h2 className="mb-2 font-semibold text-zinc-100">Shipping</h2>
            <p className="font-medium text-zinc-200">{order.shipping.name}</p>
            <p className="text-zinc-400">{order.shipping.phone}</p>
            <p className="text-zinc-400">{order.shipping.email}</p>
            <p className="text-zinc-400">{order.shipping.address}, {order.shipping.district}</p>
            {order.shipping.notes && (
              <p className="rounded-lg bg-amber-500/8 px-3 py-2 text-xs text-amber-300">📝 {order.shipping.notes}</p>
            )}
            {order.customer && (
              <p className="border-t border-white/8 pt-2 text-xs text-zinc-500">
                Account: {order.customer.name} ({order.customer.email})
              </p>
            )}
          </GlassCard>

          {/* Courier — Send to Courier, tracking, status refresh (spec §11) */}
          <GlassCard className="p-5">
            <CourierPanel
              order={{
                id: order.id,
                status: order.status,
                paymentMethod: order.paymentMethod,
                paymentStatus: order.paymentStatus,
                total: order.total,
                shipping: order.shipping,
                courier: order.courier,
              }}
              onChanged={reload}
            />
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
