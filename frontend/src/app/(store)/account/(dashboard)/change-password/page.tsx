"use client";

/** Change password — also the forced first-login flow for auto-created
 *  accounts (spec §6): ?required=1 shows the explainer banner. */
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ChangePasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const required = params.get("required") === "1";
  const { user, refresh } = useAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) return toast.error("New passwords do not match");
    setSaving(true);
    try {
      await api("/auth/change-password", { method: "PUT", body: { currentPassword: current, newPassword: next } });
      await refresh();
      toast.success("Password updated!");
      router.replace("/account");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight text-zinc-900">Change Password</h1>
      {(required || user?.mustChangePassword) && (
        <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-800">
            <strong>Set a new password to continue.</strong> You logged in with the temporary password
            we emailed you — choose your own password now to secure your account.
          </p>
        </div>
      )}
      <form onSubmit={save} className="space-y-4 rounded-xl border border-zinc-200 p-6">
        <div className="space-y-1.5">
          <Label>Current password</Label>
          <Input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} placeholder={required ? "The temporary password from your email" : ""} />
        </div>
        <div className="space-y-1.5">
          <Label>New password</Label>
          <Input type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} />
          <p className="text-xs text-zinc-400">At least 8 characters.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Confirm new password</Label>
          <Input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button type="submit" disabled={saving} className="w-full bg-blue-600 text-white hover:bg-blue-700">
          {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Update password
        </Button>
      </form>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense>
      <ChangePasswordContent />
    </Suspense>
  );
}
