# PROMPT 2: Google AI Studio — QUANTBIT 2.0 Fullstack Build

> **Cara pakai**: Buka aistudio.google.com → tab **Build** → paste prompt ini → Generate.
> AI Studio akan buat full React app + Firebase backend (Firestore, Auth, Cloud Functions).

---

## FULL BUILD PROMPT

```
Build a full-stack quantitative stock trading terminal called "QUANTBIT" using React + Firebase.

## TECH STACK
- Frontend: React 19 + Vite + TypeScript + Tailwind CSS 4
- UI Components: shadcn/ui
- Charting: lightweight-charts (candlestick) + recharts (dashboard)
- State: zustand + tanstack/react-query
- Backend: Firebase (Firestore, Auth, Hosting, Cloud Functions)
- AI: Gemini API (single provider, called from Cloud Functions only)
- Routing: wouter

## FIRESTORE DATA MODEL

### Collection: stocks/{ticker}
{
  ticker: "BBCA",
  name: "Bank Central Asia Tbk",
  sector: "Finance",
  subSector: "Banks",
  marketCap: 850000000000000,
  shares: 29332141680,
}

### Subcollection: stocks/{ticker}/prices/{YYYY-MM-DD}
{
  date: "2026-07-14",
  open: 47800,
  high: 48500,
  low: 47600,
  close: 48200,
  volume: 25000000,
  change: 1.25,
  adjClose: 48200,
}

### Collection: computed/{ticker}
{
  ticker: "BBCA",
  updatedAt: Timestamp,
  rank: 3,
  signal: "STRONG_BUY",
  score: 82,
  breakdown: {
    quality: 90,
    growth: 75,
    value: 80,
    momentum: 85,
    dividend: 70,
  },
  fundamental: {
    pe: 12.3,
    pb: 1.8,
    roe: 14.5,
    de: 0.9,
    divYield: 3.21,
    revenue: 125000000000,
    netIncome: 52000000000,
    totalAssets: 2100000000000,
    liabilities: 1800000000000,
    equity: 300000000000,
  },
  technical: {
    rsi14: 58,
    sma20: 47500,
    sma50: 46800,
    sma200: 44200,
    atr14: 850,
    fiftyTwoWeekHigh: 52000,
    fiftyTwoWeekLow: 38000,
  },
  peers: [
    { ticker: "BBRI", score: 78 },
    { ticker: "BMRI", score: 75 },
    { ticker: "BBNI", score: 71 },
  ],
}

### Collection: users/{uid}
{
  uid: "firebase-auth-uid",
  displayName: "User",
  email: "user@example.com",
  createdAt: Timestamp,
  settings: {
    profile: "balanced",
    theme: "dark",
    currency: "IDR",
  },
  capital: 100000000,
  kas: 15000000,
  emas: 10000000,
}

### Subcollection: users/{uid}/portfolio/{ticker}
{
  ticker: "BBCA",
  volume: 500,
  avgPrice: 45000,
  dividendPerYear: 3200,
  lastDividendDate: "2026-03-15",
}

### Subcollection: users/{uid}/tradeLog/{auto-id}
{
  ticker: "BBCA",
  type: "BUY",
  volume: 500,
  price: 45000,
  total: 22500000,
  timestamp: Timestamp,
  reason: "Top 10 rank — BUY",
  strategy: "algo",
}

### Subcollection: users/{uid}/watchlist/{ticker}
{
  ticker: "TLKM",
  addedAt: Timestamp,
}

### Collection: sectorScores/{sectorId}
{
  id: "Finance",
  avgScore: 72,
  avgPe: 11.5,
  avgRoe: 13.2,
  avgDivYield: 4.1,
  topTickers: ["BBCA", "BBRI", "BMRI"],
  updatedAt: Timestamp,
}

### Collection: signals/{YYYY-MM-DD}
{
  date: "2026-07-14",
  signals: {
    "BBCA": { signal: "STRONG_BUY", score: 82, reason: "High quality, strong momentum" },
    "TLKM": { signal: "SELL", score: 35, reason: "Low rank, declining momentum" },
  },
}

### Collection: backtests/{uid}/{backtestId}
{
  createdAt: Timestamp,
  config: {
    mode: "algo",
    universe: "IDX80",
    topN: 10,
    profile: "balanced",
    startDate: "2021-01-01",
    endDate: "2026-07-01",
    capital: 100000000,
    crashProtection: true,
    crossoverMode: "monthly",
    reserveBuffer: 10,
  },
  results: {
    totalReturn: 145,
    cagr: 16.2,
    sharpeRatio: 1.34,
    maxDrawdown: -18.5,
    winRate: 62,
  },
  equityCurve: [ { date: "2021-01-01", value: 100000000 }, ... ],
  tradeLog: [ { date: "2021-03-15", type: "BUY", ticker: "BBCA", ... }, ... ],
}

## FIREBASE AUTH
- Sign in with Google (one-tap)
- Sign in with Email/Password
- Auth state persisted, used for portfolio/trade-log/watchlist scoping

## CLOUD FUNCTIONS

### 1. compute-daily (HTTPS, triggered by Cloud Scheduler daily at 18:00 WIB)
- Fetches latest prices from Yahoo Finance API
- Updates stocks/{ticker}/prices/{date} for all tracked stocks
- Recalculates computed/{ticker} (ranks, signals, fundamentals)
- Updates sectorScores
- Updates signals/{date}

### 2. run-backtest (HTTPS callable)
Input: { config: BacktestConfig }
- Runs deterministic engine
- Returns { results: BacktestResults, equityCurve: Point[], tradeLog: Trade[] }
- Stores result in backtests/{uid}/{auto-id}

### 3. ai-chat (HTTPS callable)
Input: { message: string, ticker?: string, context: string }
- Calls Gemini API
- System prompt: "You are QUANTBIT AI. Answer about Indonesian stocks (IDX). Be concise, data-driven. Never give financial advice — always add disclaimers."
- Returns { reply: string }
- Rate limit: 30 messages/minute per user

### 4. execute-action (HTTPS callable — TRANSACTIONAL)
Input: { type: "BUY" | "SELL", ticker: string, volume: number, price: number }
- Uses Firestore batched writes (atomic):
  a. Update users/{uid}/portfolio/{ticker} — adjust volume/avgPrice
  b. Update users/{uid} kas — subtract/add amount
  c. Create users/{uid}/tradeLog/{auto-id}
- Validate: enough shares to sell, enough kas to buy
- Returns { success: boolean, portfolio: PortfolioSnapshot }

### 5. trigger-compute (HTTPS callable — admin only)
- Manually triggers compute-daily for testing

## APP PAGES

### Route: / (Market Overview — Dashboard)
- IHSG index card
- Sector heatmap
- Top Gainers/Losers table
- Watchlist panel
- Floating AI Chat button (bottom-right)

### Route: /portfolio
- Net Wealth hero card (sum of portfolio + kas + emas)
- Summary cards: Cost, Market Value, P&L, Dividend
- Holdings table: Ticker, Rank, Shares, Entry vs Live, Net Value & P&L, Dividends, Actions (Sell/Delete)
- Ledger Cerdas recommendations panel
- Editable capital, kas, emas fields

### Route: /ticker/:code
- Full-page stock view (no sidebar)
- Header: Ticker + Name + Price + Change + Watchlist star + Trade button
- Tabs: Overview | Chart | Fundamentals | Peers | Signals
- Overview: Metrics row (P/E, P/B, ROE, DivYield, D/E) + 52W range + candlestick chart + company profile + sector peers
- Chart: Full candlestick with SMA overlays
- Fundamentals: Financial statement table
- Peers: Comparison table
- Signals: Signal badge + breakdown + history

### Route: /backtest
- Left panel: Strategy settings (mode, universe, topN, profile, weights, date range, capital)
- Right panel: Results (metrics bar, equity curve chart, trade log, drawdown chart)
- Run Backtest button

### Route: /screener
- Left panel: Filter sliders/dropdowns + quick filter presets
- Right panel: Results table with sortable columns + pagination

### Route: /settings
- User profile (display name, email)
- Capital/Kas/Emas editing
- Strategy defaults
- Sign out button

## CRITICAL RULES
1. ALL financial calculations are DETERMINISTIC — no AI, no randomness
2. AI is ONLY used in the ai-chat function for the floating chat panel
3. Every trade execution must be ATOMIC (Firestore batched writes)
4. All data flows FROM Firestore — no local hardcoded data
5. React Query for all Firestore reads
6. Zustand for UI state only
7. All numbers in Indonesian Rupiah format
8. Date format: YYYY-MM-DD internally, displayed human-readable

## FOLDER STRUCTURE
src/
  components/
    layout/        (Sidebar, TopBar, FloatingAIChat)
    dashboard/     (MarketSummaryBar, SectorHeatmap, TopMovers, WatchlistPanel)
    portfolio/     (NetWealthCard, HoldingsTable, LedgerCerdas, SummaryCards)
    ticker/        (TickerHeader, TickerTabs, OverviewTab, ChartTab, FundamentalsTab, PeersTab, SignalsTab)
    backtest/      (SettingsPanel, MetricsBar, EquityCurve, TradeLog, DrawdownChart)
    screener/      (FilterPanel, ResultsTable, QuickFilters)
    ui/            (shadcn components)
  hooks/           (useFirestoreQuery, usePortfolio, useWatchlist, useExecuteTrade)
  lib/             (firebase.ts, firestore-queries.ts, gemini-client.ts, format.ts)
  pages/           (Dashboard, Portfolio, TickerDetail, Backtest, Screener, Settings)
  stores/          (useUIStore.ts)
  types/           (stock.ts, portfolio.ts, backtest.ts, signals.ts)
functions/         (Cloud Functions — TypeScript)
public/

Build this app step by step:
1. Initialize project with Vite + React + TypeScript + Tailwind
2. Set up Firebase config + Auth
3. Create Firestore data model and queries
4. Build layout (Sidebar + TopBar)
5. Build Dashboard page
6. Build Ticker Detail page
7. Build Portfolio page
8. Build Screener page
9. Build Backtest page
10. Deploy to Firebase Hosting

For each step, generate working code. Use TypeScript throughout.
```
