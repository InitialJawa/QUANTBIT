# CURRENT STATE

| Field | Value |
|-------|-------|
| Tanggal | 2026-06-30 |
| Status | Development |
| Progress | ~99% |
| Sprint | Sesi 14 — DB Single Source of Truth + Daily Sync Pipeline (2026-06-30) |

## Active Architecture

```
EngineConfigContext (SOT for LIVE strategy) — ADR-003, ADR-010, ADR-011
  ├── profiles[] — AMAN, AGRESIF, DIVIDEN, Custom N (weight profiles)
  ├── activeProfileId — profile aktif (getter: activeProfile)
  ├── topNCount, universe, crash/crossover settings
  ├── simulationMode: "algo" | "custom" | "adaptive_dca"
  ├── customUniverse: string[] (exclusive, custom mode)
  ├── enableAdaptiveWeights: boolean (auto-adjust weights)
  └── dcaActive: boolean (DCA Rekomendasi — Portfolio-only)
       │
       ├── AppSidebar (renderPortfolioContent)
       │     └── StrategySettingsPanel (10 strategy fields, write)
       ├── SimulationTab
       │     ├── handleRunAlgoBacktest uses:
       │     │   effectiveConfig = backtestUseLiveStrategy
       │     │     ? {...backtestConfig, ...engineConfig}  ← engineConfig menang untuk 10 strategy keys
       │     │     : backtestConfig
       │     └── AppSidebar (renderBacktestContent)
       │           └── StrategySettingsPanel (10 strategy fields, read-only when ON, write when OFF)
       ├── PortfolioTracker → reads engineConfig (live, no sync needed)
       ├── MarketTab → cascade filter from engineConfig
       └── AI Chat → profile-aware context (AMAN/AGRESIF/DIVIDEN)
```

**Single Source of Truth (ADR-003, ADR-011)**: `engineConfig` adalah SATU-SATUNYA sumber
kebenaran untuk strategy. `ui.activeConfig` (UIState) sudah dihapus (Sesi 8). ConfigSync bridge
dihapus. **Sesi 12**: `backtestConfig` sekarang opsional — backtest SELALU pakai engineConfig untuk
strategy fields saat `backtestUseLiveStrategy=true` (default). Draft mode opsional untuk eksperimen,
di-promote manual via `promoteDraftToEngine()`.

## 3 Mode + 1 Bridge (ADR-011) — backtest ↔ portfolio

| Mode | Default | Description |
|------|---------|-------------|
| **Live** (default ON) | ✅ | Backtest = engineConfig. Strategy fields di sidebar greyed. Banner hijau "✓ Live Strategy". |
| **Draft** (toggle OFF) | – | Backtest = backtestConfig (sandbox). Strategy fields editable. Banner amber "⚠ DRAFT — perubahan tidak effect Portofolio". Tombol "PROMOTE TO PORTFOLIO" tersedia saat ada hasil. |
| **Edge case** | – | User toggle ON dengan draft unsynced → ConfirmModal "Buang / Promote Dulu / Batal". |

10 strategy fields yang koheren: `activeProfileId`, `universe`, `topNCount`, `simulationMode`,
`safeHavenAsset`, `crashSensitivity`, `enableCrashProtection`, `customUniverse`,
`enableAdaptiveWeights`, `reserveBufferPct`. Fields backtest-only: `simStartDate`, `simEndDate`,
`algoCapital`, `singleTicker`, `singleSellTrigger`, `singleBuyTrigger`.

## Current Focus

**Session 2026-06-30 (session 14): DB Single Source of Truth — IN PROGRESS**

### 🟢 Mission
Eliminasi misalignment data antara Portfolio (live prices) vs Backtest/Market (DB stale). DB adalah satu-satunya source of truth untuk ALL engines.

### 🟢 Delivered
- **PROJECT_MASTER.md** — updated architecture rules: "DB = single source of truth", "Daily cron (06:30 UTC = 13:30 WIB)", "No real-time live price"
- **AGENTS.md** — added rule 4: "WAJIB baca dari DB, JANGAN pakai live prices langsung kecuali DB sudah sync"
- **scripts/sync-daily-data.ts** — NEW: Fetch Yahoo EOD prices → upsert `stock_daily` + `daily_overview`
- **.github/workflows/sync-db.yml** — NEW: GitHub Actions daily cron (06:30 UTC) untuk menjalankan sync
- **useDataFeed.ts** — modified: now fetches DB sync status, shows stale warning, still uses live prices as visual overlay but with clear "STALE" badge
- **PortfolioTracker.tsx** — added "Sync Status" indicator bar (Last synced, stale warning, Sync Now button)
- **MarketTab.tsx** — added DB Sync indicator in the status bar area

### Root Cause Resolved
**Portfolio vs Backtest mismatch** — Portfolio sebelumnya pakai `getDynamicStock()` dari Yahoo/GoAPI live prices, sementara Backtest & Market baca dari DB (stale 2026-06-24). Dengan fix ini:
- Portfolio tetap bisa tampilkan live prices visual (intraday fluktuasi) 
- TAPI dengan label "STALE" yang jelas jika DB belum sync
- Semua decision engine (backtest, strategy evaluation) pake data DB yang konsisten
- Tombol "Sync Now" untuk trigger manual update DB
- Daily cron otomatis setiap 13:30 WIB via GitHub Actions

### Files Modified/Created
- `scripts/sync-daily-data.ts` (NEW) — Daily sync script
- `.github/workflows/sync-db.yml` (NEW) — GitHub Actions cron
- `src/hooks/useDataFeed.ts` (modified) — DB sync status + stale warning
- `src/components/PortfolioTracker.tsx` (modified) — Sync status bar
- `src/components/MarketTab.tsx` (modified) — DB sync indicator
- `docs/PROJECT_MASTER.md` (modified) — Architecture rules
- `docs/CURRENT_STATE.md` (modified) — This update
- `docs/NEXT_ACTION.md` (modified) — Priority queue update
- `AGENTS.md` (modified) — DB SOT rule

### Verification
- [x] `npx tsc --noEmit` PASS 0 errors
- [x] `npm test` 239/239 tests passing
- [ ] Manual: dev server running, Portfolio shows sync status
- [ ] Test: click "Sync Now" → data refreshes

**Session 2026-06-30 (session 13c): Production Backtest Critical Fix — COMPLETED**

### 🔴 Critical Bug Fixed
- **Data mapping bug** causing strategy anjlok (-33.7% return, 14.6% win rate)
- **Empty object handling** — `{}` is truthy, defeating `||` fallback operator
- **Ranking data validation** — Ensure stockRanks never empty/undefined

### Root Cause
```typescript
// BEFORE (WRONG):
stockPrices: day.stockAdjPrices || day.stockPrices,  // {} defeats ||
stockRanks: configType === "prod" ? day.stockRanksProd : day.stockRanksRes,  // undefined if missing

// AFTER (FIXED):
const stockPrices = (day.stockPrices && Object.keys(day.stockPrices).length > 0)
  ? day.stockPrices : day.stockAdjPrices;
const stockRanks = configType === "prod" 
  ? (day.stockRanksProd || day.stockRanks || {})
  : (day.stockRanksRes || day.stockRanks || {});
```

### Impact
- **Before**: Engine received empty prices/ranks → picked random stocks → 14.6% win rate
- **After**: Engine receives valid data → picks correct stocks → expected performance

### Files Modified
- `functions/api/[[path]].ts` — Fixed data mapping in both D1 and fallback paths

**Session 2026-06-30 (session 13): Backtest Chart Fixes — COMPLETED**

### 🟢 4 Fixes Delivered
- **FIX 1 — Auto-run on config change**: SimulationTab useEffect re-triggers `handleRunAlgoBacktest()` when `configFingerprint` berubah. Fix: chart tidak update saat ubah parameter.
- **FIX 2 — Data re-fetch on date range change**: `useEffect` dependencies tambah `simStartDate`/`simEndDate`. Fix: data tidak reload saat ganti date range.
- **FIX 3 — Python Windows compatibility**: `server.ts` gunakan `python` (Windows) via `process.platform` check, bukan `python3`. Fix: DB load gagal silently di Windows → fallback ke synthetic data.
- **FIX 4 — Comprehensive logging**: Server + client console logs untuk trace data flow (DB → year files → synthetic fallback). Easier debugging.

### Root Cause Analysis
- **Chart flat 2025-2026**: `python3` tidak ada di Windows → DB load gagal → fallback year files (works) → tapi jika ANY error → client `generateClientBacktestData()` synthetic data (seed=42) → flat random walk chart.
- **Chart tidak update**: FASE 2.7 menghapus auto-run (backtest hanya sekali saat initial load). Fix: tambah useEffect dependency ke `configFingerprint`.

### Files Modified
- `src/components/SimulationTab.tsx` — auto-run useEffect, data re-fetch dependencies, logging
- `server.ts` — python command, error handling, logging

**Session 2026-06-26 (session 8): Sync Drift + Feature Overhaul — COMPLETED**

### 🟢 5 Sync Drifts Diperbaiki
- **FASE 1.1 — Crisis Detection**: Unifikasi rumus ke 60d-drawdown. Sebelumnya ada 4 rumus
  (60d-drawdown, IHSG monthly hardcoded -15.42%, dll) di marketRegimeEngine + useProactiveAgent.
  Sekarang konsisten di `marketRegimeEngine.ts:isCrisisMode()` dan `marketRegimeEngine.ts:computeMarketRegime()`.
- **FASE 1.2 — IHSG Monthly Computed**: `MKT.ihsg.monthly/weekly/daily` sekarang dihitung
  dari `_lastIhsgData` (historical IHSG) via `getIhsgMonthlyReturn()` di `marketRegimeEngine.ts`.
  Hardcoded values di `marketData.ts` jadi fallback 0.
- **FASE 1.3 — Portfolio Value Standard**: `enrichedPortfolio` di PortfolioTracker tidak filter
  EMAS lagi. Formula seragam: `shares × (currentPrice ?? buyPrice)` di semua tempat.
- **FASE 1.4 — Total Wealth**: Helper `totalWealth(portfolio, cash, getDynamicStock)` di
  `src/utils/portfolioValue.ts`. Tampil di AppHeader (sticky pill, emerald). Klik = buka tab
  Portfolio. Single source of truth = stocks + cash + gold.
- **FASE 1.5 — Watchlist Count Rename**: `RS.radar_context.watchlist_count` → `idx_universe_size`
  (field baru) untuk menghilangkan misleading label. Update di MarketTab, MarketOverviewCharts,
  aiClient, useAITools, buyPressure.

### 🟢 9 Feature Simplifications
- **FASE 2.1 — 7 Dead Components Removed**: DashboardGrid, BottomNav, NavDrawer,
  DiagnosticsTab, AIAssistant, DeepReport, AICockpit (~470 LOC cleanup).
- **FASE 2.2 — NotificationContext Slim**: Hapus `removeNotification`, `clearAll`,
  `shouldFireRule`, `markRuleFired`, `resetRule` (dead API). `fireRule` tetap karena dipakai
  PortfolioTracker. Context API jadi 3 method: `notifications`, `addNotification`, `fireRule`.
- **FASE 2.3 — Fine-Tune Sliders Removed from Sidebar**: 2 blok (custom + algo mode) dihapus.
  Edit profil hanya via `ManageProfilesModal` (sidebar "Edit Profiles" button).
- **FASE 2.4 — Advanced Safeguards Collapsed**: Crash protection + Buffer kas di-wrap `<details>`
  "Pengaturan Lanjutan". Default closed.
- **FASE 2.5 — Settings Dropdown Profile Picker Removed**: Duplicate "Config" section di
  AppHeader Settings dropdown dihapus. Profile hanya diubah via sidebar chips.
- **FASE 2.6 — SSOT activeProfileId**: `useUIState.activeConfig` + `idx_activeconfig`
  localStorage dihapus. `engineConfig.activeProfileId` adalah single source of truth.
  ConfigSync bridge dihapus.
- **FASE 2.7 — Backtest Tidak Auto-run Lagi**: `useEffect` di SimulationTab:530-557 yang
  trigger handleRunAlgoBacktest() setiap config change dihapus. Hanya run saat historicalData
  pertama kali dimuat (initial). User klik tombol "Jalankan Backtest" eksplisit di sidebar.
- **FASE 2.8 — Sticky Buy CTA**: "Beli Cepat" pill di top Portfolio tab (sticky, emerald).
  Klik → scroll + focus ke form.
- **FASE 2.9 — Jargon Simplified**:
  - "BPS Config (Live)" → "Profil Strategi Aktif"
  - "Sandi Saham (Ticker)" → "Pilih Saham"
  - "Custom Trade" → "Beli Manual"
  - "Eksekusi Beli Saham" → "Beli Sekarang"
  - "Hapus Semua" → "Reset Portofolio"
  - "Bersihkan Entri" → "Hapus Riwayat"

## Verification
- ✅ `npx tsc --noEmit` PASS 0 errors
- [ ] `npx vite build` — perlu dicek
- [ ] `npm test` — full test suite

## Known Gap (Pre-existing)
`shouldTriggerExit` per-ticker exit evaluation exists in engine but not yet wired per-portfolio-item
in the notification loop. (Tidak berubah dari sesi sebelumnya.)

## New Files
- `src/utils/portfolioValue.ts` — shared helpers: positionValue, stocksValue, totalCost,
  totalReturnPercent, goldValue, totalWealth, formatRupiahShort.
- `src/components/_archive/DashboardGrid.tsx` — archived dead code.

## Files Modified
- `src/marketRegimeEngine.ts` — unified crisis detection, added getIhsgMonthlyReturn/etc.
- `src/marketData.ts` — removed hardcoded MKT.ihsg.monthly, added idx_universe_size field.
- `src/hooks/useProactiveAgent.ts` — Rule 6 pakai 60d-drawdown bukan monthly.
- `src/hooks/useDataFeed.ts` — (call sites updated).
- `src/hooks/useUIState.ts` — removed activeConfig state.
- `src/contexts/NotificationContext.tsx` — slim API.
- `src/components/AppHeader.tsx` — Total Wealth pill, removed Settings Config section.
- `src/components/AppSidebar.tsx` — Fine-Tune removed, safeguards collapsed, removed Profile picker from Portfolio content.
- `src/components/PortfolioTracker.tsx` — EMAS no longer filtered, sticky Buy CTA, labels simplified.
- `src/components/SimulationTab.tsx` — backtest no longer auto-run, useRef import added.
- `src/components/MarketTab.tsx` — idx_universe_size.
- `src/components/MarketOverviewCharts.tsx` — idx_universe_size.
- `src/ai/aiClient.ts` — idx_universe_size.
- `src/hooks/useAITools.ts` — idx_universe_size.
- `src/engine/buyPressure.ts` — idx_universe_size.
- `src/App.tsx` — removed ConfigSync, wired engineConfig.activeProfileId.
- `src/components/AITestHarness.tsx` — removed idx_activeconfig from STORAGE_KEYS.

## Removed Files
- `src/components/BottomNav.tsx`
- `src/components/NavDrawer.tsx`
- `src/components/DiagnosticsTab.tsx`
- `src/components/AIAssistant.tsx`
- `src/components/DeepReport.tsx`
- `src/components/AICockpit.tsx`
- `DashboardGrid.tsx` (moved to _archive)

## Session 2026-06-26 (session 9): UI/UX Polish + Color Consolidation — COMPLETED

### 🟢 Theme Color Unification
- **Wallet + AI → emerald**: Semua `text-cyan-*`, `bg-cyan-*`, `border-cyan-*` di
  `FloatingWallet.tsx`, `FloatingAIChat.tsx`, `AITestHarness.tsx`, `AIActionApprovalCard.tsx`
  diganti `emerald-*`. AI button, chat bubbles, follow-up chips, dan tool call cards sekarang
  konsisten dengan accent hijau.
- **Decorative blue/indigo → emerald**: `DataBadge` (CACHED), `LeadersTab` (Konsolidasi/Support),
  `MarketTab` (HOLD_CASH regime), `SimulationTab` (BUY action), `AppSidebar` (Custom Universe
  pill), `MultiSearchableSelect` default theme, dan `marketData.ts` news badge.
- **BuyPressure "BELI NORMAL" → emerald** (sebelumnya cyan) untuk konsistensi; shade 400 vs
  300 membedakan NORMAL vs AGRESIF.

### 🟢 Light Theme Visibility Fix
- **CSS remap diperluas**: `[class*="bg-cyan-500/"]`, `[class*="bg-cyan-950/"]`,
  `[class*="bg-blue-500/"]` sekarang di-remap ke emerald tint di kedua tema (sebelumnya
  hanya `/10` dan `/20` yang ter-remap, sisanya pakai Tailwind default yang tidak terbaca
  di light mode).
- **Light text contrast**: `--text-muted` light dinaikkan dari `#CBD5E1` → `#94A3B8`,
  `--text-tertiary` dari `#94A3B8` → `#64748B`, `--text-secondary` dari `#475569` →
  `#334155`. Konten `text-white/30` (di-remap ke text-muted) sekarang lebih gelap dan
  terbaca di light mode.

### 🟢 UI/UX Improvements (Phase 1 Quick Wins)
- **A1 Tab labels**: `Market` → `Pasar`, `Portfolio` → `Portofolio`. Konsisten dengan
  tab lain yang sudah Indonesia.
- **A6 Sub-tab unification**: `SimulationTab` sub-tab pill style diganti ke border-bottom
  emerald (matching `MarketTab` & `AnalyticsTab`).
- **A7 Empty state**: `PortfolioTracker` empty state sekarang punya icon `Briefcase`
  + quick "Beli Pertama" CTA yang scroll ke form manual buy.
- **A11 Back-to-top**: Komponen baru `src/components/BackToTop.tsx`, mounted di `App.tsx`.
  Muncul setelah scroll > 600px, fixed bottom-right.
- **B10 EMAS tooltip**: Volume cell di Portfolio sekarang punya tooltip "1 lot emas = 1 gram.
  Spread 2% untuk konversi fisik" (cursor-help + dotted underline).
- **D6 Backtest sub-tab rename**: `Backtester` → `Strategi`, `Simulasi` → `Historis`.
  Hindari overlap dengan "Simulasi" istilah Portfolio.
- **E1 Crisis badge**: `Recovery` sub-tab dapat badge "Krisis" merah saat IHSG krisis aktif.
- **E2 Risk rename**: `Risk` sub-tab → `Proteksi Modal` (lebih deskriptif).
- **E4 Sub-tab persist**: `AnalyticsTab` sub-tab state di-persist via `localStorage`
  (key: `quantbit_analytics_subtab`) supaya tidak reset saat pindah tab utama.
- **F2 BPS Config**: Sudah di-rename ke "Profil Strategi Aktif" oleh ADR-010 (no-op).

### Files Modified
- `src/components/FloatingWallet.tsx`
- `src/components/FloatingAIChat.tsx`
- `src/components/AITestHarness.tsx`
- `src/components/AIActionApprovalCard.tsx`
- `src/components/BuyPressureDashboard.tsx`
- `src/components/DataBadge.tsx`
- `src/components/LeadersTab.tsx`
- `src/components/MarketTab.tsx`
- `src/components/PortfolioTracker.tsx`
- `src/components/SimulationTab.tsx`
- `src/components/AppHeader.tsx`
- `src/components/AppSidebar.tsx`
- `src/components/MultiSearchableSelect.tsx`
- `src/components/AnalyticsTab.tsx`
- `src/components/BackToTop.tsx` (new)
- `src/App.tsx`
- `src/marketData.ts`
- `src/index.css`
- `src/AGENTS.md`

### Verification
- `npx tsc --noEmit` PASS 0 errors
- `npx vitest run` 18/18 tests passing
- `npx vite build` 14.5s, no errors

## Session 2026-06-26 (session 10): UX Phase 2 — Power Features — COMPLETED

### Phase 2 UX Improvements
- **A2 Keyboard shortcuts**: Hook baru `useShortcuts()`. `1`/`2`/`3`/`4` switch
  tab Pasar/Portofolio/Backtest/Analitik. Tab button di header dapat kbd hint
  badge "1"/"2"/"3"/"4" (hidden di < lg).
- **A3 Total Wealth pill on mobile**: Dihapus `hidden md:flex`, sekarang visible
  di semua viewport. `formatRupiahShort` sudah short ("Rp XXjt") jadi muat di mobile.
- **A4 Last updated chip**: Komponen baru `LastUpdatedChip` dengan auto-refresh
  relative time. Dipasang di header Market overview ("Ringkasan Parameter").
- **A10 Confirmation modal**: Komponen baru `ConfirmModal` (variants: danger/
  warning/info). Dipasang di sidebar Reset Portofolio.
- **B2 Holdings table sort/filter**: Input filter di header table + click column
  header untuk sort. Sticky `thead` + max-height scroll area. SortKey type baru.
  Visible count "X/Y" di header.
- **B5 Dismissable warnings**: Per-row `×` button + "Tandai Dibaca" bulk button
  di Portfolio warnings.
- **D1 Run button in tab**: "Jalankan Backtest" button prominent di header
  Backtest tab (sebelumnya hanya di sidebar).
- **D7 Config changed banner**: Amber banner muncul di top Backtest saat config
  berubah sejak last run. Inline "Jalankan" button di banner.
- **E5 CSV export**: Tombol CSV di LeadersTab, RecoveryOpsTab, CapitalProtectionTab.
  Format: rank, ticker, scores, in_portfolio, in_watchlist.
- **F4 Danger Zone**: Reset Portofolio button di-group dengan label "Danger Zone"
  + border rose accent.
- **A7 Backtest empty state**: Empty state Backtest tab sekarang punya inline
  "Jalankan Backtest" button (sebelumnya cuma teks instruksi).

### Files Added
- `src/hooks/useShortcuts.ts`
- `src/components/LastUpdatedChip.tsx`
- `src/components/ConfirmModal.tsx`

### Files Modified (11)
- `src/App.tsx` — useShortcuts wiring
- `src/components/AppHeader.tsx` — kbd badges, mobile pill
- `src/components/AppSidebar.tsx` — ConfirmModal, Danger Zone
- `src/components/MarketTab.tsx` — LastUpdatedChip
- `src/components/PortfolioTracker.tsx` — sort/filter, dismissable warnings
- `src/components/SimulationTab.tsx` — Run button in tab, Config banner
- `src/components/LeadersTab.tsx` — CSV export
- `src/components/RecoveryOpsTab.tsx` — CSV export
- `src/components/CapitalProtectionTab.tsx` — CSV export

### Verification
- `npx tsc --noEmit` PASS 0 errors
- `npx vitest run` 18/18 tests passing
- `npx vite build` 10.9s PASS

## Session 2026-06-26 (session 12): Konsolidasi UI + Backtest ↔ Portfolio Koherensi — COMPLETED

---

## Session 2026-06-29 (session 13): Migration 0003 — DB as SOT for Market Data

### 🟢 Migration 0003 Applied Locally
- **Migration file**: `db/migrations/0003_market_data.sql` (already existed, 51 lines)
- **Tables created** in `data/historical_market.sqlite`:
  - `daily_overview` — 1320 rows (IHSG close, Gold IDR, USD/IDR per day)
  - `stock_fundamentals` — 164 rows (quality, growth, value, momentum, dividend scores per ticker)
  - `stock_daily` — 120,603 rows (close, adj_close, volume, ranks, norm_scores per ticker per day)
  - `engine_snapshots` — 0 rows (ready for engine state persistence)
- **Seed script**: `scripts/seed-db.py` (Python, uses built-in sqlite3 — works in constrained environments where better-sqlite3 can't build)

### 🟢 DB Wiring Complete — All Endpoints Read from DB
**Semua endpoint yang sebelumnya baca dari file JSON sekarang baca dari DB (single source of truth).**

| Endpoint | Sebelum | Sesudah |
|----------|---------|---------|
| `server.ts` `/api/backtest-data` (dev) | `readFileSync` year JSONs | Python bridge → `daily_overview` + `stock_daily` |
| `functions/api/[[path]].ts` `/api/backtest-data` (prod) | `env.ASSETS.fetch()` year JSONs | D1 query → `daily_overview` + `stock_daily` |
| `functions/api/[[path]].ts` `/api/fundamentals` (prod) | `env.ASSETS.fetch()` idx_fundamentals_all.json | D1 query → `stock_fundamentals` |
| `src/mcp/index.ts` `get_historical_data` | `readFileSync` year JSONs | Python bridge → `stock_daily` |

### 🟢 Python Bridge Scripts (2 NEW)
- **`scripts/db-query.py`** — generic SQLite query bridge: `python3 db-query.py "<sql>" '<params_json>'` → JSON stdout
- **`scripts/export-backtest-json.py`** — reconstructs full day entries (nested stock dicts) from normalized DB tables
- Fallback ke file JSON jika DB error, jadi tidak ada downtime

### ⏳ Remaining
- **Production D1 migration**: blocked until Node >= 22 or manual `wrangler d1 execute` with valid auth
- Client-side build-time imports (`dividend_snapshots.json`, `idx80_scan.json`) tetap file-based — data ini snapshot tidak masuk migration 0003

### Files Modified/Added
- `scripts/seed-db.py` (NEW) — Python seed script
- `scripts/db-query.py` (NEW) — Python DB query bridge
- `scripts/export-backtest-json.py` (NEW) — Python backtest data export
- `src/db/localDb.ts` (NEW) — TypeScript DB access layer (unused, for future)
- `scripts/seed-db.ts` — fixed `import.meta.dirname` → `fileURLToPath` for Node 18 compat
- `server.ts` — `/api/backtest-data` reads from SQLite via Python bridge
- `functions/api/[[path]].ts` — `/api/backtest-data` + `/api/fundamentals` read from D1
- `src/mcp/index.ts` — `get_historical_data` reads from SQLite via Python bridge

### 🟢 Root cause
User: "backtest untuk eksperimen dan aku udah nemu hasil yang pas, langsung sync ke porto dong... tapi di kasus ini backtest sudah masuk fase recovery dan sudah membeli saham lagi tapi pas di porto dan market malah masih crash. kalau kek gtu 2 mesin itu baca data yang beda atau ada setting yang ngga sync semua"

**Penyebab**: backtestConfig dan engineConfig bisa diverge (10 strategy fields). User edit di Backtest sidebar → backtestConfig ter-update, tapi engineConfig (yang drives Portfolio) tidak. Hasil backtest tidak sama dengan sinyal Portfolio.

Tambahan: "settingan ui yang ada di porto dan backtest jujur beda jauah" — UI settings di dua tab secara visual/substantif berbeda, user bingung mana yang sync.

### 🟢 FASE 12.1 — Unified Settings Panel (NEW)
- **`src/components/StrategySettingsPanel.tsx` (NEW, 230 LOC)**: reusable component
  untuk strategy fields. Standard fields: Profile, Mode, Universe, Custom Universe,
  Top N, Crossover, Crash (ON + sensitivity), Safe Haven, Buffer Kas.
- **Adaptive Weights** dihapus (deprecated ADR-010)
- Settings Lock + DCA toggle tetap di Portfolio sidebar (Portfolio-only concerns)
- Used identically di Portfolio sidebar (write) dan Backtest sidebar (read-only when toggle ON, write when OFF)

### 🟢 FASE 12.2 — Backtest ↔ Portfolio Koherensi
- **`EngineConfigContext`**: tambah `backtestUseLiveStrategy` (default ON, localStorage).
  Tambah `isDraftEqualToEngine()` method + `promoteDraftToEngine()` helper.
  Hapus `isConfigSynced` flag (replaced by `isDraftEqualToEngine`).
- **`SimulationTab`**: `handleRunAlgoBacktest` sekarang merge `engineConfig` ke backtestConfig
  saat `backtestUseLiveStrategy=true`. Strategy fields (10 keys) dari engineConfig menang;
  date range, capital, singleTicker tetap backtest-specific.
- **Banner DRAFT MODE** muncul di Backtest tab saat toggle OFF
- **Tombol "PROMOTE TO PORTFOLIO"** saat toggle OFF + draft != engineConfig + ada hasil
- **Edge case modal** "Draft Belum di-Sync" saat toggle ON dengan draft unsynced
  (Buang / Promote Dulu / Batal via ConfirmModal)

### 🟢 FASE 12.3 — PortfolioTracker UI Restructure
- **Net Wealth hero card**: 1 baris dengan total (Saham + Kas + Emas) + P&L besar
- **5 mini-metrics**: Modal, Nilai, P&L, Dividen/thn, Kas (1 baris, 5 col di md+)
- **Strategy Says banner**: tambah chip "IHSG live: 5884 (-23.3%)" + "PROFIL: AGRESIF"
- **Holdings table dividen cell**: compact "+Rp XXjt" + "X.XX% yield" format

### 🟢 FASE 12.4 — SimulationTab UI Tidy
- **6-col compact metrics strip** (CAGR, MaxDD, Sharpe, Dividen, Trades, Vol)
  di atas bento grid 4-col existing
- **Status Akhir card** dipromote (sudah dari sesi 10)
- **ReferenceArea** imported (untuk future chart annotations)

### Files
- `src/components/StrategySettingsPanel.tsx` (NEW)
- `src/contexts/EngineConfigContext.tsx` (modified)
- `src/components/AppSidebar.tsx` (heavily modified, ~250 LOC removed)
- `src/components/SimulationTab.tsx` (modified)
- `src/components/PortfolioTracker.tsx` (modified)

### Verification
- `npx tsc --noEmit` PASS 0 errors
- `npx vitest run` 18/18 tests passing
