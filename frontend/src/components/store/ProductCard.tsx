"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, ShoppingCart, Zap } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { bdt } from "@/lib/format";
import { RatingStars } from "@/components/store/RatingStars";
import type { ProductCardData } from "@/lib/server-api";
import { cn } from "@/lib/utils";

export function ProductCard({ product }: { product: ProductCardData }) {
  const { addToCart, toggleWishlist, isWishlisted, ready } = useStore();
  const wished = ready && isWishlisted(product.id);
  const out = product.stock <= 0;

  function quickAdd() {
    if (product.hasVariants) {
      window.location.href = `/product/${product.slug}`;
      return;
    }
    addToCart({
      productId: product.id,
      quantity: 1,
      name: product.name,
      slug: product.slug,
      image: product.image,
      unitPrice: product.price,
      maxStock: product.stock,
    });
    toast.success(`${product.name} added to cart`);
  }

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200/80 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-brand/30 hover:shadow-[0_12px_40px_-12px_rgba(242,100,30,0.35)]">
      {/* Badges */}
      <div className="absolute left-0 top-3 z-10 flex flex-col gap-1.5">
        {product.flashSale ? (
          <span className="flex items-center gap-1 rounded-r-full bg-gradient-to-r from-brand to-brand-dark px-2.5 py-1 text-[11px] font-bold text-white shadow">
            <Zap className="h-3 w-3" /> Flash
          </span>
        ) : product.discountPercent > 0 ? (
          <span className="rounded-r-full bg-brand px-2.5 py-1 text-[11px] font-bold text-white shadow">
            -{product.discountPercent}%
          </span>
        ) : null}
        {out && <span className="rounded-r-full bg-zinc-700 px-2.5 py-1 text-[11px] font-bold text-white">Stock out</span>}
      </div>

      {/* Wishlist heart */}
      <button
        onClick={() => {
          toggleWishlist({ productId: product.id, slug: product.slug });
          toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
        }}
        aria-label="Toggle wishlist"
        className={cn(
          "absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-zinc-200 backdrop-blur transition-all hover:scale-110",
          wished ? "text-rose-500" : "text-zinc-400 hover:text-rose-500"
        )}
      >
        <Heart className={cn("h-4 w-4", wished && "fill-rose-500")} />
      </button>

      {/* Image */}
      <Link href={`/product/${product.slug}`} className="relative aspect-square overflow-hidden bg-white p-3">
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-3 transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1 border-t border-zinc-100 p-3.5">
        {product.category && (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-brand">{product.category.name}</span>
        )}
        <Link
          href={`/product/${product.slug}`}
          className="line-clamp-2 min-h-10 text-sm font-semibold leading-tight text-ink transition-colors hover:text-brand"
        >
          {product.name}
        </Link>
        <div className="flex items-center gap-2">
          <RatingStars rating={product.rating.average} count={product.rating.count} size="sm" />
        </div>

        <div className="mt-1 flex items-end justify-between gap-2">
          <div className="leading-tight">
            <div className="text-lg font-extrabold text-ink">{bdt(product.price)}</div>
            {product.price < product.regularPrice && (
              <div className="text-xs text-zinc-400 line-through">{bdt(product.regularPrice)}</div>
            )}
          </div>
          <span className={cn("text-[11px] font-semibold", out ? "text-rose-500" : "text-emerald-600")}>
            {out ? "Stock out" : "In stock"}
          </span>
        </div>

        <button
          onClick={quickAdd}
          disabled={out}
          className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-brand-soft py-2 text-sm font-bold text-brand transition-all hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
        >
          <ShoppingCart className="h-4 w-4" /> Add to Cart
        </button>
      </div>
    </div>
  );
}
