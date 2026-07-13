# AGENTS.md — QUANTBIT

## Code Structure

Gunakan **graphify** untuk navigasi codebase:
```bash
graphify query "apa fungsi backtest engine?"
graphify explain "StockData"
graphify path "core.ts" "FloatingAIChat.tsx"
```

Graph output: `graphify-out/graph.json` + `graphify-out/graph.html`

## Rules

- **No AI for financial math** — semua kalkulasi deterministic di `src/engine/`
- **DB = single source of truth** — semua data dari D1 via CF Functions
- **Full Serverless** — CF Pages Functions + D1 + GH Actions. No Express di production.
- **AI = presentation only** — `src/ai/` hanya untuk interface, bukan kalkulasi
- **AI actions require approval** — semua `AIAction` wajib user klik [Approve]
- **Ask before adding dependencies**
- **Update docs setiap sesi**

## Dev Mode

```bash
npm run dev    # Express (API :3001) + Vite (UI :5173)
```

## Key Files

| File | Fungsi |
|------|--------|
| `src/engine/core.ts` | Strategy runner (runStrategy) |
| `src/engine/ranker.ts` | Scoring & ranking |
| `src/engine/buyPressure.ts` | BPS algorithm |
| `src/engine/crashDetector.ts` | Crash detection |
| `src/marketRegimeEngine.ts` | Market regime |
| `src/marketData.ts` | Runtime data store |
| `src/components/FloatingAIChat.tsx` | AI chat UI |
| `src/ai/aiClient.ts` | AI client |
| `src/contexts/EngineConfigContext.tsx` | Strategy config |
| `src/hooks/usePortfolioManager.ts` | Portfolio state |
| `functions/api/[[path]].ts` | CF Functions (API) |
| `scripts/pipeline-sync.ts` | Data pipeline |

## Session Start

```
Read docs/TASK.md and continue the project.
```

## Archived Files

Historical docs dipindah ke `archive/`:
- `archive/handover/` — session handover records
- `archive/research/` — v1 audit (20 docs)
- `archive/v2-blueprint/` — v2 planning (33 docs)
- `archive/roadmap/` — roadmap phases (8 docs)
