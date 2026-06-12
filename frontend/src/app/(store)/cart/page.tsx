"use client";

/** Placeholder — the full cart + checkout flow ships in the next phase.
 *  The mini-cart drawer (header) is already functional. */
import Link from "next/link";
import { Construction } from "lucide-react";
import { useStore } from "@/lib/store";
import { bdt } from "@/lib/format";
import { Button } from "@/components/ui/button";

export default function CartPage() {
  const { cart, cartSubtotal } = useStore();

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <Construction className="h-12 w-12 text-amber-400" />
      <h1 className="text-2xl font-extrabold text-zinc-900">Checkout is almost here</h1>
      <p className="text-sm text-zinc-500">
        Your cart has {cart.reduce((s, c) => s + c.quantity, 0)} item(s) worth {bdt(cartSubtotal)} — saved and safe.
        The full cart &amp; checkout experience (COD, bKash, Nagad, cards) ships in the next build phase.
      </p>
      <Link href="/shop"><Button variant="outline">Continue shopping</Button></Link>
    </div>
  );
}
