"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { GlassCard, PageHeader, Spinner, EmptyState } from "@/components/admin/ui";
import { TextField, ImageField } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Category = { id: string; name: string; slug: string; image: string | null; productCount: number };

export default function AdminCategoriesPage() {
  const { data, loading, reload } = useLoad(() => api<{ categories: Category[] }>("/categories").then((r) => r.categories));
  const [editing, setEditing] = useState<{ id?: string; name: string; slug: string; image: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!editing?.name) return toast.error("Name is required");
    setSaving(true);
    try {
      const body = { name: editing.name, slug: editing.slug || undefined, image: editing.image || null };
      if (editing.id) {
        await api(`/admin/categories/${editing.id}`, { method: "PUT", body });
        toast.success("Category updated");
      } else {
        await api("/admin/categories", { method: "POST", body });
        toast.success("Category created");
      }
      setEditing(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(c: Category) {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    try {
      await api(`/admin/categories/${c.id}`, { method: "DELETE" });
      toast.success("Category deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        actions={
          <Button
            onClick={() => setEditing({ name: "", slug: "", image: "" })}
            className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-violet-500"
          >
            <Plus className="mr-1 h-4 w-4" /> New category
          </Button>
        }
      />

      {loading || !data ? (
        <Spinner />
      ) : data.length === 0 ? (
        <GlassCard><EmptyState message="No categories yet" /></GlassCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <GlassCard key={c.id} className="flex items-center gap-4 p-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                {c.image && <Image src={c.image} alt="" fill unoptimized className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-zinc-100">{c.name}</div>
                <div className="text-xs text-zinc-500">/{c.slug} · {c.productCount} product{c.productCount === 1 ? "" : "s"}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-cyan-300"
                  onClick={() => setEditing({ id: c.id, name: c.name, slug: c.slug, image: c.image ?? "" })}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-red-400" onClick={() => remove(c)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="border-white/10 bg-zinc-900/95 text-zinc-100 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit category" : "New category"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <TextField label="Name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              <TextField label="Slug (auto if blank)" value={editing.slug} onChange={(v) => setEditing({ ...editing, slug: v })} />
              <ImageField label="Image" value={editing.image} onChange={(v) => setEditing({ ...editing, image: v })} aspectHint="600×400" />
              <Button onClick={save} disabled={saving} className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white">
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
