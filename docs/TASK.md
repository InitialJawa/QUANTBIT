# TASK.md — Session SOT

## Project
**QUANTBIT** — Quantitative Stock Terminal (React 19 + Vite 6 + TypeScript)
Repo: `https://github.com/InitialJawa/QUANTBIT`

## Current Mission
Data layer rewrite: D1 single source of truth dengan schema V2 (19 tables), pipeline otomatis, hapus semua sumber data ganda (JSON/SQLite/L[]/in-memory).

## Session Context
- **Sesi 20** — 2026-07-04
- Branch: `main`
- Status: **DATA LAYER REWRITE** — Phase 4-6 selesai
- Data source: **Yahoo Finance** (harga + fundamental) — IDX website Cloudflare-blocked
- `scripts/pipeline-sync.ts` = pipeline harian (Yahoo -> D1)
- `scripts/seed-local-db.ts` = seed `data/quantbit.db` untuk dev (node:sqlite)
- `src/server/db.ts` = D1 database module (node:sqlite, auto-schema, query helpers)
- Vite proxy: `/api/stocks`, `/api/engine`, `/api/backtest-data`, `/api/db-sync-status`, `/api/market/sync` → Express (port 3001)
- Express server: D1-backed endpoints — `/api/stocks/scores`, `/api/stocks/profiles`, `/api/stocks/fundamentals`, `/api/engine/idx80`, `/api/backtest-data`, `/api/db-sync-status`
- `data/quantbit.db` = local SQLite seeded dengan V2 schema (19 tables, 1320 mkt rows, 120k+ stock daily, 89 scores)

### Phase 4-6 Changes
- `src/server/db.ts` — D1 database module (node:sqlite, auto-schema, query helpers)
- `scripts/seed-local-db.ts` — seed local SQLite from migration + seed SQL files
- `server.ts` — all D1-backed API endpoints + cron schedule (weekdays 16:30 WIB)
- `src/mcp/index.ts` — replaced Python bridge + idx80_scan.json refs with D1 queries
- `vite.config.ts` — proxied `/api/stocks`, `/api/engine` to Express
- `src/services/dataService.ts` — fetches from Express API, updates `L`/`PF`/`FD` via setters
- `src/marketData.ts` — `L`, `PF`, `FD` use setters from dataService
- `src/data/fallbackData.ts` — **deleted**
- `data/historical_market.sqlite`, `data/idx80_scan.json` — **deleted**
- `package.json` — `serve-api` + `serve-mcp` use `NODE_OPTIONS='--experimental-sqlite'`

## Active Tasks
- [x] **Phase 1**: D1 Schema Migration — 19 tables V2 ✅
- [x] **Phase 2**: Seed D1 ✅
- [x] **Build Fix Sesi 19**: ✅
- [x] **Phase 3**: Engine → D1-only ✅
- [x] **Phase 4**: API — Express D1-backed endpoints ✅
- [x] **Phase 5**: Pipeline — cron automation, endpoints verified ✅
- [x] **Phase 6**: Cleanup — MCP server updated, dead code removed, fallbackData deleted ✅

## Key Constraints
- **NO AI for financial math** — semua kalkulasi deterministic
- **DB = single source of truth** — semua engine baca dari D1, bukan file/in-memory
- **Dual source: Yahoo (harga+fundamental)**, IDX website Cloudflare-blocked
- **Pipeline: scripts/pipeline-sync.ts** untuk update harian prices + scores + momentum
- **No refactor without DOX pass**
- **Update docs setelah setiap sesi**
- **Buat handover setelah sesi berakhir**
- **Ask before adding dependencies**
- **Dev server**: `NODE_OPTIONS='--experimental-sqlite' tsx server.ts` (uses Node built-in SQLite)

## Test Commands
```
npx tsc --noEmit
npm run lint
npx vite build
NODE_OPTIONS='--experimental-sqlite' npx tsx scripts/pipeline-sync.ts
NODE_OPTIONS='--experimental-sqlite' npx tsx scripts/seed-local-db.ts
```
