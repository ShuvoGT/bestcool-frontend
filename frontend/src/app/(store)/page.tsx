import type { Metadata } from "next";
import { getPage } from "@/lib/server-api";
import { BlockRenderer } from "@/components/store/blocks/BlockRenderer";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("home");
  return {
    title: page?.metaTitle ?? page?.title ?? "Home",
    description: page?.metaDescription ?? undefined,
    openGraph: page?.ogImage ? { images: [page.ogImage] } : undefined,
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
