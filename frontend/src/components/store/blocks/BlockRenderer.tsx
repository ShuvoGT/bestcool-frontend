/**
 * Renders enriched CMS blocks into storefront sections.
 * Server component — interactive children (slider, product cards, countdown)
 * are client components composed inside.
 */
import Image from "next/image";
import Link from "next/link";
import { Mail, MapPin, Phone, Clock, Zap, ChevronRight } from "lucide-react";
import type { CmsBlock, ProductCardData } from "@/lib/server-api";
import { HeroSlider, type Slide } from "@/components/store/blocks/HeroSlider";
import { ProductCard } from "@/components/store/ProductCard";
import { Countdown } from "@/components/store/Countdown";
import { RatingStars } from "@/components/store/RatingStars";
import { Reveal } from "@/components/store/Reveal";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

/** Left-aligned section heading with an orange accent bar + optional link. */
function SectionHeading({ heading, subheading, viewAll }: { heading?: string; subheading?: string; viewAll?: string }) {
  if (!heading) return null;
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
          <span className="h-6 w-1.5 rounded-full bg-brand" />
          {heading}
        </h2>
        {subheading && <p className="mt-1.5 pl-4 text-sm text-zinc-500">{subheading}</p>}
      </div>
      {viewAll && (
        <Link href={viewAll} className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-brand hover:text-brand-dark">
          View all <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

const wrap = "mx-auto max-w-7xl px-4 sm:px-6";

export function BlockRenderer({ blocks }: { blocks: CmsBlock[] }) {
  return (
    <>
      {blocks.map((block) => (
        <Block key={block.id} block={block} />
      ))}
    </>
  );
}

function Block({ block }: { block: CmsBlock }) {
  const c = block.content;

  switch (block.type) {
    case "HERO_SLIDER":
      return <HeroSlider slides={(c.slides ?? []) as Slide[]} />;

    case "BANNER": {
      if (!c.image) return null;
      const img = (
        <div className="relative w-full overflow-hidden rounded-xl">
          <Image src={c.image as string} alt={(c.alt as string) ?? ""} width={1600} height={300} unoptimized className="h-auto w-full object-cover" />
        </div>
      );
      return (
        <section className={cn(wrap, "py-6")}>
          {c.link ? <Link href={c.link as string}>{img}</Link> : img}
        </section>
      );
    }

    case "RICH_TEXT":
      return (
        <section className={cn(wrap, "max-w-3xl py-10")}>
          <div
            className="prose-h2 space-y-4 text-[15px] leading-relaxed text-zinc-600 [&_a]:text-brand [&_a]:underline [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-zinc-900 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-zinc-900 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-zinc-900"
            dangerouslySetInnerHTML={{ __html: (c.html as string) ?? "" }}
          />
        </section>
      );

    case "IMAGE_TEXT":
      return (
        <section className={cn(wrap, "py-10")}>
          <div className={cn("grid items-center gap-8 md:grid-cols-2")}>
            <div className={cn("relative aspect-[4/3] overflow-hidden rounded-2xl", c.layout === "right" && "md:order-2")}>
              {c.image && <Image src={c.image as string} alt={(c.heading as string) ?? ""} fill unoptimized className="object-cover" />}
            </div>
            <div>
              {c.heading && <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-zinc-900 sm:text-3xl">{c.heading as string}</h2>}
              <div
                className="space-y-3 text-[15px] leading-relaxed text-zinc-600 [&_li]:mb-2 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-zinc-900"
                dangerouslySetInnerHTML={{ __html: (c.html as string) ?? "" }}
              />
            </div>
          </div>
        </section>
      );

    case "IMAGE_GALLERY": {
      const images = (c.images ?? []) as { url: string; alt?: string }[];
      if (!images.length) return null;
      return (
        <section className={cn(wrap, "py-10")}>
          <SectionHeading heading={c.heading as string} />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {images.map((img, i) => (
              <div key={i} className="group relative aspect-[4/3] overflow-hidden rounded-xl">
                <Image src={img.url} alt={img.alt ?? ""} fill unoptimized className="object-cover transition-transform duration-300 group-hover:scale-105" />
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "FEATURED_PRODUCTS": {
      const products = (block.data?.products ?? []) as ProductCardData[];
      if (!products.length) return null;
      return (
        <section className={cn(wrap, "py-9")}>
          <SectionHeading heading={c.heading as string} subheading={c.subheading as string} viewAll="/shop" />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 70}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      );
    }

    case "CATEGORY_PRODUCTS": {
      const products = (block.data?.products ?? []) as ProductCardData[];
      const category = block.data?.category as { id: string; name: string; slug: string } | null;
      if (!products.length) return null;
      // Heading defaults to the category name; "View all" deep-links to it.
      const heading = (c.heading as string) || category?.name || "Products";
      return (
        <section className={cn(wrap, "py-9")}>
          <SectionHeading heading={heading} subheading={c.subheading as string} viewAll={category ? `/shop?category=${category.slug}` : "/shop"} />
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {products.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 70}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      );
    }

    case "FEATURED_CATEGORIES": {
      const categories = (block.data?.categories ?? []) as { id: string; name: string; slug: string; image: string | null; productCount: number }[];
      if (!categories.length) return null;
      return (
        <section className={cn(wrap, "py-9")}>
          <SectionHeading heading={c.heading as string} viewAll="/shop" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {categories.map((cat, i) => (
              <Reveal key={cat.id} delay={(i % 6) * 60}>
                <Link
                  href={`/shop?category=${cat.slug}`}
                  className="group flex flex-col items-center gap-3 rounded-xl border border-zinc-200/80 bg-white p-4 text-center transition-all hover:-translate-y-1 hover:border-brand/40 hover:shadow-[0_12px_30px_-14px_rgba(242,100,30,0.4)]"
                >
                  <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-brand-soft ring-1 ring-brand/10 transition-colors group-hover:bg-brand/10">
                    {cat.image ? (
                      <Image src={cat.image} alt={cat.name} fill unoptimized className="object-cover" />
                    ) : (
                      <Zap className="h-8 w-8 text-brand" />
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-bold leading-tight text-ink group-hover:text-brand">{cat.name}</div>
                    <div className="mt-0.5 text-xs text-zinc-400">{cat.productCount} items</div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      );
    }

    case "FLASH_SALE": {
      const sale = block.data?.flashSale as { id: string; title: string; endsAt: string; products: ProductCardData[] } | null;
      if (!sale || !sale.products.length) return null;
      return (
        <section className="py-9">
          <div className={wrap}>
            <div className="overflow-hidden rounded-2xl border border-brand/15 bg-white shadow-sm">
              {/* Deal banner header */}
              <div className="flex flex-col items-center gap-3 bg-gradient-to-r from-brand to-brand-dark px-5 py-4 sm:flex-row sm:justify-between">
                <h2 className="flex items-center gap-2 text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                  <Zap className="h-6 w-6 fill-white" />
                  {(c.heading as string) || sale.title}
                </h2>
                <div className="flex items-center gap-2.5">
                  <span className="text-sm font-medium text-white/90">Ends in</span>
                  <Countdown endsAt={sale.endsAt} size="sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 p-4 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                {sale.products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          </div>
        </section>
      );
    }

    case "TESTIMONIALS": {
      const items = (c.items ?? []) as { name: string; location?: string; rating?: number; text: string }[];
      if (!items.length) return null;
      return (
        <section className="bg-zinc-50 py-12">
          <div className={wrap}>
            <SectionHeading heading={c.heading as string} />
            <div className="grid gap-5 md:grid-cols-3">
              {items.map((t, i) => (
                <figure key={i} className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <RatingStars rating={t.rating ?? 5} size="sm" />
                  <blockquote className="mt-3 text-sm leading-relaxed text-zinc-600">“{t.text}”</blockquote>
                  <figcaption className="mt-4 text-sm font-semibold text-zinc-900">
                    {t.name}
                    {t.location && <span className="ml-1.5 font-normal text-zinc-400">· {t.location}</span>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      );
    }

    case "FAQ": {
      const items = (c.items ?? []) as { question: string; answer: string }[];
      if (!items.length) return null;
      return (
        <section className={cn(wrap, "max-w-3xl py-10")}>
          <SectionHeading heading={c.heading as string} />
          <Accordion type="single" collapsible className="w-full">
            {items.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left font-semibold text-zinc-900">{item.question}</AccordionTrigger>
                <AccordionContent className="text-zinc-600">{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      );
    }

    case "CONTACT_INFO":
      return (
        <section className={cn(wrap, "py-10")}>
          <SectionHeading heading={c.heading as string} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Phone, label: "Phone", value: c.phone as string, href: `tel:${c.phone}` },
              { icon: Mail, label: "Email", value: c.email as string, href: `mailto:${c.email}` },
              { icon: MapPin, label: "Address", value: c.address as string },
              { icon: Clock, label: "Hours", value: c.hours as string },
            ]
              .filter((x) => x.value)
              .map(({ icon: Icon, label, value, href }) => (
                <div key={label} className="rounded-xl border border-zinc-200 bg-white p-5 text-center shadow-sm">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{label}</div>
                  {href ? (
                    <a href={href} className="mt-1 block text-sm font-medium text-zinc-900 hover:text-brand">{value}</a>
                  ) : (
                    <div className="mt-1 text-sm font-medium text-zinc-900">{value}</div>
                  )}
                </div>
              ))}
          </div>
        </section>
      );

    case "MAP_EMBED":
      if (!c.embedUrl) return null;
      return (
        <section className={cn(wrap, "py-10")}>
          <SectionHeading heading={c.heading as string} />
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <iframe
              src={c.embedUrl as string}
              className="h-96 w-full"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={(c.heading as string) || "Map"}
            />
          </div>
        </section>
      );

    default:
      return null;
  }
}
