"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, Shield, Search } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { GlassCard, PageHeader, Spinner, EmptyState } from "@/components/admin/ui";
import { TextField, SwitchField } from "@/components/admin/fields";
import { useAdminUser } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type StaffUser = {
  id: string; name: string; email: string; username: string | null; phone: string | null;
  role: "ADMIN" | "STAFF"; staffRole: string | null; permissions: string[]; isActive: boolean; createdAt: string;
};
type Customer = { id: string; name: string; email: string; phone: string | null; joinedAt: string; totalOrders: number };
type Capabilities = { permissions: { key: string; label: string }[]; presets: { key: string; label: string; permissions: string[] }[] };

type EditState = {
  id?: string; name: string; email: string; username: string; phone: string; password: string;
  role: "ADMIN" | "STAFF"; staffRole: string; permissions: string[]; isActive: boolean;
};

const blankUser = (): EditState => ({
  name: "", email: "", username: "", phone: "", password: "",
  role: "STAFF", staffRole: "custom", permissions: [], isActive: true,
});

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AdminUsersPage() {
  const me = useAdminUser();
  const [tab, setTab] = useState<"staff" | "customers">("staff");

  const caps = useLoad(() => api<Capabilities>("/admin/users/capabilities"));
  const staff = useLoad(() => api<{ items: StaffUser[] }>("/admin/users", { query: { limit: 100 } }).then((r) => r.items));
  const [custSearch, setCustSearch] = useState("");
  const customers = useLoad(
    () => api<{ items: Customer[] }>("/admin/customers", { query: { search: custSearch, limit: 100 } }).then((r) => r.items),
    [custSearch]
  );

  const [editing, setEditing] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const presets = caps.data?.presets ?? [];
  const permissionList = caps.data?.permissions ?? [];
  const presetLabel = useMemo(() => {
    const map: Record<string, string> = { administrator: "Administrator" };
    presets.forEach((p) => (map[p.key] = p.label));
    return map;
  }, [presets]);

  function applyPreset(key: string) {
    if (!editing) return;
    if (key === "administrator") {
      setEditing({ ...editing, role: "ADMIN", staffRole: "administrator" });
      return;
    }
    const preset = presets.find((p) => p.key === key);
    setEditing({ ...editing, role: "STAFF", staffRole: key, permissions: preset ? [...preset.permissions] : editing.permissions });
  }

  function togglePerm(key: string) {
    if (!editing) return;
    const has = editing.permissions.includes(key);
    setEditing({
      ...editing,
      staffRole: "custom",
      permissions: has ? editing.permissions.filter((p) => p !== key) : [...editing.permissions, key],
    });
  }

  async function save() {
    if (!editing) return;
    if (!editing.name || !editing.email) return toast.error("Name and email are required");
    if (!editing.id && editing.password.length < 8) return toast.error("Password must be at least 8 characters");
    if (editing.id && editing.password && editing.password.length < 8) return toast.error("Password must be at least 8 characters");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: editing.name,
        email: editing.email,
        username: editing.username.trim() || "",
        phone: editing.phone.trim() || undefined,
        role: editing.role,
        staffRole: editing.role === "ADMIN" ? "administrator" : editing.staffRole,
        permissions: editing.role === "ADMIN" ? [] : editing.permissions,
      };
      if (editing.password) body.password = editing.password;
      if (editing.id) {
        body.isActive = editing.isActive;
        await api(`/admin/users/${editing.id}`, { method: "PUT", body });
        toast.success("User updated");
      } else {
        await api("/admin/users", { method: "POST", body });
        toast.success("User created");
      }
      setEditing(null);
      staff.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(u: StaffUser) {
    if (!confirm(`Delete user "${u.name}"? This can't be undone.`)) return;
    try {
      const res = await api<{ deactivated?: boolean }>(`/admin/users/${u.id}`, { method: "DELETE" });
      toast.success(res.deactivated ? "User had records — deactivated instead" : "User deleted");
      staff.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function toggleActive(u: StaffUser) {
    try {
      await api(`/admin/users/${u.id}`, { method: "PUT", body: { isActive: !u.isActive } });
      staff.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  function openEdit(u: StaffUser) {
    setEditing({
      id: u.id, name: u.name, email: u.email, username: u.username ?? "", phone: u.phone ?? "",
      password: "", role: u.role, staffRole: u.staffRole ?? "custom", permissions: [...u.permissions], isActive: u.isActive,
    });
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage staff accounts, roles & permissions — and view customers"
        actions={
          tab === "staff" ? (
            <Button
              onClick={() => setEditing(blankUser())}
              className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-violet-500"
            >
              <Plus className="mr-1 h-4 w-4" /> New user
            </Button>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="mb-5 inline-flex rounded-lg border border-white/8 bg-white/4 p-1">
        {(["staff", "customers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors",
              tab === t ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/15 text-cyan-300" : "text-zinc-400 hover:text-zinc-100"
            )}
          >
            {t === "staff" ? "Staff & Admins" : "Customers"}
          </button>
        ))}
      </div>

      {/* Staff tab */}
      {tab === "staff" && (
        staff.loading || !staff.data ? (
          <Spinner />
        ) : staff.data.length === 0 ? (
          <GlassCard><EmptyState message="No staff users yet" /></GlassCard>
        ) : (
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-left text-xs uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Permissions</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {staff.data.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/3">
                      <td className="px-4 py-3">
                        <div className="font-medium text-zinc-100">
                          {u.name} {me?.id === u.id && <span className="text-xs text-cyan-400">(you)</span>}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {u.email}{u.username ? ` · @${u.username}` : ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
                          u.role === "ADMIN" ? "bg-violet-500/15 text-violet-300" : "bg-cyan-500/10 text-cyan-300"
                        )}>
                          {u.role === "ADMIN" && <Shield className="h-3 w-3" />}
                          {u.role === "ADMIN" ? "Administrator" : presetLabel[u.staffRole ?? ""] ?? "Staff"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {u.role === "ADMIN" ? "Full access" : u.permissions.length ? `${u.permissions.length} section${u.permissions.length === 1 ? "" : "s"}` : "None"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => me?.id !== u.id && toggleActive(u)}
                          disabled={me?.id === u.id}
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                            u.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-500/15 text-zinc-400",
                            me?.id !== u.id && "cursor-pointer hover:opacity-80"
                          )}
                        >
                          {u.isActive ? "Active" : "Disabled"}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-cyan-300" onClick={() => openEdit(u)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon" variant="ghost"
                            className="h-7 w-7 text-zinc-400 hover:text-red-400 disabled:opacity-30"
                            disabled={me?.id === u.id}
                            onClick={() => remove(u)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )
      )}

      {/* Customers tab */}
      {tab === "customers" && (
        <div>
          <div className="mb-4 flex max-w-sm items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3">
            <Search className="h-4 w-4 text-zinc-500" />
            <input
              value={custSearch}
              onChange={(e) => setCustSearch(e.target.value)}
              placeholder="Search customers…"
              className="w-full bg-transparent py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
            />
          </div>
          {customers.loading || !customers.data ? (
            <Spinner />
          ) : customers.data.length === 0 ? (
            <GlassCard><EmptyState message="No customers found" /></GlassCard>
          ) : (
            <GlassCard className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8 text-left text-xs uppercase tracking-wider text-zinc-500">
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Orders</th>
                      <th className="px-4 py-3 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.data.map((c) => (
                      <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/3">
                        <td className="px-4 py-3">
                          <div className="font-medium text-zinc-100">{c.name}</div>
                          <div className="text-xs text-zinc-500">{c.email}</div>
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{c.phone ?? "—"}</td>
                        <td className="px-4 py-3 text-zinc-300">{c.totalOrders}</td>
                        <td className="px-4 py-3 text-zinc-400">{fmtDate(c.joinedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          )}
        </div>
      )}

      {/* Create / edit staff dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-white/10 bg-zinc-900/95 text-zinc-100 backdrop-blur-xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit user" : "New staff user"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <TextField label="Full name" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} required />
              <TextField label="Email" value={editing.email} onChange={(v) => setEditing({ ...editing, email: v })} type="email" required />
              <TextField label="Username (optional, for login & display)" value={editing.username} onChange={(v) => setEditing({ ...editing, username: v })} placeholder="e.g. karim" />
              <TextField
                label={editing.id ? "New password (leave blank to keep)" : "Password"}
                value={editing.password}
                onChange={(v) => setEditing({ ...editing, password: v })}
                type="password"
                placeholder="Min 8 characters"
              />

              {/* Role preset */}
              <div className="space-y-2">
                <div className="text-sm font-medium text-zinc-300">Role</div>
                <div className="flex flex-wrap gap-2">
                  {[{ key: "administrator", label: "Administrator" }, ...presets].map((p) => {
                    const active = editing.role === "ADMIN" ? p.key === "administrator" : editing.staffRole === p.key;
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => applyPreset(p.key)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                          active
                            ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300"
                            : "border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-100"
                        )}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Permissions (hidden for full administrators) */}
              {editing.role === "ADMIN" ? (
                <p className="rounded-lg border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
                  Administrators have full access to every section, including user management.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-zinc-300">Permissions</div>
                  <div className="grid grid-cols-2 gap-2">
                    {permissionList.map((perm) => {
                      const on = editing.permissions.includes(perm.key);
                      return (
                        <button
                          key={perm.key}
                          type="button"
                          onClick={() => togglePerm(perm.key)}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                            on ? "border-cyan-400/40 bg-cyan-500/12 text-cyan-200" : "border-white/8 bg-white/3 text-zinc-400 hover:text-zinc-200"
                          )}
                        >
                          <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", on ? "border-cyan-400 bg-cyan-500/30" : "border-white/20")}>
                            {on && <span className="h-2 w-2 rounded-sm bg-cyan-300" />}
                          </span>
                          {perm.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {editing.id && me?.id !== editing.id && (
                <SwitchField label="Active" description="Disabled users can't sign in" checked={editing.isActive} onChange={(v) => setEditing({ ...editing, isActive: v })} />
              )}

              <Button onClick={save} disabled={saving} className="w-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white">
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} {editing.id ? "Save changes" : "Create user"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
