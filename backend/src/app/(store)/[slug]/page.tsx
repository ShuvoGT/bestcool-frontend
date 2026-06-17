/**
 * Generic CMS page route: about-us, contact-us, showroom, terms,
 * privacy-policy, refund-policy. Static routes (shop, product, …) win
 * over this dynamic segment automatically.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/server-api";
import { pageTitle } from "@/lib/seo";
import { BlockRenderer } from "@/components/store/blocks/BlockRenderer";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return {};
  const description = page.metaDescription ?? undefined;
  return {
    title: pageTitle(page.metaTitle, page.title),
    description,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      type: "website",
      title: page.metaTitle ?? page.title,
      description,
      url: `/${slug}`,
      images: page.ogImage ? [page.ogImage] : undefined,
    },
  };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page || slug === "home") notFound();

  return (
    <>
      <div className="border-b border-zinc-100 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900">{page.title}</h1>
        </div>
      </div>
      <BlockRenderer blocks={page.blocks} />
    </>
  );
}
