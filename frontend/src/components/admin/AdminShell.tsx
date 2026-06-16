"use client";

/**
 * Admin shell: auth guard (ADMIN or STAFF) + futuristic sidebar/topbar chrome.
 * The real security boundary is the API (role + permission gated JWT); this
 * guard is UX. Sidebar items are filtered by the user's capabilities.
 */
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FileText, Package, Tags, ShoppingCart, Users, Zap,
  Settings, Shield, UserCircle, LogOut, Loader2, ExternalLink, Image as ImageIcon, type LucideIcon,
} from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

export type AdminUser = {
  id: string; name: string; email: string; username?: string | null;
  role: string; permissions?: string[];
};
const AdminUserContext = createContext<AdminUser | null>(null);
export const useAdminUser = () => useContext(AdminUserContext);

// `perm` gates visibility: null = everyone, "__admin__" = ADMIN only, else a
// capability key (ADMIN implicitly has all).
type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean; perm: string | null };
const NAV: NavItem[] = [
  { href: "/work", label: "Dashboard", icon: LayoutDashboard, exact: true, perm: null },
  { href: "/work/pages", label: "Pages", icon: FileText, perm: "content" },
  { href: "/work/media", label: "Media", icon: ImageIcon, perm: "content" },
  { href: "/work/products", label: "Products", icon: Package, perm: "products" },
  { href: "/work/categories", label: "Categories", icon: Tags, perm: "products" },
  { href: "/work/orders", label: "Orders", icon: ShoppingCart, perm: "orders" },
  { href: "/work/customers", label: "Customers", icon: Users, perm: "customers" },
  { href: "/work/flash-sales", label: "Flash Sales", icon: Zap, perm: "flashSales" },
  { href: "/work/users", label: "Users", icon: Shield, perm: "__admin__" },
  { href: "/work/settings", label: "Settings", icon: Settings, perm: "settings" },
];

function canSee(user: AdminUser, perm: string | null): boolean {
  if (!perm) return true;
  if (perm === "__admin__") return user.role === "ADMIN";
  if (user.role === "ADMIN") return true;
  return (user.permissions ?? []).includes(perm);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(true);
  // Site name drives the "<Site> Control Center" branding; admin-editable in Settings.
  const [siteName, setSiteName] = useState("Best Cool Electronics");

  useEffect(() => {
    api<{ user: AdminUser }>("/auth/me")
      .then((res) => {
        if (res.user.role === "CUSTOMER") throw new Error("not staff");
        setUser(res.user);
        setChecking(false);
      })
      .catch(() => router.replace("/work/login"));
  }, [router]);

  useEffect(() => {
    api<{ settings: Record<string, unknown> }>("/settings/public")
      .then((r) => {
        const name = r.settings["site.name"];
        if (typeof name === "string" && name.trim()) setSiteName(name);
      })
      .catch(() => undefined);
  }, []);

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/work/login");
  }

  if (checking || !user) {
    return (
      <div className="dark flex min-h-screen items-center justify-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const nav = NAV.filter((n) => canSee(user, n.perm));

  return (
    <AdminUserContext.Provider value={user}>
      <div className="dark relative min-h-screen bg-zinc-950 text-zinc-100">
        {/* Ambient background glows */}
        <div className="pointer-events-none fixed -top-60 left-1/3 h-150 w-150 rounded-full bg-cyan-500/8 blur-[160px]" />
        <div className="pointer-events-none fixed bottom-0 right-0 h-120 w-120 rounded-full bg-violet-600/8 blur-[160px]" />

        {/* Sidebar */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-white/8 bg-zinc-950/70 backdrop-blur-xl lg:flex">
          <div className="flex items-center gap-2.5 px-5 py-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 shadow-lg shadow-cyan-500/30">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text text-base font-bold leading-tight text-transparent">
                {siteName}
              </div>
              <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">Control Center</div>
            </div>
          </div>

          <nav className="mt-2 flex-1 space-y-1 px-3">
            {nav.map(({ href, label, icon: Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "bg-gradient-to-r from-cyan-500/15 to-violet-500/10 text-cyan-300 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.25)]"
                      : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                  )}
                >
                  <Icon className={cn("h-4.5 w-4.5 transition-colors", active && "text-cyan-400")} />
                  {label}
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_rgba(34,211,238,0.6)]" />}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/8 p-3">
            <Link
              href="/work/profile"
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                pathname === "/work/profile" ? "bg-white/5 text-cyan-300" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
              )}
            >
              <UserCircle className="h-4 w-4" /> My profile
            </Link>
            <a
              href="/"
              target="_blank"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
            >
              <ExternalLink className="h-4 w-4" /> View storefront
            </a>
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
            <div className="mt-2 px-3">
              <div className="truncate text-xs font-medium text-zinc-300">{user.name}</div>
              <div className="truncate text-[11px] text-zinc-600">
                {user.role === "ADMIN" ? "Administrator" : "Staff"} · {user.email}
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-white/8 bg-zinc-950/80 px-4 py-3 backdrop-blur-xl lg:hidden">
          <div className="bg-gradient-to-r from-cyan-300 to-violet-400 bg-clip-text font-bold text-transparent">{siteName} Admin</div>
          <button onClick={logout} className="text-sm text-zinc-400">Sign out</button>
        </header>
        <nav className="sticky top-12 z-20 flex gap-1 overflow-x-auto border-b border-white/8 bg-zinc-950/80 px-2 py-2 backdrop-blur-xl lg:hidden">
          {nav.map(({ href, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium",
                  active ? "bg-cyan-500/15 text-cyan-300" : "text-zinc-400"
                )}
              >
                {label}
              </Link>
            );
          })}
          <Link href="/work/profile" className={cn("whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium", pathname === "/work/profile" ? "bg-cyan-500/15 text-cyan-300" : "text-zinc-400")}>
            Profile
          </Link>
        </nav>

        <main className="relative px-4 py-6 sm:px-6 lg:ml-60 lg:px-8">{children}</main>
        <Toaster theme="dark" position="top-right" richColors />
      </div>
    </AdminUserContext.Provider>
  );
}
