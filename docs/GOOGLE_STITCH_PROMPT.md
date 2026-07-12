# Prompt untuk Google Stitch — QUANTBIT UI/UX Redesign

Copy prompt di bawah ini dan paste ke Google Stitch untuk generate UI/UX baru.

---

## PROMPT (Copy dari sini)

```
Design a modern, dark-themed financial terminal for a quantitative stock trading platform called "QUANTBIT" — focused on the Indonesia Stock Exchange (IDX). The design should feel like a blend of Bibit.id (clean, simple, progressive disclosure) and Stockbit (data-dense, card-based, real-time) — but MORE powerful, like a professional Bloomberg Terminal that's been redesigned by a modern fintech team.

### Design Inspiration

**Bibit.id** — Clean simplicity:
- Bottom navigation with 5 key sections
- Home screen prioritizes portfolio overview and quick actions
- Progressive disclosure — reveal complexity as user scrolls
- Green as primary color (trust, growth)
- Ample white space to prevent cognitive overload
- Interactive risk-reward sliders
- Goal visualization with real-time progress tracking

**Stockbit** — Data density:
- Card-based design for easy scanning
- Real-time price data with green/red color coding
- Dynamic price charts with customizable overlays
- One-tap sentiment buttons (Bullish/Bearish)
- Heatmaps for quick market overview
- Social feed alongside market data
- TradingView charts built-in
- Desktop app with customizable widget layout

**QUANTBIT target**: Bibit's clean UX + Stockbit's data density + Bloomberg's functionality — all in one dark-themed terminal.

### Core Concept

A single-page application that helps users screen stocks, backtest trading strategies, manage portfolios, and interact with an AI agent. The layout should NOT be locked to a rigid 4-tab structure. Instead, REORGANIZE all features freely — propose the best way to present them. Think about:
- What should be visible at first glance (dashboard)?
- What needs its own dedicated view (charts, backtest)?
- What can be contextual (AI chat, notifications)?
- What should be accessible via navigation (settings, analytics)?

The design language should be "Bibit clean meets Stockbit data density" — dark backgrounds, emerald/teal accents, information-rich but not overwhelming.

### ALL Features Available (reorganize freely)

These are ALL the features that must be included. You have COMPLETE FREEDOM to rearrange, regroup, or reimagine how they are presented:

#### Market Intelligence
- Real-time market overview (IHSG, sector performance)
- Sector heatmap / market map
- Market regime display (RISK_ON / RISK_OFF / GOLD_DEFENSE / CASH_DEFENSE)
- Crisis warning alerts (IHSG drawdown detection)
- Technical indicators strip (RSI, MACD, SMA20, SMA50, Breadth, Score Gap)
- Market health metrics (4 cards: Health, Opportunity, Risk, Confidence)
- Top stock movers with mini sparklines
- Gold/Emas price tracking
- USD/IDR exchange rate

#### Stock Screening & Analytics
- Multi-factor scoring system (Quality/Growth/Value/Momentum/Dividend)
- Stock ranking leaderboard (sortable, filterable by IDX30/IDX80/LQ45)
- Score breakdown visualization (horizontal stacked bars)
- Rotation tracking (sector rotation in/out of top-N)
- Signal history (tier-based buy/hold/sell signals)
- Peer comparison (compare stocks within sector)
- Fundamental data display (P/E, P/B, ROE, DER, dividend yield)
- Company profiles

#### Charts & Visualizations (CAN BE DESIGNED — database not built yet)
- Candlestick price charts (TradingView-style)
- Area charts for portfolio performance over time
- Equity curve charts for backtest results
- Drawdown charts
- Benchmark comparison charts (vs IHSG, vs Gold)
- Sparkline mini-charts in cards
- Circular gauges (Buy Pressure Score 0-100)
- Progress bars and factor bars

#### Portfolio Management
- Net worth display (large hero value)
- Portfolio holdings table (ticker, shares, entry vs live price, P&L, dividend)
- Cash wallet management (deposit, withdraw)
- Gold/Emas buy/sell
- Trade history log
- Dividend forecast calculator
- Position rebalancing UI

#### Backtest & Simulation
- Strategy configuration (profile selector, date range, capital)
- Backtest execution and results
- Performance metrics (CAGR, Sharpe, Sortino, max drawdown, win rate)
- Trade log timeline
- 4-way comparison (Adaptive DCA vs Lump Sum vs Monthly DCA vs Quarterly DCA)
- DCA baseline visualization

#### Buy Pressure & DCA
- Circular BPS gauge (0-100 with action recommendation)
- 5 factor bars (Valuasi, Momentum, Breadth, Drawdown, Fear)
- Action badges (JANGAN BELI / BELI KECIL / BELI NORMAL / BELI AGRESIF / DEPLOY SEMUA)
- Deploy/cash allocation stats

#### AI Assistant
- Floating AI chat panel (bottom-right or integrated)
- AI-generated market briefs and analysis
- Trade recommendations with approve/reject buttons
- Proactive alerts (BPS changes, crisis detection)
- Context-aware suggestion chips
- AI explanation buttons ("Explain this" on any panel)

#### Strategy & Settings
- Investment profile management (AMAN/AGRESIF/DIVIDEN/Custom)
- Weight sliders (Quality/Growth/Value/Momentum/Dividend)
- Universe selection (IDX30/IDX80/LQ45/Custom)
- Top-N selection
- Crash protection settings (sensitivity, safe haven)
- DCA mode toggle
- Theme toggle (dark/light)

#### Notifications
- Crisis alerts (IHSG crash)
- Portfolio alerts (ticker dropped from top-N)
- BPS change alerts
- Persistent notification center

### Color Palette (EXACT — do not change)

#### Dark Theme (default)
- `--bg-primary`: #000000 (page background — pure black)
- `--bg-surface`: #0a0a0a (cards, sidebar, header)
- `--bg-surface-alt`: #111111 (elevated surfaces, tooltips)
- `--bg-elevated`: #1a1a1a (modal backgrounds)
- `--text-primary`: #ffffff (primary text)
- `--text-secondary`: #b0b0b0 (secondary text)
- `--text-tertiary` / `--text-muted`: #7a7a7a (muted labels, placeholders)
- `--border-default`: rgba(255,255,255,0.06) (default borders)
- `--border-strong`: rgba(255,255,255,0.10) (emphasized borders)
- `--accent-primary`: #008a6e (interactive elements — active tabs, focus rings, buttons)
- `--accent-primary-hover`: #00a37a (hover state for accent)
- `--accent-glow`: rgba(0,138,110,0.12) (subtle radial glow on elevated cards)
- `--data-positive`: #00c9a5 (gains, positive P&L, emerald teal)
- `--data-negative`: #f23645 (losses, negative P&L, rose red)
- `--data-warning`: #f59e0b (warnings, caution, amber)

#### Light Theme
- `--bg-primary`: #F1F5F9 (slate-100)
- `--bg-surface`: #FFFFFF
- `--text-primary`: #0F172A (slate-900)
- `--text-secondary`: #334155
- `--text-tertiary`: #64748B
- `--accent-primary`: #008a6e (same as dark)
- `--data-positive`: #00a37a
- `--data-negative`: #d32f2f
- `--data-warning`: #b45309

#### Color Usage Rules
- Active tabs: `text-[#00c9a5]` + `bg-[#00c9a5]/10`
- Primary buttons: `bg-emerald-500` (→ #008a6e)
- Ghost buttons: `bg-white/[0.04]` + `border-white/[0.06]`
- Badges (interactive): `bg-emerald-500/12%` + `border-emerald-500/25%` + `text-emerald-400`
- Badges (positive): `bg-green-500/12%` + `border-green-500/25%` + `text-green-400`
- Badges (warning): `bg-amber-500/12%` + `border-amber-500/25%` + `text-amber-400`
- Badges (negative): `bg-rose-500/15%` + `border-rose-500/30%` + `text-rose-400`
- Cards (elevated): `bg-[#0a0a0a]` + `border-white/10` + radial accent glow
- Cards (default): `bg-[#0a0a0a]` + `border-white/[0.06]`
- Hover states: `bg-white/[0.05]` + `border-emerald-500/30%`

### Typography (EXACT — do not change)

#### Font Families
- `--font-sans`: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif
- `--font-mono`: 'JetBrains Mono', monospace

#### Text Sizes
- `.text-label`: 10px, uppercase, letter-spacing 0.05em — section headers
- `.text-caption`: 11px — small captions
- `.text-body`: 12px — body text
- `.text-data`: 14px, font-weight 600 — financial data values
- `.text-value`: 16px, font-weight 700 — prominent values
- `.text-heading`: 13px — section headings

#### Rules
- ALL financial numbers: JetBrains Mono with tabular numbers
- Section headers: 10px, uppercase, bold, wide letter-spacing, muted color
- Body: Plus Jakarta Sans, 12px

### Card Hierarchy (EXACT)
- **card-default**: bg #0a0a0a, border rgba(255,255,255,0.06), radius 12px
- **card-elevated**: bg #0a0a0a, border rgba(255,255,255,0.10), radius 16px, subtle radial accent glow, shadow
- **card-inset**: bg rgba(255,255,255,0.03), border rgba(255,255,255,0.06), radius 12px
- **card-signal**: with positive (emerald border) / warning (amber border) / negative (rose border) modifiers

### Button Patterns (EXACT)
- **Primary**: bg #008a6e, text white, rounded-lg
- **Ghost**: bg white/0.04, border white/0.06
- **Danger**: bg rose-600, hover rose-500
- **Tab buttons**: active text-[#00c9a5] bg-[#00c9a5]/10, inactive text-white/30

### Animation System (Framer Motion)
- Tab switching: opacity 0→1, y 15→0, 150ms
- Card entrance: opacity 0→1, y 40→0, scale 0.96→1, 900ms
- Badge pop: spring stiffness 200, damping 15
- Drawer slide: spring damping 28, stiffness 300
- Modal: scale 0.95→1, 150ms
- Circular gauge: strokeDashoffset 600ms ease-out

### Design Principles
- **Bibit clean + Stockbit density**: Simple enough for beginners, powerful enough for pros
- **Dark-first**: Pure black (#000000) with subtle white overlays
- **Emerald accent**: #008a6e / #00c9a5 used consistently for interactive elements
- **Monospace for numbers**: ALL financial data in JetBrains Mono
- **Card-based scanning**: Like Stockbit — easy to scan information at a glance
- **Progressive disclosure**: Like Bibit — reveal complexity as user scrolls/dives deeper
- **Charts everywhere**: Include candlestick charts, area charts, sparklines, gauges — visual data representation is key
- **Professional but approachable**: Bloomberg power, Bibit simplicity

### Responsive Behavior
- Desktop: Full layout with sidebar/navigation
- Tablet: Collapsible navigation, stacked cards
- Mobile: Bottom navigation (like Bibit), full-width cards

### Language
- UI labels: Bahasa Indonesia (Pasar, Portofolio, Backtest, Analitik, Daftar Pantau)
- Technical terms: English (BPS, Sharpe, CAGR, MACD, RSI)

### What to Generate

Please generate UI designs for these screens (rearrange features as you see fit):

1. **Dashboard / Home** — The first thing users see. What's most important? Portfolio overview? Market status? Quick actions?

2. **Stock Detail** — Individual stock view with chart, fundamentals, scores, peer comparison

3. **Portfolio / Holdings** — All positions, P&L, dividends, rebalancing

4. **Backtest / Strategy** — Configure and run backtests, view results with charts

5. **Analytics / Screening** — Stock rankings, score breakdowns, filtering

6. **AI Chat** — How the AI assistant integrates with the UI

You have COMPLETE FREEDOM to:
- Rearrange which features appear on which screen
- Create new screen combinations
- Change navigation structure
- Add or remove visual hierarchy
- Propose entirely different layouts

The ONLY constraints are: keep all features, use the exact color palette, and make it feel like Bibit + Stockbit.
```

---

## Tips untuk Google Stitch

1. **Generate beberapa varian** — minta 3-4 versi berbeda untuk setiap screen
2. **Fokus ke clean + dense** — Bibit clean UX, Stockbit data density
3. **Include charts** — candlestick, area charts, sparklines, gauges — visual data is key
4. **Dark theme** — jangan generate light theme
5. **Monospace numbers** — semua angka harus monospace
6. **Indonesian labels** — gunakan Bahasa Indonesia
7. **Freely reorganize** — jangan terpatok dengan struktur tab yang lama

## Referensi

- Bibit.id — clean fintech UX, progressive disclosure, goal-based visualization
- Stockbit — data-dense, card-based, TradingView charts, heatmaps, social feed
- Bloomberg Terminal — extreme data density, professional trading tools
- Live app: https://quantbit-terminal.pages.dev
- GitHub: https://github.com/InitialJawa/QUANTBIT
