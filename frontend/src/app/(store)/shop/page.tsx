import type { Metadata } from "next";
import { getCategories, getPage, getProducts } from "@/lib/server-api";
import { BlockRenderer } from "@/components/store/blocks/BlockRenderer";
import { ProductCard } from "@/components/store/ProductCard";
import { ShopControls, ShopPagination } from "@/components/store/ShopControls";

type Search = { [key: string]: string | string[] | undefined };
type Props = { searchParams: Promise<Search> };

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("shop");
  return {
    title: page?.metaTitle ?? "Shop",
    description: page?.metaDescription ?? undefined,
  };
}

const str = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ShopPage({ searchParams }: Props) {
  const sp = await searchParams;
  const query = {
    category: str(sp.category),
    search: str(sp.search),
    minPrice: str(sp.minPrice),
    maxPrice: str(sp.maxPrice),
    sort: str(sp.sort) ?? "newest",
    page: Number(str(sp.page) ?? 1),
    limit: 12,
  };

  const [page, categories, result] = await Promise.all([
    getPage("shop"),
    getCategories(),
    getProducts(query),
  ]);

  return (
    <>
      {page && <BlockRenderer blocks={page.blocks} />}
      <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <ShopControls
          categories={categories}
          total={result?.total ?? 0}
          current={{
            category: query.category ?? "",
            search: query.search ?? "",
            minPrice: query.minPrice ?? "",
            maxPrice: query.maxPrice ?? "",
            sort: query.sort,
          }}
        />

        {!result || result.items.length === 0 ? (
          <div className="py-20 text-center text-zinc-500">
            No products found. Try adjusting your filters.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
              {result.items.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
            <ShopPagination page={result.page} pages={result.pages} />
          </>
        )}
      </div>
    </>
  );
}
