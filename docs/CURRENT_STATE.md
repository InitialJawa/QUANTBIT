# CURRENT STATE
| Field | Value |
|-------|-------|
| Tanggal | 2026-06-24 |
| Status | Development |
| Progress | ~92% |

## Completed
- [x] **Data Validation Audit** — full pipeline traced: daily live feed, idx80_scan, backtest year files, carry-forward analysis
- [x] **P0: Fix RAW_STOCKS_DATA stale prices** — synced 30/31 stock prices from `idx80_scan.json` (HEAL not in scan)
- [x] **P0: Fix sector mismatches RAW vs PF** — RAW_STOCKS_DATA sectors sync to scan (Yahoo GICS); PF tetap IDX classification
- [x] **P1: Update MKT values** — IHSG 5886→6008, USDIDR 17985→17714
- [x] **P2: Run IDX scraper for 2026** — timeout diperbaiki (connect 10s, read 30s), tetap 0 records (data fundamental 2026 belum rilis IDX)
- [x] **P2: Sync MKT hardcoded** — IHSG 6008→6101, USDIDR 17714→17840, gold sync dari live_market.json
- [x] **P2: Fix random scores in force-sync** — `Math.random()` diganti deterministik dari chart data (momentum, quality, value, growth real)
- [x] **P2: Verify IHSG Jan 2026 spike** — 8748 confirmed real dari raw Yahoo `^JKSE` (peak 9134, crash 8232)
- [x] **P3: Gold unit mismatch** — `post_process_live_market.py` fetch GC=F langsung + konversi USD/oz→IDR/gram, MKT gold sync
- [x] **P4: Label carry-forward data** — `DataStatus.CARRIED_FORWARD` added, `isCarriedForward` di API response & frontend
- [x] **P3: Refresh `live_market.json`** — updated via `post_process_live_market.py` dari scan data
- [x] **P3: Add devMock for Yahoo prices** — local dev sekarang bisa update MKT via mock
- [x] React 19 + Vite 6 + Tailwind 4 scaffold
- [x] Multi-factor quantitative engine (Quality, Growth, Value, Momentum)
- [x] Market regime engine (RISK_ON, RISK_OFF, RECOVERY_WATCH, GOLD_DEFENSE, CASH_DEFENSE)
- [x] Yahoo Finance data fetching + Express proxy API (`server.ts`)
- [x] Backtesting engine with IDX lot/slippage/tax rules
- [x] Portfolio tracker with floating P&L
- [x] Asset rotation protocol (Cash/Gold defense)
- [x] Gemini AI integration for executive summaries
- [x] AI chat assistant / cockpit UI
- [x] Dashboard with data status transparency (LIVE/CACHED/STALE/ESTIMATED)
- [x] Cloudflare Pages + D1 deployment pipeline
- [x] Auth system (PBKDF2) + Cloudflare Functions API — login/signup/session
- [x] Login flow — LoginScreen UI + AuthContext + routing + dev mock fallback
- [x] CSS cleanup — removed legacy selectors, glass-morphism via Tailwind
- [x] AI Context Persistence + DOX tree — full initialization
- [x] **UI Overhaul** — true black theme, cyan accent (#06b6d4), floating AI chat widget, TradingView professional vibe
- [x] **Market cleanup** — removed duplicate AI Co-Pilot from MarketTab (redundant with FloatingAIChat), only Analisa AI Harian retained
- [x] **DeepReport design refresh** — uniform backgrounds, simplified SWOT, cyan accent, fixed text-emerald-450 typo
- [x] **Sidebar widened** — md:w-56→w-72, font sizes bumped (text-caption→text-body for data values)
- [x] **Wallet refresh** — added Coins (emas) + CreditCard (kas) icons, text-display for balance, fixed rgba bug
- [x] **Removed DataSourcesRow badges** — deleted price/fundamentals/charts/description badges from StockDrawer and MarketTab
- [x] **Fixed AICockpit Provider Error** — moved `<StockDrawer />` inside `<AICockpitProvider>` to fix ExplainButton crash
- [x] **Floating Wallet** — extracted DigitalWalletUI from sidebar into floating toggle button (above AI Chat) with slide-in panel from right
- [x] **Market Tab Charts** — new "Charts" sub-tab with IHSM+Gold indexed chart + SMA20/SMA50 overlay + regime indicator panel; removed "All Stocks" sub-tab
- [x] **Sidebar Market Enhancements** — expanded berita (no max-height, all items), added Top Movers section (2-col gainers/losers with RSI coloring + histogram bars), added Technical Stats section (RSI, MACD histogram, SMA20, SMA50, market breadth, score gap)
- [x] **Market Regime Engine exports** — added `getIhsgData()`, `computeRSI()`, `computeMACD()` helpers for sidebar widgets
- [x] **CI/CD Pipeline auto-aktif** — fix workflow: hapus bootstrap scripts (fetch_historical_data, scrape fundamentals) dari daily run, ganti strategi deploy via git push + CF Pages auto-build, setup conditional manual trigger
- [x] **Top Movers Enhancement** — added sparkline (20-day mini chart) + volume indicator per stock in sidebar
- [x] **DeepReport Enhancement** — added SWOT dot indicators, 90-day price history chart (SVG gradient), peer comparison table (sector-based, 5 peers)
- [x] **Bundle Optimization** — lazy loading for SimulationTab, AnalyticsTab, PortfolioTracker; main bundle 732→612 kB (-16.5%)
- [x] **Bundle Optimization (v2)** — MarketTab also lazy-loaded (34.88 kB); main bundle 576 kB; rollup-plugin-visualizer; chunkSizeWarningLimit 500 kB
- [x] **Fundamentals Expansion** — 9 new hardcoded snapshots (BBNI, INDF, INTP, ICBP, KLBF, UNTR, AKRA, PGAS, SMGR); total 18 tickers with real historical data (2018-2025)
- [x] **MCP Server Setup** — 5 tools + 3 resources via @modelcontextprotocol/sdk; data dari live_market, raw_stocks, idx80_scan, backtest years
- [x] **Vite Chunk Size** — lazy-load MarketTab, rollup-plugin-visualizer installed, chunkSizeWarningLimit 1000→500; main bundle 576 kB
- [x] **Gold/USDIDR Historical** — yearly → monthly granular via linear interpolation
- [x] **IDX Fundamental API Discovery & Audit** — endpoint verified, 60-month 100% pass
- [x] **IDX Fundamental Collector Built** — 51,662 records, 976 companies, 0 errors
- [x] **Factor Engine Migration** — IDX Warehouse = primary source, Yahoo/FMP/Sectors dropped
- [x] **Pre-2021 data cleanup** — 21 tahun file deleted, backtest default 2021+
- [x] **Dev script fixed** — Express server auto-starts with Vite (was PRNG fallback)
- [x] **Dead code cleanup** — `rebalancedThisMonth` removed from SimulationTab

## Completed
- [x] **P0: Weight Profile System** — `EngineConfigContext.tsx`: profiles[], WeightProfile, addProfile/deleteProfile/updateProfile/setActiveProfile, backward compat `activeConfig` getter
- [x] **P0: Profile Selector UI** — `AppSidebar.tsx`: profile buttons replacing Config F/B toggle; `ManageProfilesModal.tsx`: weight sliders, add/delete, activate
- [x] **P0: Config Sync Bridge** — bidirectional sync between `useUIState.activeConfig` and `EngineConfigContext.activeProfileId`
- [x] **P1: Runtime Re-ranking** — SimulationTab computes ranks from `stockNormScores` + active profile weights (falls back to pre-computed ranks)
- [x] **P1: Data Pipeline Raw Metrics** — `fetch_historical_data.ts` saves `stockRawMetrics` + `stockNormScores` per day to JSON/SQLite; `server.ts` + CF fn pass through
- [x] **P1: getProcessedLeaders update** — accepts WeightProfile object alongside legacy "prod"/"res"; used by LeadersTab, PortfolioTracker, marketRegimeEngine
- [x] **P2: AI profile awareness** — systemKnowledge.ts + aiClient.ts send activeProfileId, activeProfileName, profile weights
- [x] **P2: marketRegimeEngine** — supports custom weight objects via setActiveConfig

## Current Focus
Strategy Sync Engine operational — EngineConfigContext single source of truth, profiles with customizable weights, runtime re-ranking in backtest engine. Core engine (`src/engine/`) provides pure functions for ranking, crash detection, allocation, and metrics. SimulationTab uses `runStrategy()` with custom tickers UI, crash sensitivity slider, and Strategy Profile card. All 7 phases complete: Context Consolidation, Core Engine, Backtest Refactor, Sync To Portfolio, Portfolio Refactor, Market/Notification Integration, and AI Integration.

## Active Architecture
```
EngineConfigContext (single source of truth)
  ├── profiles[] — F, B, Custom N (user-defined weight profiles)
  ├── activeProfileId — profile aktif saat ini (getter: activeProfile)
  ├── activeConfig — backward compat getter ("prod"/"res")
  ├── topNCount, universe, crash/crossover settings, etc.
  │
  ├── AppSidebar → profile selector + ManageProfilesModal (sliders, add/delete)
  ├── PortfolioTracker → recommendations using activeProfile weights
  ├── SimulationTab → runtime rank compute from stockNormScores + profile weights
  ├── LeadersTab / AnalyticsTab → display with activeProfile weights
  ├── marketRegimeEngine → breadth/exit scores from profile weights
  ├── AI Chat → context with activeProfileId + weights
  └── data pipeline → stockRawMetrics + stockNormScores served via API
```

## Known Gap
BacktestContext still duplicates some config (simStartDate, simEndDate, algoCapital) not yet in EngineConfigContext. Deferred to next session.

## Archive — Legacy Cleanup
- `STOCK_FACTORS` — removed (dead code)
- `generateFallbackFundamentals` — removed (hash-based, replaced by warehouse)
- `FUNDAMENTAL_SNAPSHOTS` — archived to `src/data/archive/fundamental_snapshots.json`
- Pre-2021 year data — deleted from `data/years/`
- `BacktestContext.tsx` default `simStartDate` — 2021-01-04
- CF function default `from` — 2021
