# NEXT ACTION

## Priority Queue

### P0 — BacktestContext Consolidation
- [ ] **Merge duplicat config** — simStartDate, simEndDate, algoCapital, simUniverse, reserveBufferPct dari BacktestContext → EngineConfigContext
- [ ] **Hapus setBacktestConfigType** — ganti dengan activeProfileId dari EngineConfigContext

### P1 — Data Pipeline Active Profile Support
- [ ] **Run `npm run build`** — regenerate year files dengan stockRawMetrics + stockNormScores
- [ ] **Verify runtime re-ranking** — pastikan SimulationTab baca normScores dan compute rank dengan profile weights

### P2 — Profile UX
- [ ] **Ticker-level weight override** — override weights per ticker dalam profile
- [ ] **Profile import/export** — JSON export untuk sharing profiles

### P3 — Portfolio Scoping
- [ ] **MarketTab filter by portfolio tickers**
- [ ] **Notifications scoped ke active tickers only**

### Sources State
- ✅ IDX API = primary fundamental source (PRODUCTION READY)
- ✅ `collectors/fetch_idx_fundamental.py` = pulls 60 months, output parquet+JSON
- ✅ `scripts/fetch_historical_data.ts` = Priority 1: IDX Warehouse (976 co)
- ✅ Weight Profile System = LIVE (profiles[], ManageProfilesModal, runtime re-ranking)
- ✅ Config Sync Bridge = bidirectional sync useUIState ↔ EngineConfigContext
- ✅ Data pipeline = stockRawMetrics + stockNormScores in output
- ✅ AI = profile-aware context
- ❌ BacktestContext = still has duplicate config (needs consolidation)
- ❌ Pre-2021 data backfill = deferred
- ❌ Telegram bot = deferred

## Completed This Session (2026-06-24)
- **Weight Profile System** — EngineConfigContext rewritten with profiles[], WeightProfile, add/delete/update/setActiveProfile
- **ManageProfilesModal** — UI for weight sliders, add/delete custom profiles
- **AppSidebar profile selector** — dynamic buttons replacing Config F/B toggle
- **ConfigSync bridge** — two-way sync between useUIState and EngineConfigContext
- **Runtime re-ranking** — SimulationTab computes ranks from stockNormScores + profile weights
- **Data pipeline raw metrics** — stockRawMetrics + stockNormScores added to JSON/SQLite/API
- **marketData/marketRegimeEngine** — accept weight objects alongside legacy config
- **AI awareness** — systemKnowledge + aiClient updated for profiles
- **Strategy Sync Engine (PRD-009)** — completed Phase 1-3:
  - Phase 1: Context Consolidation — EngineConfigContext = single source of truth, deleted BacktestContext
  - Phase 2: Core Engine (`src/engine/`) — pure functions for ranking, crash detection, allocation, metrics
  - Phase 3: SimulationTab refactor — replaced inline backtest with `runStrategy()`, added custom tickers UI, crash sensitivity slider, Strategy Profile card
- **All files type-check clean** — `npm run lint` passes

### Next Session (On Deck)
1. BacktestContext consolidation — merge duplicate config fields into EngineConfigContext
2. Run `npm run build` to regenerate year files with raw metrics
3. Profile UX improvements (ticker-level overrides, import/export)
4. Phase 4: Sync To Portfolio — copy strategy profile from backtest to active portfolio
5. Phase 5: Portfolio Refactor — PortfolioTracker becomes "Strategy Deployment Center"
6. Phase 6: Market/Notification integration — MarketTab + NotificationContext use same engine
7. Phase 7: AI integration — AI responds based on user's Strategy Profile

## Next Sprint (2026-06-25) — Strategy Sync Engine v2 (PRD-009 v2)

**Portfolio = Strategy Control Center. All modules cascade from EngineConfig.**

### P0 — Custom Mode + Custom Universe
- [ ] Add `customUniverse: string[]` field to `EngineConfig` (separate from `customTickers`)
- [ ] Extend `simulationMode: "algo" | "single" | "custom"` in `EngineConfig` + `BacktestConfig`
- [ ] Add 3-button mode toggle (Algo / Custom / Single) in AppSidebar
- [ ] Add Custom Universe picker UI (multi-select + chips) visible only in custom mode
- [ ] Update `runStrategy()` to support `customUniverse` as exclusive list

### P0 — SYNC TO PORTO Real Implementation
- [ ] Add `syncFromBacktest(snapshot)` function in EngineConfigContext
- [ ] Define `StrategySnapshot` interface
- [ ] Replace `console.log` in SYNC button with actual `syncFromBacktest()` call
- [ ] Install `sonner` for toast notifications
- [ ] Add success/error toast feedback
- [ ] Capture full snapshot: profile, universe, customTickers, customUniverse, crash, safe haven, topN, mode

### P0 — Portfolio = Strategy Control Center
- [ ] Fix SimulationTab useEffect deps — add `customTickers` and `activeProfile` (object, not just ID)
- [ ] Remove `activeConfig` prop from PortfolioTrackerProps (use context only)
- [ ] Update App.tsx to not pass `activeConfig` prop
- [ ] Enhanced Active Strategy banner: show mode, universe, crash status, safe haven, top N
- [ ] Add `shouldTriggerExit()` and `evaluateStrategy()` helpers in engine
- [ ] Add `getActiveUniverse()` helper
- [ ] Auto-notify via NotificationContext when engine says exit

### P1 — Notification Rule Firing
- [ ] Add `fireRule(rule, notification)` helper in NotificationContext
- [ ] `rule_tickerOutOfTopN` — ticker dropped out of Top N
- [ ] `rule_crashProtectionTriggered` — IHSG drop > sensitivity
- [ ] `rule_customUniverseBreach` — ticker in portfolio not in customUniverse
- [ ] `rule_singleModeTrigger` — single ticker drop > singleSellTrigger
- [ ] Wire rules to PortfolioTracker useEffect

### P1 — Market Tab Filter Cascade
- [ ] Mode-aware filter: algo+customTickers / algo+universe / custom / single
- [ ] Memoize `visibleStocks` with `useMemo`
- [ ] Add "Filtered by Portfolio Strategy" badge in MarketTab header

### P1 — AI Explain Exit Logic
- [ ] Add Section 12 "STRATEGY EVALUATION" to systemKnowledge
- [ ] Add `strategyEvaluation` + `activeUniverse` to `AILiveContext`
- [ ] Update `buildLiveContext()` to pass new fields
- [ ] AI can answer "should I exit?" / "must buy X?" with setting references

### P2 — Deferred / Future
- Run `npm run build` to regenerate year files with stockRawMetrics + stockNormScores
- Profile UX improvements (ticker-level overrides, import/export)
- Add unit tests for `src/engine/` pure functions
- Implement notification persistence (localStorage/database)
- Wire `setDividendCache()` in engine caller (currently always returns 0 dividends)

## Previous Sprint (Completed 2026-06-24) — Strategy Sync Engine v1 (PRD-009)
- Phase 1: Context Consolidation — `BacktestContext.tsx` deleted
- Phase 2: Core Engine (`src/engine/`) — pure functions
- Phase 3: SimulationTab refactor — `runStrategy()` call
- Phase 4: `lastBacktestProfile` + SYNC button placeholder
- Phase 5: PortfolioTracker Active Strategy banner
- Phase 6: MarketTab filter + NotificationContext
- Phase 7: AI integration with profile awareness
- Committed as `2424f73`, pushed to `origin/main`