"use client";

/** Mini-cart drawer. Full cart page + checkout arrive in the checkout phase. */
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { bdt } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function CartSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { cart, cartSubtotal, updateQuantity, removeFromCart } = useStore();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your Cart ({cart.reduce((s, c) => s + c.quantity, 0)})</SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-500">
            <ShoppingCart className="h-10 w-10 text-zinc-300" />
            <p className="text-sm">Your cart is empty</p>
            <Link href="/shop" onClick={() => onOpenChange(false)}>
              <Button variant="outline" size="sm">Browse products</Button>
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-zinc-100 overflow-y-auto px-4">
              {cart.map((item) => (
                <li key={`${item.productId}-${item.variantId ?? ""}`} className="flex gap-3 py-4">
                  {item.image && (
                    <Link href={`/product/${item.slug}`} onClick={() => onOpenChange(false)} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-zinc-100">
                      <Image src={item.image} alt="" fill unoptimized className="object-cover" />
                    </Link>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link href={`/product/${item.slug}`} onClick={() => onOpenChange(false)} className="line-clamp-1 text-sm font-medium text-zinc-900 hover:text-blue-600">
                      {item.name}
                    </Link>
                    {item.variantName && <p className="text-xs text-zinc-500">{item.variantName}</p>}
                    <div className="mt-1.5 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-zinc-200">
                        <button
                          className="px-2 py-1 text-zinc-500 hover:text-zinc-900"
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                          aria-label="Decrease quantity"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-6 text-center text-xs font-semibold">{item.quantity}</span>
                        <button
                          className="px-2 py-1 text-zinc-500 hover:text-zinc-900"
                          onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-semibold text-zinc-900">{bdt(item.unitPrice * item.quantity)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFromCart(item.productId, item.variantId)}
                    className="self-start text-zinc-400 hover:text-rose-500"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="border-t border-zinc-100 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm text-zinc-500">Subtotal</span>
                <span className="text-lg font-bold text-zinc-900">{bdt(cartSubtotal)}</span>
              </div>
              <p className="mb-3 text-xs text-zinc-400">Shipping calculated at checkout.</p>
              <Link href="/cart" onClick={() => onOpenChange(false)}>
                <Button className="w-full bg-blue-600 text-white hover:bg-blue-700">View cart & checkout</Button>
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
