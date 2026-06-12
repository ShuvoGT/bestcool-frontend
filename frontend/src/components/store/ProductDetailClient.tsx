"use client";

/**
 * Single-product purchase panel: gallery with zoom, variant selection,
 * quantity, Add to Cart / Buy Now, wishlist, flash countdown, trust badges,
 * and a sticky mobile add-to-cart bar.
 */
import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heart, Minus, Plus, RotateCcw, ShieldCheck, ShoppingCart, Truck, Zap } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { bdt } from "@/lib/format";
import { Countdown } from "@/components/store/Countdown";
import { RatingStars } from "@/components/store/RatingStars";
import { Button } from "@/components/ui/button";
import type { ProductDetailData } from "@/lib/server-api";
import { cn } from "@/lib/utils";

export function ProductDetailClient({ product }: { product: ProductDetailData }) {
  const router = useRouter();
  const { addToCart, toggleWishlist, isWishlisted, ready } = useStore();
  const [imageIndex, setImageIndex] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const needsVariant = product.variants.length > 0 && !variant;
  const unitPrice = product.price + (variant?.priceDiff ?? 0);
  const regularUnit = product.regularPrice + (variant?.priceDiff ?? 0);
  const stock = variant ? variant.stock : product.stock;
  const out = stock <= 0;
  const wished = ready && isWishlisted(product.id);

  // Group variant attribute names for nicer selector labels, e.g. Color / Storage.
  const attributeSummary = useMemo(
    () => [...new Set(product.variants.flatMap((v) => Object.keys(v.attributes)))].join(" / "),
    [product.variants]
  );

  function buildCartItem() {
    return {
      productId: product.id,
      variantId: variant?.id,
      quantity,
      name: product.name,
      slug: product.slug,
      image: product.images[0]?.url ?? null,
      unitPrice,
      variantName: variant?.name,
      maxStock: stock,
    };
  }

  function handleAdd(buyNow = false) {
    if (needsVariant) {
      toast.error(`Please select a ${attributeSummary || "variant"} first`);
      return;
    }
    addToCart(buildCartItem());
    if (buyNow) {
      router.push("/cart");
    } else {
      toast.success(`${product.name} added to cart`);
    }
  }

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="group relative aspect-square overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
            {product.images[imageIndex] && (
              <Image
                src={product.images[imageIndex].url}
                alt={product.images[imageIndex].alt ?? product.name}
                fill
                unoptimized
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-125"
              />
            )}
            {product.flashSale && (
              <span className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-xs font-bold text-white shadow">
                <Zap className="h-3.5 w-3.5" /> Flash Sale
              </span>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setImageIndex(i)}
                  className={cn(
                    "relative h-18 w-18 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                    i === imageIndex ? "border-blue-600" : "border-transparent hover:border-zinc-300"
                  )}
                  aria-label={`View image ${i + 1}`}
                >
                  <Image src={img.url} alt="" fill unoptimized className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="flex flex-col gap-4">
          {product.category && (
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600">{product.category.name}</span>
          )}
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-zinc-900 sm:text-3xl">{product.name}</h1>
          <div className="flex items-center gap-3">
            <RatingStars rating={product.rating.average} count={product.rating.count} />
            {product.sku && <span className="text-xs text-zinc-400">SKU: {product.sku}</span>}
          </div>

          {/* Price */}
          <div className="flex flex-wrap items-center gap-3">
            <span className={cn("text-3xl font-extrabold", product.flashSale ? "text-orange-600" : "text-zinc-900")}>
              {bdt(unitPrice)}
            </span>
            {unitPrice < regularUnit && (
              <>
                <span className="text-lg text-zinc-400 line-through">{bdt(regularUnit)}</span>
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-600">
                  Save {Math.round(((regularUnit - unitPrice) / regularUnit) * 100)}%
                </span>
              </>
            )}
          </div>

          {/* Flash countdown */}
          {product.flashSale && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <span className="text-sm font-semibold text-amber-700">⚡ {product.flashSale.title} ends in</span>
              <Countdown endsAt={product.flashSale.endsAt} size="sm" />
            </div>
          )}

          {/* Variants */}
          {product.variants.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-semibold text-zinc-900">
                Choose {attributeSummary || "variant"}
                {variant && <span className="ml-2 font-normal text-zinc-500">— {variant.name}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { setVariantId(v.id); setQuantity(1); }}
                    disabled={v.stock <= 0}
                    className={cn(
                      "rounded-lg border px-3.5 py-2 text-sm font-medium transition-all",
                      v.id === variantId
                        ? "border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600"
                        : "border-zinc-200 text-zinc-700 hover:border-zinc-400",
                      v.stock <= 0 && "cursor-not-allowed opacity-40 line-through"
                    )}
                  >
                    {v.name}
                    {v.priceDiff !== 0 && (
                      <span className="ml-1 text-xs text-zinc-400">({v.priceDiff > 0 ? "+" : ""}{bdt(v.priceDiff)})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stock */}
          <div className="text-sm">
            {out ? (
              <span className="font-semibold text-rose-600">Out of stock</span>
            ) : stock <= 5 ? (
              <span className="font-semibold text-amber-600">Only {stock} left — order soon!</span>
            ) : (
              <span className="font-semibold text-emerald-600">✓ In stock</span>
            )}
          </div>

          {/* Quantity + actions */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-zinc-300">
              <button
                className="px-3.5 py-3 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-10 text-center font-bold">{quantity}</span>
              <button
                className="px-3.5 py-3 text-zinc-500 hover:text-zinc-900 disabled:opacity-30"
                onClick={() => setQuantity((q) => Math.min(stock || 99, q + 1))}
                disabled={quantity >= stock}
                aria-label="Increase quantity"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              size="lg"
              disabled={out}
              onClick={() => handleAdd(false)}
              className="h-12 flex-1 gap-2 bg-blue-600 text-base font-semibold text-white shadow-lg shadow-blue-200 hover:bg-blue-700 sm:flex-none sm:px-8"
            >
              <ShoppingCart className="h-5 w-5" /> Add to Cart
            </Button>
            <Button
              size="lg"
              disabled={out}
              onClick={() => handleAdd(true)}
              className="h-12 flex-1 bg-zinc-900 text-base font-semibold text-white hover:bg-zinc-800 sm:flex-none sm:px-8"
            >
              Buy Now
            </Button>
            <button
              onClick={() => {
                toggleWishlist({ productId: product.id, slug: product.slug });
                toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
              }}
              aria-label="Toggle wishlist"
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl border transition-all",
                wished ? "border-rose-200 bg-rose-50 text-rose-500" : "border-zinc-300 text-zinc-400 hover:border-rose-300 hover:text-rose-500"
              )}
            >
              <Heart className={cn("h-5 w-5", wished && "fill-rose-500")} />
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-2 grid grid-cols-3 gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            {[
              { icon: ShieldCheck, label: "Secure Payment", sub: "bKash · Nagad · Cards · COD" },
              { icon: RotateCcw, label: "Easy Returns", sub: "7-day replacement" },
              { icon: Truck, label: "Fast Delivery", sub: "All 64 districts" },
            ].map(({ icon: Icon, label, sub }) => (
              <div key={label} className="flex flex-col items-center gap-1 text-center">
                <Icon className="h-5 w-5 text-blue-600" />
                <span className="text-xs font-semibold text-zinc-900">{label}</span>
                <span className="text-[10px] text-zinc-500">{sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky mobile add-to-cart bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-zinc-500">{product.name}</div>
          <div className="text-lg font-extrabold text-zinc-900">{bdt(unitPrice * quantity)}</div>
        </div>
        <Button disabled={out} onClick={() => handleAdd(false)} className="gap-1.5 bg-blue-600 font-semibold text-white hover:bg-blue-700">
          <ShoppingCart className="h-4 w-4" /> Add to Cart
        </Button>
      </div>
      {/* spacer so the sticky bar never covers the footer on mobile */}
      <div className="h-16 lg:hidden" />
    </>
  );
}
