"use client";

import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { Spinner } from "@/components/admin/ui";
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";

type ProductDetail = {
  id: string; name: string; slug: string; brand: string | null; description: string; sku: string | null;
  regularPrice: number; salePrice: number | null; stock: number; lowStockThreshold: number;
  isActive: boolean; category: { id: string } | null;
  images: { url: string; alt: string | null }[];
  variants: { name: string; attributes: Record<string, string>; sku: string | null; priceDiff: number; stock: number }[];
};

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading } = useLoad(() => api<{ product: ProductDetail }>(`/admin/products/${id}`).then((r) => r.product), [id]);

  if (loading || !data) return <Spinner />;

  const initial: ProductFormValues = {
    name: data.name,
    slug: data.slug,
    brand: data.brand ?? "",
    description: data.description,
    sku: data.sku ?? "",
    regularPrice: data.regularPrice,
    salePrice: data.salePrice ?? "",
    stock: data.stock,
    lowStockThreshold: data.lowStockThreshold,
    isActive: data.isActive,
    categoryId: data.category?.id ?? "",
    images: data.images.map((i) => ({ url: i.url, alt: i.alt ?? "" })),
    variants: data.variants.map((v) => ({ name: v.name, attributes: v.attributes, sku: v.sku ?? "", priceDiff: v.priceDiff, stock: v.stock })),
  };

  return <ProductForm initial={initial} productId={data.id} />;
}
