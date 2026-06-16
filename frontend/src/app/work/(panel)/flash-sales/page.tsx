"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Zap, Trash2, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { formatDateTime, toLocalInput } from "@/lib/format";
import { GlassCard, PageHeader, Spinner, StatusBadge, EmptyState } from "@/components/admin/ui";
import { TextField, SwitchField } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type SaleRow = {
  id: string; title: string; startsAt: string; endsAt: string;
  isActive: boolean; productCount: number; status: string;
};

export default function AdminFlashSalesPage() {
  const { data, loading, reload } = useLoad(() => api<{ flashSales: SaleRow[] }>("/admin/flash-sales").then((r) => r.flashSales));
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: "", startsAt: "", endsAt: "", isActive: true });
  const [saving, setSaving] = useState(false);

  function openCreate() {
    const now = new Date();
    setForm({
      title: "",
      startsAt: toLocalInput(now),
      endsAt: toLocalInput(new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)),
      isActive: true,
    });
    setCreating(true);
  }

  async function create() {
    if (!form.title || !form.startsAt || !form.endsAt) return toast.error("All fields are required");
    setSaving(true);
    try {
      await api("/admin/flash-sales", {
        method: "POST",
        body: { title: form.title, startsAt: new Date(form.startsAt), endsAt: new Date(form.endsAt), isActive: form.isActive },
      });
      toast.success("Campaign created — now add products to it");
      setCreating(false);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(s: SaleRow) {
    if (!confirm(`Delete campaign "${s.title}"?`)) return;
    try {
      await api(`/admin/flash-sales/${s.id}`, { method: "DELETE" });
      toast.success("Campaign deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div>
      <PageHeader
        title="Flash Sales"
        subtitle="Time-boxed campaigns with per-product flash prices"
        actions={
          <Button onClick={openCreate} className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-violet-500">
            <Plus className="mr-1 h-4 w-4" /> New campaign
          </Button>
        }
      />

      {loading || !data ? (
        <Spinner />
      ) : data.length === 0 ? (
        <GlassCard><EmptyState message="No campaigns yet" /></GlassCard>
      ) : (
        <div className="space-y-3">
          {data.map((s) => (
            <GlassCard key={s.id} className="group flex items-center gap-4 p-4 transition-all hover:border-cyan-400/30">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400">
                <Zap className="h-5 w-5" />
              </div>
              <Link href={`/work/flash-sales/${s.id}`} className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-100">{s.title}</span>
                  <StatusBadge status={s.status} />
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  {formatDateTime(s.startsAt)} → {formatDateTime(s.endsAt)} · {s.productCount} product{s.productCount === 1 ? "" : "s"}
                </div>
              </Link>
              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-zinc-400 hover:text-red-400" onClick={() => remove(s)}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <Link href={`/work/flash-sales/${s.id}`}>
                <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-cyan-400" />
              </Link>
            </GlassCard>
          ))}
        </div>
      )}

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="border-white/10 bg-zinc-900/95 text-zinc-100 backdrop-blur-xl">
          <DialogHeader><DialogTitle>New flash sale campaign</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <TextField label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} placeholder="Mega Flash Sale" />
            <TextField label="Starts at" type="datetime-local" value={form.startsAt} onChange={(v) => setForm({ ...form, startsAt: v })} />
            <TextField label="Ends at" type="datetime-local" value={form.endsAt} onChange={(v) => setForm({ ...form, endsAt: v })} />
            <SwitchField label="Active" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
            <Button onClick={create} disabled={saving} className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white">
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Create campaign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
