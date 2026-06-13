import type { Metadata } from "next";
import { getBrands, getCategories, getPage, getProducts } from "@/lib/server-api";
import { BlockRenderer } from "@/components/store/blocks/BlockRenderer";
import { ProductCard } from "@/components/store/ProductCard";
import { CategoryStrip, ShopSidebar, ShopTopBar } from "@/components/store/ShopFilters";
import { ShopPagination } from "@/components/store/ShopControls";
import { Reveal } from "@/components/store/Reveal";

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
  const category = str(sp.category) ?? "";
  const brand = str(sp.brand) ?? "";
  const search = str(sp.search) ?? "";
  const minPrice = str(sp.minPrice) ?? "";
  const maxPrice = str(sp.maxPrice) ?? "";
  const sort = str(sp.sort) ?? "newest";
  const page = Number(str(sp.page) ?? 1);

  const [cms, categories, brands, result] = await Promise.all([
    getPage("shop"),
    getCategories(),
    getBrands(category || undefined), // brands scoped to the chosen category
    getProducts({ category, brand, search, minPrice, maxPrice, sort, page, limit: 12 }),
  ]);

  return (
    <>
      {cms && <BlockRenderer blocks={cms.blocks} />}

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        {/* Top: scrolling category strip */}
        <CategoryStrip categories={categories} active={category} />

        {/* Two-column: filters + product grid */}
        <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
          <ShopSidebar categories={categories} brands={brands} current={{ category, brand, search, minPrice, maxPrice, sort }} />

          <div>
            <ShopTopBar total={result?.total ?? 0} sort={sort} />

            {!result || result.items.length === 0 ? (
              <div className="rounded-xl border border-zinc-200 py-20 text-center text-zinc-500">
                No products match these filters. Try clearing some.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {result.items.map((p, i) => (
                    <Reveal key={p.id} delay={(i % 4) * 60}>
                      <ProductCard product={p} />
                    </Reveal>
                  ))}
                </div>
                <ShopPagination page={result.page} pages={result.pages} />
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
