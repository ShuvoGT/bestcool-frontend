"use client";

/** Address book: multiple saved addresses with a default (spec §7). */
import { useState } from "react";
import { Loader2, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type Address = {
  id: string; label: string | null; fullName: string; phone: string;
  address: string; district: string; isDefault: boolean;
};
type FormState = { id?: string; label: string; fullName: string; phone: string; address: string; district: string; isDefault: boolean };

const empty: FormState = { label: "", fullName: "", phone: "", address: "", district: "", isDefault: false };

export default function AddressesPage() {
  const { data, loading, reload } = useLoad(() => api<{ addresses: Address[] }>("/auth/addresses").then((r) => r.addresses));
  const [editing, setEditing] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const body = {
        label: editing.label || undefined,
        fullName: editing.fullName,
        phone: editing.phone,
        address: editing.address,
        district: editing.district,
        isDefault: editing.isDefault,
      };
      if (editing.id) await api(`/auth/addresses/${editing.id}`, { method: "PUT", body });
      else await api("/auth/addresses", { method: "POST", body });
      toast.success("Address saved");
      setEditing(null);
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(a: Address) {
    if (!confirm("Delete this address?")) return;
    await api(`/auth/addresses/${a.id}`, { method: "DELETE" });
    toast.success("Address deleted");
    reload();
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900">Address Book</h1>
        <Button onClick={() => setEditing(empty)} className="gap-1.5 bg-blue-600 text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" /> Add address
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">{[1, 2].map((n) => <Skeleton key={n} className="h-32 rounded-xl" />)}</div>
      ) : !data?.length ? (
        <p className="rounded-xl border border-zinc-200 p-10 text-center text-sm text-zinc-500">
          No saved addresses yet.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {data.map((a) => (
            <div key={a.id} className="relative rounded-xl border border-zinc-200 p-4">
              {a.isDefault && (
                <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  <Star className="h-3 w-3 fill-blue-700" /> DEFAULT
                </span>
              )}
              <div className="mb-1 flex items-center gap-2 text-sm font-bold text-zinc-900">
                <MapPin className="h-4 w-4 text-blue-600" /> {a.label || "Address"}
              </div>
              <p className="text-sm text-zinc-700">{a.fullName} · {a.phone}</p>
              <p className="text-sm text-zinc-500">{a.address}, {a.district}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm" variant="outline" className="gap-1"
                  onClick={() => setEditing({ id: a.id, label: a.label ?? "", fullName: a.fullName, phone: a.phone, address: a.address, district: a.district, isDefault: a.isDefault })}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-rose-600 hover:bg-rose-50" onClick={() => remove(a)}>
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit address" : "New address"}</DialogTitle></DialogHeader>
          {editing && (
            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Label (e.g. Home)</Label>
                  <Input value={editing.label} onChange={(e) => setEditing({ ...editing, label: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Full name *</Label>
                  <Input required value={editing.fullName} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone *</Label>
                  <Input required minLength={11} value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>District *</Label>
                  <Input required value={editing.district} onChange={(e) => setEditing({ ...editing, district: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Full address *</Label>
                  <Input required minLength={5} value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-700">
                <input
                  type="checkbox"
                  checked={editing.isDefault}
                  onChange={(e) => setEditing({ ...editing, isDefault: e.target.checked })}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Set as default address
              </label>
              <Button type="submit" disabled={saving} className="w-full bg-blue-600 text-white hover:bg-blue-700">
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Save address
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
