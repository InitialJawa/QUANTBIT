# TASK.md — Session SOT

## Project
**QUANTBIT** — Quantitative Stock Terminal (React 19 + Vite 6 + TypeScript)
Repo: `https://github.com/InitialJawa/QUANTBIT`

## Current Mission
Data layer rewrite: D1 single source of truth dengan schema V2 (19 tables), pipeline otomatis, hapus semua sumber data ganda (JSON/SQLite/L[]/in-memory).

## Session Context
- **Sesi 19** — 2026-07-04
- Branch: `main`
- Status: **DATA LAYER REWRITE** — Phase 1-2 selesai, D1 sebagai single source of truth
- Data source: **Yahoo Finance** (harga + fundamental) — IDX website Cloudflare-blocked
- Yang tinggal: `src/` (UI + engine), `research/` (blueprint V2), `docs/TASK.md`, `scripts/`
- `scripts/pipeline-sync.ts` = pipeline harian (Yahoo -> D1)
- `scripts/sync-fundamentals.ts` = fetch fundamental + compute scores
- `scripts/compute-scores.ts` = legacy (diganti sync-fundamentals.ts)

## Active Tasks
- [x] **Phase 1**: D1 Schema Migration — 19 tables V2 ✅
  - Migration 0004: 19 tables, indexes, foreign keys
  - Migration 0005: Restore users + sessions (di-drop 0004, auth CF Functions butuh)
  - Fix: add DROP TABLE IF EXISTS stock_daily before CREATE
  - Ticker catalog: 95 tickers (88 IDX80)
- [x] **Phase 2**: Seed D1 ✅
  - market_daily: 1.320 rows (2021-01-04 s/d 2026-07-03)
  - stock_daily: 120.358 rows (95 tickers × 5+ tahun, open/high/low/close/volume)
  - stock_scores: 89 tickers (quality/growth/value/dividend/momentum 0-100)
- [x] **Build Fix Sesi 19**: ✅
  - Stub files dibuat: `data/idx80_scan.json`, `src/data/dividend_snapshots.json`, `src/data/raw_stocks_data.ts`
  - `src/data/yahoo/fetchYahooData.ts` — recreate pakai yahoo-finance2@3 API (new YahooFinance())
  - `npm run build` + `npx tsc --noEmit` lulus
  - CF Pages deployment seharusnya fix setelah push
- [ ] **Phase 3**: Engine → D1-only — hapus L[], JSON imports, dividend_snapshots
- [ ] **Phase 4**: API — rewrite endpoints baca dari D1
- [ ] **Phase 5**: Pipeline — cron automation (Yahoo harian)
- [ ] **Phase 6**: Cleanup & Verify — dead code removal, verifikasi data flow

## Key Constraints
- **NO AI for financial math** — semua kalkulasi deterministic
- **DB = single source of truth** — semua engine baca dari D1, bukan file/in-memory
- **Dual source: Yahoo (harga+fundamental)**, IDX website Cloudflare-blocked
- **Pipeline: scripts/sync-fundamentals.ts** untuk update harian scores
- **No refactor without DOX pass**
- **Update docs setelah setiap sesi**
- **Buat handover setelah sesi berakhir**
- **Ask before adding dependencies**

## Test Commands
```
npx tsc --noEmit
npm run lint
npx vite build
npx tsx scripts/sync-fundamentals.ts
npx wrangler d1 execute quantbit-db --remote --command="SELECT * FROM stock_scores WHERE score_date=(SELECT MAX(score_date) FROM stock_scores) LIMIT 5;"
```
