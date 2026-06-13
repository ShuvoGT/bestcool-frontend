"use client";

/** Full cart page: line items, quantity steppers, shipping estimate, totals. */
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { api } from "@/lib/api";
import { bdt } from "@/lib/format";
import { Button } from "@/components/ui/button";

type Zone = { id: string; name: string; charge: number };

export default function CartPage() {
  const { cart, cartSubtotal, updateQuantity, removeFromCart, ready } = useStore();
  const [zones, setZones] = useState<Zone[]>([]);

  useEffect(() => {
    api<{ zones: Zone[] }>("/delivery-zones").then((r) => setZones(r.zones)).catch(() => undefined);
  }, []);

  const minCharge = zones.length ? Math.min(...zones.map((z) => z.charge)) : 0;

  if (!ready) return null;

  if (cart.length === 0) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
        <ShoppingCart className="h-12 w-12 text-zinc-200" />
        <h1 className="text-2xl font-extrabold text-zinc-900">Your cart is empty</h1>
        <p className="text-sm text-zinc-500">Add some products and they&apos;ll show up here.</p>
        <Link href="/shop"><Button className="bg-brand text-white hover:bg-brand-dark">Browse products</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-8 text-3xl font-extrabold tracking-tight text-zinc-900">Shopping Cart</h1>
      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        {/* Line items */}
        <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
          {cart.map((item) => (
            <div key={`${item.productId}-${item.variantId ?? ""}`} className="flex gap-4 p-4 sm:p-5">
              <Link href={`/product/${item.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50 sm:h-24 sm:w-24">
                {item.image && <Image src={item.image} alt="" fill unoptimized className="object-cover" />}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <Link href={`/product/${item.slug}`} className="line-clamp-2 font-semibold text-zinc-900 hover:text-brand">
                  {item.name}
                </Link>
                {item.variantName && <span className="text-xs text-zinc-500">{item.variantName}</span>}
                <span className="mt-0.5 text-sm text-zinc-500">{bdt(item.unitPrice)} each</span>
                <div className="mt-auto flex items-center justify-between pt-2">
                  <div className="flex items-center rounded-full border border-zinc-200">
                    <button
                      className="px-3 py-1.5 text-zinc-500 hover:text-zinc-900"
                      onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                      aria-label="Decrease"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-8 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      className="px-3 py-1.5 text-zinc-500 hover:text-zinc-900"
                      onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                      aria-label="Increase"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-zinc-900">{bdt(item.unitPrice * item.quantity)}</span>
                    <button
                      onClick={() => removeFromCart(item.productId, item.variantId)}
                      className="text-zinc-400 transition-colors hover:text-rose-500"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4.5 w-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="h-fit rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <h2 className="mb-4 text-lg font-bold text-zinc-900">Order Summary</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal</span><span className="font-semibold text-zinc-900">{bdt(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Delivery</span>
              <span>{zones.length ? `from ${bdt(minCharge)}` : "calculated at checkout"}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-3 text-base font-bold text-zinc-900">
              <span>Estimated total</span><span>{bdt(cartSubtotal + minCharge)}</span>
            </div>
          </div>
          <Link href="/checkout">
            <Button className="mt-5 h-12 w-full bg-brand text-base font-semibold text-white shadow-lg shadow-orange-200 hover:bg-brand-dark">
              Proceed to Checkout
            </Button>
          </Link>
          <p className="mt-3 text-center text-xs text-zinc-400">
            COD · bKash · Nagad · Cards — no login required
          </p>
        </div>
      </div>
    </div>
  );
}
