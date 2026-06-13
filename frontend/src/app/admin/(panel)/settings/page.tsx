"use client";

/**
 * Global Site Settings (spec §2.2): branding, contact, menus, footer,
 * socials, WhatsApp/live chat, analytics IDs, SMS toggles, delivery zones.
 */
import { useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/hooks";
import { bdt } from "@/lib/format";
import { GlassCard, PageHeader, Spinner } from "@/components/admin/ui";
import { TextField, TextareaField, ImageField, SwitchField, NumberField } from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Settings = Record<string, any>;
type Zone = { id: string; name: string; charge: number; isActive: boolean; sortOrder: number };
type NavLink = { label: string; href: string };
type FooterColumn = { title: string; links: NavLink[] };
type SocialLink = { platform: string; url: string };

const SMS_EVENTS: { key: string; label: string }[] = [
  { key: "orderPlaced", label: "Order placed" },
  { key: "statusConfirmed", label: "Order confirmed" },
  { key: "statusShipped", label: "Order shipped (with tracking ID)" },
  { key: "statusDelivered", label: "Order delivered" },
  { key: "paymentConfirmed", label: "Online payment confirmed" },
];

export default function AdminSettingsPage() {
  const { data: settings, setData: setSettings, loading } = useLoad(() =>
    api<{ settings: Settings }>("/admin/settings").then((r) => r.settings)
  );
  const { data: zones, reload: reloadZones } = useLoad(() =>
    api<{ zones: Zone[] }>("/admin/delivery-zones").then((r) => r.zones)
  );
  const [saving, setSaving] = useState(false);
  const [newZone, setNewZone] = useState<{ name: string; charge: number | "" }>({ name: "", charge: "" });

  if (loading || !settings) return <Spinner />;

  const get = <T,>(key: string, fallback: T): T => (settings[key] ?? fallback) as T;
  const set = (key: string, value: unknown) => setSettings({ ...settings, [key]: value });

  async function saveAll() {
    setSaving(true);
    try {
      await api("/admin/settings", { method: "PUT", body: settings });
      toast.success("Settings saved — live on the storefront");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function addZone() {
    if (!newZone.name || newZone.charge === "") return toast.error("Zone name and charge required");
    try {
      await api("/admin/delivery-zones", { method: "POST", body: { name: newZone.name, charge: Number(newZone.charge), isActive: true, sortOrder: (zones?.length ?? 0) } });
      setNewZone({ name: "", charge: "" });
      toast.success("Delivery zone added");
      reloadZones();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function toggleZone(z: Zone) {
    await api(`/admin/delivery-zones/${z.id}`, { method: "PUT", body: { name: z.name, charge: z.charge, isActive: !z.isActive, sortOrder: z.sortOrder } });
    reloadZones();
  }

  async function removeZone(z: Zone) {
    if (!confirm(`Delete zone "${z.name}"?`)) return;
    await api(`/admin/delivery-zones/${z.id}`, { method: "DELETE" });
    toast.success("Zone deleted");
    reloadZones();
  }

  const navHeader = get<NavLink[]>("nav.header", []);
  const footerColumns = get<FooterColumn[]>("footer.columns", []);
  const socials = get<SocialLink[]>("social.links", []);
  const smsEvents = get<Record<string, boolean>>("sms.events", {});

  // Payment gateway credentials (managed here, never exposed to the storefront).
  type Gw = Record<string, string | boolean>;
  const paymentMode = get<string>("payment.mode", "sandbox");
  const bkash = get<Gw>("payment.bkash", {});
  const nagad = get<Gw>("payment.nagad", {});
  const ssl = get<Gw>("payment.sslcommerz", {});
  const gwField = (key: string, gw: Gw, field: string, value: string) => set(key, { ...gw, [field]: value });

  // Courier credentials (managed here, used by admin "Send to Courier").
  const courierMode = get<string>("courier.mode", "sandbox");
  const steadfast = get<Gw>("courier.steadfast", {});
  const pathao = get<Gw>("courier.pathao", {});
  const redx = get<Gw>("courier.redx", {});

  const tabCls = "data-[state=active]:bg-cyan-500/15 data-[state=active]:text-cyan-300 text-zinc-400";

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Settings"
        subtitle="Everything here updates the live storefront instantly"
        actions={
          <Button onClick={saveAll} disabled={saving} className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-violet-500">
            {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save all settings
          </Button>
        }
      />

      <Tabs defaultValue="general">
        <TabsList className="mb-4 flex-wrap border border-white/8 bg-white/4">
          <TabsTrigger value="general" className={tabCls}>General</TabsTrigger>
          <TabsTrigger value="menus" className={tabCls}>Menus & Footer</TabsTrigger>
          <TabsTrigger value="integrations" className={tabCls}>Integrations</TabsTrigger>
          <TabsTrigger value="payments" className={tabCls}>Payments</TabsTrigger>
          <TabsTrigger value="couriers" className={tabCls}>Couriers</TabsTrigger>
          <TabsTrigger value="sms" className={tabCls}>SMS</TabsTrigger>
          <TabsTrigger value="delivery" className={tabCls}>Delivery</TabsTrigger>
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="space-y-6">
          <GlassCard className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Branding</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Site name" value={get("site.name", "")} onChange={(v) => set("site.name", v)} />
              <TextField label="Tagline" value={get("site.tagline", "")} onChange={(v) => set("site.tagline", v)} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <ImageField label="Logo" value={get("site.logo", "") ?? ""} onChange={(v) => set("site.logo", v || null)} />
              <ImageField label="Favicon" value={get("site.favicon", "") ?? ""} onChange={(v) => set("site.favicon", v || null)} />
            </div>
          </GlassCard>
          <GlassCard className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Contact</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Phone" value={get("contact.phone", "")} onChange={(v) => set("contact.phone", v)} />
              <TextField label="Email" value={get("contact.email", "")} onChange={(v) => set("contact.email", v)} />
            </div>
            <TextField label="Address" value={get("contact.address", "")} onChange={(v) => set("contact.address", v)} />
          </GlassCard>
          <GlassCard className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Social Links</h2>
            {socials.map((s, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-[180px_1fr_auto]">
                <TextField label="Platform" value={s.platform} onChange={(v) => set("social.links", socials.map((x, n) => (n === i ? { ...x, platform: v } : x)))} placeholder="facebook" />
                <TextField label="URL" value={s.url} onChange={(v) => set("social.links", socials.map((x, n) => (n === i ? { ...x, url: v } : x)))} />
                <div className="flex items-end">
                  <Button size="icon" variant="ghost" className="text-zinc-400 hover:text-red-400" onClick={() => set("social.links", socials.filter((_, n) => n !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="border-dashed border-white/15 bg-transparent text-zinc-300 hover:bg-white/5"
              onClick={() => set("social.links", [...socials, { platform: "", url: "" }])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add social link
            </Button>
          </GlassCard>
        </TabsContent>

        {/* Menus & Footer */}
        <TabsContent value="menus" className="space-y-6">
          <GlassCard className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Header Navigation</h2>
            {navHeader.map((link, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <TextField label="Label" value={link.label} onChange={(v) => set("nav.header", navHeader.map((x, n) => (n === i ? { ...x, label: v } : x)))} />
                <TextField label="Link" value={link.href} onChange={(v) => set("nav.header", navHeader.map((x, n) => (n === i ? { ...x, href: v } : x)))} />
                <div className="flex items-end">
                  <Button size="icon" variant="ghost" className="text-zinc-400 hover:text-red-400" onClick={() => set("nav.header", navHeader.filter((_, n) => n !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="border-dashed border-white/15 bg-transparent text-zinc-300 hover:bg-white/5"
              onClick={() => set("nav.header", [...navHeader, { label: "", href: "" }])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add menu item
            </Button>
          </GlassCard>

          <GlassCard className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Footer</h2>
            <TextareaField label="Footer text" value={get("footer.text", "")} onChange={(v) => set("footer.text", v)} rows={3} />
            {footerColumns.map((col, ci) => (
              <div key={ci} className="rounded-lg border border-white/8 bg-white/3 p-4">
                <div className="mb-3 flex items-end gap-3">
                  <div className="flex-1">
                    <TextField label={`Column ${ci + 1} title`} value={col.title}
                      onChange={(v) => set("footer.columns", footerColumns.map((c, n) => (n === ci ? { ...c, title: v } : c)))} />
                  </div>
                  <Button size="icon" variant="ghost" className="text-zinc-400 hover:text-red-400"
                    onClick={() => set("footer.columns", footerColumns.filter((_, n) => n !== ci))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {col.links.map((l, li) => (
                  <div key={li} className="mb-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <TextField label="Label" value={l.label}
                      onChange={(v) => set("footer.columns", footerColumns.map((c, n) => (n === ci ? { ...c, links: c.links.map((x, m) => (m === li ? { ...x, label: v } : x)) } : c)))} />
                    <TextField label="Link" value={l.href}
                      onChange={(v) => set("footer.columns", footerColumns.map((c, n) => (n === ci ? { ...c, links: c.links.map((x, m) => (m === li ? { ...x, href: v } : x)) } : c)))} />
                    <div className="flex items-end">
                      <Button size="icon" variant="ghost" className="text-zinc-400 hover:text-red-400"
                        onClick={() => set("footer.columns", footerColumns.map((c, n) => (n === ci ? { ...c, links: c.links.filter((_, m) => m !== li) } : c)))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="border-dashed border-white/15 bg-transparent text-zinc-300 hover:bg-white/5"
                  onClick={() => set("footer.columns", footerColumns.map((c, n) => (n === ci ? { ...c, links: [...c.links, { label: "", href: "" }] } : c)))}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add link
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="border-dashed border-white/15 bg-transparent text-zinc-300 hover:bg-white/5"
              onClick={() => set("footer.columns", [...footerColumns, { title: "", links: [] }])}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add footer column
            </Button>
          </GlassCard>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-6">
          <GlassCard className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">WhatsApp Chat Button</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="WhatsApp number (with country code)" value={get("whatsapp.number", "")} onChange={(v) => set("whatsapp.number", v)} placeholder="8801700000000" />
              <TextField label="Prefilled message (optional)" value={get("whatsapp.message", "")} onChange={(v) => set("whatsapp.message", v)} />
            </div>
            <p className="text-xs text-zinc-500">The floating button is hidden when no number is set.</p>
          </GlassCard>
          <GlassCard className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Live Chat</h2>
            <TextareaField
              label="Live chat embed code (optional)"
              value={get("chat.embedCode", "")}
              onChange={(v) => set("chat.embedCode", v)}
              rows={4}
              hint="Paste a Tawk.to / Crisp script — it is injected on all storefront pages."
            />
          </GlassCard>
          <GlassCard className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Marketing Analytics</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Facebook Pixel ID" value={get("analytics.facebookPixelId", "")} onChange={(v) => set("analytics.facebookPixelId", v)} placeholder="1234567890" />
              <TextField label="GA4 Measurement ID" value={get("analytics.ga4MeasurementId", "")} onChange={(v) => set("analytics.ga4MeasurementId", v)} placeholder="G-XXXXXXXXXX" />
            </div>
            <p className="text-xs text-zinc-500">
              Tracking scripts load on the storefront only when an ID is present — no redeploy needed. They never load on /admin.
            </p>
          </GlassCard>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="space-y-6">
          <GlassCard className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Mode</h2>
            <div className="flex gap-2">
              {(["sandbox", "live"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => set("payment.mode", mode)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-all ${
                    paymentMode === mode ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300" : "border-white/10 bg-white/5 text-zinc-400"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">
              Selects sandbox (testing) or live gateway endpoints for all methods. A gateway appears at
              checkout only when it&apos;s enabled and all its credentials are filled in below — otherwise
              customers see Cash on Delivery only. These secrets are admin-only and never sent to the storefront.
            </p>
          </GlassCard>

          {/* bKash */}
          <GlassCard className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">bKash (Tokenized Checkout)</h2>
            </div>
            <SwitchField label="Enable bKash" checked={bkash.enabled !== false} onChange={(v) => set("payment.bkash", { ...bkash, enabled: v })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="App Key" value={String(bkash.appKey ?? "")} onChange={(v) => gwField("payment.bkash", bkash, "appKey", v)} />
              <TextField label="App Secret" value={String(bkash.appSecret ?? "")} onChange={(v) => gwField("payment.bkash", bkash, "appSecret", v)} />
              <TextField label="Username" value={String(bkash.username ?? "")} onChange={(v) => gwField("payment.bkash", bkash, "username", v)} />
              <TextField label="Password" value={String(bkash.password ?? "")} onChange={(v) => gwField("payment.bkash", bkash, "password", v)} />
            </div>
          </GlassCard>

          {/* Nagad */}
          <GlassCard className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Nagad</h2>
            <SwitchField label="Enable Nagad" checked={nagad.enabled !== false} onChange={(v) => set("payment.nagad", { ...nagad, enabled: v })} />
            <TextField label="Merchant ID" value={String(nagad.merchantId ?? "")} onChange={(v) => gwField("payment.nagad", nagad, "merchantId", v)} />
            <TextareaField label="Merchant Private Key" value={String(nagad.merchantPrivateKey ?? "")} onChange={(v) => gwField("payment.nagad", nagad, "merchantPrivateKey", v)} rows={3} hint="Base64 or PEM — used to sign requests." />
            <TextareaField label="Nagad PG Public Key" value={String(nagad.pgPublicKey ?? "")} onChange={(v) => gwField("payment.nagad", nagad, "pgPublicKey", v)} rows={3} hint="Base64 or PEM — Nagad's public key, used to encrypt payloads." />
          </GlassCard>

          {/* SSLCommerz */}
          <GlassCard className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">SSLCommerz (Card / Net Banking / Mobile)</h2>
            <SwitchField label="Enable SSLCommerz" checked={ssl.enabled !== false} onChange={(v) => set("payment.sslcommerz", { ...ssl, enabled: v })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Store ID" value={String(ssl.storeId ?? "")} onChange={(v) => gwField("payment.sslcommerz", ssl, "storeId", v)} />
              <TextField label="Store Password" value={String(ssl.storePassword ?? "")} onChange={(v) => gwField("payment.sslcommerz", ssl, "storePassword", v)} />
            </div>
            <p className="text-xs text-zinc-500">Free sandbox store: developer.sslcommerz.com — the quickest gateway to test.</p>
          </GlassCard>
        </TabsContent>

        {/* Couriers */}
        <TabsContent value="couriers" className="space-y-6">
          <GlassCard className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Mode</h2>
            <div className="flex gap-2">
              {(["sandbox", "live"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => set("courier.mode", mode)}
                  className={`rounded-lg border px-4 py-2 text-sm font-medium capitalize transition-all ${
                    courierMode === mode ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-300" : "border-white/10 bg-white/5 text-zinc-400"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-500">
              Couriers are used from an order&apos;s <span className="text-zinc-300">Send to Courier</span> action. A courier
              appears there only when it&apos;s enabled and its credentials are filled in — otherwise it&apos;s hidden.
            </p>
          </GlassCard>

          {/* Steadfast */}
          <GlassCard className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Steadfast</h2>
            <SwitchField label="Enable Steadfast" checked={steadfast.enabled !== false} onChange={(v) => set("courier.steadfast", { ...steadfast, enabled: v })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="API Key" value={String(steadfast.apiKey ?? "")} onChange={(v) => gwField("courier.steadfast", steadfast, "apiKey", v)} />
              <TextField label="Secret Key" value={String(steadfast.secretKey ?? "")} onChange={(v) => gwField("courier.steadfast", steadfast, "secretKey", v)} />
            </div>
          </GlassCard>

          {/* Pathao */}
          <GlassCard className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Pathao</h2>
            <SwitchField label="Enable Pathao" checked={pathao.enabled !== false} onChange={(v) => set("courier.pathao", { ...pathao, enabled: v })} />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Client ID" value={String(pathao.clientId ?? "")} onChange={(v) => gwField("courier.pathao", pathao, "clientId", v)} />
              <TextField label="Client Secret" value={String(pathao.clientSecret ?? "")} onChange={(v) => gwField("courier.pathao", pathao, "clientSecret", v)} />
              <TextField label="Username" value={String(pathao.username ?? "")} onChange={(v) => gwField("courier.pathao", pathao, "username", v)} />
              <TextField label="Password" value={String(pathao.password ?? "")} onChange={(v) => gwField("courier.pathao", pathao, "password", v)} />
              <TextField label="Store ID" value={String(pathao.storeId ?? "")} onChange={(v) => gwField("courier.pathao", pathao, "storeId", v)} />
            </div>
          </GlassCard>

          {/* RedX */}
          <GlassCard className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">RedX</h2>
            <SwitchField label="Enable RedX" checked={redx.enabled !== false} onChange={(v) => set("courier.redx", { ...redx, enabled: v })} />
            <TextField label="API Access Token" value={String(redx.apiToken ?? "")} onChange={(v) => gwField("courier.redx", redx, "apiToken", v)} />
          </GlassCard>
        </TabsContent>

        {/* SMS */}
        <TabsContent value="sms">
          <GlassCard className="space-y-3 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">SMS Notifications</h2>
            <p className="text-xs text-zinc-500">
              Toggle which events send an SMS to the customer. Gateway credentials live in the backend .env; with none set, SMS logs to the server console.
            </p>
            {SMS_EVENTS.map((e) => (
              <SwitchField
                key={e.key}
                label={e.label}
                checked={smsEvents[e.key] ?? true}
                onChange={(v) => set("sms.events", { ...smsEvents, [e.key]: v })}
              />
            ))}
          </GlassCard>
        </TabsContent>

        {/* Delivery zones */}
        <TabsContent value="delivery">
          <GlassCard className="space-y-4 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Delivery Methods & Charges</h2>
            <p className="text-xs text-zinc-500">Customers pick one of these at checkout (e.g. Inside Dhaka / Outside Dhaka). Saved instantly.</p>
            <div className="grid gap-3 rounded-lg border border-dashed border-white/15 p-4 sm:grid-cols-[1fr_160px_auto]">
              <TextField label="Zone name" value={newZone.name} onChange={(v) => setNewZone({ ...newZone, name: v })} placeholder="Inside Dhaka" />
              <NumberField label="Charge (৳)" value={newZone.charge} onChange={(v) => setNewZone({ ...newZone, charge: v })} min={0} />
              <div className="flex items-end">
                <Button onClick={addZone} className="bg-gradient-to-r from-cyan-500 to-violet-600 text-white">
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
            </div>
            <ul className="divide-y divide-white/5">
              {(zones ?? []).map((z) => (
                <li key={z.id} className="flex items-center gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-zinc-100">{z.name}</span>
                    <span className="ml-2 text-sm text-zinc-400">{bdt(z.charge)}</span>
                  </div>
                  <button
                    onClick={() => toggleZone(z)}
                    className={z.isActive ? "rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300" : "rounded-full bg-zinc-500/15 px-2.5 py-0.5 text-xs font-medium text-zinc-400"}
                  >
                    {z.isActive ? "Active" : "Inactive"}
                  </button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-zinc-400 hover:text-red-400" onClick={() => removeZone(z)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
