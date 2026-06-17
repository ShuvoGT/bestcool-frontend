"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { GlassCard, PageHeader, Spinner } from "@/components/admin/ui";
import { TextField } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";

type Me = { id: string; name: string; email: string; username: string | null; phone: string | null; role: string };

export default function AdminProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [profile, setProfile] = useState({ name: "", username: "", phone: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    api<{ user: Me }>("/auth/me")
      .then((r) => {
        setMe(r.user);
        setProfile({ name: r.user.name, username: r.user.username ?? "", phone: r.user.phone ?? "" });
      })
      .catch(() => toast.error("Could not load your profile"));
  }, []);

  async function saveProfile() {
    if (!profile.name.trim()) return toast.error("Name is required");
    setSavingProfile(true);
    try {
      const body: Record<string, unknown> = { name: profile.name.trim(), username: profile.username.trim() };
      if (profile.phone.trim()) body.phone = profile.phone.trim();
      const r = await api<{ user: Me }>("/auth/profile", { method: "PUT", body });
      setMe(r.user);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    if (pw.next.length < 8) return toast.error("New password must be at least 8 characters");
    if (pw.next !== pw.confirm) return toast.error("New passwords don't match");
    setSavingPw(true);
    try {
      await api("/auth/change-password", { method: "PUT", body: { currentPassword: pw.current, newPassword: pw.next } });
      setPw({ current: "", next: "", confirm: "" });
      toast.success("Password changed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not change password");
    } finally {
      setSavingPw(false);
    }
  }

  if (!me) return <Spinner />;

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="My profile" subtitle={`${me.role === "ADMIN" ? "Administrator" : "Staff"} · ${me.email}`} />

      <GlassCard className="space-y-4 p-5">
        <h2 className="text-sm font-semibold text-zinc-200">Account details</h2>
        <TextField label="Full name" value={profile.name} onChange={(v) => setProfile({ ...profile, name: v })} required />
        <TextField label="Username" value={profile.username} onChange={(v) => setProfile({ ...profile, username: v })} placeholder="optional — for login & display" />
        <TextField label="Phone" value={profile.phone} onChange={(v) => setProfile({ ...profile, phone: v })} placeholder="optional" />
        <Button onClick={saveProfile} disabled={savingProfile} className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white">
          {savingProfile ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save changes
        </Button>
      </GlassCard>

      <GlassCard className="mt-5 space-y-4 p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-200">
          <KeyRound className="h-4 w-4 text-cyan-400" /> Change password
        </h2>
        <TextField label="Current password" value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} type="password" />
        <TextField label="New password" value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} type="password" placeholder="Min 8 characters" />
        <TextField label="Confirm new password" value={pw.confirm} onChange={(v) => setPw({ ...pw, confirm: v })} type="password" />
        <Button onClick={changePassword} disabled={savingPw} variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10">
          {savingPw ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <KeyRound className="mr-1 h-4 w-4" />} Update password
        </Button>
      </GlassCard>
    </div>
  );
}
