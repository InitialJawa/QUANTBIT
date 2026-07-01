# AGENTS.md — functions/

## Purpose
Cloudflare Pages Functions — production API endpoints for auth, data CRUD, AI chat, and engine operations.

## Ownership
- Root AGENTS.md governs project-wide rules
- InsForge backend rules apply (see root AGENTS.md Bagian 2)

## Local Contracts
- Functions run on Cloudflare Pages edge runtime (Workers)
- D1 database binding: `quantbit-db`
- Auth using PBKDF2 (server-side)
- AI chat via Gemini/Groq/OpenRouter
- No Express-specific APIs (that's local dev only via `src/server/`)

## Work Guidance
- Deploy via `npx wrangler pages deploy`
- Test locally via `npx wrangler pages dev dist`
- Environment variables via Cloudflare dashboard or `.env`
- `runIdx80Scan()` (line 1093) fetches Yahoo 6mo weekly data for ~80 IDX80 tickers, computes quality/growth/value/momentum from price, writes to:
  1. `idx_scan_data` D1 table (full JSON snapshot, replace-only)
  2. `stock_fundamentals` D1 table (per-ticker upsert of scores)
- Endpoint `POST /api/engine/force-sync` triggers `runIdx80Scan()`. If env `CRON_SECRET` is set, request body must include `{ secret: "..." }` matching it.
- GitHub Actions workflow `.github/workflows/daily-data-pipeline.yml` calls force-sync on schedule (weekdays) after data update + commit.

## Verification
- `npm run build` — builds functions + frontend
- `npm start` — local preview via Wrangler

## Child DOX Index
- `functions/api/` — API route handlers
