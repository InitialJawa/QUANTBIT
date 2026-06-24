# AGENTS.md — src/

## Purpose
Main application source code — React UI, core engine, AI layer, contexts, hooks, and utilities.

## Ownership
- Root AGENTS.md governs project-wide rules
- This file governs all code under `src/`

## Local Contracts
- **Deterministic engine**: `src/engine/`, `src/marketRegimeEngine.ts`, `src/marketData.ts` — NO AI involvement in calculations
- **AI layer**: `src/ai/`, `src/components/AIAssistant.tsx`, `src/components/AICockpit.tsx` — presentation only
- **Data status**: Every data point must use `DataStatus` enum (LIVE/CACHED/STALE/ESTIMATED)
- **Components**: Follow existing patterns (functional components, Tailwind CSS, lucide-react icons)

## Work Guidance
- Edit component files for UI changes
- Edit `src/ai/systemKnowledge.ts` for AI system prompt updates
- Edit `src/engine/` for calculation logic changes
- New components go in `src/components/`

## Strategy Sync Engine v2 (PRD-009 v2)

**EngineConfigContext = single source of truth. Portfolio = strategy control center.**

- `simulationMode: "algo" | "custom"` (custom = user-defined exclusive universe)
- `customTickers: string[]` (forced holdings in algo mode)
- `customUniverse: string[]` (exclusive list in custom mode — separate field, different semantics)
- `lastBacktestProfile: WeightProfile | null` (set by wrapped `setBacktestResult`)
- `syncFromBacktest(snapshot)` — copy backtest config to portfolio (replace strategy fields, exclude cash)

**Flow:**
1. User configures Backtest (algo/custom/single, profile, universe, crash settings)
2. Run backtest via `runStrategy()` in `src/engine/`
3. User clicks "SYNC TO PORTFOLIO" → `engineConfig.syncFromBacktest(snapshot)`
4. Portfolio reads `engineConfig` → cascades to Market, Notifications, AI
5. Setting changes in Portfolio → re-cascade

**Engine helpers** (Phase 10):
- `shouldTriggerExit(ticker, position, engineConfig)` — should this ticker exit to safe haven?
- `evaluateStrategy(engineConfig, marketData)` — returns `{ shouldExit, reason, targetSafeHaven }`
- `getActiveUniverse(engineConfig)` — list of tickers user cares about based on mode

**Notification rules** (Phase 11, threshold-based):
- `rule_tickerOutOfTopN` — ticker dropped out of Top N
- `rule_crashProtectionTriggered` — IHSG drop > sensitivity
- `rule_customUniverseBreach` — ticker in portfolio not in customUniverse
- `rule_singleModeTrigger` — single ticker drop > singleSellTrigger

## Verification
- `npm run lint` — TypeScript type checking
- `npm run dev` — manual UI verification

## Child DOX Index
- `src/components/` — React UI components
- `src/components/ManageProfilesModal.tsx` — Weight profile management UI (sliders, add/delete custom profiles)
- `src/contexts/` — React state contexts (Auth, EngineConfig, Notification, AI)
- `src/contexts/EngineConfigContext.tsx` — **Single source of truth** for all strategy settings
- `src/contexts/NotificationContext.tsx` — Global notification system with rule engine
- `src/hooks/` — Custom React hooks
- `src/ai/` — AI client and system knowledge
- `src/engine/` — Sync engine (pure functions, no React deps)
- `src/engine/core.ts` — `runStrategy()`, `shouldTriggerExit()`, `evaluateStrategy()`
  - **Rebalancing rules**: algo mode only (custom mode excluded from rank-based exit). `lastRebalanceMonth` init from day0 month (no day-1 false trigger). Swap candidates = `config.topNCount` (not hardcoded). Self-swap & duplicate positions prevented.
- `src/data/` — Data files (historical market data, IDX warehouse fundamental_idx_all.json)
- `src/data/archive/` — Archived legacy data (FUNDAMENTAL_SNAPSHOTS, STOCK_FACTORS)
- `src/services/` — API client
- `src/server/` — Express API handlers
- `src/utils/` — Utility functions
- `src/types/` — TypeScript type definitions
- `src/constants/` — Constant data (IDX lists)
- `src/mcp/` — MCP server (Model Context Protocol) for AI agent integration
