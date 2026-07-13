# AI Onboarding — QUANTBIT

## Quick Start
```bash
npm run dev    # Express API (:3001) + Vite (:5173)
```

## Code Navigation
```bash
graphify query "apa fungsi backtest engine?"
graphify explain "StockData"
graphify path "core.ts" "FloatingAIChat.tsx"
```

## Key Files
- **AI Chat**: `src/components/FloatingAIChat.tsx` + `src/ai/aiClient.ts`
- **System Prompt**: `src/ai/systemKnowledge.ts`
- **Engine**: `src/engine/core.ts` (strategy), `src/engine/ranker.ts` (scoring)
- **Config**: `src/contexts/EngineConfigContext.tsx`
- **Portfolio**: `src/hooks/usePortfolioManager.ts`
- **API**: `functions/api/[[path]].ts`

## Rules
- Semua kalkulasi deterministic — NO AI untuk financial math
- AI hanya untuk presentation (summary, chat, explanations)
- Data dari D1 via CF Functions (dev mode via Express + SQLite)
- Source of truth: `docs/TASK.md`
