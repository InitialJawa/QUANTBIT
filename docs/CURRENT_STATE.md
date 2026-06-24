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
  ├── simulationMode: "algo" | "custom"  (single → custom migrated)
  ├── customUniverse: string[] (exclusive, custom mode)
  └── customTickers: string[] (forced holdings, algo mode)
       │
       ├── AppSidebar → 2-button mode toggle + custom panel
       ├── SimulationTab → runStrategy() with profile weights
       ├── PortfolioTracker → Strategy Control Center + notification rules
       ├── MarketTab → cascade filter from engineConfig
       └── AI Chat → profile-aware context (Section 12)
```

## Current Focus

**Session 2026-06-24: Full audit fix** — 13 critical/medium bugs resolved, dead code removed:

### 🔴 Critical Engine Fixes
- **Custom mode crash detection** — now uses IHSG-based `detectCrashAlgo` (not single-stock)
- **Custom mode recovery** — now uses IHSG-based `detectRecoveryAlgo`
- **`peak60` wired through chain** — `getIhsgDrawdown60()` → `evaluateStrategy()` → `rule_crashProtectionTriggered()` → AI `strategyEvaluation`
- **Custom mode alerts** — custom universe-based (not rank-based) + buy suggestions
- **AI strategyEvaluation** — no longer hardcoded `shouldExit: false`, uses real drawdown
- **`rule_singleModeTrigger`** — updated for custom mode context
- **PortfolioTracker dep fix** — engineConfig.activeProfile → activeProfile

### 🟡 UI/Config Fixes
- **Portfolio sidebar custom panel** — shows fine-tune sliders + custom universe summary
- **localStorage migration** — legacy `"single"` → `"custom"` on load
- **AnalyticsTab** — uses `engineConfig.activeProfileId` directly (no lossy downcast)
- **FloatingAIChat** — now receives `selectedStock`, `portfolio`, `cash` props
- **server.ts** — now uses `bridgeHistoricalData()` matching CF Pages Function behavior

### 🟢 Dead Code Removed
- **`"single"` type union** removed from `types.ts`, `EngineConfigContext.tsx`, `systemKnowledge.ts`
- **Dead single-mode branches** — `core.ts` (crash/recovery/reentry/fallbacks), `PortfolioTracker.tsx` (alerts), `AppSidebar.tsx` (panel), `notificationRules.ts`, `aiClient.ts`
- **Engine index** — cleaned up unused exports (`detectCrashSingle`, `detectRecoverySingle`, `rule_singleModeTrigger`)

## Verification
- `tsc --noEmit` — passes
- `vite build` — passes

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
- `simulationMode: "single"` — removed across codebase
