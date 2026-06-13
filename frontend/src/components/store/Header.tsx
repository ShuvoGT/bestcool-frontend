"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Heart, Menu, Phone, Search, ShoppingCart, Truck, User, X, Zap } from "lucide-react";
import { useStore } from "@/lib/store";
import { CartSheet } from "@/components/store/CartSheet";
import type { Settings } from "@/lib/server-api";
import { cn } from "@/lib/utils";

type NavLink = { label: string; href: string };

export function Header({ settings }: { settings: Settings }) {
  const router = useRouter();
  const { cartCount, wishlist, ready } = useStore();
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");

  const siteName: string = settings["site.name"] ?? "Next Mart";
  const logo: string | null = settings["site.logo"] ?? null;
  const nav: NavLink[] = settings["nav.header"] ?? [];
  const phone: string | null = settings["contact.phone"] ?? null;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/shop?search=${encodeURIComponent(search)}`);
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40">
      {/* Slim utility bar */}
      <div className="hidden bg-ink text-zinc-300 md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2 text-xs sm:px-6">
          <span className="flex items-center gap-1.5">
            <Truck className="h-3.5 w-3.5 text-brand" /> Free delivery inside Dhaka on orders over ৳5,000
          </span>
          <div className="flex items-center gap-5">
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-1.5 transition-colors hover:text-white">
                <Phone className="h-3.5 w-3.5 text-brand" /> {phone}
              </a>
            )}
            <Link href="/account" className="transition-colors hover:text-white">My Account</Link>
            <Link href="/account/orders" className="transition-colors hover:text-white">Track Order</Link>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="border-b border-zinc-100 bg-white/95 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3.5 sm:px-6">
          {/* Mobile menu toggle */}
          <button className="lg:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            {logo ? (
              <Image src={logo} alt={siteName} width={150} height={42} unoptimized className="h-10 w-auto object-contain" />
            ) : (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark shadow-lg shadow-orange-500/20">
                  <Zap className="h-5 w-5 text-white" />
                </span>
                <span className="text-xl font-extrabold tracking-tight text-ink">
                  {siteName.split(" ")[0]}
                  <span className="text-brand">{siteName.split(" ").slice(1).join(" ") ? ` ${siteName.split(" ").slice(1).join(" ")}` : ""}</span>
                </span>
              </>
            )}
          </Link>

          {/* Search (desktop) — prominent, rounded, orange button */}
          <form onSubmit={submitSearch} className="relative ml-2 hidden flex-1 md:block">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search for products, brands and more…"
              className="w-full rounded-full border-2 border-zinc-200 bg-zinc-50 py-2.5 pl-5 pr-28 text-sm outline-none transition-colors focus:border-brand focus:bg-white"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              <Search className="h-4 w-4" /> <span className="hidden lg:inline">Search</span>
            </button>
          </form>

          {/* Icons */}
          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Link href="/account" aria-label="Account" className="hidden flex-col items-center px-2 text-zinc-600 transition-colors hover:text-brand sm:flex">
              <User className="h-5.5 w-5.5" />
              <span className="text-[10px] font-medium">Account</span>
            </Link>
            <Link href="/wishlist" aria-label="Wishlist" className="relative flex flex-col items-center px-2 text-zinc-600 transition-colors hover:text-brand">
              <Heart className="h-5.5 w-5.5" />
              <span className="hidden text-[10px] font-medium sm:block">Wishlist</span>
              {ready && wishlist.length > 0 && (
                <span className="absolute right-0 top-0 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {wishlist.length}
                </span>
              )}
            </Link>
            <button onClick={() => setCartOpen(true)} aria-label="Cart" className="relative flex flex-col items-center px-2 text-zinc-600 transition-colors hover:text-brand">
              <ShoppingCart className="h-5.5 w-5.5" />
              <span className="hidden text-[10px] font-medium sm:block">Cart</span>
              {ready && cartCount > 0 && (
                <span className="absolute right-0 top-0 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Category / nav strip (desktop) */}
      <div className="hidden border-b border-zinc-100 bg-white shadow-sm lg:block">
        <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-6">
          <Link
            href="/shop"
            className="flex items-center gap-2 rounded-t-md bg-brand px-4 py-3 text-sm font-bold text-white"
          >
            <Menu className="h-4 w-4" /> All Categories
          </Link>
          <nav className="flex items-center">
            {nav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-4 py-3 text-sm font-medium text-zinc-700 transition-colors hover:text-brand"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile search + menu */}
      <div className="border-b border-zinc-100 bg-white px-4 py-2.5 md:hidden">
        <form onSubmit={submitSearch} className="relative">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="w-full rounded-full border-2 border-zinc-200 bg-zinc-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-brand focus:bg-white"
          />
        </form>
      </div>

      {menuOpen && (
        <div className="border-b border-zinc-200 bg-white px-4 py-2 lg:hidden">
          <nav className="flex flex-col">
            {nav.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={cn("rounded-md px-2 py-2.5 text-sm font-medium text-zinc-700 hover:bg-brand-soft hover:text-brand")}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
