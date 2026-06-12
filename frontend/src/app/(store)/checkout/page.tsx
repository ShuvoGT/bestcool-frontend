"use client";

/**
 * Single-page checkout (spec §4): shipping form, delivery method,
 * payment method, order summary. Guest checkout — no login required;
 * an account is auto-created server-side (spec §6).
 */
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Banknote, CreditCard, Loader2, Lock, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { api, ApiError } from "@/lib/api";
import { bdt } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Zone = { id: string; name: string; charge: number };

const PAYMENT_METHODS = [
  { value: "COD", label: "Cash on Delivery", sub: "Pay when you receive", icon: Banknote, enabled: true },
  { value: "BKASH", label: "bKash", sub: "Online payments launch soon", icon: Smartphone, enabled: false },
  { value: "NAGAD", label: "Nagad", sub: "Online payments launch soon", icon: Smartphone, enabled: false },
  { value: "SSLCOMMERZ", label: "Card / Net Banking", sub: "Online payments launch soon", icon: CreditCard, enabled: false },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartSubtotal, clearCart, ready } = useStore();
  const { user } = useAuth();
  const [zones, setZones] = useState<Zone[]>([]);
  const [zoneId, setZoneId] = useState("");
  const [payment, setPayment] = useState("COD");
  const [placing, setPlacing] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", district: "", notes: "" });

  useEffect(() => {
    api<{ zones: Zone[] }>("/delivery-zones")
      .then((r) => {
        setZones(r.zones);
        if (r.zones[0]) setZoneId(r.zones[0].id);
      })
      .catch(() => toast.error("Could not load delivery options — is the API running?"));
  }, []);

  // Prefill from the logged-in user's profile + default address.
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({ ...f, name: f.name || user.name, email: f.email || user.email, phone: f.phone || user.phone || "" }));
    api<{ addresses: { fullName: string; phone: string; address: string; district: string; isDefault: boolean }[] }>("/auth/addresses")
      .then((r) => {
        const addr = r.addresses.find((a) => a.isDefault) ?? r.addresses[0];
        if (addr) {
          setForm((f) => ({
            ...f,
            name: f.name || addr.fullName,
            phone: f.phone || addr.phone,
            address: f.address || addr.address,
            district: f.district || addr.district,
          }));
        }
      })
      .catch(() => undefined);
  }, [user]);

  const zone = zones.find((z) => z.id === zoneId);
  const shipping = zone?.charge ?? 0;

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!cart.length) return;
    if (!zoneId) return toast.error("Please select a delivery method");
    setPlacing(true);
    try {
      const res = await api<{ orderNumber: string; accountCreated: boolean }>("/orders", {
        method: "POST",
        body: {
          customer: { name: form.name, email: form.email, phone: form.phone },
          shipping: { address: form.address, district: form.district, notes: form.notes || undefined },
          deliveryZoneId: zoneId,
          paymentMethod: payment,
          items: cart.map((c) => ({ productId: c.productId, variantId: c.variantId, quantity: c.quantity })),
        },
      });
      clearCart();
      router.replace(`/order-success?order=${res.orderNumber}&new=${res.accountCreated ? 1 : 0}`);
    } catch (err) {
      const msg = err instanceof ApiError && err.details?.length ? err.details.join("; ") : err instanceof Error ? err.message : "Order failed";
      toast.error(msg);
      setPlacing(false);
    }
  }

  if (ready && cart.length === 0 && !placing) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl font-extrabold text-zinc-900">Nothing to check out</h1>
        <p className="text-sm text-zinc-500">Your cart is empty.</p>
        <Link href="/shop"><Button className="bg-blue-600 text-white hover:bg-blue-700">Browse products</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-extrabold tracking-tight text-zinc-900">Checkout</h1>
      <form onSubmit={placeOrder} className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {/* Shipping */}
          <section className="rounded-xl border border-zinc-200 p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-zinc-900">1. Shipping Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full name *</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your full name" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone *</Label>
                <Input required type="tel" minLength={11} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01XXXXXXXXX" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Email *</Label>
                <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
                {!user && <p className="text-xs text-zinc-400">We&apos;ll create an account for you automatically and email the login details.</p>}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Full address *</Label>
                <Input required minLength={5} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="House, road, area" />
              </div>
              <div className="space-y-1.5">
                <Label>District / City *</Label>
                <Input required value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="e.g. Dhaka" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Order notes (optional)</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Anything we should know? e.g. call before delivery" />
              </div>
            </div>
          </section>

          {/* Delivery method */}
          <section className="rounded-xl border border-zinc-200 p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-zinc-900">2. Delivery Method</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {zones.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setZoneId(z.id)}
                  className={cn(
                    "flex items-center justify-between rounded-xl border-2 px-4 py-3.5 text-left transition-all",
                    zoneId === z.id ? "border-blue-600 bg-blue-50" : "border-zinc-200 hover:border-zinc-300"
                  )}
                >
                  <span className="font-semibold text-zinc-900">{z.name}</span>
                  <span className="font-bold text-blue-700">{bdt(z.charge)}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-xl border border-zinc-200 p-5 sm:p-6">
            <h2 className="mb-4 text-lg font-bold text-zinc-900">3. Payment Method</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {PAYMENT_METHODS.map(({ value, label, sub, icon: Icon, enabled }) => (
                <button
                  key={value}
                  type="button"
                  disabled={!enabled}
                  onClick={() => setPayment(value)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-all",
                    payment === value ? "border-blue-600 bg-blue-50" : "border-zinc-200 hover:border-zinc-300",
                    !enabled && "cursor-not-allowed opacity-45"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0 text-blue-600" />
                  <span>
                    <span className="block font-semibold text-zinc-900">{label}</span>
                    <span className="block text-xs text-zinc-500">{sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Summary sidebar */}
        <aside className="h-fit rounded-xl border border-zinc-200 bg-zinc-50 p-6 lg:sticky lg:top-20">
          <h2 className="mb-4 text-lg font-bold text-zinc-900">Your Order</h2>
          <ul className="mb-4 max-h-72 space-y-3 overflow-y-auto">
            {cart.map((item) => (
              <li key={`${item.productId}-${item.variantId ?? ""}`} className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zinc-200 bg-white">
                  {item.image && <Image src={item.image} alt="" fill unoptimized className="object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="line-clamp-1 text-sm font-medium text-zinc-900">{item.name}</div>
                  <div className="text-xs text-zinc-500">
                    {item.variantName ? `${item.variantName} · ` : ""}×{item.quantity}
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-zinc-900">{bdt(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-zinc-200 pt-3 text-sm">
            <div className="flex justify-between text-zinc-600"><span>Subtotal</span><span>{bdt(cartSubtotal)}</span></div>
            <div className="flex justify-between text-zinc-600"><span>Delivery {zone ? `(${zone.name})` : ""}</span><span>{bdt(shipping)}</span></div>
            <div className="flex justify-between border-t border-zinc-200 pt-2 text-base font-extrabold text-zinc-900">
              <span>Total</span><span>{bdt(cartSubtotal + shipping)}</span>
            </div>
          </div>
          <Button
            type="submit"
            disabled={placing || !cart.length}
            className="mt-5 h-12 w-full gap-2 bg-blue-600 text-base font-semibold text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
          >
            {placing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-4 w-4" />}
            Place Order — {bdt(cartSubtotal + shipping)}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-zinc-400">
            <Lock className="h-3 w-3" /> Prices are verified securely on our server
          </p>
        </aside>
      </form>
    </div>
  );
}
