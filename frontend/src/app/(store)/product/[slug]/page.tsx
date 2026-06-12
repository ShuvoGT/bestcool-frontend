import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getProduct, getRelatedProducts, getReviews } from "@/lib/server-api";
import { ProductDetailClient } from "@/components/store/ProductDetailClient";
import { ProductTabs } from "@/components/store/ProductTabs";
import { ProductCard } from "@/components/store/ProductCard";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  return {
    title: `${product.name} — Buy at the Best Price`,
    description: `Buy ${product.name} in Bangladesh${product.category ? ` (${product.category.name})` : ""}. Genuine product, official warranty, cash on delivery available.`,
    openGraph: product.image ? { images: [product.image] } : undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [related, reviews] = await Promise.all([getRelatedProducts(slug), getReviews(slug)]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Breadcrumb */}
      <nav className="mb-5 flex items-center gap-1 text-xs text-zinc-400" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-zinc-700">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/shop" className="hover:text-zinc-700">Shop</Link>
        {product.category && (
          <>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/shop?category=${product.category.slug}`} className="hover:text-zinc-700">{product.category.name}</Link>
          </>
        )}
        <ChevronRight className="h-3 w-3" />
        <span className="truncate text-zinc-600">{product.name}</span>
      </nav>

      <ProductDetailClient product={product} />
      <ProductTabs product={product} reviews={reviews} />

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-zinc-900">Related Products</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
            {related.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
