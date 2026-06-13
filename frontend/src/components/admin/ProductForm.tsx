"use client";

/** Shared create/edit product form (images, pricing, variants, status). */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { GlassCard, PageHeader } from "@/components/admin/ui";
import { TextField, NumberField, TextareaField, ImageField, SwitchField } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export type ProductFormValues = {
  name: string;
  slug: string;
  brand: string;
  description: string;
  sku: string;
  regularPrice: number | "";
  salePrice: number | "";
  stock: number | "";
  lowStockThreshold: number | "";
  isActive: boolean;
  categoryId: string;
  images: { url: string; alt: string }[];
  variants: { name: string; attributes: Record<string, string>; sku: string; priceDiff: number | ""; stock: number | "" }[];
};

export const emptyProduct: ProductFormValues = {
  name: "", slug: "", brand: "", description: "", sku: "",
  regularPrice: "", salePrice: "", stock: 0, lowStockThreshold: 5,
  isActive: true, categoryId: "", images: [], variants: [],
};

export function ProductForm({ initial, productId }: { initial: ProductFormValues; productId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const { data: categories } = useLoad(() =>
    api<{ categories: { id: string; name: string }[] }>("/categories").then((r) => r.categories)
  );

  const set = (patch: Partial<ProductFormValues>) => setForm((f) => ({ ...f, ...patch }));

  async function save() {
    if (!form.name || form.regularPrice === "" || !form.categoryId) {
      toast.error("Name, regular price and category are required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        name: form.name,
        slug: form.slug || undefined,
        brand: form.brand || null,
        description: form.description,
        sku: form.sku || null,
        regularPrice: Number(form.regularPrice),
        salePrice: form.salePrice === "" ? null : Number(form.salePrice),
        stock: Number(form.stock || 0),
        lowStockThreshold: Number(form.lowStockThreshold || 5),
        isActive: form.isActive,
        categoryId: form.categoryId,
        images: form.images.filter((i) => i.url).map((i) => ({ url: i.url, alt: i.alt || null })),
        variants: form.variants
          .filter((v) => v.name)
          .map((v) => ({
            name: v.name,
            attributes: v.attributes,
            sku: v.sku || null,
            priceDiff: Number(v.priceDiff || 0),
            stock: Number(v.stock || 0),
          })),
      };
      if (productId) {
        await api(`/admin/products/${productId}`, { method: "PUT", body });
        toast.success("Product updated");
      } else {
        await api("/admin/products", { method: "POST", body });
        toast.success("Product created");
      }
      router.push("/admin/products");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/products" className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-cyan-400">
        <ArrowLeft className="h-4 w-4" /> All products
      </Link>
      <PageHeader
        title={productId ? "Edit Product" : "New Product"}
        actions={
          <Button
            onClick={save}
            disabled={saving}
            className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-violet-500"
          >
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
            {productId ? "Save changes" : "Create product"}
          </Button>
        }
      />

      <div className="space-y-6">
        <GlassCard className="space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Basics</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Name" value={form.name} onChange={(v) => set({ name: v })} required />
            <TextField label="Slug (auto if blank)" value={form.slug} onChange={(v) => set({ slug: v })} placeholder="my-product" />
            <TextField label="SKU" value={form.sku} onChange={(v) => set({ sku: v })} />
            <TextField label="Brand" value={form.brand} onChange={(v) => set({ brand: v })} placeholder="e.g. Samsung" />
            <div className="space-y-1.5">
              <Label className="text-zinc-300">Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => set({ categoryId: v })}>
                <SelectTrigger className="border-white/10 bg-white/5 text-zinc-100">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100">
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <TextareaField
            label="Description (HTML)"
            value={form.description}
            onChange={(v) => set({ description: v })}
            rows={8}
            hint="Rich HTML supported — headings, lists, bold. Unsafe tags are stripped on save."
          />
          <SwitchField label="Active" description="Inactive products are hidden from the storefront" checked={form.isActive} onChange={(v) => set({ isActive: v })} />
        </GlassCard>

        <GlassCard className="space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Pricing & Stock</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField label="Regular price (৳)" value={form.regularPrice} onChange={(v) => set({ regularPrice: v })} min={0} />
            <NumberField label="Sale price (৳, optional)" value={form.salePrice} onChange={(v) => set({ salePrice: v })} min={0} />
            <NumberField label="Stock" value={form.stock} onChange={(v) => set({ stock: v })} min={0} />
            <NumberField label="Low-stock alert at" value={form.lowStockThreshold} onChange={(v) => set({ lowStockThreshold: v })} min={0} />
          </div>
        </GlassCard>

        <GlassCard className="space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Images ({form.images.length})</h2>
          {form.images.map((img, i) => (
            <div key={i} className="rounded-lg border border-white/8 bg-white/3 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Image {i + 1}{i === 0 && " (main)"}</span>
                <Button
                  size="icon" variant="ghost" className="h-6 w-6 text-zinc-400 hover:text-red-400"
                  onClick={() => set({ images: form.images.filter((_, x) => x !== i) })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-3">
                <ImageField label="Image" value={img.url} onChange={(v) => set({ images: form.images.map((it, x) => (x === i ? { ...it, url: v } : it)) })} />
                <TextField label="Alt text" value={img.alt} onChange={(v) => set({ images: form.images.map((it, x) => (x === i ? { ...it, alt: v } : it)) })} />
              </div>
            </div>
          ))}
          <Button
            variant="outline" size="sm"
            className="border-dashed border-white/15 bg-transparent text-zinc-300 hover:bg-white/5"
            onClick={() => set({ images: [...form.images, { url: "", alt: "" }] })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add image
          </Button>
        </GlassCard>

        <GlassCard className="space-y-4 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Variants ({form.variants.length})</h2>
          <p className="text-xs text-zinc-500">
            e.g. &quot;Black / 256GB&quot;. Price difference is added to the product&apos;s effective price; each variant tracks its own stock.
          </p>
          {form.variants.map((v, i) => (
            <div key={i} className="rounded-lg border border-white/8 bg-white/3 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Variant {i + 1}</span>
                <Button
                  size="icon" variant="ghost" className="h-6 w-6 text-zinc-400 hover:text-red-400"
                  onClick={() => set({ variants: form.variants.filter((_, x) => x !== i) })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <TextField label="Name" value={v.name} onChange={(val) => set({ variants: form.variants.map((it, x) => (x === i ? { ...it, name: val } : it)) })} placeholder="Black / 256GB" />
                <TextField label="SKU" value={v.sku} onChange={(val) => set({ variants: form.variants.map((it, x) => (x === i ? { ...it, sku: val } : it)) })} />
                <NumberField label="Price diff (৳)" value={v.priceDiff} onChange={(val) => set({ variants: form.variants.map((it, x) => (x === i ? { ...it, priceDiff: val } : it)) })} />
                <NumberField label="Stock" value={v.stock} onChange={(val) => set({ variants: form.variants.map((it, x) => (x === i ? { ...it, stock: val } : it)) })} min={0} />
              </div>
            </div>
          ))}
          <Button
            variant="outline" size="sm"
            className="border-dashed border-white/15 bg-transparent text-zinc-300 hover:bg-white/5"
            onClick={() => set({ variants: [...form.variants, { name: "", attributes: {}, sku: "", priceDiff: 0, stock: 0 }] })}
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add variant
          </Button>
        </GlassCard>
      </div>
    </div>
  );
}
