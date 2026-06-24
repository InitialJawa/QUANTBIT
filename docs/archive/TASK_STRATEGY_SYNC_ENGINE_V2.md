# TASK — PRD-009 Strategy Sync Engine v2

Owner: Imam Muhammad Nasrulloh
Started: 2026-06-24
Status: All Phases Complete

---

## Vision

Portfolio = Strategy Control Center. Settingan yang user pilih di Backtest (mode, universe, custom tickers/universe, profile, crash protection, safe haven) di-SYNC ke Portfolio, dan dari sana **mencascade** ke semua modul lain (Market, Notifications, AI, Rekomendasi Saham Cerdas).

---

## Phase 8: Custom Mode + Custom Universe

**Goal:** User bisa pilih universe eksklusif di backtest (misal: BBCA, BBRI, ADRO saja).

| # | Task | Files | Status |
|---|---|---|---|
| 8.1 | Add `customUniverse: string[]` to `EngineConfig` | `EngineConfigContext.tsx` | |
| 8.2 | Update `createDefaultConfig()` to include `customUniverse: []` | `EngineConfigContext.tsx` | |
| 8.3 | Extend `simulationMode` to `"algo" \| "single" \| "custom"` | `EngineConfigContext.tsx` | |
| 8.4 | Extend `BacktestConfig.simulationMode` in engine | `src/engine/types.ts` | |
| 8.5 | Add `customUniverse: string[]` to `BacktestConfig` | `src/engine/types.ts` | |
| 8.6 | Update `runStrategy()` to support `customUniverse` as exclusive list | `src/engine/core.ts` | |
| 8.7 | Add 3-button mode toggle (Algo / Custom / Single) in AppSidebar | `AppSidebar.tsx` | |
| 8.8 | Add Custom Universe picker UI (multi-select + chips) in AppSidebar | `AppSidebar.tsx` | |
| 8.9 | Hide custom universe picker when mode != "custom" | `AppSidebar.tsx` | |
| 8.10 | Pass `customUniverse` to `runStrategy()` in SimulationTab | `SimulationTab.tsx` | |
| 8.11 | Add `customTickers` and `activeProfile` to SimulationTab auto-run useEffect deps | `SimulationTab.tsx` | |

---

## Phase 9: SYNC TO PORTO Real Implementation

**Goal:** Tombol SYNC TO PORTO benar-benar menyalin settingan backtest ke portfolio.

| # | Task | Files | Status |
|---|---|---|---|
| 9.1 | Define `StrategySnapshot` interface | `EngineConfigContext.tsx` | |
| 9.2 | Add `syncFromBacktest(snapshot)` function in EngineConfigContext | `EngineConfigContext.tsx` | |
| 9.3 | Implement snapshot capture helper in SimulationTab | `SimulationTab.tsx` | |
| 9.4 | Replace `console.log` in SYNC button with `syncFromBacktest(snapshot)` call | `SimulationTab.tsx` | |
| 9.5 | Add disabled state + tooltip when no backtest result | `SimulationTab.tsx` | |
| 9.6 | Add loading state during sync | `SimulationTab.tsx` | |
| 9.7 | Install `sonner` for toast notifications | `package.json` | |
| 9.8 | Add success toast: "Strategy synced to portfolio" | `SimulationTab.tsx` | |
| 9.9 | Add error toast for failed sync | `SimulationTab.tsx` | |

---

## Phase 10: Portfolio = Strategy Control Center

**Goal:** Portfolio reads all settings from engineConfig dan cascades ke semua modul lain.

| # | Task | Files | Status |
|---|---|---|---|
| 10.1 | Remove `activeConfig` prop from `PortfolioTrackerProps` | `PortfolioTracker.tsx` | |
| 10.2 | Update function signature — remove `activeConfig` from destructured props | `PortfolioTracker.tsx` | |
| 10.3 | Update App.tsx — remove `activeConfig={ui.activeConfig}` props | `App.tsx` | |
| 10.4 | Enhanced Active Strategy banner: show mode | `PortfolioTracker.tsx` | |
| 10.5 | Enhanced banner: show universe source (IDX80 / Custom: BBCA, BBRI, ADRO) | `PortfolioTracker.tsx` | |
| 10.6 | Enhanced banner: show crash protection status | `PortfolioTracker.tsx` | |
| 10.7 | Enhanced banner: show safe haven target | `PortfolioTracker.tsx` | |
| 10.8 | Enhanced banner: show top N count | `PortfolioTracker.tsx` | |
| 10.9 | Add `shouldTriggerExit(ticker, position, engineConfig)` in engine | `src/engine/core.ts` | |
| 10.10 | Add `evaluateStrategy(engineConfig, marketData)` in engine | `src/engine/core.ts` | |
| 10.11 | Add `getActiveUniverse(engineConfig)` helper | `src/engine/core.ts` | |
| 10.12 | Wire `shouldTriggerExit()` to NotificationContext in PortfolioTracker | `PortfolioTracker.tsx` | |
| 10.13 | Show "Strategy says: Exit to emas" recommendation banner | `PortfolioTracker.tsx` | |

---

## Phase 11: Notification Rule Firing

**Goal:** Notification rules baca dari engineConfig, trigger threshold-based.

| # | Task | Files | Status |
|---|---|---|---|
| 11.1 | Add `fireRule(rule, notification)` helper in NotificationContext | `NotificationContext.tsx` | |
| 11.2 | `rule_tickerOutOfTopN(ticker, ranks, topN)` | `NotificationContext.tsx` | |
| 11.3 | `rule_crashProtectionTriggered(ihsgPrice, sensitivity, safeHaven)` | `NotificationContext.tsx` | |
| 11.4 | `rule_customUniverseBreach(ticker, customUniverse)` | `NotificationContext.tsx` | |
| 11.5 | `rule_singleModeTrigger(price, trigger, mode)` | `NotificationContext.tsx` | |
| 11.6 | Wire rules to PortfolioTracker useEffect (monitor engineConfig + position) | `PortfolioTracker.tsx` | |
| 11.7 | Show notification toast on rule trigger (via sonner) | `PortfolioTracker.tsx` | |

---

## Phase 12: Market Tab Filter Cascade

**Goal:** Market tab filter otomatis cascade dari engineConfig mode.

| # | Task | Files | Status |
|---|---|---|---|
| 12.1 | Mode-aware filter: algo+customTickers | `MarketTab.tsx` | |
| 12.2 | Mode-aware filter: algo+universe (idx80/idx30/lq45) | `MarketTab.tsx` | |
| 12.3 | Mode-aware filter: custom → show customUniverse | `MarketTab.tsx` | |
| 12.4 | Mode-aware filter: single → show singleTicker only | `MarketTab.tsx` | |
| 12.5 | Memoize `visibleStocks` with `useMemo` | `MarketTab.tsx` | |
| 12.6 | Add "Filtered by Portfolio Strategy" badge in MarketTab header | `MarketTab.tsx` | |

---

## Phase 13: AI Explain Exit Logic

**Goal:** AI jawab "should I exit?" / "must buy X?" berdasarkan settingan user.

| # | Task | Files | Status |
|---|---|---|---|
| 13.1 | Add Section 12 "STRATEGY EVALUATION" to systemKnowledge | `src/ai/systemKnowledge.ts` | |
| 13.2 | Add `strategyEvaluation` field to `AILiveContext` | `src/ai/systemKnowledge.ts` | |
| 13.3 | Add `activeUniverse: string[]` field to `AILiveContext` | `src/ai/systemKnowledge.ts` | |
| 13.4 | Update `buildLiveContext()` to compute `strategyEvaluation` | `src/ai/aiClient.ts` | |
| 13.5 | Update `buildLiveContext()` to compute `activeUniverse` | `src/ai/aiClient.ts` | |
| 13.6 | Update `formatLiveContext()` to show strategy evaluation | `src/ai/systemKnowledge.ts` | |
| 13.7 | AI can answer "should exit?" with sensitivity reference | (via prompt) | |
| 13.8 | AI can answer "must buy X?" with customUniverse reference | (via prompt) | |

---

## Verification

| # | Check | Status |
|---|---|---|
| V1 | `npm run lint` — 0 TypeScript errors | |
| V2 | `npm run dev` — app loads without runtime errors | |
| V3 | E2E test flow: custom mode → SYNC → portfolio → market → crash notification | |
| V4 | Regression test: existing modes (algo, single) masih jalan | |
| V5 | Backtest result dari engine = hasil lama (no regression) | |
| V6 | Commit + push to origin | |

---

## Key Design Decisions (v2)

1. **Custom Universe vs Custom Tickers (separate fields):**
   - `customTickers` = forced holdings in algo mode (always enter portfolio)
   - `customUniverse` = exclusive list in custom mode (replaces universe)
   - Different semantics, kept separate to avoid confusion

2. **SYNC behavior = replace strategy fields, exclude cash:**
   - User expects "sama persis" after SYNC
   - Cash is user's money, not part of strategy
   - Replaces: profile, universe, customTickers, customUniverse, crash, safe haven, topN, mode, singleTicker

3. **Notification = threshold-based, not real-time:**
   - Avoid notification spam
   - Use `shouldFireRule` dedup mechanism
   - Only fire when signal crosses threshold

4. **Toast library = sonner (~3KB):**
   - Modern, lightweight, easy to use
   - Standard in React ecosystem

5. **Docs-first approach:**
   - Update all docs (D1-D7) before any code changes
   - Then code (Phase 8-13)
   - Then verify (V1-V6)

---

## Migration Path from v1

- v1 `simulationMode: "algo" | "single"` → v2 `"algo" | "single" | "custom"` (backward compat)
- v1 `customTickers: string[]` → unchanged (used in algo mode)
- v1 NEW `customUniverse: string[]` → new field, default `[]`
- v1 `setBacktestResult` wrapper → unchanged
- v1 `lastBacktestProfile` → unchanged
- v1 NEW `syncFromBacktest(snapshot)` → new function
- v1 `useEngineConfig()` → extended with `customUniverse`, `syncFromBacktest`
