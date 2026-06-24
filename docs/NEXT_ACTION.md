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

## Next Sprint (2026-06-25)
1. Run `npm run build` to regenerate year files with stockRawMetrics + stockNormScores
2. Add toast notification library (sonner or react-hot-toast) for proper UX feedback
3. Implement NotificationContext rule firing in MarketTab and PortfolioTracker
4. Profile UX improvements (ticker-level overrides, import/export)
5. Add more rule types to NotificationContext (price alerts, volume spikes, etc.)
6. Connect SYNC TO PORTFOLIO button to actual portfolio sync logic
7. Add unit tests for `src/engine/` pure functions
8. Implement notification persistence (save notifications to localStorage/database)