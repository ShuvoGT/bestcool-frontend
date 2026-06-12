"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetContent() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    setBusy(true);
    try {
      await api("/auth/reset-password", { method: "POST", body: { token, newPassword: password } });
      toast.success("Password reset! Please sign in.");
      router.replace("/account/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
      setBusy(false);
    }
  }

  if (!token) {
    return <p className="py-20 text-center text-sm text-zinc-500">This reset link is invalid — request a new one from the forgot-password page.</p>;
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-md space-y-4 rounded-xl border border-zinc-200 p-6">
      <div className="space-y-1.5">
        <Label>New password</Label>
        <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Confirm new password</Label>
        <Input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <Button type="submit" disabled={busy} className="w-full bg-blue-600 text-white hover:bg-blue-700">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Set new password"}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="px-4 py-16 sm:px-6">
      <h1 className="mb-6 text-center text-3xl font-extrabold tracking-tight text-zinc-900">Reset Password</h1>
      <Suspense>
        <ResetContent />
      </Suspense>
    </div>
  );
}
