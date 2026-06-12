"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function LoginContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/account";
  const { login, register } = useAuth();
  const [busy, setBusy] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ name: "", email: "", phone: "", password: "" });

  async function submitLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await login(loginForm.email, loginForm.password);
      if (user.mustChangePassword) {
        toast.info("Please set a new password to continue");
        router.replace("/account/change-password?required=1");
      } else {
        router.replace(next);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
      setBusy(false);
    }
  }

  async function submitRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await register(regForm.name, regForm.email, regForm.phone, regForm.password);
      toast.success("Welcome! Your account is ready.");
      router.replace(next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14 sm:px-6">
      <h1 className="mb-6 text-center text-3xl font-extrabold tracking-tight text-zinc-900">My Account</h1>
      <Tabs defaultValue="login">
        <TabsList className="mb-5 grid w-full grid-cols-2">
          <TabsTrigger value="login">Sign in</TabsTrigger>
          <TabsTrigger value="register">Create account</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <form onSubmit={submitLogin} className="space-y-4 rounded-xl border border-zinc-200 p-6">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" required value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" required value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-blue-600 text-white hover:bg-blue-700">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
            <p className="text-center text-sm">
              <Link href="/forgot-password" className="text-blue-600 hover:underline">Forgot password?</Link>
            </p>
            <p className="text-center text-xs text-zinc-400">
              Ordered as a guest? Your login details were emailed to you with your first order.
            </p>
          </form>
        </TabsContent>

        <TabsContent value="register">
          <form onSubmit={submitRegister} className="space-y-4 rounded-xl border border-zinc-200 p-6">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input required minLength={2} value={regForm.name} onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" required value={regForm.email} onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input type="tel" required minLength={11} value={regForm.phone} onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} placeholder="01XXXXXXXXX" />
            </div>
            <div className="space-y-1.5">
              <Label>Password</Label>
              <Input type="password" required minLength={8} value={regForm.password} onChange={(e) => setRegForm({ ...regForm, password: e.target.value })} />
              <p className="text-xs text-zinc-400">At least 8 characters.</p>
            </div>
            <Button type="submit" disabled={busy} className="w-full bg-blue-600 text-white hover:bg-blue-700">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
