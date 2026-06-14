# Deploying the consolidated app to Hostinger

This is the **current** deploy guide for the single Next.js app (storefront +
admin + API in `frontend/`). It supersedes the old `DEPLOY.md` / README
"Deploying" section (those describe the abandoned split-hosting plan).

> **I (Claude) can't log into your Hostinger account** — this guide is the
> click-by-click you run in hPanel. Ping me with any error and I'll fix it.

---

## 0. Prerequisite — your plan MUST support Node.js  ⚠️

This app runs on Node.js (SSR + API route handlers + Prisma). It **cannot** run
on a PHP-only plan.

- In hPanel, look for **"Setup Node.js App"** (under *Advanced* / *Website*).
  - Present → you're good (Hostinger **Premium** or **Business** shared, or VPS).
  - Missing → the plan is PHP-only. You must upgrade to Business shared, or use a
    Hostinger **VPS** (cheap, full Node control — the most reliable option).

Also create, in hPanel:
- **MySQL database** (Databases → MySQL): note the DB name, user, password, host.

---

## 1. Build locally (on your Windows machine)

```powershell
cd frontend
npm install
npm run build
```

This produces a self-contained server under `frontend/.next/standalone/`
(thanks to `output: "standalone"`). The Linux Prisma engines are bundled because
`schema.prisma` lists `binaryTargets = ["native","debian-openssl-3.0.x","debian-openssl-1.1.x"]`.

## 2. Assemble the upload bundle

The standalone folder does **not** include static assets or `public/` — copy them in:

```powershell
# from frontend/
Copy-Item -Recurse .next\static .next\standalone\.next\static
Copy-Item -Recurse public .next\standalone\public
```

Your upload root is now **`frontend/.next/standalone/`**. It contains:
`server.js`, `package.json`, `node_modules/` (incl. Linux Prisma engine),
`.next/`, `public/`.

## 3. Upload

Upload **the contents of `frontend/.next/standalone/`** into your Node app's
root directory (e.g. `~/bestcool` or `~/domains/bestcoolelectronics.com/app`).
Use hPanel **File Manager** (zip → upload → extract) or **FTP/SSH**.

## 4. Configure the Node.js app (hPanel → Setup Node.js App)

- **Application root:** the folder you uploaded into.
- **Application startup file:** `server.js`
- **Node version:** 20 or newer.
- **Environment variables:** add everything from
  [`frontend/.env.production.example`](frontend/.env.production.example) with
  real values. Critical ones:
  - `DATABASE_URL` — your hPanel MySQL connection string
  - `NEXTAUTH_SECRET` — `openssl rand -base64 32`
  - `NEXT_PUBLIC_SITE_URL` — `https://yourdomain`
  - `NEXT_PUBLIC_API_URL` — leave **empty**
  - `CRON_SECRET`, `COURIER_WEBHOOK_SECRET` — random strings
  - `NODE_ENV=production`

> Passenger sets `PORT` automatically; `server.js` listens on it — don't hardcode a port.

## 5. Create the schema + seed the data (one-time)

The DB starts empty. Create the tables and load your data.

**Option A — from your local machine** (if Hostinger allows remote MySQL; enable
your IP under hPanel → Remote MySQL):
```powershell
cd frontend
$env:DATABASE_URL = "mysql://USER:PASS@REMOTE_HOST:3306/DBNAME"
npx prisma db push          # creates all tables
# then load data: re-export from live Neon and import into Hostinger MySQL
node import-live-data.mjs ../backend/live-data.json
```

**Option B — over SSH on the server** (Business/VPS): upload the repo, run the
same `npx prisma db push` + `node import-live-data.mjs` there.

> `import-live-data.mjs` **wipes then re-inserts** — only run it on the fresh
> production DB. (Re-`npx tsx backend/export-live-data.ts` first for the latest
> live snapshot.) After import, the admin login is the live one
> (`admin@nextmart.com.bd`); change the password from the panel.

## 6. Restart the app & point the domain

- hPanel → Setup Node.js App → **Restart**.
- Point your domain to the app (hPanel domain / DNS). SSL: enable Let's Encrypt.
- Visit `https://yourdomain/api/health` → should return `{"status":"ok",...}`.

## 7. Reconciliation cron (replaces the old setInterval)

Online payments (bKash/Nagad) settle via the customer's browser redirect; if that
drops, the reconcile sweep finalises the order. On shared hosting set a cron:

hPanel → **Cron Jobs** → every 5 minutes:
```bash
curl -fsS "https://yourdomain/api/cron/reconcile?secret=YOUR_CRON_SECRET" >/dev/null
```
(Returns 401 unless `CRON_SECRET` matches — it's safe to expose the URL.)

## 8. Go-live checklist for payments & couriers

- Until you enter gateway credentials, checkout shows **Cash on Delivery only** —
  this is by design and fully working.
- When ready: **Admin → Settings → Payments / Couriers**, enter the credentials,
  flip **mode to Live**, save. They take effect immediately (no redeploy).
- Sandbox-test each gateway first (SSLCommerz has a free sandbox store).
- Couriers: register the webhook URL `https://yourdomain/api/couriers/{steadfast|pathao|redx}/webhook`
  with `?secret=YOUR_COURIER_WEBHOOK_SECRET`.

## Notes / gotchas

- **Uploads:** product images saved to `public/uploads` persist on Hostinger's
  disk. Ensure that folder is writable. (Or set `CLOUDINARY_*` to use Cloudinary.)
- **Email:** Render blocked SMTP — Hostinger does not. Set `SMTP_*` or configure
  Admin → Settings → Email, then use the "Send test email" button.
- **Memory:** if the Node app is killed/slow on a shared plan, that's the plan's
  memory ceiling — upgrade tier or move to a VPS.
- **Updates:** rebuild locally (steps 1–2), re-upload `.next` + restart the app.
