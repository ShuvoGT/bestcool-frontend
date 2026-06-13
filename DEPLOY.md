# Deploying Next Mart to Hostinger

This guide deploys **both** apps (Next.js storefront + Express API) and
**PostgreSQL** on a single **Hostinger VPS**, behind nginx on one domain:

```
https://yourdomain.com/         → Next.js storefront + /admin   (Node, port 3000)
https://yourdomain.com/api/...  → Express REST API              (Node, port 5000)
https://yourdomain.com/uploads/ → uploaded product images       (served by the API)
PostgreSQL                      → localhost:5432
PM2                             → keeps both Node apps running
```

Because the frontend and API share one domain, login cookies are first-party
and work out of the box (no cross-site cookie issues).

> **Plan note:** PostgreSQL needs root/SSH access, so this requires a **Hostinger
> VPS** (not shared/Cloud hosting). If you only have shared/Node.js hosting,
> use a free managed Postgres ([Neon](https://neon.tech)) and put its connection
> string in `DATABASE_URL` — everything else is the same.

---

## 0. Prerequisites
- A **Hostinger VPS** (Ubuntu) with SSH access (hPanel → VPS → SSH details).
- A **domain** pointed at the VPS IP (hPanel → DNS → A record `@` and `www` → VPS IP).
- This project pushed to **GitHub** (see the GitHub section in the main README).

SSH in: `ssh root@YOUR_VPS_IP`

## 1. Install the runtime (once)
```bash
# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs git nginx

# PostgreSQL
apt-get install -y postgresql postgresql-contrib

# PM2 (process manager) + certbot (free SSL)
npm install -g pm2
apt-get install -y certbot python3-certbot-nginx
```

## 2. Create the database
```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE nextmart;
CREATE USER nextmart WITH ENCRYPTED PASSWORD 'CHANGE_THIS_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE nextmart TO nextmart;
ALTER DATABASE nextmart OWNER TO nextmart;
SQL
```

## 3. Get the code
```bash
cd /var/www
git clone https://github.com/<you>/<repo>.git nextmart
cd nextmart
```

## 4. Configure environment

**`backend/.env`** (copy from `backend/.env.example`, then set):
```ini
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://yourdomain.com
API_URL=https://yourdomain.com
DATABASE_URL=postgresql://nextmart:CHANGE_THIS_STRONG_PASSWORD@localhost:5432/nextmart
JWT_SECRET=<run: openssl rand -hex 32>
JWT_EXPIRES_IN=7d
COOKIE_SAMESITE=lax        # same domain → first-party cookie
# Optional — fill when you have them (otherwise email/SMS log to console,
# and payment/courier gateways stay hidden until configured in the admin panel):
SMTP_HOST=   SMTP_PORT=587  SMTP_USER=  SMTP_PASS=  MAIL_FROM="Next Mart <no-reply@yourdomain.com>"
PAYMENT_MODE=sandbox
COURIER_MODE=sandbox
COURIER_WEBHOOK_SECRET=<run: openssl rand -hex 16>
```

**`frontend/.env.production`** (NEXT_PUBLIC_* are baked in at build time):
```ini
NEXT_PUBLIC_API_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

## 5. Build + seed
```bash
# Backend
cd /var/www/nextmart/backend
npm install
npx prisma migrate deploy      # create the schema
npm run seed                   # admin user, sample data (run ONCE)
npm run build

# Frontend
cd ../frontend
npm install
npm run build
```

## 6. Start both apps with PM2
```bash
cd /var/www/nextmart
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup        # run the command it prints, so PM2 restarts on reboot
```
Check: `pm2 status` (both `nextmart-api` and `nextmart-web` should be `online`).

## 7. nginx reverse proxy
Create `/etc/nginx/sites-available/nextmart`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    client_max_body_size 6M;   # product image uploads (5MB limit)

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
    }
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable it:
```bash
ln -s /etc/nginx/sites-available/nextmart /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## 8. Free SSL (HTTPS)
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Certbot rewrites the nginx config to serve HTTPS and auto-renews. Your site is
now live at `https://yourdomain.com`.

**Admin panel:** `https://yourdomain.com/admin` — login `admin@nextmart.com.bd`
/ `Admin@12345` (change this password immediately after first login).

---

## Updating after you push new code
```bash
cd /var/www/nextmart && git pull
cd backend  && npm install && npx prisma migrate deploy && npm run build
cd ../frontend && npm install && npm run build
cd .. && pm2 restart ecosystem.config.cjs
```

## Configure gateways from the admin panel (no redeploy)
Payment (bKash/Nagad/SSLCommerz) and courier (Steadfast/Pathao/RedX) credentials,
Facebook Pixel / GA4 IDs, SMS toggles and custom code snippets are all set in
**Admin → Settings** — they take effect immediately. For payment/courier
**webhooks**, give each provider the URL `https://yourdomain.com/api/payments/...`
or `.../api/couriers/.../webhook` (see the main README).

## Troubleshooting
- **Login doesn't persist** → ensure HTTPS is active (cookies are `Secure` in
  production) and `FRONTEND_URL` / `NEXT_PUBLIC_API_URL` both equal your real
  `https://` domain.
- **Images don't load** → `API_URL` must be your real domain so upload URLs and
  `next/image` agree; rebuild the frontend after changing `NEXT_PUBLIC_*`.
- **`pm2 logs nextmart-api`** / **`pm2 logs nextmart-web`** show runtime errors.
