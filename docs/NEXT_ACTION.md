# NEXT ACTION
## P0 — DB sebagai Single Source of Truth: Seed Production D1 (2026-07-01, Sesi 16)
**Status**: PENDING

### Context
120.793 rows `stock_daily` + 1322 rows `daily_overview` udah ada di local SQLite (`data/historical_market.sqlite`, 2021-01-04 → 2026-07-01). Tapi production D1 masih kosong — endpoint `/api/backtest-data` fallback ke file statis.

### What Needs to Happen (2 langkah)
- [ ] **Bikin `scripts/seed-d1.py`** — baca dari local SQLite, generate batched SQL `INSERT OR REPLACE`, execute via `wrangler d1 execute --remote`. Handle D1 10MB batch limit (120k rows ~ perlu chunking ~3-5 batch).
- [ ] **GA workflow** — tambah step `Seed D1` setelah `sync-daily-data.ts`, pake `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` dari secrets.

### Prasyarat (user setup)
- [ ] **GitHub Secrets**: `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`
- [ ] **Env ini**: export `CLOUDFLARE_API_TOKEN` biar bisa verify

### Catatan
- User express frustration: "ini masih migration asu" — STOP planning, langsung eksekusi.
- Migration 0003 sudah diapply (user bilang "kemarin aku udah migration"). Tapi data belum di-seed ke D1.
- `stock_fundamentals` di D1 udah populated via `runIdx80Scan()` (force-sync di GA workflow).
- Yang kurang cuma `stock_daily` + `daily_overview` di D1.

## P0 — AI Router Backup Chain (2026-07-01, Sesi 15)
**Status**: IN PROGRESS

### Delivered
- [x] **Hapus stale docs**: MANUAL_TEST_GUIDE.md, TASK_STRATEGY_SYNC_ENGINE.md/v2
- [x] **Fix README.md dead link** — hapus reference ke MANUAL_TEST_GUIDE.md (line 507 & 586)
- [x] **README.md typo** — "Backtest" → "Backtest"
- [x] **Fix 9router crash loop** — langsung `server.js` via PM2, bukan CLI wrapper (`detached:true` gak cocok fork mode)
- [x] **PM2 multi-app** — `/root/ecosystem.config.js`, `pm2 startup` (systemd auto-start)
- [x] **KeiRouter** — install v0.1.23 Go binary, port :20180, 241 models via Kiro
- [x] **VirtuSoul Router** — install Python package, port :4000, ML-based query classifier (sentence-transformers)
- [ ] **FreeRouter** — perlu simplify auth dari OpenClaw ke API key
- [ ] **Update opencode.json** + add provider entries for all routers
- [x] **Fallback proxy/chain** — `/root/ai-router-proxy/server.js` port 2050, auto-switch 9router→KeiRouter→VirtuSoul
- [ ] **Verify end-to-end** — opencode bisa gonta-ganti provider

### Verification
- [x] `ss -tlnp` — 9router:20128, keirouter:20180, virtusoul:4000 all LISTEN
- [x] `/v1/models` — 9router: 62 models, keirouter: 241 models

## P1 — QUANTBIT Landing Page Rebuild (2026-07-01, Sesi 15b)
**Status**: IN PROGRESS

### Delivered
- [x] **Rebuild landing page from scratch** — sibling site `../QUANTBIT-landing` dibuat sebagai static HTML/CSS
- [x] **Tambah visual screenshot panel** — hero mockup terminal dengan market overview, factor rank, portfolio heat
- [x] **Tambah visual backtest** — section equity curve + metrik simulasi
- [x] **Tambah AI brief visual** — narrative card agar value AI lebih jelas di first scroll
- [x] **Tambah OG asset** — `../QUANTBIT-landing/public/og-preview.svg`
- [x] **Update docs** — PROJECT_MASTER, CURRENT_STATE, NEXT_ACTION, DECISIONS, MASTER_CHRONICLE, handover

### Pending
- [ ] **Login Cloudflare** — `npx wrangler login` di `../QUANTBIT-landing`
- [ ] **Create new Pages project** — project lama `quantbit-landing` sudah dihapus
- [ ] **Deploy new landing** — `npx wrangler pages deploy . --project-name <new-project>`
- [ ] **Verify public URL** — cek hero, preview screenshots, OG image

## P0 — Migration 0003 COMPLETION: DB as SOT (2026-06-30, Sesi 14)
**Status**: COMPLETED ✅

### Delivered
- [x] **PROJECT_MASTER.md** — Architecture rules updated: DB = SOT, daily cron, no live prices
- [x] **AGENTS.md** — Rule 4 added: "WAJIB baca dari DB, JANGAN pakai live prices langsung"
- [x] **scripts/sync-daily-data.ts** — Fetch Yahoo EOD → upsert year file + rebuild SQLite
- [x] **useDataFeed.ts** — DB sync status fetch, stale warning, live prices as visual overlay only
- [x] **PortfolioTracker.tsx** — Sync status indicator bar (Last synced, Sync Now, stale warning)
- [x] **MarketTab.tsx** — DB Sync indicator chip
- [x] **Actions merge** — sync-db.yml dihapus, cron 06:30 + 14:00 UTC di daily-data-pipeline.yml
- [x] **simEndDate auto-update** — EngineConfigContext refresh jika >2 hari stale
- [x] **Bug fixes** — Yahoo batchSize 50→20, gold IDR/gram conversion, --force parsing, Python encoding
- [x] **docs update** — PROJECT_MASTER, CURRENT_STATE, NEXT_ACTION, AGENTS.md

### Verification
- [x] `npx tsc --noEmit` — PASS 0 errors
- [x] `npm test` — 239/239 tests passing
- [x] `npm run sync-daily -- --force` — success (90 prices, SQLite reseeded, DB: 2026-06-30)
- [x] `GET /api/db-sync-status` — `stale: false`, `latestDate: 2026-06-30`

## P0 — CRITICAL FIX (2026-06-30, Sesi 13d)
**Status**: Production chart loading fix DEPLOYED.

Delivered (Sesi 13d — Cloudflare Workers Asset Fix):
- **env.ASSETS.fetch() fix** — Cloudflare Workers cannot use plain fetch() for static assets
- **loadYearFilesFromAssets** now receives and uses env.ASSETS binding
- **Root cause**: Worker runtime returns HTML error page instead of JSON when using plain fetch()

**Verification**:
- [x] `npx tsc --noEmit` — PASS 0 errors
- [x] Pushed to main (commit 6ca2395)
- [ ] Wait ~3 min for Cloudflare Pages deploy
- [ ] Test production backtest — chart should load

## P0 — CRITICAL FIX (2026-06-30, Sesi 13c)
**Status**: Production data mapping bug FIXED. Deployed to main.

Delivered (Sesi 13c — Production Backtest Fix):
- **Critical data mapping bug fixed** — Empty object `{}` defeating `||` fallback operator
- **stockPrices/stockAdjPrices validation** — Check Object.keys().length > 0 before using
- **stockRanks fallback chain** — Ensure ranking data never empty/undefined
- **Applied to both paths** — D1 success path + year files fallback path

**Root Cause (Production Backtest Anjlok)**:
- Empty object `{}` is truthy → `||` operator doesn't fallback
- Engine received empty prices/ranks → picked random stocks
- Result: -33.7% return, 14.6% win rate, 459 rebalances, 12723% turnover

**Verification**:
- [x] `npx tsc --noEmit` — PASS 0 errors
- [x] Pushed to main (commit afafe36)
- [ ] Wait ~3 min for Cloudflare Pages deploy
- [ ] Test production backtest 2025-2026

## P0 — VERIFY (2026-06-30, Sesi 13b)
**Status**: Backtest chart reactivity + data loading fixes DONE. tsc passing.

Delivered (Sesi 13 — Backtest Chart Fixes):
- **Auto-run backtest saat config berubah** — SimulationTab useEffect sekarang trigger re-run saat configFingerprint berubah (fix: chart tidak update saat ubah parameter)
- **Data re-fetch saat date range berubah** — Added simStartDate/simEndDate ke dependencies (fix: data tidak reload saat ganti range)
- **Python command Windows compatibility** — server.ts gunakan `python` (Windows) instead of `python3` (Linux/Mac) via process.platform check
- **Comprehensive logging** — Server + client console logs untuk debug data flow (DB → file fallback → synthetic fallback)
- **Better error handling** — Improved fallback chain dengan specific error messages

**Root cause analysis (chart flat 2025-2026)**:
- `python3` tidak ada di Windows → DB load failed silently
- Fallback ke year files (2025.json, 2026.json) worked, tapi tidak log jelas
- Jika ANY error, client fallback ke `generateClientBacktestData()` synthetic data (seed=42)
- Synthetic random walk formula menghasilkan ~flat chart karena range kecil per hari

**Verification**:
- [x] `npx tsc --noEmit` — PASS 0 errors
- [ ] Test runtime: start dev server + API server, run backtest 2025-2026, verify chart realistic

## P0 — VERIFY (2026-06-26, Sesi 12)
**Status**: Code changes done, docs updated, tsc + vitest passing. vite build pending.

Delivered (Sesi 12 — Konsolidasi UI + Koherensi):
- **StrategySettingsPanel** (NEW) — unified component untuk 10 strategy
  fields, dipakai di Portfolio + Backtest sidebar
- **backtestUseLiveStrategy** (default ON) — backtest SELALU pakai
  engineConfig untuk strategy fields saat ON. Saat OFF = sandbox.
- **isDraftEqualToEngine()** + **promoteDraftToEngine()** helpers
- **PROMOTE TO PORFOLIO** button + auto-toggle ON
- **ConfirmModal** untuk edge case "Toggle ON dengan draft unsynced"
- **Net Wealth hero card** + 5 mini-metrics di Portfolio
- **Strategy Says banner** tambah chip IHSG live + PROFIL
- **Holdings table dividen cell** compact format
- **6-col compact metrics strip** di Backtest result
- **Adaptive Weights** dihapus (deprecated ADR-010)
- **isConfigSynced** flag dihapus (replaced by isDraftEqualToEngine)

**Verification**:
- [x] `npx tsc --noEmit` — PASS 0 errors
- [x] `npx vitest run` — 18/18 passing
- [ ] `npx vite build` — verify

## P1 — UX Phase 3 (next sprint) — still open
- [ ] A5 — Command palette (Cmd+K)
- [ ] A9 — Table pagination (after B2 sort/filter)
- [ ] A12 — Search results UI (categorized dropdown)
- [ ] A13 — Group Settings dropdown into sections
- [ ] A14 — Notification bell panel (list + mark read)
- [ ] B1 — Portfolio section anchors + mini TOC
- [ ] B2 — Holdings table: more sort keys + filter persistence
- [ ] B4 — Sticky action menu (Buy/Sell/Top-up/Move to Gold)
- [ ] B6 — Sector allocation full-page view
- [ ] C1 — News as Market sub-tab
- [ ] C4 — Inline "+ Watch" on Top Movers cards
- [ ] C6 — Data feed switcher in header (Y/G/S popover)
- [ ] D2 — Equity curve region annotations (Stocks/EMAS/Cash via ReferenceArea — ReferenceArea already imported)
- [ ] D7 — "Config changed" banner (already in Sesi 10)
- [ ] F1 — Sidebar collapsible sections
- [ ] F4 — "Danger Zone" group in sidebar (already in Sesi 9)
- [ ] **New from Sesi 12**: Cumulative Dividends YTD tracker (needs API endpoint or local accumulation)
- [ ] **New from Sesi 12**: Equity curve region shading for in-crash periods

## P2 — Deferred / Future
- [ ] Run `npm run build` (regenerate year files)
- [ ] Profile UX (ticker-level overrides, import/export)
- [ ] Notification persistence — TTL not enforced
- [ ] Telegram bot
- [ ] Pre-2021 data backfill
- [ ] Proactive alert chip in chat (wired but not yet rendered)
- [ ] Auto-execute BPS recommendation (Level 5, requires UX decision)
- [ ] CI workflow untuk Playwright E2E
- [ ] Cross-browser E2E (Firefox, WebKit)
- [ ] PWA / install prompt

## Done Recently (Sesi 15c — Backtest Audit Fix)
- ✅ Fix 1A: Hapus MultiSearchableSelect options={[]} dari StrategySettingsPanel
- ✅ Fix 1B: Tambah custom universe picker (STOCKS_DATA) di Portfolio sidebar AppSidebar
- ✅ Fix 1C/2A: effectiveConfig selective merge — hanya STRATEGY_MERGE_KEYS dari engineConfig
- ✅ Fix 1D: configFingerprint include customUniverse + depend effectiveConfig
- ✅ Fix 3A: setTimeout(0) sebelum runStrategy() biar React commit progress state
- ✅ Fix 3B: setBacktestProgress(0) di catch block
- ✅ Fallback proxy: /root/ai-router-proxy/server.js port 2050 (auto-switch router)
- ✅ npx tsc --noEmit PASS, 239/239 tests PASS

## Done Recently (Sesi 14 — DB SOT + Daily Sync Pipeline)
- ✅ Sync pipeline: `scripts/sync-daily-data.ts` (Yahoo → year files → SQLite rebuild)
- ✅ DB stale indicator: SyncStatus bar di PortfolioTracker + MarketTab chip
- ✅ useDataFeed.ts: syncStatus + triggerSync, price tagged STALE saat DB stale
- ✅ Actions merged: dual cron di daily-data-pipeline.yml (06:30 + 14:00 UTC)
- ✅ simEndDate auto-update: refresh ke hari ini jika >2 hari stale
- ✅ Bug fixes: Yahoo batchSize 20, gold IDR/gram, --force parsing, Python encoding
- ✅ DB synced: 2026-06-30, IHSG 5643, gold 2.317M/gr, USD/IDR 17.878, 90/95 saham

## Done Recently (Sesi 12 — Konsolidasi)
- ✅ StrategySettingsPanel component (unified)
- ✅ backtestUseLiveStrategy toggle (default ON, koheren)
- ✅ PROMOTE TO PORTFOLIO bridge
- ✅ ConfirmModal untuk draft unsynced
- ✅ PortfolioTracker: Net Wealth hero + 5 mini-metrics
- ✅ SimulationTab: 6-col compact metrics strip
- ✅ Strategy Says: IHSG live + PROFIL chips
- ✅ Holdings dividen cell compact format
- ✅ Adaptive Weights removed (deprecated)

## Done Recently (Sesi 11 — Settings Koherensi)
- ✅ Sinyal Krisis toggle (Sesi 11)
- ✅ Alert Pop-up section
- ✅ Sinyal Pasar section
- ✅ Exit Safe Haven → Stock banner
- ✅ Safe Haven Aktif chip

## Done Recently (Sesi 10 — UX Phase 2)
- ✅ A2 — Keyboard shortcuts
- ✅ A3 — Total Wealth pill on mobile
- ✅ A4 — Last updated chip
- ✅ A7 — Empty states
- ✅ A10 — ConfirmModal (created)
- ✅ B2 — Holdings table sort/filter
- ✅ B5 — Dismissable alerts
- ✅ D1 — Jalankan Backtest button in tab
- ✅ D7 — Config changed banner
- ✅ E5 — CSV export
- ✅ F4 — Danger Zone
