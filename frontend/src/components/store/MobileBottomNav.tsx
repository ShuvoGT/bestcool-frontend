"use client";

/** Sticky bottom navigation bar on mobile (Akij-style quick actions). */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Heart, ShoppingCart, User } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/shop", label: "Shop", icon: LayoutGrid },
  { href: "/wishlist", label: "Wishlist", icon: Heart, badge: "wishlist" as const },
  { href: "/cart", label: "Cart", icon: ShoppingCart, badge: "cart" as const },
  { href: "/account", label: "Account", icon: User },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const { cartCount, wishlist, ready } = useStore();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur-lg lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {ITEMS.map(({ href, label, icon: Icon, exact, badge }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          const count = badge === "cart" ? cartCount : badge === "wishlist" ? wishlist.length : 0;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                active ? "text-brand" : "text-zinc-500"
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" />
                {ready && badge && count > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-white">
                    {count}
                  </span>
                )}
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
