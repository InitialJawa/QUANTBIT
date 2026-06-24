# CURRENT STATE

| Field | Value |
|-------|-------|
| Tanggal | 2026-06-24 |
| Status | Development |
| Progress | ~94% |
| Sprint | Platform Stabilization & MCP |

## Active Architecture

```
EngineConfigContext (single source of truth)
  ├── profiles[] — F, B, Custom N (weight profiles)
  ├── activeProfileId — profile aktif (getter: activeProfile)
  ├── activeConfig — backward compat getter ("prod"/"res")
  ├── topNCount, universe, crash/crossover settings
  ├── simulationMode: "algo" | "custom" | "single"
  ├── customUniverse: string[] (exclusive, custom mode)
  └── customTickers: string[] (forced holdings, algo mode)
       │
       ├── AppSidebar → 3-button mode toggle + custom universe picker
       ├── SimulationTab → runStrategy() with profile weights
       ├── PortfolioTracker → Strategy Control Center + notification rules
       ├── MarketTab → cascade filter from engineConfig
       └── AI Chat → profile-aware context (Section 12)
```

## Current Focus

All P0 items complete. Strategy Sync Engine v2 (PRD-009 v2) fully implemented:
- **3-mode toggle** (Algo/Custom/Single) + custom universe picker in AppSidebar
- **SYNC TO PORTO** real implementation (syncFromBacktest, sonner toast)
- **Portfolio = Control Center** (enhanced banner, shouldTriggerExit, evaluateStrategy)
- **Notification rules** wired (crashProtection, tickerOutOfTopN, customUniverseBreach)
- **MarketTab filter** mode-aware + "Filtered by Portfolio Strategy" badge
- **AI Exit Logic** (Section 12, strategyEvaluation, activeUniverse)

## Remaining (P2/Deferred)
- `npm run build` to regenerate year files with raw metrics
- Profile UX (ticker-level overrides, import/export)
- Unit tests for `src/engine/`
- Notification persistence (localStorage/database)
- `setDividendCache()` wiring
- Telegram bot
- Pre-2021 data backfill

## Known Gap
`shouldTriggerExit` per-ticker exit evaluation exists in engine but not yet wired per-portfolio-item in the notification loop.

## Archive — Legacy Cleanup
- `BacktestContext.tsx` — deleted, config migrated to EngineConfigContext
- `STOCK_FACTORS` — removed
- `generateFallbackFundamentals` — removed (hash-based, replaced by warehouse)
- Pre-2021 year data — deleted from `data/years/`
