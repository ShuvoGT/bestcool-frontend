"use client";

/**
 * Admin "Send to Courier" panel (spec §11).
 * Shows configured couriers only; a courier that isn't set up in Settings →
 * Couriers never appears here. On dispatch the order auto-advances to SHIPPED.
 */
import { useState } from "react";
import { ExternalLink, Loader2, RefreshCw, Truck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { TextField, NumberField } from "@/components/admin/fields";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type OrderForCourier = {
  id: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  total: number;
  shipping: { name: string; phone: string; address: string; district: string };
  courier: { name: string; consignmentId: string | null; status: string | null; trackingUrl: string | null } | null;
};

export function CourierPanel({ order, onChanged }: { order: OrderForCourier; onChanged: () => void }) {
  const { data: couriers } = useLoad(() =>
    api<{ couriers: { name: string; label: string }[] }>("/admin/couriers").then((r) => r.couriers)
  );
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // COD orders not yet paid → the courier collects the total; otherwise 0.
  const defaultCod = order.paymentMethod === "COD" && order.paymentStatus !== "PAID" ? order.total : 0;
  const [form, setForm] = useState({
    courier: "",
    recipientName: order.shipping.name,
    recipientPhone: order.shipping.phone,
    recipientAddress: order.shipping.address,
    recipientCity: order.shipping.district,
    recipientZone: "",
    codAmount: defaultCod as number | "",
    note: "",
  });

  async function refresh() {
    setBusy(true);
    try {
      const r = await api<{ status: string }>(`/admin/orders/${order.id}/refresh-courier`, { method: "POST" });
      toast.success(`Courier status: ${r.status}`);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!form.courier) return toast.error("Select a courier");
    setBusy(true);
    try {
      await api(`/admin/orders/${order.id}/send-to-courier`, {
        method: "POST",
        body: {
          courier: form.courier,
          recipientName: form.recipientName,
          recipientPhone: form.recipientPhone,
          recipientAddress: form.recipientAddress,
          recipientCity: form.recipientCity,
          recipientZone: form.recipientZone || undefined,
          codAmount: Number(form.codAmount || 0),
          note: form.note || undefined,
        },
      });
      toast.success("Sent to courier — order marked shipped");
      setOpen(false);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-zinc-100">
        <Truck className="h-4 w-4 text-cyan-400" /> Courier
      </h2>

      {/* Already shipped via a courier */}
      {order.courier?.consignmentId ? (
        <div className="space-y-1.5 text-sm">
          <p className="text-zinc-200">{order.courier.name}</p>
          <p className="text-zinc-500">Tracking: <span className="font-mono text-zinc-300">{order.courier.consignmentId}</span></p>
          {order.courier.status && <p className="text-zinc-500">Status: <span className="text-zinc-300">{order.courier.status}</span></p>}
          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" variant="outline" disabled={busy} onClick={refresh} className="gap-1.5 border-white/10 bg-white/5">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Refresh status
            </Button>
            {order.courier.trackingUrl && (
              <a href={order.courier.trackingUrl} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="outline" className="gap-1.5 border-white/10 bg-white/5">
                  <ExternalLink className="h-3.5 w-3.5" /> Track
                </Button>
              </a>
            )}
          </div>
        </div>
      ) : !couriers ? (
        <p className="text-sm text-zinc-500">Loading couriers…</p>
      ) : couriers.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No courier configured. Add one in <span className="text-cyan-400">Settings → Couriers</span> to enable shipping.
        </p>
      ) : order.status === "CANCELLED" || order.status === "DELIVERED" ? (
        <p className="text-sm text-zinc-500">This order can no longer be sent to a courier.</p>
      ) : !open ? (
        <Button
          onClick={() => setOpen(true)}
          className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/20 hover:from-cyan-400 hover:to-violet-500"
        >
          <Truck className="mr-1.5 h-4 w-4" /> Send to Courier
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Courier</Label>
            <Select value={form.courier} onValueChange={(v) => setForm({ ...form, courier: v })}>
              <SelectTrigger className="border-white/10 bg-white/5 text-zinc-100"><SelectValue placeholder="Choose courier" /></SelectTrigger>
              <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100">
                {couriers.map((c) => <SelectItem key={c.name} value={c.name}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <TextField label="Recipient name" value={form.recipientName} onChange={(v) => setForm({ ...form, recipientName: v })} />
          <TextField label="Phone" value={form.recipientPhone} onChange={(v) => setForm({ ...form, recipientPhone: v })} />
          <TextField label="Address" value={form.recipientAddress} onChange={(v) => setForm({ ...form, recipientAddress: v })} />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="City / District" value={form.recipientCity} onChange={(v) => setForm({ ...form, recipientCity: v })} />
            <TextField label="Zone/Area ID (optional)" value={form.recipientZone} onChange={(v) => setForm({ ...form, recipientZone: v })} />
          </div>
          <NumberField label="COD amount (৳)" value={form.codAmount} onChange={(v) => setForm({ ...form, codAmount: v })} min={0} />
          <TextField label="Note (optional)" value={form.note} onChange={(v) => setForm({ ...form, note: v })} />
          <div className="flex gap-2">
            <Button disabled={busy} onClick={send} className="flex-1 bg-gradient-to-r from-cyan-500 to-violet-600 text-white">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create consignment"}
            </Button>
            <Button variant="outline" className="border-white/10 bg-white/5" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
