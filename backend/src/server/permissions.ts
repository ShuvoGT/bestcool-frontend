/**
 * Staff capability system (WordPress-style roles → permissions).
 * Ported from backend/src/lib/permissions.ts.
 *
 * ADMIN implicitly has every capability. STAFF users are granted an explicit
 * subset via `User.permissions`. CUSTOMER has none. User management itself is
 * ADMIN-only (not a delegatable capability) to prevent privilege escalation.
 */

export const PERMISSIONS = [
  "products",       // products, categories, brands, image uploads
  "orders",         // order management + send-to-courier
  "content",        // Pages CMS block editor
  "flashSales",     // flash sales
  "couriers",       // courier settings
  "deliveryZones",  // delivery zones
  "settings",       // site settings & integrations (sensitive)
  "customers",      // view the customer list
  "analytics",      // dashboard stats
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

/** Human-readable labels for the admin UI. */
export const PERMISSION_LABELS: Record<Permission, string> = {
  products: "Products & Categories",
  orders: "Orders",
  content: "Pages / Content",
  flashSales: "Flash Sales",
  couriers: "Couriers",
  deliveryZones: "Delivery Zones",
  settings: "Settings & Integrations",
  customers: "Customers",
  analytics: "Dashboard / Analytics",
};

/** Built-in role presets the admin can pick from when creating a staff user. */
export const ROLE_PRESETS: { key: string; label: string; permissions: Permission[] }[] = [
  {
    key: "store_manager",
    label: "Store Manager",
    permissions: ["products", "orders", "flashSales", "couriers", "deliveryZones", "customers", "analytics"],
  },
  { key: "editor", label: "Editor", permissions: ["content", "products"] },
  { key: "author", label: "Author / Blog Writer", permissions: ["content"] },
  { key: "custom", label: "Custom", permissions: [] },
];

/** Whether a user may access a section guarded by any of `caps`. */
export function userHasPermission(
  user: { role: string; permissions: string[] } | undefined,
  caps: string[],
): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (user.role !== "STAFF") return false;
  return caps.some((c) => user.permissions.includes(c));
}
