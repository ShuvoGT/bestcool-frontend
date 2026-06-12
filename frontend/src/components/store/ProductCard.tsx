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
      // Variant products need a selection — go to the product page.
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
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/60">
      {/* Badges */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5">
        {product.flashSale && (
          <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
            <Zap className="h-3 w-3" /> Flash Sale
          </span>
        )}
        {!product.flashSale && product.discountPercent > 0 && (
          <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
            -{product.discountPercent}%
          </span>
        )}
        {out && <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[11px] font-bold text-white">Out of stock</span>}
      </div>

      {/* Wishlist heart */}
      <button
        onClick={() => {
          toggleWishlist({ productId: product.id, slug: product.slug });
          toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
        }}
        aria-label="Toggle wishlist"
        className={cn(
          "absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow backdrop-blur transition-all hover:scale-110",
          wished ? "text-rose-500" : "text-zinc-400 hover:text-rose-500"
        )}
      >
        <Heart className={cn("h-4 w-4", wished && "fill-rose-500")} />
      </button>

      {/* Image */}
      <Link href={`/product/${product.slug}`} className="relative aspect-square overflow-hidden bg-zinc-50">
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            fill
            unoptimized
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        {product.category && <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">{product.category.name}</span>}
        <Link href={`/product/${product.slug}`} className="line-clamp-2 text-sm font-semibold text-zinc-900 transition-colors hover:text-blue-600">
          {product.name}
        </Link>
        <RatingStars rating={product.rating.average} count={product.rating.count} size="sm" />
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div>
            <div className={cn("text-lg font-bold", product.flashSale ? "text-orange-600" : "text-zinc-900")}>
              {bdt(product.price)}
            </div>
            {product.price < product.regularPrice && (
              <div className="text-xs text-zinc-400 line-through">{bdt(product.regularPrice)}</div>
            )}
          </div>
          <button
            onClick={quickAdd}
            disabled={out}
            aria-label="Add to cart"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow transition-all hover:bg-blue-700 hover:shadow-md disabled:bg-zinc-300"
          >
            <ShoppingCart className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
