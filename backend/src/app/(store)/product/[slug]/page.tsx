import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { getProduct, getRelatedProducts, getReviews, getSettings } from "@/lib/server-api";
import { getSiteUrl, absoluteUrl, toPlainText } from "@/lib/seo";
import { ProductDetailClient } from "@/components/store/ProductDetailClient";
import { ProductTabs } from "@/components/store/ProductTabs";
import { ProductCard } from "@/components/store/ProductCard";
import { JsonLd } from "@/components/seo/JsonLd";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return {};
  const description = `Buy ${product.name} in Bangladesh${product.category ? ` (${product.category.name})` : ""}. Genuine product, official warranty, cash on delivery available.`;
  const canonical = `/product/${product.slug}`;
  return {
    title: product.name,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: product.name,
      description,
      url: canonical,
      images: product.image ? [product.image] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [related, reviews, settings] = await Promise.all([getRelatedProducts(slug), getReviews(slug), getSettings()]);

  // Structured data: Product (price/availability/rating → rich results) + breadcrumb.
  const base = getSiteUrl(settings);
  const productUrl = `${base}/product/${product.slug}`;
  const images = (product.images?.length ? product.images.map((i) => absoluteUrl(i.url, base)) : product.image ? [absoluteUrl(product.image, base)] : []).filter(Boolean);
  const productLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    ...(images.length ? { image: images } : {}),
    ...(product.description ? { description: toPlainText(product.description) } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "BDT",
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: productUrl,
    },
    ...(product.rating?.count > 0
      ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating.average, reviewCount: product.rating.count } }
      : {}),
  };
  const crumbs = [
    { name: "Home", item: base },
    { name: "Shop", item: `${base}/shop` },
    ...(product.category ? [{ name: product.category.name, item: `${base}/shop?category=${product.category.slug}` }] : []),
    { name: product.name, item: productUrl },
  ];
  const breadcrumbLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: c.item })),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <JsonLd data={[productLd, breadcrumbLd]} />
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
