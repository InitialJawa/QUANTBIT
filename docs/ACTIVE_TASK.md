# ACTIVE TASK
## Current Sprint
Sprint: Data Validation & Integrity

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

### Task 15: MCP Server
**Status:** DEFERRED
**Files:** TBD

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
**Status:** PENDING
**Files:** data/idx_fundamentals_all.json, scripts/scrape_idx_fundamentals.py

### Task 20: Full Data Pipeline Validation (P1)
**Status:** IN PROGRESS
**Files:** docs/CURRENT_STATE.md, docs/ACTIVE_TASK.md, docs/NEXT_ACTION.md, docs/KNOWN_ISSUES.md

### Task 21: Verify IHSG Jan 2026 Spike (P1)
**Status:** PENDING
**Files:** data/years/2026.json, scripts/fetch_historical_data.ts

### Task 22: Refresh live_market.json from idx80_scan (P1)
**Status:** PENDING
**Files:** data/live_market.json

### Task 23: Add Data Freshness Guard (P3)
**Status:** PENDING
**Files:** src/hooks/useDataFeed.ts, src/marketData.ts

### Task 24: Label Carry-Forward with DataStatus (P3)
**Status:** PENDING
**Files:** src/stocksData.ts, src/types/DataStatus.ts

### Task 20: Data Validation Audit — Full Pipeline Trace
**Status:** DONE (2026-06-23)
**Findings:**
- `idx80_scan.json` — VALID, fresh 2026-06-23, 87 stocks from Yahoo
- Backtest year files (2000-2026) — VALID, 27 years complete
- Stock prices konsisten antara backtest dan scan
- Carry-forward ratio rendah (6% di 2026)
- See `docs/AUDIT_DATA_SINTETIS.md` + `docs/DATA_AUDIT_NOTES.md` for full report

### Task 21: Verify IHSG Jan 2026 Spike (P2)
**Status:** PENDING
**Detail:** IHSG 8748 di 2026-01-02, turun ke 5342 (Jun), recovery ke 6101. Perlu cek raw Yahoo `^JKSE` data.

### Task 22: Refresh live_market.json — Stale Cache (P3)
**Status:** PENDING
**Detail:** `live_market.json` last update 2026-06-11. IHSG 5886 stale vs backtest 6101.

### Task 23: Gold Unit Mismatch Fix (P3)
**Status:** PENDING
**Detail:** `live_market.json` gold: 4347 (USD/oz) tapi MKT gold value pakai IDR/gram. Perlu rekonsiliasi satuan.

### Task 24: Label Carry-Forward Data (P4)
**Status:** PENDING
**Detail:** Data hasil bridgeHistoricalDataToToday harus diberi status `CARRIED_FORWARD` bukan terlihat seperti live.
