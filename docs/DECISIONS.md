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

## 2026-06-25 — Quantbit AI Depth Upgrade (Levels 1+2+3+4)
**Keputusan:** Meng-upgrade `Quantbit AI` (FloatingAIChat) dari Q&A only menjadi **fully integrated agent** dengan 4 levels, sesuai spec di `docs/AI_DEPTH_UPGRADE_PLAN.md`. Semua keputusan sudah dikunci sejak plan; eksekusi dilakukan dalam satu sesi (S6) tanpa klarifikasi tambahan.

**Filosofi:** AI = presentation/interface layer. Math tetap deterministic di `engine/`. Semua action **WAJIB** dapat approval user sebelum eksekusi (zero auto-execute). Proactive alert default ON tapi user bisa disable via Settings.

### Level 1 — Smarter Q&A
- **Chat history persist** di `localStorage` (key `quantbit_ai_chat_history`, cap 100 pesan). Welcome message prepended kalau history kosong.
- **Richer live context**: `buildLiveContext()` sekarang kirim `bps` (Buy Pressure Score), `backtestConfigSnapshot`, `isBacktestOutOfSync`, dan 5 `alerts` terakhir ke model. Model bisa jawab "apa strategi terbaik?" dengan BPS live, regime, dan alert state.
- **Trash button** di header chat untuk clear history.

### Level 2 — Read-only Tool Use
- **8 read-only tools** di `src/hooks/useAITools.ts`:
  - `get_portfolio_state` — positions, cash, watchlist
  - `get_bps_now` — Buy Pressure Score (market-level)
  - `get_regime_details` — regime + breadth + drawdown
  - `get_ticker_metrics` — current price, scores, rank, fundamentals
  - `get_market_history` — last N days IHSG
  - `get_backtest_config` / `get_engine_config` — current settings
  - `get_active_universe` — tickers user cares about (custom mode)
- **Mekanisme**: Backend tetap pakai `buildSystemPrompt(ctx)` yang sekarang include **Section 13 (TOOL CATALOG)** + **Section 14 (PROACTIVE RULES)**. Model emit JSON block `{"tool_call": {"name": "...", "args": {...}}}` di response text. Frontend `extractToolCalls()` regex-parse, eksekusi read-only tool via `executeTool`, append hasil sebagai "tool" message ke chat, lalu re-ask AI untuk follow-up jawaban yang incorporate tool results.
- **Kenapa JSON-block bukan native function calling**: portability — OpenRouter, Groq, Gemini semua support text response. Backend tidak perlu maintain 3 schema function declaration yang berbeda.

### Level 3 — Action API + Inline Card Approval
- **10 actions** di `useAITools.ts` (sama dengan tool names di Section 13 actions list): `buy_stock`, `sell_stock`, `move_to_gold`, `set_active_profile`, `set_universe`, `set_topN`, `toggle_dca_active`, `add_to_watchlist`, `remove_from_watchlist`, `sync_backtest_to_portfolio`.
- **AIActionApprovalCard** (`src/components/AIActionApprovalCard.tsx`): inline card di chat dengan `[Approve]` `[Reject]` button, display text + impact preview (cost/proceeds/grams/profile bobot).
- **Approval flow**: `addPendingAction(pending)` masuk queue `AICockpitContext.pendingActions` → card render di bawah chat messages → user klik [Approve] → `executeAIAction(pending)` dispatch ke deterministic handler existing (`handleAddTransaction`, `handleMoveToGold`, `setActiveProfile`, `updateConfigValue`, `handleToggleWatchlist`, `syncFromBacktest`) → `approveAction(id)` remove dari queue.
- **Critical safety**: tidak ada auto-execute. AI SELALU hanya propose, user SELALU confirm. Untuk `sync_backtest_to_portfolio`, snapshot di-rebuild manual dari `backtestConfig` (bukan reference) — jadi old snapshot tidak ter-overwrite.
- **Error handling**: try/catch di `executeAIAction`, card menampilkan "✗ {error}" dengan status merah.

### Level 4 — Proactive Agent
- **`useProactiveAgent` hook** (`src/hooks/useProactiveAgent.ts`) — di-mount sekali via `<ProactiveAgentBridge />` di `App.tsx` (dalam AICockpitProvider).
- **6 rules** dengan hardcoded 5-min cooldown per rule:
  1. `bpsAggressive` — BPS 70-89
  2. `bpsDeploy` — BPS ≥ 90 (capitulasi)
  3. `bpsLow` — BPS < 30
  4. `dcaOffHighBps` — BPS ≥ 80 tapi `dcaActive=false`
  5. `crisisOverride` — `isCrisisMode()` aktif
  6. `ihsgDrop` — IHSG monthly drop > crashSensitivity
- **Honour toggle**: `proactiveAIEnabled` di `useUIState` (localStorage `idx_proactive_ai`, default true). Settings menu di AppHeader ada toggle "Proactive Alerts" dengan icon Bell/BellOff.
- **Chat badge**: `FloatingAIChat` menampilkan badge Bell kuning + counter unread (proactive alerts + chat messages) di tombol chat.

### Files Created (3)
| File | Lines | Purpose |
|------|------:|---------|
| `src/types/ai.ts` | 65 | AIToolCall, AIAction, AIToolResult, PendingAction, ProactiveAlert |
| `src/hooks/useAITools.ts` | 280 | 8 read-only tools + 10 actions + buildPendingAction |
| `src/hooks/useProactiveAgent.ts` | 90 | BPS threshold monitor + 5min cooldown |
| `src/components/AIActionApprovalCard.tsx` | 90 | Inline approval card with Approve/Reject |

### Files Modified (7)
| File | Change |
|------|--------|
| `src/ai/aiClient.ts` | `askAI` returns `{ content, provider, toolCalls }`; `buildLiveContext` adds bps/backtestConfigSnapshot/alerts; new `extractToolCalls()` regex parser; `READ_ONLY_TOOLS` + `ACTION_TOOLS` exports |
| `src/ai/systemKnowledge.ts` | Section 13 (TOOL CATALOG) + Section 14 (PROACTIVE RULES); `AILiveContext` extended with bps/alerts/backtestConfigSnapshot/dcaActive |
| `src/contexts/AICockpitContext.tsx` | Added `pendingActions`, `approveAction`, `rejectAction`, `proactiveAlerts`, `dismissProactiveAlert`, `openChatWithPrompt` |
| `src/components/FloatingAIChat.tsx` | History persist (localStorage, cap 100), tool execution loop, action approval rendering, follow-up AI call, trash button, proactive alert badge |
| `src/hooks/useUIState.ts` | `proactiveAIEnabled` + `setProactiveAIEnabled` (localStorage, default true) |
| `src/components/AppHeader.tsx` | New "AI Agent" section in settings menu with Bell toggle |
| `src/App.tsx` | `ProactiveAgentBridge` component, pass `pm` + `getDynamicStock` to FloatingAIChat, pass proactive toggle to AppHeader |

### Verification
```bash
$ npx tsc --noEmit   # PASS (0 errors)
$ npx vite build     # PASS
# Bundle impact:
# - index.js: 659.71 KB (186.57 KB gzip) — +0 KB
# - PortfolioTracker: 50.40 KB (12.79 KB gzip) — +0.7 KB
# - SimulationTab: 45.44 KB — no change
# - No new chunks (tool registry bundled into existing modules)
```

### Out of Scope (Deferred)
- Auto-execute BPS recommendation (Level 5) — violates "No AI for financial math"
- Voice input, image understanding — not in spec
- Cross-device chat sync — localStorage only per plan
- BPS re-calibration, VIX-like fear indicator — separate feature

## 2026-06-25 — Test Coverage for AI Features (4-Layer)
**Keputusan:** Implementasi 4-lapis test coverage untuk Quantbit AI (Levels 1-4) per spec yang di-approve user. Effort dialokasikan berurutan dari unit tests (no infra) sampai E2E (Playwright).

### Refactor untuk testability
Sebelum menulis test, dua file di-refactor untuk expose pure logic:
- **`src/ai/toolCallParser.ts`** (NEW, dependency-free) — `extractToolCalls()` regex parser + `READ_ONLY_TOOLS` + `ACTION_TOOLS` Sets. Di-import kembali dari `src/ai/aiClient.ts` untuk backward compat. **Bug fix**: regex `\{[\s\S]*?\}` salah-parse nested `{}`; diganti dengan brace-counting algorithm yang handles nested objects correctly.
- **`src/hooks/useAITools.ts`** — `ACTION_REGISTRY` (10 actions) + `buildPendingActionFromContext(action, ctx, now?)` di-extract ke module-level exports (sebelumnya di dalam `useMemo` di dalam hook).
- **`src/hooks/useProactiveAgent.ts`** — `shouldFireRule(lastFiredAt, now, cooldownMs?)` + `markRuleFired(map, ruleId, now)` di-extract sebagai pure helpers. `COOLDOWN_MS` constant juga di-export.

### Lapis 1 — Unit tests (no DOM, no React, no backend)
- `src/ai/__tests__/extractToolCalls.test.ts` — 17 tests: regex parser, multiple calls, malformed JSON, nested args, whitespace handling, unique IDs, multi-paragraph text
- `src/ai/__tests__/systemKnowledge.test.ts` — 20 tests: `formatLiveContext` untuk semua field combinations (config, regime, market, portfolio, BPS, backtestConfig, alerts, activeUniverse)
- `src/hooks/__tests__/useAITools.test.ts` — 39 tests: ACTION_REGISTRY (10 actions × normalization), buildPendingActionFromContext (10 action types × impact preview), formatIDR, common properties
- `src/hooks/__tests__/proactiveCooldown.test.ts` — 19 tests: shouldFireRule (first fire, within cooldown, boundary, custom cooldown, clock skew), markRuleFired (immutability), full workflow

**Total Lapis 1: 95 tests** (was 57 engine tests → 152 total)

### Lapis 2 — Component tests (jsdom + @testing-library/react)
- `vitest.config.ts` (NEW) — jsdom env, jsx via @vitejs/plugin-react, exclude existing node:test files
- `vitest.setup.ts` (NEW) — `import.meta.env` shim, `vi.mock` for api service, `cleanup()` in afterEach
- `src/components/__tests__/AIActionApprovalCard.test.tsx` — 12 tests: render, displayText, impact items, Approve/Reject buttons, click flows, success/reject status, error handling
- `src/components/__tests__/FloatingAIChat.history.test.tsx` — 6 tests: localStorage round-trip, welcome fallback, corrupt JSON, cap at 100, role preservation

**Total Lapis 2: 18 tests**

### Lapis 3 — Manual test guide + dev test harness
- `MANUAL_TEST_GUIDE.md` (NEW) — 30+ test cases organized by Level 1-4, with setup, expected outcomes, and cross-checks
- `src/components/AITestHarness.tsx` (NEW) — dev-only panel (guarded by `import.meta.env.DEV`) with 4 tabs: Tools (test extractToolCalls), Actions (test all 10 action builders), Cooldown (test 5-min gate + bypass), Storage (inspect/clear localStorage)

### Lapis 4 — Playwright E2E
- `playwright.config.ts` (NEW) — Chromium, baseURL localhost:5173, auto-start dev server, retries on CI
- `e2e/auth.setup.ts` (NEW) — dev-session localStorage seed (gated by IS_DEV in api.ts)
- `e2e/ai-chat.spec.ts` — 10 tests: chat opens, history persist, trash button, history cap, approval card render, Approve/Reject click flows, settings toggle
- `e2e/ai-proactive.spec.ts` — 7 tests: proactive toggle persist, fired rules tracking, notifications persist, 5-min cooldown, toast render, settings toggle ON/OFF
- `e2e/README.md` — usage instructions, CI integration snippet

**Total Lapis 4: 17 tests discoverable** (skipped when no AI provider configured)

### Combined test counts
| Lapis | Test runner | Tests | Speed |
|-------|-------------|------:|------:|
| Engine (existing) | `tsx --test` (node:test) | 57 | ~0.9s |
| 1 — Unit (new) | `tsx --test` (node:test) | 95 | ~0.6s |
| 2 — Component (new) | `vitest run` | 18 | ~1.9s |
| 4 — E2E (new) | `playwright test` | 17 (discoverable) | TBD |
| **Total automated** | | **170** | |

### Files Created (10)
- `src/types/ai.ts` (already from S6)
- `src/ai/toolCallParser.ts` — refactored parser
- `src/ai/__tests__/extractToolCalls.test.ts`
- `src/ai/__tests__/systemKnowledge.test.ts`
- `src/hooks/__tests__/useAITools.test.ts`
- `src/hooks/__tests__/proactiveCooldown.test.ts`
- `src/components/__tests__/AIActionApprovalCard.test.tsx`
- `src/components/__tests__/FloatingAIChat.history.test.tsx`
- `vitest.config.ts` + `vitest.setup.ts`
- `MANUAL_TEST_GUIDE.md` + `e2e/README.md`
- `src/components/AITestHarness.tsx`
- `playwright.config.ts` + `e2e/auth.setup.ts` + `e2e/ai-chat.spec.ts` + `e2e/ai-proactive.spec.ts`

### npm scripts added
- `test:ui` — vitest run (component tests)
- `test:ui:watch` — vitest watch mode
- `test:ui:coverage` — vitest with v8 coverage
- `test:e2e` — playwright test (auto-starts dev server)
- `test:e2e:headed` — playwright with browser visible
- `test:e2e:ui` — playwright interactive mode
- `test:e2e:install` — install chromium browser

### Verification
```bash
$ npm test                # 152/152 pass (engine + AI unit tests)
$ npm run test:ui         # 18/18 pass (component tests)
$ npx tsc --noEmit        # 0 errors
$ npx vite build          # PASS, 0 warnings
$ npx playwright test --list  # 17 tests discoverable
```

### Refactor side-effects
- Fixed off-by-one bug in `extractToolCalls` (was missing last `}` of inner JSON)
- Replaced fragile non-greedy regex with brace-counting algorithm (handles nested `{}` correctly)
- Extracted `shouldFireRule` to pure function (testable in isolation)
- Extracted `ACTION_REGISTRY` + `buildPendingActionFromContext` to module-level (no React deps for tests)

### Bug found during testing
- Original `extractToolCalls` regex failed on `{"args": {}}` empty-object case (consumed wrong `}`). Fixed by switching to brace-counting algorithm.

### Out of Scope
- Backend AI provider tests (would need mocks + provider integration)
- Cross-browser E2E (Firefox, WebKit) — Chromium only by default
- CI workflow (`.github/workflows/e2e.yml`) — listed in e2e/README.md as future work

## 2026-06-25 — Fix Dev Path: Real AI in Local Development

**Problem:** User reported "AI error padahal API sudah dipasang". Root cause:
1. `functions/api/[[path]].ts:handleAiChat` was the ONLY place that read `OPENROUTER_API_KEY` / `GROQ_API_KEY` / `GEMINI_API_KEY` — and it only runs in production Cloudflare Pages
2. Local `server.ts` (Express) had no `/api/ai/chat` handler
3. `vite.config.ts` proxy list only had `/api/backtest-data` and `/api/yahoo` — `/api/ai/chat` was missing
4. Vite's SPA fallback served `index.html` for `/api/ai/chat` → `api.ts:121-125` detected HTML → `devMock` returned canned "Mode dev lokal" message that was misleading (made user think AI was working in dev mode by design)
5. `package.json:dev` used `start cmd /c "tsx server.ts" && vite` (Windows-only `start` command, broken on Linux)

**Fix — share AI handler between CF Functions and Express:**

### Refactor
- **`src/server/aiChatHandler.ts`** (NEW) — extracted `runAiChat(messages, context, env)` pure function. Provider chain (OpenRouter → Groq → Gemini) + diagnostic error messages. No `Request`/`Response` types — accepts plain `AiEnv` object so it works in both CF Workers and Node Express.
- **`functions/api/[[path]].ts`** — `handleAiChat` now thin wrapper that calls `runAiChat(body.messages, body.context, env)`. Removed duplicate `chatGemini` + `chatOpenAICompatible` (~100 lines deleted).
- **`server.ts`** — added `app.post("/api/ai/chat", ...)` handler. Reads API keys from `process.env` (via `.env.local`).
- **`vite.config.ts`** — added `'/api/ai/chat': 'http://localhost:3001'` to proxy list.
- **`src/services/api.ts`** — devMock for `/api/ai/chat` now returns a helpful "Backend AI tidak reachable" hint with 2 numbered steps instead of the misleading "Mode dev lokal" message.
- **`package.json`** — replaced Windows-only `dev` script with cross-platform `concurrently -k -n api,web "npm:serve-api" "vite"`. Added `concurrently` as devDep.

### Tests
- **`src/server/__tests__/aiChatHandler.test.ts`** (NEW, 16 tests) — input validation, no-provider diagnostic, OpenRouter/Groq/Gemini provider calls, fallback chain, system prompt integration, error reporting. Uses `mock.fn` to intercept `globalThis.fetch`.

### Verification
- `npm test` 198/198 (was 182, +16 new)
- `npm run test:ui` 18/18
- `npx tsc --noEmit` 0 errors
- `npx vite build` PASS

### How user uses it
```bash
# .env.local (any one of these)
OPENROUTER_API_KEY=sk-or-v1-...

# Two terminals:
npm run serve-api   # terminal 1 — reads API key, listens on :3001
npm run dev         # terminal 2 — Vite proxies /api/ai/chat to :3001
```

Or `npm run dev` alone runs both concurrently (cross-platform via `concurrently`).

### Decisions recorded
- **Shared handler wins over duplicate code** — pure function pattern is cleaner than 2 implementations that drift over time
- **`concurrently` over platform-specific scripts** — was `start cmd /c` (Windows-only), broke on Linux. Replaced with cross-platform npm package
- **Helper hint in devMock** — instead of pretending the mock IS the AI, be honest that backend isn't reachable and tell user how to fix

### Net effect
- API keys di `.env.local` sekarang benar-benar dipakai di dev mode
- Tinggal `npm run dev` (atau `npm run serve-api` + `npm run dev`), chat akan pakai OpenRouter/Groq/Gemini
- Kalau backend tetap off, dev mock kasih hint actionable bukan misleading
- Codebase lebih DRY (1 handler bukan 2 duplicates)
