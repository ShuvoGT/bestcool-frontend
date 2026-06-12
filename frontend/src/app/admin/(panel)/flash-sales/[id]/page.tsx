"use client";

/** Flash sale campaign editor: schedule + products with flash prices. */
import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { bdt, toLocalInput } from "@/lib/format";
import { GlassCard, PageHeader, Spinner, StatusBadge, EmptyState } from "@/components/admin/ui";
import { TextField, NumberField, SwitchField } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Campaign = {
  id: string; title: string; startsAt: string; endsAt: string; isActive: boolean; status: string;
  products: { id: string; productId: string; name: string; image: string | null; regularPrice: number; salePrice: number | null; flashPrice: number }[];
};

export default function FlashSaleEditor() {
  const { id } = useParams<{ id: string }>();
  const { data: sale, loading, reload } = useLoad(
    () => api<{ flashSale: Campaign }>(`/admin/flash-sales/${id}`).then((r) => r.flashSale),
    [id]
  );
  const { data: allProducts } = useLoad(() =>
    api<{ items: { id: string; name: string; price: number }[] }>("/admin/products", { query: { limit: 100 } }).then((r) => r.items)
  );

  const [meta, setMeta] = useState<{ title: string; startsAt: string; endsAt: string; isActive: boolean } | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [newProductId, setNewProductId] = useState("");
  const [newPrice, setNewPrice] = useState<number | "">("");
  const [adding, setAdding] = useState(false);

  if (loading || !sale) return <Spinner />;

  const m = meta ?? { title: sale.title, startsAt: toLocalInput(sale.startsAt), endsAt: toLocalInput(sale.endsAt), isActive: sale.isActive };
  const availableProducts = (allProducts ?? []).filter((p) => !sale.products.some((sp) => sp.productId === p.id));

  async function saveMeta() {
    setSavingMeta(true);
    try {
      await api(`/admin/flash-sales/${sale!.id}`, {
        method: "PUT",
        body: { title: m.title, startsAt: new Date(m.startsAt), endsAt: new Date(m.endsAt), isActive: m.isActive },
      });
      toast.success("Campaign updated");
      setMeta(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingMeta(false);
    }
  }

  async function addProduct() {
    if (!newProductId || newPrice === "") return toast.error("Pick a product and set a flash price");
    setAdding(true);
    try {
      await api(`/admin/flash-sales/${sale!.id}/products`, {
        method: "POST",
        body: { productId: newProductId, flashPrice: Number(newPrice) },
      });
      toast.success("Product added to campaign");
      setNewProductId("");
      setNewPrice("");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed — check overlap with other campaigns");
    } finally {
      setAdding(false);
    }
  }

  async function removeProduct(productId: string) {
    try {
      await api(`/admin/flash-sales/${sale!.id}/products/${productId}`, { method: "DELETE" });
      toast.success("Removed from campaign");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/flash-sales" className="mb-4 inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-cyan-400">
        <ArrowLeft className="h-4 w-4" /> All campaigns
      </Link>
      <PageHeader title={sale.title} actions={<StatusBadge status={sale.status} />} />

      <GlassCard className="mb-6 space-y-4 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Schedule</h2>
        <TextField label="Title" value={m.title} onChange={(v) => setMeta({ ...m, title: v })} />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Starts at" type="datetime-local" value={m.startsAt} onChange={(v) => setMeta({ ...m, startsAt: v })} />
          <TextField label="Ends at" type="datetime-local" value={m.endsAt} onChange={(v) => setMeta({ ...m, endsAt: v })} />
        </div>
        <SwitchField label="Active" description="Inactive campaigns never run, regardless of schedule" checked={m.isActive} onChange={(v) => setMeta({ ...m, isActive: v })} />
        <Button onClick={saveMeta} disabled={savingMeta || !meta} className="bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-40">
          {savingMeta ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save schedule
        </Button>
      </GlassCard>

      <GlassCard className="p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Products in campaign ({sale.products.length})
        </h2>

        {/* Add product */}
        <div className="mb-5 grid gap-3 rounded-lg border border-dashed border-white/15 p-4 sm:grid-cols-[1fr_180px_auto]">
          <div className="space-y-1.5">
            <Label className="text-zinc-300">Product</Label>
            <Select value={newProductId} onValueChange={setNewProductId}>
              <SelectTrigger className="border-white/10 bg-white/5 text-zinc-100">
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent className="border-white/10 bg-zinc-900 text-zinc-100">
                {availableProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} — {bdt(p.price)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <NumberField label="Flash price (৳)" value={newPrice} onChange={setNewPrice} min={0} />
          <div className="flex items-end">
            <Button onClick={addProduct} disabled={adding} className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />} Add
            </Button>
          </div>
        </div>

        {sale.products.length === 0 ? (
          <EmptyState message="No products yet — add some above to activate the campaign visuals." />
        ) : (
          <ul className="divide-y divide-white/5">
            {sale.products.map((p) => {
              const base = p.salePrice ?? p.regularPrice;
              const off = Math.round(((base - p.flashPrice) / base) * 100);
              return (
                <li key={p.id} className="flex items-center gap-4 py-3">
                  {p.image && (
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-white/10">
                      <Image src={p.image} alt="" fill unoptimized className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-zinc-100">{p.name}</div>
                    <div className="text-xs text-zinc-500">
                      <span className="line-through">{bdt(base)}</span>
                      <span className="mx-1.5 font-semibold text-amber-300">{bdt(p.flashPrice)}</span>
                      <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 font-semibold text-amber-300">-{off}%</span>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-zinc-400 hover:text-red-400" onClick={() => removeProduct(p.productId)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
