# NEXT ACTION

## Priority Queue
### P0 — MCP Server Setup ✅
- [x] **Init project** — @modelcontextprotocol/sdk installed, src/mcp/ created
- [x] **Build tools** — 5 tools: get_market_overview, get_stock_info, search_stocks, get_top_movers, get_historical_data
- [x] **Resources** — quantbit://stocks/{ticker}, quantbit://market/overview, quantbit://stocks
- [x] **Test** — all tools verified returning real data via stdio transport
- **Run:** `npm run serve-mcp`

### P1 — Vite Chunk Size ✅
- [x] Lazy-load MarketTab — 34.88 kB terpisah (dari ~984 kB total)
- [x] Add rollup-plugin-visualizer — `npx vite build` juga generate `dist/stats.html`
- [x] Lower chunkSizeWarningLimit 1000→500 KB

### P1 — Fundamentals 69/87 Ticker ✅
- [x] Load IDX scraper di fetch_historical_data.ts sebagai Priority 1.5
- [x] Import idx_fundamentals.json di SimulationTab.tsx (Priority 2)
- [x] Generate src/data/idx_fundamentals.json otomatis saat build:db

### P1 — Gold/USDIDR Historical ✅
- [x] Helper `buildMonthlySeries()` — linear interpolation yearly→monthly
- [x] Ganti lookup `HISTORICAL_X[year]` → `HISTORICAL_X[monthKey]`

### P2 — Yahoo Data Pre-2022
- [x] SKIPPED — No free API with pre-2022 daily data (Invezgo max 2yr, Sectors.app only 90 days)

### P3 — Backtest Integrity
- Jakarta holiday calendar-aware gap detection (current: all weekdays bridged)

## Completed This Session (2026-06-24)
- **Vite Chunk Size** — MarketTab lazy-loaded, visualizer, warning limit 500
- **Fundamentals 69/87** — IDX scraper data now Priority 1.5 covering 987 tickers × 27 years
- **Gold/USDIDR Historical** — yearly → monthly granular via linear interpolation
- **TypeScript clean** — `npx tsc --noEmit` zero errors
- **Yahoo Pre-2022** — SKIPPED (no viable free API for backfill)

## Setelah Selesai
1. Update CURRENT_STATE.md
2. Update ACTIVE_TASK.md
3. Update NEXT_ACTION.md
4. Update MASTER_CHRONICLE.md
5. Buat handover baru
