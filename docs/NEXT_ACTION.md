# NEXT ACTION

1. Implementasi Telegram bot
2. Setup MCP server

## Priority Queue
### P1 — Telegram Bot
### P2 — MCP Server

## Completed This Session (2026-06-23)
- Sidebar market enhancements: expanded berita (no max-height), added Top Movers section (2-col gainers/losers with RSI coloring + histogram bars), added Technical Stats section (RSI, MACD histogram, SMA20, SMA50, breadth, score gap)
- Added computeRSI, computeMACD, getIhsgData exports to marketRegimeEngine.ts for sidebar widgets
- **Fixed backtest data bug** (3 fixes):
  - Added `/api/backtest-data` Express handler di `server.ts` — baca dari `data/years/*.json` langsung (real data, no PRNG)
  - Added Vite proxy `/api/backtest-data` dan `/api/yahoo` → `localhost:3001`
  - Fixed `generateClientBacktestData()` gold starting price: 300K→75K (realistis 2000), drift: 0.007→0.054
  - Updated `MKT.gold.value` stale: 1,350,000 → 2,466,698 (latest from data)
  - Added `npm run dev:full` — runs API server + Vite concurrently

## Setelah Selesai
1. Update CURRENT_STATE.md
2. Update ACTIVE_TASK.md
3. Update KNOWN_ISSUES.md
4. Buat handover baru
