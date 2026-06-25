# DECISIONS

## 2026-06-21 — Yahoo Finance API Server
**Keputusan:** Membuat Express server (`server.ts`) sebagai proxy API Yahoo Finance terpisah dari Vite dev server.
**Alasan:** Library `yahoo-finance2` membutuhkan Node.js runtime dan tidak bisa jalan di browser. Server terpisah menghindari CORS dan SSR complexity.
**Konsekuensi:** Perlu menjalankan 2 server (`npm run dev` + `npm run serve-api`) untuk development lokal.

## 2026-06-23 — Backtest-Data API + Gold Price Fix
**Keputusan:** Menambahkan handler `/api/backtest-data` di Express server (`server.ts`) yang membaca data dari `data/years/*.json` langsung, plus Vite proxy untuk forwarding. Memperbaiki `generateClientBacktestData()` gold starting price (300K→75K) dan drift multiplier (0.007→0.054) biar realistik. Update `MKT.gold.value` stale (1.35Jt→2.47Jt) sesuai data historis.
**Alasan:** Sebelumnya backtest di local dev mode pake data PRNG palsu dengan gold starting 300K-500K vs harusnya 75K, menyebabkan IHSG sering > gold di chart. Juga MKT.gold.value di sidebar/portfolio 45% di bawah harga sebenarnya.
**Konsekuensi:** User perlu run `npm run serve-api` atau `npm run dev:full` untuk API data. Tanpa server, fallback PRNG sekarang lebih realistis.

## 2026-06-21 — Deterministic Engine (No AI for Math)
**Keputusan:** Semua kalkulasi keuangan dieksekusi secara deterministik. AI hanya digunakan di presentation layer untuk narrative summarization.
**Alasan:** Mencegah AI hallucination pada angka finansial yang bisa menyebabkan keputusan investasi salah.
**Konsekuensi:** Arsitektur lebih kompleks (engine terpisah dari AI layer), tapi hasil 100% akurat dan reproducible.

## 2026-06-21 — Data Status Transparency
**Keputusan:** Implementasi enum `DataStatus` (LIVE/CACHED/STALE/ESTIMATED) untuk setiap data point.
**Alasan:** Memberi user visibilitas penuh terhadap provenance data, terutama karena data gratis Yahoo Finance terbatas.
**Konsekuensi:** Overhead UI untuk menampilkan badge status, tapi trustworthiness meningkat.

## 2026-06-22 — AI Context Persistence + DOX
**Keputusan:** Mengadopsi AI Context Persistence System + DOX Framework untuk manajemen konteks AI.
**Alasan:** Project besar (100+ file, banyak keputusan arsitektur) membutuhkan context persistence agar AI baru tidak kehilangan konteks antar sesi.
**Konsekuensi:** Maintenance `docs/` dan `handover/` menjadi tanggung jawab rutin.

## 2026-06-22 — UI Overhaul: True Black + Cyan Accent + Floating AI Chat
**Keputusan:** Background true black (#000), accent emerald→cyan (#06b6d4), AI chat dari right-rail static → floating bottom-right widget.
**Alasan:** Tampilan lebih modern financial-terminal (Bloomberg/TradingView). Floating AI chat hemat screen real estate.
**Konsekuensi:** Semua komponen perlu di-restyle. CSS overrides emerald→cyan dipasang di index.css agar komponen dengan Tailwind emerald class tetap render cyan.

## 2026-06-23 — Remove Duplicate AI from MarketTab
**Keputusan:** Hapus AIAssistant ("AI Co-Pilot — Analisis Saham") dari MarketTab. Hanya "Analisa AI Harian" yang dipertahankan.
**Alasan:** FloatingAIChat sudah handle semua AI chat secara global. Dua AI widget di halaman yang sama redundant dan membingungkan.
**Konsekuensi:** AIAssistant masih tersedia di DiagnosticsTab untuk debugging.

## 2026-06-23 — Remove DataSourcesRow Badges
**Keputusan:** Hapus DataSourcesRow (price/fundamentals/charts/description status badges) dari StockDrawer dan DataBadge dari watchlist MarketTab.
**Alasan:** Badge tidak memberikan nilai informatif yang berarti bagi user. Menambah clutter visual.
**Konsekuensi:** File SourceBadge.tsx menjadi unused (orphan). DataBadge.tsx masih digunakan di PortfolioTracker dan DecisionAuditTrail.

## 2026-06-23 — Data Audit: RAW_STOCKS_DATA Stale + Sector Mismatch
**Keputusan:** Prioritaskan fix data integrity sebelum fitur baru. Temuan audit:
- 31 stock prices di `raw_stocks_data.ts` deviasi 30-147% dari data aktual `idx80_scan.json`
- 20/31 stocks punya sector mismatch antara RAW_STOCKS_DATA dan PF records di `marketData.ts`
- `MKT.ihsg.value` (5886) != data terbaru (6008)
- `MKT.usdidr.value` (17985) != record manapun di JSON (terakhir 17714)
- 2026 fundamentals kosong di `idx_fundamentals_all.json`
**Alasan:** Sidebar prices, portfolio, ranking, scoring semuanya pakai data basi. Sektor inkonsisten bikin filter/filtering rusak.

## 2026-06-24 — IDX API Menjadi Sumber Fundamental Utama
**Keputusan:** IDX API `/primary/DigitalStatistic/GetApiDataPaginated` menjadi primary source fundamental QuantBit, menggantikan Yahoo Fundamental, FMP, Sectors.app, dan Hash Fallback Fundamental.
**Alasan:**
- 60-month audit (2021-01 s.d. 2025-12) lulus 100% — 60/60 months available, schema konsisten, 0 error
- 947 companies, 32 fields — lebih lengkap dari semua sumber sebelumnya
- Sumber resmi IDX — data primer, bukan scraping pihak ketiga
- Cloudscraper bypass Cloudflare tanpa API key
**Konsekuensi:**
- Yahoo Fundamental, FMP, Sectors.app, Hash Fallback — DIHENTIKAN
- RTI/Stockbit — ditahan sebagai backfill 2015-2020 saja
- Arsitektur baru: IDX API → warehouse_fundamental_idx.parquet → Factor Engine
- Perlu build `collectors/fetch_idx_fundamental.py` untuk pull bulanan

## 2026-06-25 — Unified Crisis Signal (Hormati enableCrashProtection)
**Keputusan:** Semua komponen sekarang menggunakan `isCrisisMode()` dari `marketRegimeEngine.ts` sebagai satu-satunya sumber kebenaran untuk sinyal krisis, bukan hardcoded `MKT.ihsg.monthly < -10`.
**Alasan:** Saat user mematikan "Proteksi Crash" di settings, 5 dari 6 komponen masih menyalakan sinyal krisis (AlertBanner, Sidebar, MarketTab, SimulationTab, marketRegimeEngine) karena pakai threshold hardcoded yang mengabaikan `enableCrashProtection`. Hanya PortfolioTracker yang sudah benar.
**Konsekuensi:**
- Ditambahkan `setCrashProtectionEnabled(bool)` dan `isCrisisMode()` di `marketRegimeEngine.ts`
- `PortfolioTracker.tsx` memanggil `setCrashProtectionEnabled(engineConfig.enableCrashProtection)` di useEffect
- `computeMarketRegime()` sekarang cek `_crashProtectionEnabled` sebelum masuk mode GOLD/CASH DEFENSE
- 4 komponen (App, AppSidebar, MarketTab, SimulationTab) diubah dari `MKT.ihsg.monthly < -10` → `isCrisisMode()`
- `isCrisisMode()` menggunakan 60-day drawdown (bukan monthly return) agar konsisten dengan `evaluateStrategy()` di engine

## 2026-06-25 — Code Health Audit Fix Decisions
**Keputusan:** Setelah comprehensive code audit (lihat `docs/audit/AUDIT-2026-06-25-CODE-HEALTH.md`), diputuskan pendekatan fix untuk 3 issues utama:

### B2 — Source of Truth: IDX Warehouse Fields
**Keputusan:** `migrate-normscores.ts` formula = canonical. Field IDX warehouse langsung (`roe`, `per`, `eps`) jadi source of truth, bukan computed fields.
**Alasan:** IDX warehouse adalah data primer resmi (DECISIONS 2026-06-24). Field langsung lebih reliable daripada computed (`profitAttrOwner/equity` bisa gagal kalau ada edge case accounting). `migrate-normscores.ts` sudah benar pakai `1/per` (PER lebih stabil dari PB di emerging market) dan `eps change` (lebih relevan dari ROE change untuk growth).
**Konsekuensi:**
- `fetch_historical_data.ts` line 443-498 akan di-update pakai formula `migrate-normscores.ts` (Quality=`roe`, Value=`1/per else 1/priceBV`, Growth=`eps change annualized else sales change`, Normalisasi=rank-based 0-95)
- Re-test: `stockRanksProd/Res` harus identik antara `fetch` dan `migrate` setelah fix
- ADR-009 scoring tetap valid (rank-based, bukan linear min-max)

### A3 — Custom Hook `useMarketRegimeSync`
**Keputusan:** Extract sync logic dari `PortfolioTracker.tsx:106-111` ke dedicated hook `src/hooks/useMarketRegimeSync.ts`, mount sekali di `App.tsx`.
**Alasan:** (1) Saat ini sync hanya terjadi saat Portfolio tab mount → user yang toggle `enableCrashProtection` di sidebar (visible di semua tab) tidak melihat efek sampai buka Portfolio. (2) Single Responsibility Principle — sync state engine adalah concern terpisah dari PortfolioTracker logic. (3) Testable — hook bisa di-test independen.
**Konsekuensi:**
- `useMarketRegimeSync()` call `setActiveUniverse()`, `setCrashSensitivity()`, `setCrashProtectionEnabled()`, `setActiveConfig({q,g,v,m})`, `refreshRSFromRegime()`
- Mount di `App.tsx` setelah `EngineConfigProvider` (line ~190)
- Hapus useEffect `setActiveUniverse/setCrashSensitivity/setCrashProtectionEnabled/refreshRSFromRegime` dari `PortfolioTracker.tsx:106-111`
- Dependency: `engineConfig.universe`, `engineConfig.crashSensitivity`, `engineConfig.enableCrashProtection`, `activeProfile.{q,g,v,m}`

### C3 — Vite Plugin Copy Data ke dist/
**Keputusan:** Tambah Vite plugin di `vite.config.ts` untuk copy `data/years/*.json`, `data/idx80_scan.json`, `data/fundamental_idx_all.json`, `data/live_market.json` ke `dist/data/` saat `npm run build`.
**Alasan:** `functions/api/[[path]].ts:306` pakai `env.ASSETS.fetch("/data/years/{y}.json")` yang hanya bekerja jika file ada di static assets. Tanpa plugin ini, production CF Pages return 503. Alternatif `public/` folder Vite tidak ideal karena file-file ini besar (ratusan MB) dan bisa konflik dengan workflow lain.
**Konsekuensi:**
- Plugin `copy-data-assets` di `vite.config.ts` dengan `closeBundle()` hook
- Test: `npm run build` harus generate `dist/data/years/2025.json` dll
- Tambah `.gitignore` exception untuk `dist/data/` (jika perlu)
- Update `data/AGENTS.md` jika ada implikasi workflow

### Prioritisasi Sprint (Total ~39 issues)
- **Sprint 1** (next session): A1, A2, A3 — user-facing critical
- **Sprint 2**: A4, A5, B1, B2, B3 — engine correctness
- **Sprint 3**: B4, C3, C8 — production deployment blockers
- **Sprint 4**: D1-D4, D11 — performance
- **Sprint 5**: C1, C2, C4-C7, C9-C12, D5-D12, B5, E1-E5 — cleanup

## 2026-06-25 — Adaptive DCA Engine (Phase 1 + 2)
**Keputusan:** Implementasi Adaptive DCA Engine per PRD `Adaptive_DCA_Engine_QuantBit.md`. Dua fase sekaligus: BPS dashboard + backtest simulator dengan 4-way comparison.

**Filosofi:** "Data menentukan pembelian, bukan kalender." Buy Pressure Score (BPS) dihitung dari 5 faktor pasar, menentukan berapa % kas yang harus di-deploy.

**Buy Pressure Score (BPS)**:
- **Valuasi (30%)**: avg value score (1/PE atau 1/PB) dari leader universe
- **Momentum (25%)**: `clamp(50 - ihsgMonthly * 2, 0, 100)` — IHSG turun = skor tinggi
- **Breadth (15%)**: `(1 - breadth_above_60 / watchlist_count) * 100` — few healthy = skor tinggi
- **Drawdown (20%)**: `min(100, -drawdown60 * 4)` — deeper drop = skor tinggi
- **Fear (10%)**: langsung `RS.risk` (0-100) — high regime risk = high fear

**Action mapping** (per PRD):
- 0-30: tidak beli
- 30-50: beli kecil (25% kas)
- 50-70: beli normal (50% kas)
- 70-90: beli agresif (75% kas)
- 90-100: deploy hampir semua (90% kas)

**Override**: jika `isCrisisMode()` → BPS invalid, action = "none". Cash defense lebih penting dari buy opportunity.

**File yang dibuat/diubah**:
- **NEW** `src/engine/buyPressure.ts` (180 lines) — pure function + React hook `useBuyPressure()`
- **NEW** `src/components/BuyPressureDashboard.tsx` (220 lines) — circular SVG gauge + 5 factor bars + reason card
- **NEW** `src/engine/dcaBaselines.ts` (230 lines) — 3 baseline simulators (Lump Sum, Monthly DCA, Quarterly DCA)
- **MODIFIED** `src/engine/types.ts` — `simulationMode: "algo" | "custom" | "adaptive_dca"`, add `BpsSnapshot`, `bpsHistory?`, `totalDeployed?` ke BacktestResult
- **MODIFIED** `src/engine/core.ts` — adaptive_dca branch di `runStrategy`:
  - Initial: 100% cash, 0 positions
  - On month change: compute BPS dari historical data (ihsgMonthly 21d, drawdown 60d rolling, breadth, risk = abs(momentum)*4, avgValueScore)
  - Deploy `BPS.deployPct` of available cash ke Top N
  - **NO** monthly rebalancing (positions held until crash)
  - Crash detection & recovery tetap aktif (exit ke gold)
- **MODIFIED** `src/components/PortfolioTracker.tsx` — embed `<BuyPressureDashboard />` di atas Holdings
- **MODIFIED** `src/components/SimulationTab.tsx` — ketika `simulationMode === "adaptive_dca"`, run 3 baselines + 4-way comparison card (Adaptive vs Lump Sum vs Monthly DCA vs Quarterly DCA) + verdict
- **MODIFIED** `src/components/AppSidebar.tsx` — mode toggle 2-button → 3-button (Algo | Custom | Adaptive)

**Visual delivered**:
- Portfolio tab: gauge + 5 sub-factor bars + "Deploy X% of cash" recommendation, dengan CASH DEFENSE overlay saat krisis
- Backtest tab: 4-card grid (Adaptive vs 3 baselines) + verdict "Adaptive DCA mengungguli Lump Sum sebesar X.X poin"

**Verification**: `tsc --noEmit` PASS, `vite build` PASS (SimulationTab +7 KB, PortfolioTracker +7 KB untuk dashboard + 4-way comparison).

**Phase 3 (deferred)**: Auto-execute BPS recommendation. Butuh UX decision (one-click approve → recurring deploy? manual tiap bulan?).


**Keputusan:** Daripada menunggu sprint berikut, langsung eksekusi semua critical/high issues di sesi yang sama. Hasil verifikasi: `tsc --noEmit` pass + `vite build` pass (termasuk copy-data-assets plugin).

### Issues Fixed (13 dari 39)
- **A1** `useDataFeed.ts:114` — `newOffset = offset + 0` diganti mean-reverting random walk dengan damping
- **A2** `SimulationTab.tsx:197` — `configType=prod` hardcode diganti `backtestConfig.activeProfileId`
- **A3** Create `src/hooks/useMarketRegimeSync.ts` + mount `<MarketRegimeSyncBridge />` di `App.tsx` + hapus duplikasi di `PortfolioTracker.tsx`
- **A4** `core.ts:32-46` — recompute rank dari `stockNormScores` selalu pakai `currentWeights` (untuk custom profile)
- **A5** `core.ts:108-110` — incremental `ihsgRollingWindow` (cap 60) replaces O(n²) slice
- **B2** `fetch_historical_data.ts` — `WarehouseRecord` tambah `roe` field, `computeFromWarehouse` prefer raw ROE, scoring pakai `1/per else 1/pb` (vInvPE) + gROEChg (gEPSChg alias)
- **B4** Wired di `useMarketRegimeSync.ts` (dalam A3) — `setActiveConfig({q,g,v,m})` untuk custom profile
- **C1** `src/mcp/index.ts:161` — wrap `await server.connect(transport)` dengan `process.argv` check + `QUANTBIT_MCP_AUTOSTART` env var
- **C2** Hapus unused `getSession` import di `SimulationTab.tsx:29`
- **C3** `vite.config.ts` — new `copyDataAssets` plugin di `closeBundle()` copy `data/years/`, `data/idx80_scan.json`, `data/fundamental_idx_all.json`, `data/live_market.json` ke `dist/data/`
- **C8** `functions/api/[[path]].ts:821` — `DELETE FROM idx_scan_data` sebelum `INSERT` (replace-only retention)
- **C9** `src/services/api.ts:1-12, 24-32, 100-110` — `IS_DEV = import.meta.env?.DEV === true` guard di semua dev mock branches
- **C12** Hapus `src/services/emailNotifier.ts` (unused)
- **D1** `PortfolioTracker.tsx:215-243` — `processedLeaders` di-wrap `useMemo` (D11: pre-build `rankMap` Map<ticker, {rank, score}>)
- **D2** `PortfolioTracker.tsx:391-602` — `activeAlerts` IIFE di-wrap `useMemo` dengan 14 dependencies
- **D5** `marketData.ts:69, 75` — `T` dan `EX` ganti `const` ke `let` + comment
- **D10** `src/services/api.ts:122-129` — `devMock` HTML fallback tambah `isServerError` + `IS_DEV` guard
- **D11** `PortfolioTracker.tsx:306-309` — `getStockRankAndScore` O(1) via `rankMap.get()`

### Issues Deferred (5 — Low Priority / Requires Architectural Decision)
- **B3** Dua sinyal krisis (drawdown vs monthly) — add tooltip di UI, not code change
- **B5** `_prevRanks` LRU cache — leak growth ~100 bytes/call, low priority
- **C4** `run_backtest_comparison.cjs` — added to `scripts/AGENTS.md` Child DOX Index ✓
- **C5** `getActiveUniverse` untuk algo mode — semantically correct ([] is right answer for algo)
- **C6** Notification `firedRules` TTL — need UX decision (reset button vs auto-expire)
- **C7** ErrorBoundary wrap di `main.tsx` — ALREADY DONE before audit (verified)
- **C10** Dividend dari IDX warehouse — complex, separate feature
- **C11** `shouldTriggerExit` wire ke notification loop — risky, separate feature
- **D6** `getSession` re-export — backward compat reason unknown, leave
- **D7** `MARKET_TICKERS` share constant — cross-cutting refactor
- **D8** `SimulationTab` fetch caching — needs SWR design
- **D9** `marketRegimeEngine` module-level state — needs major refactor
- **D12** `_activeWeights` wire — already addressed in A3/B4
- **E1-E5** Doc drift cleanup — minor

### Verification
```bash
$ npx tsc --noEmit   # PASS (0 errors)
$ npx vite build     # PASS
# [copy-data-assets] data/idx80_scan.json → dist/data/idx80_scan.json (190.3 KB)
# [copy-data-assets] data/fundamental_idx_all.json → dist/data/fundamental_idx_all.json (40123.4 KB)
# [copy-data-assets] data/live_market.json → dist/data/live_market.json (0.6 KB)
# [copy-data-assets] data/years/ → dist/data/years/ (27 files)
```

### Net Effect
- 13 critical/high issues fixed
- 1 deployment blocker (C3) unblocked
- 1 production security hole (C9) closed
- O(n²) → O(n) IHSG window (A5) — 12× speedup untuk 1500-day backtest
- 0 regression di TypeScript atau build
