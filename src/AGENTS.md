# AGENTS.md — src/

## Purpose
Main application source code — React UI, core engine, AI layer, contexts, hooks, and utilities.

## Ownership
- Root AGENTS.md governs project-wide rules
- This file governs all code under `src/`

## Local Contracts
- **Deterministic engine**: `src/engine/`, `src/marketRegimeEngine.ts`, `src/marketData.ts` — NO AI involvement in calculations
- **AI layer**: `src/ai/`, `src/components/AIAssistant.tsx`, `src/components/AICockpit.tsx`, `src/components/AIActionApprovalCard.tsx` — presentation only. AI is interface; math stays in `engine/`.
- **AI agent actions**: All `AIAction` executions require user `[Approve]` click in `AIActionApprovalCard` before dispatch to deterministic handlers. Zero auto-execute.
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
- `customUniverse: string[]` (exclusive list in custom mode)
- `enableAdaptiveWeights: boolean` (auto-adjust factor weights based on recent factor performance)
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
- `npm test` — 152 unit tests (engine + AI pure functions, via `tsx --test`)
- `npm run test:ui` — 18 component tests (vitest + @testing-library/react, jsdom)
- `npm run test:e2e` — 17 Playwright E2E tests (auto-starts dev server)

## AI Agent (Quantbit AI Depth Upgrade, Levels 1+2+3+4)
- **FloatingAIChat.tsx** — entry point. Chat history persist (localStorage, cap 100), tool execution loop, action approval rendering, follow-up AI call.
- **AIActionApprovalCard.tsx** — inline [Approve]/[Reject] card. Zero auto-execute — all `AIAction` must be approved by user.
- **useAITools.ts** — 8 read-only tools + 10 actions registry. JSON-block function calling (`{"tool_call": {...}}` regex-parse).
- **useProactiveAgent.ts** — Level 4 proactive monitor. 6 BPS rules + 5-min hardcoded cooldown per rule. Default ON, toggleable via Settings.
- **systemKnowledge.ts** Sections 13 (TOOL CATALOG) + 14 (PROACTIVE RULES) — model instructions.
- **aiClient.ts** — `askAI()` returns `{ content, provider, toolCalls }`. `extractToolCalls()` regex parser. `READ_ONLY_TOOLS` + `ACTION_TOOLS` constants.
- **AICockpitContext** — `pendingActions` queue (Level 3), `proactiveAlerts` queue (Level 4, wired but not yet rendered as chip).

## Child DOX Index
- `src/components/` — React UI components
- `src/components/ManageProfilesModal.tsx` — Weight profile management UI (sliders, add/delete custom profiles)
- `src/components/AIActionApprovalCard.tsx` — Inline approval card for AI-suggested actions (Level 3)
- `src/contexts/` — React state contexts (Auth, EngineConfig, Notification, AI)
- `src/contexts/EngineConfigContext.tsx` — **Single source of truth** for all strategy settings
- `src/contexts/NotificationContext.tsx` — Global notification system with rule engine
- `src/hooks/` — Custom React hooks
- `src/hooks/useAITools.ts` — AI tool + action registry (Levels 2+3)
- `src/hooks/useProactiveAgent.ts` — Proactive agent monitor (Level 4)
- `src/ai/` — AI client and system knowledge
- `src/ai/systemKnowledge.ts` — System prompt + Sections 13/14 tool catalog
- `src/ai/toolCallParser.ts` — Pure extractToolCalls + READ_ONLY_TOOLS + ACTION_TOOLS (testable in isolation)
- `src/types/ai.ts` — AIToolCall, AIAction, PendingAction, ProactiveAlert type definitions
- `src/ai/__tests__/` — 37 unit tests (extractToolCalls, systemKnowledge)
- `src/hooks/__tests__/` — 58 unit tests (useAITools, proactiveCooldown)
- `src/components/__tests__/` — 18 component tests (AIActionApprovalCard, FloatingAIChat history)
- `src/components/AITestHarness.tsx` — Dev-only test panel (4 tabs: Tools/Actions/Cooldown/Storage)
- `src/engine/` — Sync engine (pure functions, no React deps)
- `src/engine/core.ts` — `runStrategy()`, `shouldTriggerExit()`, `evaluateStrategy()`
- `src/engine/dividendCache.ts` — `setDividendCache()`, `getDividendPerShare()` (extracted from core.ts)
  - **Rebalancing rules**: algo mode only (custom mode excluded from rank-based exit). `lastRebalanceMonth` init from day0 month (no day-1 false trigger). Swap candidates = `config.topNCount` (not hardcoded). Self-swap & duplicate positions prevented.
- `src/data/` — Data files (historical market data, IDX warehouse fundamental_idx_all.json)
- `src/data/archive/` — Archived legacy data (FUNDAMENTAL_SNAPSHOTS, STOCK_FACTORS)
- `src/services/` — API client
- `src/server/` — Express API handlers
- `src/utils/` — Utility functions
- `src/types/` — TypeScript type definitions
- `src/constants/` — Constant data (IDX lists)
- `src/mcp/` — MCP server (Model Context Protocol) for AI agent integration
