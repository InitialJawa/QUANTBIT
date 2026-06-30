# NEXT ACTION
## P0 — VERIFY (2026-06-30, Sesi 13)
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

## P0 — Migration 0003: DB as SOT for Market Data
- [x] Migration file exists: `db/migrations/0003_market_data.sql`
- [x] Local SQLite DB seeded: `data/historical_market.sqlite` (32.8 MB, 4 tables)
- [x] Tables verified: 1320 daily_overview, 164 stock_fundamentals, 120603 stock_daily, 0 engine_snapshots
- [x] **`server.ts`** /api/backtest-data → SQLite (via Python bridge `scripts/export-backtest-json.py`)
- [x] **`functions/api/[[path]].ts`** /api/backtest-data → D1 (daily_overview + stock_daily queries)
- [x] **`functions/api/[[path]].ts`** /api/fundamentals → D1 (stock_fundamentals table)
- [x] **`src/mcp/index.ts`** get_historical_data → SQLite (via Python bridge `scripts/db-query.py`)
- [ ] Apply 0003 ke production D1: need Node >= 22 + CLOUDFLARE_API_TOKEN (currently Node 18 blocks wrangler)
- [ ] Seed local D1 (miniflare): blocked by Node 18 (wrangler requires Node 22+)

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
