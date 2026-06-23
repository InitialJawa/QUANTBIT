# ACTIVE TASK
## Current Sprint
Sprint: UI Overhaul & Cleanup

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
**Status:** PENDING
**Files:** src/data/raw_stocks_data.ts, src/stocksData.ts

### Task 17: Fix Sector Mismatches RAW vs PF (P0)
**Status:** PENDING
**Files:** src/data/raw_stocks_data.ts, src/marketData.ts

### Task 18: Update Stale MKT Object Values (P1)
**Status:** PENDING
**Files:** src/marketData.ts

### Task 19: Run IDX Scraper for 2026 Fundamentals (P2)
**Status:** PENDING
**Files:** data/idx_fundamentals_all.json, scripts/scrape_idx_fundamentals.py
