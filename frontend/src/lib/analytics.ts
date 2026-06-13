/**
 * Marketing-analytics event helpers (spec §13).
 * Fires the standard e-commerce events to BOTH Facebook Pixel (fbq) and
 * GA4 (gtag) when those are loaded. All calls are guarded, so they no-op
 * safely when no analytics ID is configured. Currency is always BDT.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

function fbq(...args: any[]) {
  if (typeof window !== "undefined" && window.fbq) window.fbq(...args);
}
function gtag(...args: any[]) {
  if (typeof window !== "undefined" && window.gtag) window.gtag(...args);
}

/**
 * Runs `fn` once analytics is loaded. Events requested before the Pixel/GA4
 * scripts finish loading (e.g. ViewContent on a direct product load) are
 * retried briefly instead of being dropped. No-ops if nothing is configured.
 */
function dispatch(fn: () => void) {
  if (typeof window === "undefined") return;
  if (window.fbq || window.gtag) return fn();
  let tries = 0;
  const t = setInterval(() => {
    if (window.fbq || window.gtag) {
      clearInterval(t);
      fn();
    } else if (++tries > 40) {
      clearInterval(t); // give up after ~10s (no analytics configured)
    }
  }, 250);
}

export type AnalyticsProduct = { id: string; name: string; price: number; quantity?: number; category?: string };
export type PurchasePayload = { orderNumber: string; value: number; items: AnalyticsProduct[] };

const CUR = "BDT";
const gaItems = (items: AnalyticsProduct[]) =>
  items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity ?? 1, item_category: i.category }));

export const analytics = {
  pageView() {
    dispatch(() => {
      fbq("track", "PageView");
      gtag("event", "page_view");
    });
  },

  viewContent(p: AnalyticsProduct) {
    dispatch(() => {
      fbq("track", "ViewContent", { content_ids: [p.id], content_name: p.name, content_type: "product", value: p.price, currency: CUR });
      gtag("event", "view_item", { currency: CUR, value: p.price, items: gaItems([p]) });
    });
  },

  addToCart(p: AnalyticsProduct) {
    const value = p.price * (p.quantity ?? 1);
    dispatch(() => {
      fbq("track", "AddToCart", { content_ids: [p.id], content_name: p.name, content_type: "product", value, currency: CUR });
      gtag("event", "add_to_cart", { currency: CUR, value, items: gaItems([p]) });
    });
  },

  addToWishlist(p: AnalyticsProduct) {
    dispatch(() => {
      fbq("track", "AddToWishlist", { content_ids: [p.id], content_name: p.name, value: p.price, currency: CUR });
      gtag("event", "add_to_wishlist", { currency: CUR, value: p.price, items: gaItems([p]) });
    });
  },

  initiateCheckout(value: number, items: AnalyticsProduct[]) {
    dispatch(() => {
      fbq("track", "InitiateCheckout", { value, currency: CUR, num_items: items.length, content_ids: items.map((i) => i.id), content_type: "product" });
      gtag("event", "begin_checkout", { currency: CUR, value, items: gaItems(items) });
    });
  },

  purchase(order: PurchasePayload) {
    dispatch(() => {
      fbq("track", "Purchase", { value: order.value, currency: CUR, content_ids: order.items.map((i) => i.id), content_type: "product" });
      gtag("event", "purchase", { transaction_id: order.orderNumber, currency: CUR, value: order.value, items: gaItems(order.items) });
    });
  },
};
