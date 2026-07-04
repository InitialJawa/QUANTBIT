# AGENTS.md — src/

## Purpose
Main application source code — React UI, core engine, AI layer, contexts, hooks, and utilities.

## Ownership
- Root AGENTS.md governs project-wide rules
- This file governs all code under `src/`

## Local Contracts
- **Deterministic engine**: `src/engine/`, `src/marketRegimeEngine.ts`, `src/marketData.ts` — NO AI involvement in calculations
- **AI layer**: `src/ai/`, `src/components/FloatingAIChat.tsx` — presentation only. AI is interface; math stays in `engine/`.
- **AI agent actions**: All `AIAction` executions require user [Approve] click before dispatch.
- **Data status**: Every data point must use `DataStatus` enum (LIVE/CACHED/STALE/ESTIMATED)

## Work Guidance
- Edit component files for UI changes
- Edit `src/ai/systemKnowledge.ts` for AI system prompt updates
- Edit `src/engine/` for calculation logic changes
- New components go in `src/components/`
- **Phase 4-6 ✅**: Express D1-backed endpoints, MCP server updated, cron automation, fallbackData deleted, all data from D1.

## Verification
- `npx tsc --noEmit` — TypeScript type checking
- `NODE_OPTIONS='--experimental-sqlite' npx tsx server.ts` — Express D1 API server
- `npx vite build` — bundle build
- `npm run dev` — manual UI verification
- `NODE_OPTIONS='--experimental-sqlite' npx tsx scripts/pipeline-sync.ts` — pipeline test

## Child DOX Index
- `src/components/` — React UI components
- `src/contexts/` — React state contexts (Auth, EngineConfig, Notification, AI)
- `src/hooks/` — Custom React hooks
- `src/ai/` — AI client and system knowledge
- `src/engine/` — Sync engine (pure functions, no React deps)
- `src/marketRegimeEngine.ts` — Crash detection, regime classification
- `src/marketData.ts` — Runtime state (RS, MKT) + data facade (L/PF/FD dari dataService)
- `src/stocksData.ts` — Stock data registry
- `src/services/` — API client + dataService (bridge to D1)
- `src/data/` — raw_stocks_data.ts (synthetic stock data), fallbackData.ts **deleted**
- `src/types/` — TypeScript type definitions
- `src/constants/` — Constant data (IDX lists)
- `src/server/` — Express server utilities (db.ts, aiChatHandler.ts, yahooApi.ts, emailUtil.ts)
