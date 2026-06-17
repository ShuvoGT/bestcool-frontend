"use client";

/** Customer dashboard shell: auth guard + section navigation (spec §7). */
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, KeyRound, Loader2, LogOut, MapPin, Package, UserRound, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/account", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/account/orders", label: "My Orders", icon: Package },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/profile", label: "Profile", icon: UserRound },
  { href: "/account/change-password", label: "Password", icon: KeyRound },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/account/login?next=${encodeURIComponent(pathname)}`);
    } else if (user.mustChangePassword && pathname !== "/account/change-password") {
      router.replace("/account/change-password?required=1");
    }
  }, [user, loading, pathname, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[230px_1fr]">
      <aside>
        <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div className="font-bold text-zinc-900">{user.name}</div>
          <div className="truncate text-xs text-zinc-500">{user.email}</div>
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-brand-soft text-brand-dark" : "text-zinc-600 hover:bg-zinc-50"
                )}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            );
          })}
          <button
            onClick={async () => {
              await logout();
              router.push("/");
            }}
            className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </nav>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
