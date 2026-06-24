# CURRENT STATE

| Field | Value |
|-------|-------|
| Tanggal | 2026-06-24 |
| Status | Development |
| Progress | ~95% |
| Sprint | Platform Stabilization & MCP |

## Active Architecture

```
EngineConfigContext (single source of truth)
  ├── profiles[] — F, B, Custom N (weight profiles)
  ├── activeProfileId — profile aktif (getter: activeProfile)
  ├── activeConfig — backward compat getter ("prod"/"res")
  ├── topNCount, universe, crash/crossover settings
  ├── simulationMode: "algo" | "custom"
  ├── customUniverse: string[] (exclusive, custom mode)
  └── customTickers: string[] (forced holdings, algo mode)
       │
       ├── AppSidebar → 2-button mode toggle + custom universe picker
       ├── SimulationTab → runStrategy() with profile weights
       ├── PortfolioTracker → Strategy Control Center + notification rules
       ├── MarketTab → cascade filter from engineConfig
       └── AI Chat → profile-aware context (Section 12)
```

## Current Focus

All P0 items complete. Backend bugs fixed:
- **Mode toggle 3→2** ([Algo] [Custom]) — Custom = old single + renamed, no more 3-way
- **Config F vs B fixed** — activeProfileId now correctly passed to engine, rank key selection fixed
- **Fine-tune sliders fixed** — now read/write activeProfile via updateProfile (not orphaned engineConfig props)
- **Mock data** now generates stockNormScores for dev mode weight support
- **Comma input fix** — customTickers & customUniverse use defaultValue + onBlur
- **Duplicate config row** removed from SimulationTab header
- **PortfolioTracker dep fix** — engineConfig.activeProfile → activeProfile

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
