"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api("/auth/profile", { method: "PUT", body: { name, phone: phone || null } });
      await refresh();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-extrabold tracking-tight text-zinc-900">Profile</h1>
      <form onSubmit={save} className="space-y-4 rounded-xl border border-zinc-200 p-6">
        <div className="space-y-1.5">
          <Label>Full name</Label>
          <Input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input type="tel" minLength={11} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} disabled className="bg-zinc-50 text-zinc-500" />
          <p className="text-xs text-zinc-400">Email is your login and cannot be changed.</p>
        </div>
        <Button type="submit" disabled={saving} className="gap-1.5 bg-brand text-white hover:bg-brand-dark">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
        </Button>
      </form>
    </div>
  );
}
