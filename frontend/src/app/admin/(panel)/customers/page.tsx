"use client";

import { useState } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { formatDate } from "@/lib/format";
import { GlassCard, PageHeader, Spinner, EmptyState } from "@/components/admin/ui";
import { TextField } from "@/components/admin/fields";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Customer = { id: string; name: string; email: string; phone: string | null; joinedAt: string; totalOrders: number };

type NewCustomer = {
  name: string; email: string; phone: string; username: string; password: string; address: string; district: string;
};
const blank = (): NewCustomer => ({ name: "", email: "", phone: "", username: "", password: "", address: "", district: "" });

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, loading, reload } = useLoad(
    () => api<{ items: Customer[]; total: number; pages: number }>("/admin/customers", { query: { search, page, limit: 20 } }),
    [search, page]
  );

  const [form, setForm] = useState<NewCustomer | null>(null);
  const [saving, setSaving] = useState(false);

  async function create() {
    if (!form) return;
    if (!form.name || !form.email || !form.phone) return toast.error("Name, email and phone are required");
    if (form.password.length < 8) return toast.error("Password must be at least 8 characters");
    setSaving(true);
    try {
      await api("/admin/customers", {
        method: "POST",
        body: {
          name: form.name,
          email: form.email,
          phone: form.phone,
          username: form.username.trim() || "",
          password: form.password,
          address: form.address.trim() || undefined,
          district: form.district.trim() || undefined,
        },
      });
      toast.success("Customer added");
      setForm(null);
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add customer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={data ? `${data.total} registered customer${data.total === 1 ? "" : "s"}` : undefined}
        actions={
          <Button
            onClick={() => setForm(blank())}
            className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-violet-500"
          >
            <Plus className="mr-1 h-4 w-4" /> New customer
          </Button>
        }
      />

      <div className="relative mb-4 w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <Input
          placeholder="Search name, email, phone…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="border-white/10 bg-white/5 pl-9 text-zinc-100 placeholder:text-zinc-600"
        />
      </div>

      <GlassCard>
        {loading || !data ? (
          <Spinner />
        ) : data.items.length === 0 ? (
          <EmptyState message="No customers found" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/8 hover:bg-transparent">
                <TableHead className="text-zinc-400">Name</TableHead>
                <TableHead className="text-zinc-400">Email</TableHead>
                <TableHead className="text-zinc-400">Phone</TableHead>
                <TableHead className="text-zinc-400">Orders</TableHead>
                <TableHead className="text-zinc-400">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((c) => (
                <TableRow key={c.id} className="border-white/5 hover:bg-white/3">
                  <TableCell className="font-medium text-zinc-100">{c.name}</TableCell>
                  <TableCell className="text-zinc-300">{c.email}</TableCell>
                  <TableCell className="text-zinc-400">{c.phone ?? "—"}</TableCell>
                  <TableCell>
                    <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-xs font-semibold text-cyan-300">
                      {c.totalOrders}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-zinc-500">{formatDate(c.joinedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={cn(
                "h-8 w-8 rounded-md border text-sm font-medium",
                n === page ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300" : "border-white/10 bg-white/5 text-zinc-400"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      )}

      {/* Add customer dialog */}
      <Dialog open={!!form} onOpenChange={(open) => !open && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-900/95 text-zinc-100 backdrop-blur-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New customer</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <TextField label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <TextField label="Email (login username)" value={form.email} onChange={(v) => setForm({ ...form, email: v })} type="email" required />
              <TextField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="01XXXXXXXXX" required />
              <TextField label="Username (optional, for login & display)" value={form.username} onChange={(v) => setForm({ ...form, username: v })} placeholder="e.g. karim" />
              <TextField label="Password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} type="password" placeholder="Min 8 characters" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="Address (optional)" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="House, road, area" />
                <TextField label="District (optional)" value={form.district} onChange={(v) => setForm({ ...form, district: v })} placeholder="e.g. Dhaka" />
              </div>
              <p className="rounded-lg border border-white/8 bg-white/3 px-3 py-2 text-xs text-zinc-400">
                The customer can sign in immediately at <span className="text-cyan-300">/account/login</span> with this email (or username) and password.
              </p>
              <Button onClick={create} disabled={saving} className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white">
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Add customer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
