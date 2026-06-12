# Next Mart — E-commerce Platform for Bangladesh

A production-quality electronics e-commerce web application for the Bangladesh market.

- **Storefront + Admin panel**: Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui — in [`/frontend`](frontend)
- **REST API**: Node.js + Express (TypeScript), Prisma ORM, PostgreSQL — in [`/backend`](backend)
- **Payments**: Cash on Delivery, bKash, Nagad, SSLCommerz (sandbox-ready)
- **Couriers**: Steadfast, Pathao, RedX
- **Notifications**: Email (Nodemailer/SMTP) + SMS (provider-agnostic gateway)

> **Build status**: Phase 1 complete (scaffolding, database schema, migrations, seed data).
> Phases 2–8 (API, admin panel, storefront, checkout, payments, couriers, analytics) are in progress.

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

Payment sandbox setup notes, courier API setup notes, and SMS gateway setup notes
will be expanded in this README as those phases are built (Phases 5–8).
