# Next Mart — E-commerce Platform for Bangladesh

A production-quality electronics e-commerce web application for the Bangladesh market.

- **Storefront + Admin panel**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui — in [`/frontend`](frontend)
- **REST API**: Node.js + Express (TypeScript), Prisma ORM, PostgreSQL — in [`/backend`](backend)
- **Payments**: Cash on Delivery, bKash, Nagad, SSLCommerz (sandbox-ready)
- **Couriers**: Steadfast, Pathao, RedX
- **Notifications**: Email (Nodemailer/SMTP) + SMS (provider-agnostic gateway)

> **Build status**: Phases 1–7 complete — scaffolding/schema/seed, backend REST API,
> admin panel at `/admin`, the full CMS-driven storefront, the complete commerce flow
> (cart, checkout, COD, guest→auto-account, emails, SMS), **online payments**
> (bKash/Nagad/SSLCommerz with server-side verification + IPN), and **courier
> integration** (Steadfast/Pathao/RedX — send-to-courier, tracking, status sync,
> webhooks). Both payments and couriers are configured from the admin panel.
> Phase 8 (Facebook Pixel + GA4 + final polish) is in progress.

**Email & SMS in development**: with no SMTP/SMS credentials in `backend/.env`, every
email and SMS is printed to the backend console instead of being sent — so you can
test the entire flow (including the auto-account temp password) with zero setup.
Fill `SMTP_*` to send real email; fill `SMS_API_BASE_URL`, `SMS_API_KEY`,
`SMS_SENDER_ID` for a real BD SMS gateway (generic HTTP provider, swappable in
`backend/src/lib/sms.ts`). Per-event SMS toggles live in Admin → Settings → SMS.

---

## Prerequisites

- **Node.js 20+** and **PostgreSQL 15+**

This machine had neither installed, so portable (no-admin) copies were set up in [`/tools`](tools):

| Tool | Location | Version |
|---|---|---|
| Node.js | `tools/node` | v24.16.0 LTS |
| PostgreSQL | `tools/pgsql` (binaries), `tools/pgdata` (data) | 17.5 |

To use them in any new PowerShell window:

```powershell
. .\tools\dev-env.ps1     # adds node/npm + psql to PATH (note the leading dot)
.\tools\start-db.ps1      # starts PostgreSQL on localhost:5432
```

If you later install Node/PostgreSQL system-wide, you can delete `/tools` entirely —
nothing in the project depends on it beyond PATH and the `DATABASE_URL`.

**Local database credentials** (already wired into `backend/.env`):

- Host: `localhost:5432` · Database: `nextmart` · User: `postgres` · Password: `nextmart_dev_pass`

---

## Setup

### 1. Backend (`/backend`)

```powershell
cd backend
npm install
copy .env.example .env        # already done for local dev — review values
npx prisma migrate dev        # create/apply database migrations
npm run seed                  # seed admin, products, flash sale, CMS pages
npm run dev                   # starts API at http://localhost:5000
```

Health check: `http://localhost:5000/api/health` → `{"status":"ok","database":"connected"}`

### 2. Frontend (`/frontend`)

```powershell
cd frontend
npm install
copy .env.example .env.local  # already done for local dev
npm run dev                   # starts storefront at http://localhost:3000
```

---

## Default admin login

| Field | Value |
|---|---|
| Email | `admin@nextmart.com.bd` |
| Password | `Admin@12345` |

(The admin panel UI ships in Phase 3 — the account exists in the database now.)

---

## Seed data

Running `npm run seed` in `/backend` creates (idempotent — re-running never overwrites admin edits):

- 1 admin user (credentials above)
- 4 categories: Smartphones, Laptops, Accessories, Smart Watches
- 10 electronics products (several with color/storage variants, placeholder images)
- 1 **running flash sale** ("Mega Flash Sale", 4 products at ~20% off, ends 7 days after seeding)
- Delivery zones: Inside Dhaka ৳60, Outside Dhaka ৳120
- Default global settings (site name, menus, footer, contact info, WhatsApp number, SMS toggles)
- Default content blocks for all 8 CMS pages: Home, About Us, Contact Us, Shop, Showroom, Terms & Conditions, Privacy Policy, Refund & Return Policy

---

## Environment variables

Both apps ship a fully documented **`.env.example`**. Summary:

### `backend/.env`

| Variable | Purpose |
|---|---|
| `PORT`, `NODE_ENV`, `FRONTEND_URL`, `API_URL` | Server basics + CORS origin + callback URL base |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Auth token signing |
| `SMTP_HOST/PORT/SECURE/USER/PASS`, `MAIL_FROM` | Transactional email (Nodemailer) |
| `SMS_API_BASE_URL`, `SMS_API_KEY`, `SMS_SENDER_ID` | Generic BD SMS gateway — leave blank in dev to log SMS to console |
| `PAYMENT_MODE` | `sandbox` or `live` gateway base URLs |
| `BKASH_APP_KEY/APP_SECRET/USERNAME/PASSWORD` | bKash Tokenized Checkout sandbox credentials |
| `NAGAD_MERCHANT_ID/MERCHANT_PRIVATE_KEY/PG_PUBLIC_KEY` | Nagad sandbox credentials |
| `SSLCOMMERZ_STORE_ID/STORE_PASSWORD` | SSLCommerz sandbox store |
| `COURIER_MODE` | `sandbox` or `live` courier endpoints |
| `STEADFAST_API_KEY/SECRET_KEY` | Steadfast API credentials |
| `PATHAO_CLIENT_ID/CLIENT_SECRET/USERNAME/PASSWORD/STORE_ID` | Pathao Merchant API credentials |
| `REDX_API_TOKEN` | RedX API token |
| `COURIER_WEBHOOK_SECRET` | Shared secret for verifying courier webhooks |

### `frontend/.env.local`

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the Express API |
| `NEXT_PUBLIC_SITE_URL` | Public storefront URL (canonical/OG tags) |

Facebook Pixel ID and GA4 Measurement ID are **not** env vars — they are entered in
the admin Settings page and injected at runtime (no redeploy needed).

---

## Project structure

```
/frontend        Next.js app — storefront + /admin panel
/backend         Express REST API + Prisma + PostgreSQL
  /prisma        schema.prisma, migrations, seed.ts
  /src           API source (routes/services/providers arrive in Phase 2+)
/tools           Portable Node.js + PostgreSQL for this machine (git-ignored)
```

---

## Courier gateways (Phase 7) — Steadfast, Pathao, RedX

Three couriers sit behind a single `CourierProvider` interface
(`backend/src/couriers/`), mirroring the payment architecture. Couriers are an
**admin-side** feature: the customer never picks a courier — the admin clicks
**"Send to Courier"** on an order's detail page, and the customer just sees the
courier name + tracking id once shipped.

**Credentials are managed from Admin → Settings → Couriers** (database; `.env`
fallback). Set the mode (sandbox/live), each courier's keys, and an enable
toggle. A courier appears in the order's **Send to Courier** selector **only
when it is enabled and fully configured** — otherwise it's hidden (driven by
`GET /api/admin/couriers`). These secrets are admin-only.

`.env` fallback keys (admin-panel values take precedence):
```
COURIER_MODE=sandbox            # or live
COURIER_WEBHOOK_SECRET=...      # shared secret couriers must present on webhooks
STEADFAST_API_KEY=...  STEADFAST_SECRET_KEY=...
PATHAO_CLIENT_ID=...  PATHAO_CLIENT_SECRET=...  PATHAO_USERNAME=...  PATHAO_PASSWORD=...  PATHAO_STORE_ID=...
REDX_API_TOKEN=...
```

**Get credentials:** Steadfast → portal.packzy.com (API menu); Pathao →
merchant.pathao.com (Developer API; sandbox base auto-selected by mode); RedX →
redx.com.bd (Open API). Pathao/RedX parcels need numeric city/zone/area ids —
the Send-to-Courier form has an optional Zone/Area ID field; use each courier's
location-lookup endpoints to populate it in production.

**What happens on "Send to Courier":** a form prefilled with the order's
recipient name/phone/address and COD amount (all editable) → on submit we create
the consignment, save the courier name + tracking id on the order, and
auto-advance it to **SHIPPED** (which fires the customer's email + SMS with the
tracking id). A **Refresh status** button pulls the latest parcel status; a
courier "delivered" advances the order to DELIVERED, a "returned/cancelled"
cancels it and restores stock.

**Webhooks:** `POST /api/couriers/{steadfast|pathao|redx}/webhook` accepts push
status updates, verified server-side against `COURIER_WEBHOOK_SECRET` (sent as
`?secret=…` or an `X-Webhook-Secret` header) and matched to an order by
consignment id — a webhook body alone can't move an unrelated order. Configure
this URL + secret in each courier's webhook settings.

---

## Payment gateways (Phase 6) — bKash, Nagad, SSLCommerz

All four payment methods sit behind a single `PaymentProvider` interface
(`backend/src/payments/`). **Cash on Delivery works out of the box.** The three
online gateways are **fully implemented** but each needs credentials before it
appears at checkout.

**Credentials are managed from the Admin panel → Settings → Payments** (stored in
the database; `.env` values act as fallback defaults). There you set the mode
(sandbox/live), each gateway's keys, and an enable toggle. A gateway appears at
checkout **only when it is enabled and all its credentials are filled in** —
otherwise customers see Cash on Delivery only (driven by `GET /api/payments/methods`).
These secrets are admin-only and are never exposed to the storefront.

You can alternatively pre-seed credentials via `backend/.env` (the keys below);
admin-panel values take precedence. `PAYMENT_MODE=sandbox|live` in `.env` is the
fallback when no mode is set in the admin panel.

### bKash (Tokenized Checkout / PGW)
Get sandbox credentials from the [bKash merchant portal](https://developer.bka.sh).
```
BKASH_APP_KEY=...
BKASH_APP_SECRET=...
BKASH_USERNAME=...
BKASH_PASSWORD=...
```
Flow: grant token → create payment (redirect to bKash) → on return we **execute**
the payment server-side and only trust a `Completed` status.

### Nagad (Payment Gateway)
Nagad issues sandbox merchant credentials + RSA keys after onboarding. Provide the
keys as raw base64 or full PEM:
```
NAGAD_MERCHANT_ID=...
NAGAD_MERCHANT_PRIVATE_KEY=...   # your merchant private key (signs requests)
NAGAD_PG_PUBLIC_KEY=...          # Nagad's PG public key (encrypts payloads)
```
Flow: initialize → complete (redirect to Nagad) → on return we call Nagad's
**verify/payment** API and only trust a `Success` status.

### SSLCommerz (hosted checkout)
Get a free sandbox store from [developer.sslcommerz.com](https://developer.sslcommerz.com).
```
SSLCOMMERZ_STORE_ID=...
SSLCOMMERZ_STORE_PASSWORD=...
```
Flow: init (redirect to SSLCommerz) → on return we call the **validation API**
with the `val_id` and only trust `VALID`/`VALIDATED`.

### Callback URLs to configure in each gateway dashboard
The backend exposes per-order callbacks under `API_URL`. The success/fail/cancel/IPN
URLs are passed automatically at initiation, but if a gateway dashboard asks you to
whitelist them, the pattern is:
```
{API_URL}/api/payments/{bkash|nagad|sslcommerz}/{ORDER_NUMBER}/callback   (bKash, Nagad)
{API_URL}/api/payments/sslcommerz/{ORDER_NUMBER}/success | /fail | /cancel
{API_URL}/api/payments/{provider}/{ORDER_NUMBER}/ipn                       (server-to-server IPN)
```
On a public deploy set `API_URL` to your backend's public HTTPS URL so gateways can
reach the callbacks.

**Security guarantees (verified):** an order is *never* marked `PAID` from a client
redirect alone — both the redirect callback and the IPN run a server-to-server
verification (`execute`/`verify`/`validate`) against the gateway. Settlement is
idempotent (duplicate callback + IPN settle once), the gateway-reported amount must
match the order total, and the callback/IPN endpoints are rate-limited. A spoofed
callback with a fake transaction id is rejected and the order stays unpaid.

---

## API overview (Phase 2)

All endpoints are under `http://localhost:5000/api`. Auth uses a JWT in an
httpOnly cookie set by `/auth/login` / `/auth/register`. Admin endpoints
(`/api/admin/*`) require the `ADMIN` role.

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PUT /auth/profile`, `PUT /auth/change-password`, `POST /auth/forgot-password`, `POST /auth/reset-password`, `GET/POST/PUT/DELETE /auth/addresses` |
| Catalog | `GET /products` (filters/sort/search/pagination), `GET /products/:slug`, `GET /products/:slug/related`, `GET/POST /products/:slug/reviews`, `GET /categories` |
| CMS & config | `GET /pages/:slug` (blocks enriched with live product/flash data), `GET /settings/public`, `GET /delivery-zones`, `GET /flash-sales/current` |
| Cart & wishlist | `GET/POST/PUT/DELETE /cart`, `POST /cart/merge`, `GET/POST/DELETE /wishlist`, `POST /wishlist/merge` (logged-in users; guests use localStorage) |
| Orders | `POST /orders` (guest checkout supported — auto-creates an account per spec §6), `GET /orders/my`, `GET /orders/my/:orderNumber` |
| Admin | `/admin/products`, `/admin/categories`, `/admin/uploads`, `/admin/pages` (block editor API), `/admin/flash-sales` (with overlap protection), `/admin/orders` (status flow + payment status), `/admin/customers`, `/admin/dashboard/stats`, `/admin/settings`, `/admin/delivery-zones` |

Security: Zod validation on every input, sanitize-html on all rich text /
user content, bcrypt passwords, rate limiting on auth & checkout, server-side
price resolution (client prices are never trusted), role-gated admin API.

---

## Deploying (GitHub + Vercel)

This is a **two-app architecture** — Vercel hosts the Next.js frontend, while
the Express API and PostgreSQL need their own homes:

| Piece | Where | Notes |
|---|---|---|
| `/frontend` | **Vercel** | Import the GitHub repo, set **Root Directory = `frontend`**. Set `NEXT_PUBLIC_API_URL` + `NEXT_PUBLIC_SITE_URL` env vars. |
| `/backend` | **Render / Railway** (free tier) | Root directory `backend`, build `npm install && npx prisma migrate deploy && npm run build`, start `npm start`. Copy every var from `backend/.env.example`. |
| PostgreSQL | **Neon** (free) or Railway Postgres | Put the connection string in the backend's `DATABASE_URL`, run `npx prisma migrate deploy` + `npm run seed` once. |
| Uploads | Local disk works on a persistent server; on ephemeral hosts swap `LocalStorageProvider` for S3/Cloudflare R2 (one line in `backend/src/storage/index.ts`) | Planned as part of go-live hardening. |

**Cookie caveat for production**: the JWT cookie is `SameSite=Lax`, which only
works when the frontend and API share a site (e.g. `nextmart.com.bd` +
`api.nextmart.com.bd`). With a `*.vercel.app` frontend talking to a
`*.onrender.com` API you'd need `SameSite=None; Secure` — prefer a custom
domain with an `api.` subdomain when going live.

To publish: create a GitHub repo, then
`git remote add origin <repo-url> && git push -u origin main`.
(`.env` files, `node_modules`, and the portable `/tools` are already git-ignored —
only `.env.example` templates are committed.)
