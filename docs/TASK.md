# TASK.md — Session SOT

## Project
**QUANTBIT** — Quantitative Stock Terminal (React 19 + Vite 6 + TypeScript)
Repo: `https://github.com/InitialJawa/QUANTBIT`

## Current Mission
**Full Serverless Refactor — Complete ✅**
Semua data flow dari D1 Cloudflare via CF Pages Functions. Gak ada Express, gak ada SQLite lokal, gak ada devMock. Pipeline otomatis tiap 6 jam via GitHub Actions.

## Session Context
- **Sesi 22** — 2026-07-04
- Branch: `main`
- Status: **FULL SERVERLESS** — Phase 7-12 selesai, Bugfix sesh
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

### ✅ Phase 12 — Deploy
- [x] 12.1 — `npx tsc --noEmit` ✅
- [x] 12.2 — `npx vite build` ✅
- [x] 12.3 — Setup GitHub Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- [x] 12.4 — Push ke GitHub → CF Pages auto-deploy
- [ ] 12.5 — Buka dari HP, test Market/Analytics/Backtest (pending user test)

---

## Sesi 22 — Bugfix: Gold Zeros + Backtest Broken

### Bug 1: Gold chart zeros on Market tab
**Root cause**: Silent GC=F fetch failure in pipeline + missing USD/oz → IDR/gram conversion in chart
- `scripts/pipeline-sync.ts`: empty try-catch swallows Yahoo errors for GC=F; gold_close written as NULL/0
- `src/components/MarketOverviewCharts.tsx`: renders raw gold_close (USD/oz ~$2,600) without converting to IDR/gram (~Rp 1,400,000)

**Fixes applied**:
- `scripts/pipeline-sync.ts` (lines 66-69): error logging now prints Yahoo fail message instead of silent `⚠️`
- `scripts/pipeline-sync.ts` (lines 256-258): explicit warning when GC=F returns 0 days
- `scripts/pipeline-sync.ts` (lines 107-114): separate `UPDATE` for gold fields `WHERE gold_close IS NULL OR gold_close = 0` — fixes existing rows that have NULL gold from previous failures
- `src/components/MarketOverviewCharts.tsx` (line 141-154): gold converted from USD/oz → IDR/gram via `(goldPrice * usdidrRate) / 31.1035`
- `src/components/MarketOverviewCharts.tsx` (lines 23, 95): `usdidrRate` added to `RawDay` interface and fetched from API

### Bug 2: Backtest chart not showing, results = 0%
**Root cause**: `.JK` suffix mismatch — `functions/api/backtest-data.ts` line 50 used `stockNormScores[tkr + ".JK"]` while stockPrices/stockAdjPrices use bare tickers. This caused `pickTopTickersByRank` (ranker.ts) to always return empty because `.JK`-suffixed tickers never matched bare `allowedTickers` or `dayPrices`.

**Fixes applied**:
- `functions/api/backtest-data.ts` (line 50): removed `.JK` suffix — now uses bare tickers throughout
- `server.ts` (line 527): same fix applied to dev-mode Express server

## Sesi 23 — Backtest Production Fix (2026-07-04)

### Bug 1: Migration 0004 wipes stock_daily data every pipeline run
**Root cause**: `db/migrations/0004_v2_schema.sql` contains `DROP TABLE IF EXISTS stock_daily;` before `CREATE TABLE IF NOT EXISTS stock_daily`. Each pipeline "Apply D1 migrations" step drops and recreates the table, deleting all data.

**Fixes**:
- Removed `DROP TABLE IF EXISTS stock_daily;` from `db/migrations/0004_v2_schema.sql`

### Bug 2: --full flag breaks pipeline-sync
**Root cause**: `scripts/pipeline-sync.ts` reads `process.argv[2]` as mode (all/prices/fundamentals). `--full` was passed as first arg, making mode=`--full` instead of `all`, skipping both price and fundamental fetching.

**Fixes**:
- `scripts/pipeline-sync.ts`: parse `--full` as flag (not mode) using `process.argv.slice(2).find()`
- `.github/workflows/pipeline.yml`: added `workflow_dispatch.inputs.full_sync` boolean for manual trigger

### Bug 3: compute-intermediate NaN in SQL
**Root cause**: `esc()` helper doesn't handle NaN. SMA/RSI/MACD return NaN for early days (not enough data), inserted as `NaN` in SQL → `SQLITE_ERROR: no such column: NaN`

**Fixes**:
- `scripts/compute-intermediate.ts`: `esc()` now uses `!isFinite(v)` to catch NaN/Infinity → returns `NULL`

### Bug 4: backtest/run.ts missing topN rebalancing
**Root cause**: `functions/api/backtest/run.ts` only had DCA buying logic (`if (dcaActive && dcaAmount > 0)`). The main rebalancing strategy (sell all → buy topN each period) was completely absent.

**Fixes**:
- Added monthly/weekly/quarterly rebalance date detection
- Added sell-all → buy-topN logic on rebalance days
- Added crash protection (skip buy when SMA50 < SMA200)
- Sell uses full daily data (`allToday`, not topN-only `stocks`) for correct price
- Unsold stocks carried forward when price data missing on rebalance day
- Guard against `close <= 0` in buy calculations (prevents Infinity shares)

### Status: ✅ ALL PRODUCTION BUGS FIXED
- Gold chart: ✅ fixed earlier
- Pipeline data fetching: ✅ fixed
- Intermediate computation: ✅ fixed  
- Backtest results: ✅ returns +16.64% with 319 trades

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

## Backtest CURL
```bash
curl -X POST "https://quantbit-terminal.pages.dev/api/backtest/run" \
  -H "Content-Type: application/json" \
  -d '{"from":"2021-01-01","to":"2026-12-31","initialCash":100000000,"config":{"weights":{"quality":0.45,"growth":0.1,"value":0.05,"momentum":0.40,"dividend":0},"topN":5,"rebalanceFreq":"monthly","crashProtection":true,"dcaActive":false,"dcaAmount":0}}'
```
