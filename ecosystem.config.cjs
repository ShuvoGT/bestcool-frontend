/**
 * PM2 process manager config — runs BOTH apps in production (e.g. on a
 * Hostinger VPS). Run from the repo root after building each app:
 *
 *   cd backend  && npm install && npx prisma migrate deploy && npm run build
 *   cd ../frontend && npm install && npm run build
 *   cd .. && pm2 start ecosystem.config.cjs && pm2 save
 *
 * See DEPLOY.md for the full step-by-step guide (nginx, SSL, env, Postgres).
 */
const path = require("path");

module.exports = {
  apps: [
    {
      name: "nextmart-api",
      cwd: path.join(__dirname, "backend"),
      script: "dist/index.js", // built output of `npm run build`
      env: { NODE_ENV: "production" }, // PORT etc. come from backend/.env
      time: true,
      max_restarts: 10,
    },
    {
      name: "nextmart-web",
      cwd: path.join(__dirname, "frontend"),
      script: "npm",
      args: "start", // next start (reads PORT from frontend/.env / env)
      env: { NODE_ENV: "production", PORT: "3000" },
      time: true,
      max_restarts: 10,
    },
  ],
};
