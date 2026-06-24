# TASK — PRD-009 Strategy Sync Engine

Owner: Imam Muhammad Nasrulloh
Started: 2026-06-24
Status: In Progress

---

## Vision

Satu Strategy Profile → satu engine → semua modul (Backtest, Portfolio, Market, Notification, AI) membaca keputusan yang sama.

---

## Phase 1: Context Consolidation

**Goal:** EngineConfigContext = single source of truth. Hapus BacktestContext sepenuhnya.

| # | Task | Files | Status |
|---|---|---|---|
| 1.1 | Tambah field baru ke EngineConfig: `simStartDate`, `simEndDate`, `algoCapital`, `customTickers`, `simStartDate`, `simEndDate` | `EngineConfigContext.tsx` | ✅ |
| 1.2 | Update `EngineConfig` interface + default value | `EngineConfigContext.tsx` | ✅ |
| 1.3 | Update `EngineConfigContextType` — tambah setters untuk field baru | `EngineConfigContext.tsx` | ✅ |
| 1.4 | Update `App.tsx` — hapus `BacktestProvider`, update ConfigSync | `App.tsx` | ✅ |
| 1.5 | Update `SimulationTab.tsx` — ganti semua `bt.xxx` → `engineConfig.xxx` | `SimulationTab.tsx` | ✅ |
| 1.6 | Update `PortfolioTracker.tsx` — ganti `setActiveConfig()` | `PortfolioTracker.tsx` | ✅ |
| 1.7 | Update `server.ts` — profile persistence endpoint | `server.ts` | ✅ |
| 1.8 | Hapus `BacktestContext.tsx` | `src/contexts/BacktestContext.tsx` | ✅ |
| 1.9 | Hapus import `BacktestProvider` di root | `App.tsx` | ✅ |
| 1.10 | Verifikasi `npm run lint` — 0 errors | — | ✅ |

---

## Phase 2: Core Engine (`run_strategy()`)

**Goal:** Satu pure function yang bisa dipanggil dari mana saja.

| # | Task | Files | Status |
|---|---|---|---|
| 2.1 | Buat `src/engine/types.ts` — `StrategyProfile`, `EngineInput`, `EngineOutput` | NEW | ✅ |
| 2.2 | Buat `src/engine/ranker.ts` — `computeRankings(stocks, weights, universe)` | NEW | ✅ |
| 2.3 | Buat `src/engine/crashDetector.ts` — `checkCrash(ihsg, sensitivity)` | NEW | ✅ |
| 2.4 | Buat `src/engine/allocator.ts` — `computeAllocation(rankings, topN, cash, customTickers)` | NEW | ✅ |
| 2.5 | Buat `src/engine/actions.ts` — `computeActions(holdings, targets, crashStatus)` | NEW | ✅ |
| 2.6 | Buat `src/engine/core.ts` — `runStrategy(date, profile, marketData)` orchestration | NEW | ✅ |
| 2.7 | Export pure functions (no React dependency) | `core.ts` | ✅ |

---

## Phase 3: Backtest Refactor

**Goal:** SimulationTab jadi UI wrapper tipis di atas Core Engine.

| # | Task | Files | Status |
|---|---|---|---|
| 3.1 | Ganti `handleRunAlgoBacktest()` — panggil `runStrategy()` per day | `SimulationTab.tsx` | ✅ |
| 3.2 | Ekstrak metric computation ke `src/engine/metrics.ts` | NEW + SimulationTab | ✅ |
| 3.3 | Hapus duplikasi logika (crash, rank, allocation sudah di engine) | `SimulationTab.tsx` | ✅ |
| 3.4 | **Custom Tickers** — tambah input multi-select di UI SimulationTab | `SimulationTab.tsx` | ✅ |
| 3.5 | **Top N: 10** — tambah opsi 10 ke `numStocks` / `topNCount` | `EngineConfigContext.tsx`, UI | ✅ |
| 3.6 | **Crash threshold slider** — 5-30% di UI | `SimulationTab.tsx` | ✅ |
| 3.7 | **Strategy Profile card** — tampilkan profile name, weights, custom tickers | `SimulationTab.tsx` | ✅ | |

---

## Phase 4: Sync To Portfolio

**Goal:** Tombol yang copy strategy profile dari backtest ke portfolio aktif.

| # | Task | Files | Status |
|---|---|---|---|
| 4.1 | Tambah `lastBacktestProfile` state di EngineConfigContext | `EngineConfigContext.tsx` | |
| 4.2 | Tombol "SYNC TO PORTFOLIO" di SimulationTab | `SimulationTab.tsx` | |
| 4.3 | Visual feedback — toast "Strategy synced" | `SimulationTab.tsx` | |

---

## Phase 5: Portfolio Refactor

**Goal:** PortfolioTracker jadi "Strategy Deployment Center".

| # | Task | Files | Status |
|---|---|---|---|
| 5.1 | Ganti `activeConfig` reader → baca `engineConfig.activeProfile` langsung | `PortfolioTracker.tsx` | |
| 5.2 | Ganti `setActiveConfig()` → panggil engine | `PortfolioTracker.tsx` | |
| 5.3 | Tambah UI "Active Strategy" banner | `PortfolioTracker.tsx` | |
| 5.4 | Hapus dependency pada `marketRegimeEngine.setActiveConfig` | `PortfolioTracker.tsx` | |

---

## Phase 6: Market Scoping + Notification Engine

**Goal:** Market & Notification pakai satu engine yang sama.

| # | Task | Files | Status |
|---|---|---|---|
| 6.1 | MarketTab filter — jika `customTickers` ada, hanya tampilkan itu | `MarketTab.tsx` | |
| 6.2 | Notification context — global provider dengan rule engine | NEW | |
| 6.3 | Rules: ticker out of topN, crash protection, regime change | `NotificationContext.tsx` | |
| 6.4 | Ganti local toast dengan NotificationContext | `PortfolioTracker.tsx`, `DigitalWalletUI.tsx` | |

---

## Phase 7: AI Integration

**Goal:** AI menjawab berdasarkan Strategy Profile user.

| # | Task | Files | Status |
|---|---|---|---|
| 7.1 | Update `systemKnowledge.ts` — strategy explanation prompt section | `systemKnowledge.ts` | |
| 7.2 | Update `buildLiveContext()` — kirim full strategy profile + rankings | `aiClient.ts` | |
| 7.3 | AI bisa explain "kenapa beli ADRO?" dengan referensi engine | `aiClient.ts` | |

---

## Verification

| # | Check | Status |
|---|---|---|
| V1 | `npm run lint` — 0 TypeScript errors | |
| V2 | `npm run dev` — app loads without runtime errors | |
| V3 | Backtest result dari engine = hasil lama (regression check) | |
| V4 | Double config verification — tidak ada field duplikat | |
