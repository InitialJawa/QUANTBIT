# CURRENT STATE

| Field | Value |
|-------|-------|
| Tanggal | 2026-06-25 |
| Status | Development |
| Progress | ~96% |
| Sprint | Platform Stabilization & MCP |

## Active Architecture

```
EngineConfigContext (source of truth for LIVE strategy)
  ├── profiles[] — QM, BG, Custom N (weight profiles)
  ├── activeProfileId — profile aktif (getter: activeProfile)
  ├── activeConfig — backward compat getter ("prod"/"res")
  ├── topNCount, universe, crash/crossover settings
  ├── simulationMode: "algo" | "custom"
  ├── customUniverse: string[] (exclusive, custom mode)
  └── enableAdaptiveWeights: boolean (auto-adjust factor weights)
       │
       ├── AppSidebar → 2-button mode toggle + custom panel
       ├── └── renderBacktestContent → uses backtestConfig (draft, NOT engineConfig)
       ├── SimulationTab → runStrategy() with backtestConfig (draft)
       ├── PortfolioTracker → reads engineConfig (live, only updated via SYNC)
       ├── MarketTab → cascade filter from engineConfig
       └── AI Chat → profile-aware context (Section 12)

backtestConfig (draft, isolated from engineConfig)
  ├── Full EngineConfig copy for backtest experimentation
  ├── Modified by Backtest sidebar inputs (no effect on Portfolio)
  ├── Auto-run useEffect fires on backtestConfig changes
  └── syncFromBacktest() copies backtestConfig → engineConfig on SYNC click
```

## Current Focus

**Session 2026-06-25 (session 3): Factor analysis, weight rebalancing, data consistency fix**

### 🔴 Data Fix: stockNormScores ↔ stockRanksProd/Res Inkonsisten (FIXED)
- **Akarnya**: `fetch_historical_data.ts` pake linear min-max (40-95), `migrate-normscores.ts` overwrite pake rank-based (0-95) tanpa update `stockRanksProd/Res`
- **Fix**: `migrate-normscores.ts` sekarang compute `stockRanksProd` & `stockRanksRes` dari `stockNormScores` + profile weights (sama kaya `computeDayRankings()` di engine)
- **Data restored**: `fundamental_idx_all.json` di-revert ke versi sebelumnya — collector overwrite dengan data baru yg cuma punya 13 ticker pre-2021. Versi restore punya **751** ticker pre-2021 data.

### 🟢 Weight Rebalancing: Value ditekan ke 5%, Quality dinaikkan
- **Dasar**: ADR-009 — Value (1/PB) adalah negative-alpha factor (-26% CAGR) di IDX80 2021-2026
- **Config QM** (id="prod", menggantikan Config F): Q45 G10 V5 M40 — fokus ke 2 faktor terkuat
- **Config BG** (id="res", menggantikan Config B): Q40 G25 V5 M30 — balanced, growth tetap dipertahankan
- **Single-factor confirmed**: Quality (ROE) = +246% CAGR 25.5%, Momentum = +63%, Growth = +49%, Value = -26%
- **QM backtest**: +150% CAGR 18.23% (vs old Config B +79%, old Config F -0.7%)

### 🟢 All Naming Updated
- `EngineConfigContext.tsx` — DEFAULT_PROFILES weights & names
- `marketData.ts` — CW_F/CW_B, hardcoded weights di `syncExitsFromScan`, `syncRadarContext`
- `systemKnowledge.ts` — AI prompt profile descriptions
- `core.ts` — configName untuk backtest result
- `AppSidebar.tsx`, `AppHeader.tsx`, `DiagnosticsTab.tsx`, `PortfolioTracker.tsx` — display labels
- `run_backtest_comparison.cjs` — weight configs

## Verification
- `tsc --noEmit` — passes (0 errors)
- `vite build` — passes (0 errors)

## Remaining (P2/Deferred)
- Profile UX (ticker-level overrides, import/export)
- Unit tests for `src/engine/`
- Notification persistence (localStorage/database)
- `setDividendCache()` wiring
- Telegram bot
- Pre-2021 data backfill (IDX warehouse collector perlu historical archive)
- Bootstrap `npm run build` / `npm run split-data` untuk fresh data

## Known Gap
`shouldTriggerExit` per-ticker exit evaluation exists in engine but not yet wired per-portfolio-item in the notification loop.

## Archive — Legacy Cleanup
- `BacktestContext.tsx` — deleted, config migrated to EngineConfigContext
- `STOCK_FACTORS` — removed
- `generateFallbackFundamentals` — removed (hash-based, replaced by warehouse)
- Pre-2021 year data — deleted from `data/years/`
- `simulationMode: "single"` — removed across codebase
