import type { Metadata } from "next";
import { getPage } from "@/lib/server-api";
import { pageTitle } from "@/lib/seo";
import { BlockRenderer } from "@/components/store/blocks/BlockRenderer";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("home");
  return {
    // No title set → falls back to the SEO default title from the root layout.
    title: page?.metaTitle ? { absolute: page.metaTitle } : undefined,
    description: page?.metaDescription ?? undefined,
    alternates: { canonical: "/" },
    openGraph: { url: "/", images: page?.ogImage ? [page.ogImage] : undefined },
  };
}

export default async function HomePage() {
  const page = await getPage("home");
  if (!page) {
    return (
      <div className="flex min-h-96 items-center justify-center text-zinc-500">
        Could not load page content — is the API running?
      </div>
    );
  }
  return <BlockRenderer blocks={page.blocks} />;
}
