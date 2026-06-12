"use client";

/** Wishlist page — items live in localStorage (guests) and merge into the
 *  account at login. Prices/stock are fetched fresh, so they're always
 *  sale/flash-sale aware. */
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { bdt } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductDetailData } from "@/lib/server-api";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export default function WishlistPage() {
  const { wishlist, toggleWishlist, addToCart, ready } = useStore();
  const [products, setProducts] = useState<ProductDetailData[] | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (wishlist.length === 0) {
      setProducts([]);
      return;
    }
    Promise.all(
      wishlist.map((w) =>
        fetch(`${API_BASE}/api/products/${encodeURIComponent(w.slug)}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => d?.product ?? null)
          .catch(() => null)
      )
    ).then((list) => setProducts(list.filter(Boolean) as ProductDetailData[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, wishlist.length]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="mb-1 text-3xl font-extrabold tracking-tight text-zinc-900">My Wishlist</h1>
      <p className="mb-8 text-sm text-zinc-500">{wishlist.length} item{wishlist.length === 1 ? "" : "s"} saved</p>

      {!ready || products === null ? (
        <div className="space-y-3">{[1, 2, 3].map((n) => <Skeleton key={n} className="h-24 w-full rounded-xl" />)}</div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <Heart className="h-12 w-12 text-zinc-200" />
          <p className="text-zinc-500">Your wishlist is empty. Tap the ♥ on any product to save it here.</p>
          <Link href="/shop"><Button className="bg-blue-600 text-white hover:bg-blue-700">Browse products</Button></Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {products.map((p) => {
            const out = p.stock <= 0;
            return (
              <li key={p.id} className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-4">
                <Link href={`/product/${p.slug}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50">
                  {p.image && <Image src={p.image} alt={p.name} fill unoptimized className="object-cover" />}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link href={`/product/${p.slug}`} className="line-clamp-1 font-semibold text-zinc-900 hover:text-blue-600">
                    {p.name}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={cn("font-bold", p.flashSale ? "text-orange-600" : "text-zinc-900")}>{bdt(p.price)}</span>
                    {p.price < p.regularPrice && <span className="text-xs text-zinc-400 line-through">{bdt(p.regularPrice)}</span>}
                    {p.flashSale && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">⚡ Flash Sale</span>}
                  </div>
                  <div className={cn("mt-0.5 text-xs font-medium", out ? "text-rose-500" : "text-emerald-600")}>
                    {out ? "Out of stock" : "In stock"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    disabled={out}
                    onClick={() => {
                      if (p.hasVariants) {
                        window.location.href = `/product/${p.slug}`;
                        return;
                      }
                      addToCart({
                        productId: p.id, quantity: 1, name: p.name, slug: p.slug,
                        image: p.image, unitPrice: p.price, maxStock: p.stock,
                      });
                      toast.success(`${p.name} added to cart`);
                    }}
                    className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                  </Button>
                  <button
                    onClick={() => toggleWishlist({ productId: p.id, slug: p.slug })}
                    aria-label="Remove from wishlist"
                    className="rounded-full p-2 text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
