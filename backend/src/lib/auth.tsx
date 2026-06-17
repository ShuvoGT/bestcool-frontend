"use client";

/**
 * Customer auth context. On login/register the guest cart + wishlist
 * (localStorage) are merged into the account in the database (spec §4/§10).
 */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { CartItem, WishlistItem } from "@/lib/store";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  mustChangePassword: boolean;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (name: string, email: string, phone: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

async function mergeGuestData() {
  try {
    const cart: CartItem[] = JSON.parse(localStorage.getItem("nextmart.cart") ?? "[]");
    const wishlist: WishlistItem[] = JSON.parse(localStorage.getItem("nextmart.wishlist") ?? "[]");
    if (cart.length) {
      await api("/cart/merge", {
        method: "POST",
        body: { items: cart.map((c) => ({ productId: c.productId, variantId: c.variantId, quantity: c.quantity })) },
      });
    }
    if (wishlist.length) {
      await api("/wishlist/merge", { method: "POST", body: { productIds: wishlist.map((w) => w.productId) } });
    }
  } catch {
    // merge is best-effort; the local copies remain usable either way
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ user: AuthUser }>("/auth/me");
      setUser(res.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value: AuthState = {
    user,
    loading,
    refresh,
    login: async (email, password) => {
      const res = await api<{ user: AuthUser }>("/auth/login", { method: "POST", body: { email, password } });
      setUser(res.user);
      await mergeGuestData();
      return res.user;
    },
    register: async (name, email, phone, password) => {
      const res = await api<{ user: AuthUser }>("/auth/register", { method: "POST", body: { name, email, phone, password } });
      setUser(res.user);
      await mergeGuestData();
      return res.user;
    },
    logout: async () => {
      await api("/auth/logout", { method: "POST" }).catch(() => undefined);
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
