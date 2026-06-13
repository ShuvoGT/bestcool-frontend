"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronDown, ChevronRight, Heart, LayoutGrid, Mail, Menu, Phone, Search, ShoppingCart, User, Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { CartSheet } from "@/components/store/CartSheet";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { Settings } from "@/lib/server-api";
import { cn } from "@/lib/utils";

type NavLink = { label: string; href: string };
type Category = { id: string; name: string; slug: string; image: string | null; productCount: number };

export function Header({ settings, categories }: { settings: Settings; categories: Category[] }) {
  const router = useRouter();
  const { cartCount, wishlist, ready } = useStore();
  const [cartOpen, setCartOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"categories" | "menu">("categories");
  const [catSidebarOpen, setCatSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  const siteName: string = settings["site.name"] ?? "Next Mart";
  const logo: string | null = settings["site.logo"] ?? null;
  const nav: NavLink[] = settings["nav.header"] ?? [];
  const phone: string | null = settings["contact.phone"] ?? null;
  const email: string | null = settings["contact.email"] ?? null;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/shop?search=${encodeURIComponent(search)}`);
    setDrawerOpen(false);
  }

  const Logo = (
    <Link href="/" className="flex shrink-0 items-center gap-2">
      {logo ? (
        <Image src={logo} alt={siteName} width={150} height={42} unoptimized className="h-9 w-auto object-contain sm:h-10" />
      ) : (
        <>
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark shadow-md shadow-brand/20">
            <Zap className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-ink sm:text-xl">{siteName}</span>
        </>
      )}
    </Link>
  );

  const SearchForm = ({ className }: { className?: string }) => (
    <form onSubmit={submitSearch} className={cn("relative", className)}>
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search for products, brands and more…"
        className="w-full rounded-full border-2 border-zinc-200 bg-zinc-50 py-2.5 pl-5 pr-12 text-sm outline-none transition-colors focus:border-brand focus:bg-white"
      />
      <button type="submit" aria-label="Search" className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-dark">
        <Search className="h-4 w-4" />
      </button>
    </form>
  );

  return (
    <header className="sticky top-0 z-40">
      {/* ============ DESKTOP / TABLET ============ */}
      <div className="hidden bg-white shadow-sm md:block">
        {/* Row 1: logo · search · hotline/email · icons */}
        <div className="mx-auto flex max-w-7xl items-center gap-5 px-4 py-3.5 sm:px-6">
          {Logo}
          <SearchForm className="ml-2 flex-1" />
          {/* Hotline + Email (xl) */}
          <div className="hidden items-center gap-5 xl:flex">
            {phone && (
              <a href={`tel:${phone}`} className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand"><Phone className="h-4 w-4" /></span>
                <span className="leading-tight">
                  <span className="block text-[11px] text-zinc-400">Hotline</span>
                  <span className="block text-sm font-bold text-ink">{phone}</span>
                </span>
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-soft text-brand"><Mail className="h-4 w-4" /></span>
                <span className="leading-tight">
                  <span className="block text-[11px] text-zinc-400">Email</span>
                  <span className="block text-sm font-bold text-ink">{email}</span>
                </span>
              </a>
            )}
          </div>
          {/* Icons */}
          <div className="flex items-center gap-1">
            <Link href="/account" aria-label="Account" className="rounded-full p-2 text-zinc-600 transition-colors hover:text-brand">
              <User className="h-5.5 w-5.5" />
            </Link>
            <Link href="/wishlist" aria-label="Wishlist" className="relative rounded-full p-2 text-zinc-600 transition-colors hover:text-brand">
              <Heart className="h-5.5 w-5.5" />
              {ready && wishlist.length > 0 && (
                <span className="absolute right-0 top-0 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{wishlist.length}</span>
              )}
            </Link>
            <button onClick={() => setCartOpen(true)} aria-label="Cart" className="relative rounded-full p-2 text-zinc-600 transition-colors hover:text-brand">
              <ShoppingCart className="h-5.5 w-5.5" />
              {ready && cartCount > 0 && (
                <span className="absolute right-0 top-0 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">{cartCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Top Categories dropdown + nav */}
        <div className="border-t border-zinc-100 bg-white">
          <div className="mx-auto flex max-w-7xl items-stretch px-4 sm:px-6">
            {/* Opens the left category sidebar (Akij style) */}
            <button
              onClick={() => setCatSidebarOpen(true)}
              className="flex items-center gap-2 bg-ink px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
            >
              <LayoutGrid className="h-4 w-4" /> Top Categories <ChevronDown className="h-4 w-4" />
            </button>
            <nav className="flex items-center">
              {nav.map((link) => (
                <Link key={link.href} href={link.href} className="px-4 py-3 text-sm font-semibold text-zinc-700 transition-colors hover:text-brand">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* ============ MOBILE ============ */}
      <div className="bg-white shadow-sm md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => setDrawerOpen(true)} aria-label="Menu" className="text-ink"><Menu className="h-6 w-6" /></button>
          {Logo}
          <Link href="/account" aria-label="Account" className="text-zinc-700"><User className="h-6 w-6" /></Link>
        </div>
        <div className="px-4 pb-3"><SearchForm /></div>
      </div>

      {/* Mobile drawer: Categories | Menu tabs */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="grid grid-cols-2 border-b">
            {(["categories", "menu"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setDrawerTab(t)}
                className={cn(
                  "py-3.5 text-sm font-bold uppercase tracking-wide transition-colors",
                  drawerTab === t ? "border-b-2 border-brand bg-brand-soft text-brand" : "text-zinc-500"
                )}
              >
                {t === "categories" ? "Categories" : "Menu"}
              </button>
            ))}
          </div>

          {drawerTab === "categories" ? (
            <ul className="h-[calc(100vh-3.25rem)] overflow-y-auto">
              {categories.map((c) => (
                <li key={c.id} className="border-b border-zinc-50">
                  <Link href={`/shop?category=${c.slug}`} onClick={() => setDrawerOpen(false)} className="flex items-center gap-3 px-5 py-3 text-sm text-zinc-700">
                    <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-100">
                      {c.image ? <Image src={c.image} alt="" fill unoptimized className="object-cover" /> : <LayoutGrid className="h-4 w-4 text-zinc-400" />}
                    </span>
                    <span className="flex-1 font-medium">{c.name}</span>
                    <span className="text-xs text-zinc-400">{c.productCount}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="overflow-y-auto">
              {nav.map((link) => (
                <li key={link.href} className="border-b border-zinc-50">
                  <Link href={link.href} onClick={() => setDrawerOpen(false)} className="block px-5 py-3.5 text-sm font-semibold text-zinc-800">{link.label}</Link>
                </li>
              ))}
              <li className="border-b border-zinc-50">
                <Link href="/wishlist" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2 px-5 py-3.5 text-sm font-semibold text-zinc-800">
                  <Heart className="h-4 w-4 text-brand" /> Wishlist
                </Link>
              </li>
              <li className="border-b border-zinc-50">
                <Link href="/account" onClick={() => setDrawerOpen(false)} className="flex items-center gap-2 px-5 py-3.5 text-sm font-semibold text-zinc-800">
                  <User className="h-4 w-4 text-brand" /> My Account
                </Link>
              </li>
            </ul>
          )}
        </SheetContent>
      </Sheet>

      {/* Desktop "Top Categories" → left sliding sidebar (Akij style) */}
      <Sheet open={catSidebarOpen} onOpenChange={setCatSidebarOpen}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetTitle className="sr-only">All Categories</SheetTitle>
          <div className="flex items-center gap-2 bg-ink px-5 py-4 text-sm font-bold text-white">
            <LayoutGrid className="h-4.5 w-4.5" /> All Categories
          </div>
          <ul className="h-[calc(100vh-3.75rem)] overflow-y-auto">
            {categories.map((c) => (
              <li key={c.id} className="border-b border-zinc-50">
                <Link
                  href={`/shop?category=${c.slug}`}
                  onClick={() => setCatSidebarOpen(false)}
                  className="flex items-center gap-3 px-5 py-3 text-sm text-zinc-700 transition-colors hover:bg-brand-soft hover:text-brand"
                >
                  <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-100">
                    {c.image ? <Image src={c.image} alt="" fill unoptimized className="object-cover" /> : <LayoutGrid className="h-4 w-4 text-zinc-400" />}
                  </span>
                  <span className="flex-1 font-medium">{c.name}</span>
                  <span className="text-xs text-zinc-400">{c.productCount}</span>
                  <ChevronRight className="h-4 w-4 text-zinc-300" />
                </Link>
              </li>
            ))}
            <li>
              <Link href="/shop" onClick={() => setCatSidebarOpen(false)} className="block px-5 py-3.5 text-sm font-bold text-brand hover:bg-brand-soft">
                View all products →
              </Link>
            </li>
          </ul>
        </SheetContent>
      </Sheet>

      <CartSheet open={cartOpen} onOpenChange={setCartOpen} />
    </header>
  );
}
