# TASK.md — Session SOT

## Project
**QUANTBIT** — Quantitative Stock Terminal (React 19 + Vite 6 + TypeScript)
Repo: `https://github.com/InitialJawa/QUANTBIT`

## Current Mission
**Full Serverless Refactor — Complete ✅**
Semua data flow dari D1 Cloudflare via CF Pages Functions. Gak ada Express, gak ada SQLite lokal, gak ada devMock. Pipeline otomatis tiap 6 jam via GitHub Actions.

## Session Context
- **Sesi 21** — 2026-07-04
- Branch: `main`
- Status: **FULL SERVERLESS** — Phase 7-12 selesai
- Data source: **Yahoo Finance** via pipeline → D1 Cloudflare

## Arsitektur Baru
```
GitHub Actions (tiap 6 jam)
  └→ pipeline-sync.ts → D1 Cloudflare
  └→ compute-intermediate.ts → D1 Cloudflare (SMA/RSI/MACD/ATR)

Frontend React → CF Pages Functions → D1 Cloudflare
  └→ /api/stocks/scores, /api/stocks/profiles, /api/stocks/fundamentals
  └→ /api/engine/idx80, /api/backtest-data, /api/db-sync-status
  └→ /api/yahoo/live-prices (Yahoo dengan D1 fallback)
  └→ /api/backtest/run (strategy compute dari intermediate table)
  └→ /api/auth/* (login/signup/me/logout via D1)

Dev mode: npm run dev (Express + Vite concurrently)
Production: CF Pages Functions + D1 (no server needed)
```

---

## Master Task List — Status

### ✅ Phase 7 — CF Functions (8 endpoints)
- [x] **7.1** — `/api/stocks/scores`
- [x] **7.2** — `/api/stocks/profiles`
- [x] **7.3** — `/api/stocks/fundamentals`
- [x] **7.4** — `/api/engine/idx80`
- [x] **7.5** — `/api/backtest-data`
- [x] **7.6** — `/api/db-sync-status`
- [x] **7.7** — `/api/yahoo/live-prices`, `/api/market/sync`
- [x] **7.8** — `/api/backtest/run`

### ✅ Phase 8 — GitHub Actions Pipeline
- [x] **8.1** — `.github/workflows/pipeline.yml` (cron tiap 6 jam)
- [x] **8.2** — Pipeline: pipeline-sync.ts → D1 + compute-intermediate.ts → D1

### ✅ Phase 9 — Intermediate Backtest
- [x] **9.1** — Migration 0006: `backtest_intermediate` table
- [x] **9.2** — `scripts/compute-intermediate.ts` (SMA20/50/200, RSI14, MACD, ATR14, drawdown)
- [x] **9.3** — CF Function `/api/backtest/run` (strategy DCA, topN selection, weighted scoring)

### ✅ Phase 10 — Frontend Update
- [x] **10.1** — Hapus semua `devMock()` data di `api.ts` (sisain auth mock)
- [x] **10.2** — Wire `initDataService()` di `App.tsx` → L[]/PF[]/FD[] dari D1
- [x] **10.3** — Update MKT fallback values dari D1 seed (IHSG=5875.78, gold=2.417.492)
- [x] **10.4** — Seed MKT values dari backtest-data D1 saat Yahoo offline

### ✅ Phase 11 — Docs
- [x] **11.1** — TASK.md di-update
- [x] **11.2** — AGENTS.md di-update
- [x] **11.3** — functions/tsconfig.json (workers-types)

### ☐ Phase 12 — Deploy
- [x] 12.1 — `npx tsc --noEmit` ✅
- [x] 12.2 — `npx vite build` ✅
- [x] 12.3 — Setup GitHub Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- [x] 12.4 — Push ke GitHub → CF Pages auto-deploy
- [ ] 12.5 — Buka dari HP, test Market/Analytics/Backtest

---

## Yang Loe Perlu Lakukan
1. **Set GitHub Secrets**: `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID` di Settings → Secrets → Actions
2. **Push**: `git push origin main` → pipeline auto-deploy ke CF Pages
3. **Buka dari HP**: `https://quantbit-terminal.pages.dev`

## Key Constraints
- **NO AI for financial math**
- **DB = single source of truth** — semua dari D1
- **No Express, no SQLite lokal, no mock** — full serverless
- **Ask before adding dependencies**

## Test Commands
```
npx tsc --noEmit
npx vite build
npm run dev  # Express + Vite (dev mode with real data)
```
