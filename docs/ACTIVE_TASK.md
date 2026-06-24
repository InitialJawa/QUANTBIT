# ACTIVE TASK
## Current Sprint
Sprint: Platform Stabilization & MCP

### Task 1: Initialize DOX + Context Persistence
**Status:** DONE
**Files:** AGENTS.md, docs/*, handover/*, child AGENTS.md files

### Task 2: Login Flow Integration
**Status:** DONE
**Files:** src/components/LoginScreen.tsx, src/contexts/AuthContext.tsx, src/services/api.ts, functions/api/[[path]].ts

### Task 3: UI Overhaul — True Black + Cyan + Floating AI Chat
**Status:** DONE
**Files:** src/index.css, src/components/FloatingAIChat.tsx, src/App.tsx, AppHeader, BottomNav, NavDrawer, LoginScreen, AppSidebar, DigitalWalletUI, SimulationTab

### Task 4: Remove Duplicate AI from MarketTab
**Status:** DONE
**Files:** src/components/MarketTab.tsx — removed AIAssistant import + AI Co-Pilot section

### Task 5: DeepReport Design Refresh
**Status:** DONE
**Files:** src/components/DeepReport.tsx — uniform bg, cyan accent, simplified SWOT

### Task 6: Sidebar Width + Font Sizing
**Status:** DONE
**Files:** src/components/AppSidebar.tsx — md:w-56→w-72, font bumps

### Task 7: Wallet Icons + Font + Bug Fix
**Status:** DONE
**Files:** src/components/DigitalWalletUI.tsx — Coins/CreditCard icons, text-display, rgba fix

### Task 8: Remove DataSourcesRow Badges
**Status:** DONE
**Files:** src/components/StockDrawer.tsx, src/components/MarketTab.tsx

### Task 9: Fix AICockpitProvider Error
**Status:** DONE
**Files:** src/App.tsx — moved StockDrawer inside AICockpitProvider

### Task 10: Floating Wallet (pisah dari sidebar)
**Status:** DONE
**Files:** src/components/FloatingWallet.tsx (new), src/App.tsx, src/hooks/useUIState.ts, src/components/AppSidebar.tsx

### Task 11: Market Tab — Charts sub-tab
**Status:** DONE
**Files:** src/components/MarketOverviewCharts.tsx (new), src/components/MarketTab.tsx (add Charts, remove All Stocks)

### Task 12: Sidebar Market Enhancements
**Status:** DONE
**Files:** src/components/AppSidebar.tsx — expanded berita, added Top Movers (2-col gainers/losers with RSI/histogram), added Teknikal section (RSI/MACD/SMA/breadth/score gap)

### Task 13: Market Regime Engine — Export Helpers
**Status:** DONE
**Files:** src/marketRegimeEngine.ts — added getIhsgData, computeRSI, computeMACD exports

### Task 14: Telegram Bot
**Status:** DEFERRED
**Files:** TBD

### Task 15: MCP Server Setup
**Status:** DONE (2026-06-24)
**Files:** src/mcp/index.ts (new), package.json
**Detail:** Built custom QuantBit MCP server using @modelcontextprotocol/sdk. Exposes 5 tools (get_market_overview, get_stock_info, search_stocks, get_top_movers, get_historical_data) + 3 resources (quantbit://market/overview, quantbit://stocks, quantbit://stocks/{ticker}). Run via `npm run serve-mcp`. Tested — all tools respond with real data from live_market.json, raw_stocks_data.ts, idx80_scan.json, and years/*.json.

### Task 16: Fix RAW_STOCKS_DATA Stale Prices (P0)
**Status:** DONE (2026-06-23)
**Files:** src/data/raw_stocks_data.ts — synced 30/31 prices from idx80_scan.json

### Task 17: Fix Sector Mismatches RAW vs PF (P0)
**Status:** DONE (2026-06-23)
**Files:** src/data/raw_stocks_data.ts — RAW sectors sync to scan (Yahoo GICS). PF tetap IDX classification.

### Task 18: Update Stale MKT Object Values (P1)
**Status:** DONE (2026-06-23)
**Files:** src/marketData.ts — IHSG 5886→6008, USDIDR 17985→17714

### Task 19: Run IDX Scraper for 2026 Fundamentals (P2)
**Status:** DONE (2026-06-23)
**Files:** data/idx_fundamentals_all.json, scripts/scrape_idx_fundamentals.py
**Notes:** Timeout diperbaiki (connect 10s, read 30s). 2026 tetap 0 records — data fundamental 2026 belum rilis IDX.

### Task 20: Full Data Pipeline Validation (P1)
**Status:** DONE (2026-06-23)
**Files:** docs/CURRENT_STATE.md, docs/ACTIVE_TASK.md, docs/NEXT_ACTION.md, docs/KNOWN_ISSUES.md
**Findings:**
- `idx80_scan.json` — VALID, fresh 2026-06-23, 87 stocks from Yahoo
- Backtest year files (2000-2026) — VALID, 27 years complete
- Stock prices konsisten antara backtest dan scan
- Carry-forward ratio rendah (6% di 2026)
- See `docs/AUDIT_DATA_SINTETIS.md` + `docs/DATA_AUDIT_NOTES.md` for full report

### Task 21: Verify IHSG Jan 2026 Spike (P2)
**Status:** DONE (2026-06-23)
**Detail:** IHSG 8748 confirmed real dari raw Yahoo `^JKSE` (peak 9134, crash 8232). Bukan error data.

### Task 22: Refresh live_market.json from idx80_scan (P1)
**Status:** DONE (2026-06-23)
**Files:** data/live_market.json
**Notes:** Already updated via post_process_live_market.py. last_update: 2026-06-23, IHSG 6101.

### Task 23: Gold Unit Mismatch Fix (P3)
**Status:** DONE (2026-06-23)
**Detail:** `post_process_live_market.py` fetch GC=F langsung + konversi USD/oz→IDR/gram. MKT gold sync. Semua layer konsisten IDR/gram.

### Task 24: Label Carry-Forward Data (P4)
**Status:** DONE (2026-06-23)
**Detail:** `DataStatus.CARRIED_FORWARD` added. Backend set `isCarriedForward: true` di response. Data di `setIhsgHistory`/`getIhsgData` pass through flag.

### Task 25: Fix Random Scores in force-sync (P2)
**Status:** DONE (2026-06-23)
**Files:** functions/api/[[path]].ts
**Detail:** `Math.random() * 40 + 60` diganti dengan compute deterministik (momentum, quality, value, growth dari chart data Yahoo). Range chart diperpanjang 1mo→6mo untuk kalkulasi lebih akurat.

### Task 26: Top Movers Enhancement — Sparkline + Volume
**Status:** DONE (2026-06-23)
**Files:** src/components/AppSidebar.tsx
**Detail:** Added `MiniSparkline` SVG component (20-day price trend), volume indicator (K/M/B format) per stock in sidebar Top Movers section.

### Task 27: DeepReport Enhancement — Price Chart + Peer Comparison
**Status:** DONE (2026-06-23)
**Files:** src/components/DeepReport.tsx
**Detail:** Added 90-day price history chart (SVG gradient), peer comparison table (sector-based, 5 peers), SWOT dot indicators. Cleaned 7 unused imports.

### Task 28: Bundle Optimization — Lazy Loading
**Status:** DONE (2026-06-23)
**Files:** src/App.tsx
**Detail:** Lazy-loaded SimulationTab, AnalyticsTab, PortfolioTracker via `React.lazy()` + `Suspense`. Main bundle 732→612 kB (-16.5%).

### Task 29: Fundamentals Expansion — 18 Tickers
**Status:** DONE (2026-06-23)
**Files:** src/components/SimulationTab.tsx
**Detail:** Added 9 new hardcoded snapshots (BBNI, INDF, INTP, ICBP, KLBF, UNTR, AKRA, PGAS, SMGR) with 8 years data (2018-2025). Total 18 tickers.

### Task 30: Vite Chunk Size — Bundle Optimization
**Status:** DONE (2026-06-24)
**Files:** vite.config.ts, src/App.tsx
**Detail:** MarketTab sekarang lazy-loaded (34.88 kB terpisah). rollup-plugin-visualizer installed. chunkSizeWarningLimit turun 1000→500. Main bundle 576 kB (sebelumnya ~984 kB total).

### Task 31: Fundamentals — Upgrade 69/87 Ticker dari Hash Fallback
**Status:** DONE (2026-06-24)
**Files:** src/components/SimulationTab.tsx, scripts/fetch_historical_data.ts, src/data/idx_fundamentals.json (new)
**Detail:** IDX scraper data (idx_fundamentals_all.json, 987 tickers × 27 years) terintegrasi sebagai Priority 1.5 di pipeline:
- fetch_historical_data.ts: `loadIDXFundamentals()` load data + Priority 1.5 di `getPointInTimeFundamentals`
- SimulationTab.tsx: import `idx_fundamentals.json` + Priority 2 di pipeline lokal
- Pipeline sekarang: Yahoo (Priority 1) → IDX scraper (Priority 1.5) → Hardcoded snapshots (Priority 2) → Hash fallback (Priority 3)

### Task 32: Gold/USDIDR Historical — Yearly → Monthly/Daily Averages
**Status:** DONE (2026-06-24)
**Files:** scripts/fetch_historical_data.ts
**Detail:** HISTORICAL_GOLD_USD dan HISTORICAL_USDIDR diubah dari `Record<number,number>` (yearly) jadi `Record<string,number>` (monthly, key "YYYY-MM"). Helper `buildMonthlySeries()` melakukan linear interpolation antara yearly values. Lookup di main loop pakai `monthKey` dari date.

### Task 33: Yahoo Data Pre-2022 — GoAPI Integration
**Status:** SKIPPED (2026-06-24)
**Files:** N/A
**Detail:** Tidak ada API free yang bisa backfill daily prices pre-2022 (Invezgo max 2 tahun, Sectors.app cuma 90 hari). Skipped — proceed with current data coverage.

### Task 34: IDX Fundamental API Discovery
**Status:** DONE (2026-06-24)
**Files:** docs/REPORT-IDX-API-001.md, docs/ADR-006.md, docs/audit_idx_api_60months.json
**Detail:**
- Endpoint `/primary/DigitalStatistic/GetApiDataPaginated` ditemukan via reverse engineering Nuxt.js bundles
- 60-month audit (2021-01 to 2025-12) PASS: 60/60 months, schema 100% consistent, 0 errors
- 947 companies, 32 fields termasuk assets, equity, sales, profit, eps, per, pbv, roe, roa
- Status: **PRODUCTION READY**
- IDX API menjadi primary source fundamental — gantikan Yahoo/FMP/Sectors/Hash Fallback
- RTI/Stockbit ditahan untuk backfill 2015-2020

### Task 35: Build IDX Fundamental Collector
**Status:** DONE (2026-06-24)
**Files:** collectors/fetch_idx_fundamental.py, collectors/AGENTS.md, collectors/requirements.txt, data/fundamental_idx.parquet, data/fundamental_idx_all.json
**Detail:**
- Created `collectors/fetch_idx_fundamental.py` — pulls all 60 months (2021-01 to 2025-12) from IDX API
- Idempotent (skips existing months), retry 3x, argparse CLI, structured logging
- Output: parquet (2.2 MB) + JSON (42 MB) + pull meta
- **60 months, 51,662 records, 0 errors, 100% schema consistent**
- **976 unique companies** across 11 sectors
- Ratio mismatch confirmed on all samples — API ROE/ROA/NPM tidak reliable
- Cross-check: BBCA/BBRI/BMRI/TLKM full 60 months, ASII 59/60 (missing 2021-02)

### Task 36: Factor Engine Migration — IDX Warehouse Priority 1
**Status:** DONE (2026-06-24)
**Files:** scripts/fetch_historical_data.ts, src/components/SimulationTab.tsx
**Detail:**
- `scripts/fetch_historical_data.ts`: Removed Yahoo fundamentals fetching entirely. IDX Warehouse (976 companies, 60 months) = Priority 1. Hardcoded snapshots = Priority 2. Fallback = Priority 3.
- `src/components/SimulationTab.tsx`: Same priority chain. Imports `fundamental_idx_all.json` directly (replaces old `idx_fundamentals.json`).
- Pipeline successfully regenerated: 6,582 trading days, 95 active tickers, all scored with IDX warehouse fundamentals.
- Yahoo fundamentals API calls removed — no more dependency on Yahoo for fundamental data.
- Old `idx_fundamentals.json` deleted from `src/data/`.

### Task 37 (Next): Backtest Config B & F Validation
**Status:** PENDING
**Files:** TBD
**Detail:** Jalankan backtest Config B dan Config F menggunakan warehouse baru. Bandingkan hasil dengan baseline lama. Verifikasi distribusi rank masuk akal.
