"use client";

/**
 * Storefront client state: cart + wishlist.
 * Guests persist in localStorage; on login the same shapes merge into the DB
 * via /cart/merge and /wishlist/merge (wired in the account phase).
 * Prices shown from snapshots are display-only — the server always
 * re-resolves real prices at checkout/order time.
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  variantId?: string;
  quantity: number;
  // display snapshot
  name: string;
  slug: string;
  image: string | null;
  unitPrice: number;
  variantName?: string;
  maxStock: number;
};

export type WishlistItem = { productId: string; slug: string };

type StoreState = {
  cart: CartItem[];
  wishlist: WishlistItem[];
  addToCart: (item: CartItem) => void;
  updateQuantity: (productId: string, variantId: string | undefined, quantity: number) => void;
  removeFromCart: (productId: string, variantId: string | undefined) => void;
  clearCart: () => void;
  toggleWishlist: (item: WishlistItem) => void;
  isWishlisted: (productId: string) => boolean;
  cartCount: number;
  cartSubtotal: number;
  ready: boolean;
};

const StoreContext = createContext<StoreState | null>(null);

const CART_KEY = "nextmart.cart";
const WISHLIST_KEY = "nextmart.wishlist";

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem(CART_KEY) ?? "[]"));
      setWishlist(JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? "[]"));
    } catch {
      /* corrupted storage — start fresh */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, ready]);
  useEffect(() => {
    if (ready) localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
  }, [wishlist, ready]);

  const value = useMemo<StoreState>(() => {
    const keyOf = (productId: string, variantId?: string) => `${productId}::${variantId ?? ""}`;
    return {
      cart,
      wishlist,
      ready,
      addToCart: (item) =>
        setCart((prev) => {
          const existing = prev.find((c) => keyOf(c.productId, c.variantId) === keyOf(item.productId, item.variantId));
          if (existing) {
            return prev.map((c) =>
              c === existing ? { ...c, ...item, quantity: Math.min(c.quantity + item.quantity, item.maxStock || 99) } : c
            );
          }
          return [...prev, item];
        }),
      updateQuantity: (productId, variantId, quantity) =>
        setCart((prev) =>
          prev.map((c) =>
            keyOf(c.productId, c.variantId) === keyOf(productId, variantId)
              ? { ...c, quantity: Math.max(1, Math.min(quantity, c.maxStock || 99)) }
              : c
          )
        ),
      removeFromCart: (productId, variantId) =>
        setCart((prev) => prev.filter((c) => keyOf(c.productId, c.variantId) !== keyOf(productId, variantId))),
      clearCart: () => setCart([]),
      toggleWishlist: (item) =>
        setWishlist((prev) =>
          prev.some((w) => w.productId === item.productId)
            ? prev.filter((w) => w.productId !== item.productId)
            : [...prev, item]
        ),
      isWishlisted: (productId) => wishlist.some((w) => w.productId === productId),
      cartCount: cart.reduce((sum, c) => sum + c.quantity, 0),
      cartSubtotal: cart.reduce((sum, c) => sum + c.unitPrice * c.quantity, 0),
    };
  }, [cart, wishlist, ready]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreState {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
