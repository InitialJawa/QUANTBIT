# PROMPT 1: Google Stitch — QUANTBIT 2.0 Frontend UI Design

> **Cara pakai**: Copy prompt di bawah, buka stitch.withgoogle.com, pilih **Web App**, paste, lalu generate.
> Generate satu per satu screen. Setelah dapat hasil, refine dengan annotation/direct edit.

---

## SCREEN 1: Market Overview (Dashboard Home)

```
Design a quantitative stock trading terminal dashboard called "QUANTBIT".

Platform: Web app (desktop-first, responsive)
App type: Dark-mode trading terminal

Layout: Left sidebar (collapsible) + top bar + main content area

LAYOUT STRUCTURE:
- Top bar: Logo "QUANTBIT", global search bar (Cmd+K style), user avatar
- Left sidebar: Navigation icons with labels — Dashboard (active), Portfolio, Screener, Backtest, Settings. Collapsed state shows only icons.
- Main content: Scrollable area with dashboard widgets

MAIN CONTENT (top to bottom):
1. Market Summary Bar: Full-width horizontal strip with 3 data cards side by side:
   - IHSG index: value, change percentage, mini sparkline
   - Gold price: value in IDR, change percentage
   - USD/IDR: value, change percentage

2. Sector Heatmap: Large rectangular treemap visualization. Each sector is a rectangle sized by market cap. Colors indicate daily performance. Labels inside: sector name + change %. Sectors: Banking, Mining, Consumer, Tech, Energy, Healthcare, Property, Infrastructure, Automotive, Agriculture.

3. Two-column layout below heatmap:
   LEFT (60%) — Top Movers:
   - Tab switcher: "Gainers" | "Losers" | "Most Active"
   - Table with columns: Ticker, Price, Change%, Volume
   - 8 rows visible, compact row height

   RIGHT (40%) — Watchlist:
   - Header "Watchlist" with "+" add button
   - List of 5-6 stock items, each showing: ticker, company name (truncated), price, change%, mini sparkline
   - Hover highlight

4. Floating AI Chat button: Bottom-right corner, circular button with chat icon. When opened, shows a chat panel with message bubbles and input field.
```

---

## SCREEN 2: Portfolio View

```
Design a portfolio management screen for the QUANTBIT trading terminal.

Platform: Web app (desktop-first, responsive)
App type: Dark-mode trading terminal
Layout: Same sidebar + top bar as Dashboard screen

MAIN CONTENT (top to bottom):

1. Net Wealth Hero Card (full-width):
   - Left side: "Net Wealth (Saham + Kas + Emas)" label
   - Large number: "IDR 125,000,000" bold monospace
   - Below: "Modal: 119M • Kas: 15M • Emas: 10M" in muted text
   - Right side: P&L section with "+5.2%" and "+6.1M"

2. Three summary cards (equal width, horizontal row):
   - Card 1 "Modal/Nilai": Cost "119M" and Market "125M"
   - Card 2 "P&L": "+5.2%" and "+6.1M"
   - Card 3 "Dividen/thn": "+8.4M/yr" and "6.72% yield"

3. Holdings Table (full-width):
   - Column headers: Ticker | Model Rank | Volume (Lembar) | Entry vs Live (Rp) | Net Value & P&L | Dividen/thn | Actions
   - 5 sample rows with Indonesian stock data (BBCA, BBRI, BMRI, BBNI, TLKM)
   - Ticker column: company logo + ticker + company name (truncated)
   - Rank column: Badge showing rank number
   - Shares: "500 lbr" right-aligned
   - Entry vs Live: Two lines — "B: 45,000" and "L: 48,200"
   - Net Value: Number + P&L percentage badge
   - Dividend: Amount + yield percentage
   - Actions: Hover-reveal buttons — Sell input + Delete icon
   - Zebra striping: alternating rows
   - Sticky header, scrollable body

4. Ledger Cerdas (AI Recommendations) panel:
   - Header with sparkle icon "Instruksi Ledger Cerdas"
   - Two recommendation cards:
     a) "EXIT: TLKM — Rank #22, di luar Top 10" with "Execute" button
     b) "BUY: ACES — Rank #7, belum dimiliki" with "Execute" button
   - Each card shows: icon, title, description, action button

INTERACTION STATES:
- Table rows: hover shows highlight + action buttons appear
- Sort indicators on column headers
- Filter input above table: "Filter ticker / nama..."
```

---

## SCREEN 3: Ticker Detail Page

```
Design a full-page stock detail view for the QUANTBIT trading terminal.

Platform: Web app, full-height layout (no sidebar — full screen for this page)
Navigation: Back arrow button top-left to return to main app

HEADER:
- Back arrow button (left)
- Ticker logo + "BBCA" large bold + "Bank Central Asia" muted text
- Price: "Rp48,200" large monospace bold
- Change: "+1.25%" with up arrow
- Right side: Watchlist star toggle button + "Trade" button (expands to show buy/sell form)

TAB BAR (below header):
- 5 tabs: Overview | Chart | Fundamentals | Peers | Signals
- Active tab: highlighted underline
- Inactive: muted text

OVERVIEW TAB (default):
1. Metrics Row (5 cards, equal width):
   - P/E: "12.3x"
   - P/B: "1.8x"
   - ROE: "14.5%"
   - Div Yield: "3.21%"
   - D/E: "0.9x"
   Each card: small label on top, large number below

2. Two-column layout:
   LEFT — 52W Range card:
   - "High" / "Low" / "Dari High" / "Dari Low" with values
   - Progress bar showing current price position between 52W low and high

   RIGHT — Portfolio card (if owned):
   - "Shares" / "Avg Price" / "Value" / "Gain/Loss" with values

3. Interactive Candlestick Chart (TradingView Lightweight Charts style):
   - Timeframe buttons: 1M | 3M | 6M | 1Y | 5Y | All
   - Candlestick chart with volume bars below
   - Crosshair cursor on hover
   - Price + date tooltip

4. Company Profile card:
   - Grid: Sector, Sub Sector, Market Cap, Ticker
   - Description paragraph (3 lines max with "read more")

5. Sector Peers card:
   - Horizontal list of 3-4 peer stocks: ticker + price + mini sparkline
   - Clickable to navigate to that ticker

CHART TAB:
- Full-width candlestick chart (larger than overview)
- Technical indicator toggles: SMA20, SMA50, SMA200, Volume
- Drawing tools toolbar (minimal: crosshair, trendline, horizontal line)
- Timeframe selector: 1D, 1W, 1M

FUNDAMENTALS TAB:
- Financial statement table (Bloomberg-style)
- Columns: Metric | FY 2023 | FY 2024 | FY 2025
- Rows: Revenue, Net Income, Total Assets, Liabilities, Equity, Operating CF, Investing CF, Financing CF
- Values in "Rp X B" format
- If no data: Empty state + "Data keuangan belum tersedia"

PEERS TAB:
- Comparison table with sector peers
- Columns: Ticker | P/E | P/B | ROE | Div Yield | Score | Rank
- Highlighted row for current ticker
- Sector average row at bottom

SIGNALS TAB:
- Current signal badge (large): "STRONG BUY" or "HOLD" or "SELL"
- Signal breakdown bar (stacked horizontal bar showing factor contributions)
- Factor cards: Quality, Growth, Value, Momentum, Dividend — each with score
- History timeline: vertical timeline showing signal changes over last 30 days
```

---

## SCREEN 4: Backtest Results

```
Design a backtest results screen for the QUANTBIT quantitative trading terminal.

Platform: Web app with sidebar navigation
Layout: Settings panel (left ~300px) + Results area (right, scrollable)

LEFT PANEL — Strategy Settings:
- "Strategy Settings" header
- Mode selector: Radio buttons — Algo | Custom | Adaptive DCA
- Universe dropdown: IDX80, IDX30, LQ45, All
- Top N count: Number input (default 10)
- Profile selector: Dropdown — Aman, Agresif, Dividen, Growth-heavy
- Weight sliders: Quality, Growth, Value, Momentum, Dividend (each 0-100%, sum to 100%)
- Crash Protection: Toggle switch
- Crossover Mode: Dropdown — Off, Monthly, Instant
- Reserve Buffer: Percentage input (default 10%)
- Date Range: Start date + End date pickers
- Capital: Number input (default 100,000,000)
- "Run Backtest" button (large, full-width)

RIGHT AREA — Results (appears after running):
1. Metrics Bar (5 cards, horizontal):
   - Total Return: "+145%"
   - CAGR: "16.2%"
   - Sharpe Ratio: "1.34"
   - Max Drawdown: "-18.5%"
   - Win Rate: "62%"

2. Equity Curve Chart (full-width):
   - Area chart showing portfolio value over time
   - X-axis: dates (2021-2026)
   - Y-axis: portfolio value in IDR
   - Reference line at initial capital
   - Tooltip on hover showing date + value

3. Trade Log Table:
   - Columns: Date | Type (BUY/SELL/REBALANCE) | Ticker | Shares | Price | Value | Reason
   - Type badges: color-coded by type
   - 15 rows visible, scrollable
   - Compact rows

4. Drawdown Chart:
   - Line chart showing drawdown percentage over time
   - Zero baseline
   - Annotated with crash protection trigger points
```

---

## SCREEN 5: Stock Screener

```
Design a stock screener screen for the QUANTBIT trading terminal.

Platform: Web app with sidebar navigation
Layout: Filter panel (left ~280px) + Results area (right)

LEFT PANEL — Filters:
- "Screener" header with result count badge
- Quick Filter Presets (pill buttons, multi-select):
  [Undervalued] [High Dividend] [Momentum Up] [Small Cap] [Blue Chip] [Custom]
- Advanced Filters (collapsible sections):
  Fundamental:
  - P/E: Min-Max range (0-50)
  - ROE: Min-Max range (0-50%)
  - Dividend Yield: Min-Max (0-15%)
  - Market Cap: Dropdown — Micro, Small, Mid, Large, Mega
  Technical:
  - Rank: Top N slider (1-80)
  - Signal: Dropdown — All, Strong Buy, Buy, Hold, Sell
  Sector:
  - Sector checkboxes: Banking, Mining, Consumer, Tech, etc.
- "Reset Filters" button
- "Apply" button (full-width)

RIGHT AREA — Results:
- Header: "42 saham ditemukan" + Sort dropdown
- Results Table:
  - Columns: Ticker | Price | Change% | P/E | ROE | Div Yield | Rank | Signal | Actions
  - 15 rows visible
  - Ticker: Bold + company name muted
  - Price: Monospace
  - Change%: colored by direction
  - P/E, ROE, DivYield: Numbers
  - Rank: Badge
  - Signal: Badge (STRONG BUY / HOLD / SELL)
  - Actions: Star (watchlist) + Chart icon + Buy button
  - Sortable column headers
  - Zebra striping

- Pagination at bottom: "Showing 1-42 of 42" + page controls

EMPTY STATE:
- When no results match filters
- Illustration + "Tidak ada saham yang cocok dengan filter" + "Reset Filters" button
```
