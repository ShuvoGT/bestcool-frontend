# CLAUDE.md — Next Mart / Best Cool Electronics

Guidance for Claude Code. **Read this first on any machine.** For exhaustive
feature/API docs see [README.md](README.md) — but note its **"Deploying" section and
`DEPLOY.md` are OUTDATED** (they describe an abandoned Hostinger-VPS plan); the real
live setup is documented below.

## What this is

Production e-commerce web app for the Bangladesh **electronics** market. Internal
name "Next Mart"; live brand **Best Cool Electronics** (https://bestcoolelectronics.com).
One git repo, two apps:

- **`/frontend`** — Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui.
  Storefront (route group `(store)`) + admin panel at `/admin`.
- **`/backend`** — Node.js + Express + TypeScript + Prisma + PostgreSQL REST API.

The user communicates in **Banglish** (Bangla + English mixed) — reply the same way.

## Live deployment (current truth — supersedes README "Deploying" + DEPLOY.md)

Split hosting; everything **auto-deploys on push to `main`**:

| Piece | Where | Notes |
|---|---|---|
| Frontend | **Vercel** — project `bestcool-frontend`, team `achare-paka-s-projects` | Root Directory = `frontend`, Framework = Next.js |
| Backend | **Render** web service | Root Directory = `backend`; Build = `npm install --include=dev && npx prisma generate && npm run build`; Start = `npm start`; live at `https://bestcool-frontend.onrender.com` |
| Database | **Neon** Postgres (region ap-southeast-1 / Singapore) | `DATABASE_URL` in Render env + local `backend/.env` |
| Image uploads | **Cloudinary** (cloud `dwypgpehw`) | used when `CLOUDINARY_*` env vars are set; else local disk |
| Domain | `bestcoolelectronics.com` → Vercel | Hostinger DNS: A `@` → Vercel IP, CNAME `www`. SSL auto-issued |

Render free tier sleeps after ~15 min idle (~50s cold start on first request).
Vercel Hobby tier is technically non-commercial (Pro for a real store).

**Admin panel:** https://bestcoolelectronics.com/admin — `admin@nextmart.com.bd` / `Admin@12345`.

## Running locally

Needs **Node 20+** (and PostgreSQL for a local dev DB). Code is in git; `node_modules`,
`.env*` files, and the portable `/tools` folder are **git-ignored** (not cloned).

1. `git clone` → `cd frontend && npm install` → `cd ../backend && npm install`
2. Create the `.env` files from the committed `.env.example` templates (they document
   every variable). **Secrets are not in git** — get live values from the platform
   dashboards (Neon/Cloudinary/Render/Vercel) or the user's local Claude memory.
3. Backend: `npm run dev` (runs via tsx — **does NOT watch; restart after backend edits**)
   → http://localhost:5000. Frontend: `npm run dev` (HMR) → http://localhost:3000.
   Health check: `GET http://localhost:5000/api/health`.

### Original dev machine only
That box has no system Node/Postgres — portable copies live in `/tools` (Node 24.16.0,
PostgreSQL 17.5, data in `tools/pgdata`). Prepend PATH before any node/npm command:
`$env:Path = "<repo>\tools\node;$env:Path"`; start the DB with `tools\start-db.ps1`.
On any **other** machine, ignore `/tools` and install Node/Postgres normally.

## Two-machine workflow (the user works from office + home)

Both machines push to the same private repo (`github.com/ShuvoGT/bestcool-frontend`).

- **`git pull` before starting work, `git push` when done — every time** (avoids conflicts).
- Use a **local Postgres or a Neon dev branch** as the dev database. Do **NOT** point
  local dev at the live Neon — a stray `prisma migrate` would alter production data.
- **Live (Neon) and any local DB are SEPARATE.** Content/product/image edits made on a
  local DB do **not** appear on the live site — manage real content via the **live admin
  panel**, where image uploads go to Cloudinary automatically.

## Conventions & gotchas

- **Next 16 has breaking changes** — read `frontend/node_modules/next/dist/docs/` before
  writing Next code (see `frontend/AGENTS.md`).
- Backend prod build: `npm run build` (tsc → `dist/`), run `npm start` (`node dist/index.js`).
  `backend/src/config/env.ts` **throws if `JWT_SECRET` is unset**.
- **Storage:** `backend/src/storage/index.ts` selects `CloudinaryStorageProvider` when
  `CLOUDINARY_CLOUD_NAME` is set, else `LocalStorageProvider` (local disk). Render's
  filesystem is ephemeral, so production MUST use Cloudinary.
- **CORS:** `FRONTEND_URL` is a **comma-separated allowlist** of origins (first entry is
  canonical, used for email/redirect/payment links). Each must exactly match a storefront
  origin — scheme + host, **no trailing slash**.
- **Auth cookie** defaults to `SameSite=None; Secure` in production (cross-site
  Vercel ↔ Render) and `lax` in dev; override with `COOKIE_SAMESITE`.
- **Payments, couriers, analytics, and code snippets** are configured in **Admin →
  Settings** (stored in the DB); `.env` values are only fallbacks.
- **psql via the PowerShell tool mangles double-quoted `"Identifiers"`** — use the Bash
  tool (or a `.sql` file) for psql queries.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- After substantive payment/security changes, run an adversarial review.
