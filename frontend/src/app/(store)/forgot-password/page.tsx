"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/auth/forgot-password", { method: "POST", body: { email } });
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <h1 className="mb-2 text-center text-3xl font-extrabold tracking-tight text-zinc-900">Forgot Password</h1>
      <p className="mb-6 text-center text-sm text-zinc-500">We&apos;ll email you a link to reset it.</p>
      {sent ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <MailCheck className="h-10 w-10 text-emerald-600" />
          <p className="text-sm text-emerald-800">
            If an account exists for <strong>{email}</strong>, a reset link is on its way. The link expires in 1 hour.
          </p>
          <Link href="/account/login" className="text-sm font-semibold text-brand hover:underline">Back to login</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 rounded-xl border border-zinc-200 p-6">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <Button type="submit" disabled={busy} className="w-full bg-brand text-white hover:bg-brand-dark">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
          </Button>
        </form>
      )}
    </div>
  );
}
