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

## Verification
- `npm run lint` — TypeScript type checking
- `npm run dev` — manual UI verification

## Child DOX Index
- `src/components/` — React UI components
- `src/components/ManageProfilesModal.tsx` — Weight profile management UI (sliders, add/delete custom profiles)
- `src/contexts/` — React state contexts (Auth, Backtest, EngineConfig, AI)
- `src/hooks/` — Custom React hooks
- `src/ai/` — AI client and system knowledge
- `src/engine/` — Sync engine
- `src/data/` — Data files (historical market data, IDX warehouse fundamental_idx_all.json)
- `src/data/archive/` — Archived legacy data (FUNDAMENTAL_SNAPSHOTS, STOCK_FACTORS)
- `src/services/` — API client
- `src/server/` — Express API handlers
- `src/utils/` — Utility functions
- `src/types/` — TypeScript type definitions
- `src/constants/` — Constant data (IDX lists)
- `src/mcp/` — MCP server (Model Context Protocol) for AI agent integration
