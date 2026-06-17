"use client";

import { ProductForm, emptyProduct } from "@/components/admin/ProductForm";

export default function NewProductPage() {
  return <ProductForm initial={emptyProduct} />;
}
