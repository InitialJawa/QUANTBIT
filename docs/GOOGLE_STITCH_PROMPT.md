# Prompt untuk Google Stitch — QUANTBIT UI/UX Redesign

Copy prompt di bawah ini dan paste ke Google Stitch untuk generate UI/UX baru.

---

## PROMPT (Copy dari sini)

```
Design a modern, dark-themed financial terminal dashboard for a quantitative stock trading platform called "QUANTBIT" — focused on the Indonesia Stock Exchange (IDX). The UI should feel like a professional Bloomberg Terminal meets a modern fintech app (like Robinhood or TradingView), but optimized for data density and decision-making.

### Core Concept
A single-page application with a left sidebar + top header + main content area layout. The terminal helps users screen stocks, backtest trading strategies, manage portfolios, and interact with an AI agent — all in one view. The design language should be "professional hacker meets fintech analyst" — dark backgrounds, emerald/teal accents, extreme data density, but still beautiful and readable.

### Color Palette (EXACT from current codebase)

#### Dark Theme (default)
- `--bg-primary`: #000000 (page background — pure black)
- `--bg-surface`: #0a0a0a (cards, sidebar, header)
- `--bg-surface-alt`: #111111 (elevated surfaces, tooltips)
- `--bg-header`: #000000 (header bar)
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
- Active tabs: `text-[#00c9a5]` + `bg-[#00c9a5]/10` (accent with 10% opacity)
- Primary buttons: `bg-emerald-500` (maps to #008a6e via CSS override)
- Ghost buttons: `bg-white/[0.04]` + `border-white/[0.06]`
- Badges (interactive): `bg-emerald-500/12%` + `border-emerald-500/25%` + `text-emerald-400`
- Badges (positive): `bg-green-500/12%` + `border-green-500/25%` + `text-green-400`
- Badges (warning): `bg-amber-500/12%` + `border-amber-500/25%` + `text-amber-400`
- Badges (negative): `bg-rose-500/15%` + `border-rose-500/30%` + `text-rose-400`
- Cards (elevated): `bg-[#0a0a0a]` + `border-white/10` + radial accent glow
- Cards (default): `bg-[#0a0a0a]` + `border-white/[0.06]`
- Cards (inset): `bg-white/[0.03]` + `border-white/[0.06]`
- Hover states: `bg-white/[0.05]` + `border-emerald-500/30%`
- Table row hover: `bg-white/[0.02]`
- Scrollbar: `bg-white/[0.02]` track, `bg-white/[0.1]` thumb

### Typography (EXACT from current codebase)

#### Font Families
- `--font-sans`: 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif
- `--font-serif`: 'Playfair Display', Georgia, Cambria, serif
- `--font-mono`: 'JetBrains Mono', monospace
- `--font-ios`: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif

#### Text Size Utility Classes (EXACT)
- `.text-label`: 10px, line-height 1.3, letter-spacing 0.05em — tiny uppercase section headers
- `.text-caption`: 11px, line-height 1.4 — small captions
- `.text-body`: 12px, line-height 1.5 — body text
- `.text-data`: 14px, line-height 1.3, font-weight 600, font-feature-settings "tnum" — financial data values
- `.text-value`: 16px, line-height 1.2, font-weight 700, font-feature-settings "tnum" — prominent values
- `.text-heading`: 13px, line-height 1.4, letter-spacing 0.02em — section headings

#### Typography Rules
- ALL financial numbers/prices/percentages: JetBrains Mono (monospace) with tabular numbers
- Section headers: 10px, uppercase, bold, wide letter-spacing (0.05em), muted color (text-white/30)
- Body text: Plus Jakarta Sans, 12px, normal weight
- Data values: JetBrains Mono, 14px, font-weight 600
- Large hero values: JetBrains Mono, 16px, font-weight 700
- Labels: 10px, uppercase, letter-spacing 0.05em, muted gray (#7a7a7a)

### Layout Structure
1. **Top Header (sticky):** Logo "QUANTBIT" with emerald dot, navigation tabs (Pasar/Portofolio/Backtest/Analitik), total wealth display, search bar, settings icon
2. **Left Sidebar (collapsible, 256px):** Real-time market data — top stock movers with mini sparklines, AI quick pulse summary, macro indicators (IHSG, Gold, USD/IDR), news feed
3. **Main Content Area:** Tab-based content that fills the remaining space
4. **Floating AI Chat:** Bottom-right FAB (floating action button) that opens a chat panel for AI assistant
5. **Floating Wallet:** Right-side slide-in drawer for portfolio details

### Key Screens to Design

#### Screen 1: Market Overview (Pasar)
- Top section: Market health cards (4 metric cards with progress bars — Market Health, Opportunity, Risk, Confidence)
- Technical indicator strip: RSI, MACD, SMA20, SMA50, Breadth, Score Gap in a horizontal bar
- Crisis warning banner (conditional, red-tinted with left red stripe)
- Watchlist grid: Stock cards with logo, ticker symbol, price, change%, sparkline chart, add/remove button
- AI Brief section: Collapsible market analysis with rationale, supporting factors, risk factors

#### Screen 2: Portfolio Dashboard (Portofolio)
- Hero card: Large net worth display with gradient background, total P&L
- 3 summary cards: Modal (investment), Nilai (value), Dividen/tahun (annual dividend)
- Buy Pressure Gauge: Circular SVG gauge showing score 0-100 with action badge (JANGAN BELI / BELI KECIL / BELI NORMAL / BELI AGRESIF)
- 5 factor bars: Valuasi, Momentum, Breadth, Drawdown, Fear (each with icon and percentage bar)
- Holdings table: Sortable rows with ticker logo, rank, shares, entry vs live price, P&L, dividend, sell controls
- AI Ledger Instructions: Buy/sell recommendation cards with approve/reject buttons

#### Screen 3: Backtest Simulator (Backtest)
- Configuration panel: Profile selector (AMAN/AGRESIF/DIVIDEN), date range picker, capital input
- Results area: Equity curve chart (Recharts area chart), drawdown chart, benchmark comparison
- Performance metrics: CAGR, Sharpe ratio, max drawdown, win rate in stat cards
- Trade log timeline: Chronological list of simulated trades
- 4-way comparison: Adaptive DCA vs Lump Sum vs Monthly DCA vs Quarterly DCA

#### Screen 4: Stock Analytics (Analitik)
- Profile tabs: AMAN, AGRESIF, DIVIDEN, Growth-heavy (pill buttons)
- Full stock ranking table: Rank, ticker, company name, score breakdown (Q/G/V/M/D), rotation badge, action button
- Score breakdown visualization: Horizontal stacked bar chart for each stock
- Filter controls: Universe selector (IDX80/IDX30/LQ45), search, sort

### Card Hierarchy (EXACT from current codebase)

#### Card Variants
- **card-default**: `bg: #0a0a0a`, `border: rgba(255,255,255,0.06)`, `border-radius: 12px`
- **card-elevated**: `bg: #0a0a0a`, `border: rgba(255,255,255,0.10)`, `border-radius: 16px`, subtle radial accent glow at bottom-right corner, box-shadow: `0 1px 0 rgba(255,255,255,0.03), 0 4px 12px rgba(0,0,0,0.4)`
- **card-inset**: `bg: rgba(255,255,255,0.03)`, `border: rgba(255,255,255,0.06)`, `border-radius: 12px`
- **card-signal**: `bg: #0a0a0a`, `border-radius: 12px`, with signal modifiers:
  - `card-signal-positive`: border tinted with data-positive (#00c9a5) at 30%
  - `card-signal-warning`: border tinted with data-warning (#f59e0b) at 30%
  - `card-signal-negative`: border tinted with data-negative (#f23645) at 30%
- **card-hover**: transitions bg to rgba(255,255,255,0.05) and border to accent-primary at 30% on hover

#### Card Gradients
- `bg-card-gradient`: radial-gradient at 100% 100% with accent-glow (rgba(0,138,110,0.12)) + #0a0a0a
- `bg-card-gradient-alt`: radial-gradient at 0% 0% with accent-glow + #0a0a0a

### Button Patterns (EXACT)
- **Primary**: `bg-emerald-500` (→ #008a6e via CSS), `text-white`, `rounded-lg`
- **Primary hover**: `bg-emerald-600` (→ #00a37a via CSS)
- **Secondary/Ghost**: `bg-white/[0.04]`, `border border-white/[0.06]`, hover: `bg-white/[0.06]`
- **Danger**: `bg-rose-600`, hover: `bg-rose-500`, `text-white`
- **Tab buttons**: `px-3.5 h-9 rounded-md`, active: `text-[#00c9a5] bg-[#00c9a5]/10`, inactive: `text-white/30 hover:text-white/60 hover:bg-white/[0.04]`
- **Icon buttons**: `w-7 h-7 rounded-md hover:bg-white/[0.06]`
- **Mini toggles**: Active: `bg: rgba(0,201,165,0.15)`, `color: #00c9a5`; Inactive: `bg: rgba(255,255,255,0.04)`, `color: #7a7a7a`

### Modal Pattern (EXACT)
- Backdrop: `fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm`
- Modal body: `bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 max-w-md shadow-2xl`
- Icon badge: `p-2 rounded-lg` with color from variant (danger=wings, warning=amber, info=emerald)
- Footer: `flex justify-end gap-2 pt-3 border-t border-white/5`
- Animation: scale from 0.95 with opacity, 150ms

### Drawer Pattern (EXACT)
- Backdrop: `fixed inset-0 bg-black/40`
- Drawer: `fixed top-0 right-0 h-full w-full sm:w-[380px] border-l border-white/10 shadow-2xl`
- Background: `#0a0a0a`
- Animation: spring, damping 28, stiffness 300

### Loading Skeletons (EXACT)
- All use `animate-pulse` on `bg-white/[0.02]` or `bg-white/5`
- ChartSkeleton: Spinner with icon, loading text
- CardSkeleton: Pulsing card with 3 lines of varying width
- TableRowSkeleton: Row with 6 pulsing cells
- ListSkeleton: N items with avatar circle + two text lines
- SpinnerOverlay: Full-overlay spinner with backdrop blur

### Key UI Components (EXACT patterns)

1. **Stock Card**: Compact card with TickerLogo (circular, fetches from stockbit CDN, fallback to colored initial), ticker symbol, company name, current price (JetBrains Mono 14px bold), change% (green-400 for gain, rose-400 for loss), mini sparkline, add-to-watchlist button. Used in watchlist grids.

2. **Metric Card**: Small card with Lucide icon, label (10px uppercase muted), value (14px JetBrains Mono bold), optional progress bar. Used for market health, portfolio stats.

3. **AI Chat Panel**: Fixed bottom-right, 380px wide, max-height 620px, bg-[#0a0a0a], border-white/10. User messages: bg-emerald-950/40, right-aligned, max-w 88%. AI messages: bg-white/[0.03], left-aligned, max-w 96%. Suggestion chips: bg-emerald-950/20 + border-emerald-500/15. Loading: "Menganalisis..." spinner.

4. **Circular Gauge (BPS)**: SVG ring, radius 70px, animated strokeDashoffset (600ms ease-out). Color: red (0-30) → amber (30-70) → emerald (70-100). Center: numeric score (JetBrains Mono) + action label badge.

5. **Holdings Table Row**: Dense row with rank badge, TickerLogo, ticker, company, shares, entry vs live price (JetBrains Mono), value/P&L (color-coded), dividend, hover-reveal sell controls (rose-600 buttons).

6. **Alert Banner**: Fixed top-right, z-100, w-340px. Rose gradient card, auto-dismiss 8s progress bar, spring animation from right. Shows IHSG crash alert + "Buka Ledger" CTA.

7. **Strategy Settings Panel**: Collapsible sections, button group selectors (universe/profile/safe haven), slider inputs (accent-emerald for range), read-only mode when locked to live strategy.

8. **Navigation Tabs**: Horizontal pill buttons, active: text-[#00c9a5] bg-[#00c9a5]/10, inactive: text-white/30 hover:text-white/60 hover:bg-white/[0.04].

9. **Login Screen**: Centered form, bg-[#1e222d] card on #0d0d0d bg, email/password inputs with Lucide icons, sign in/sign up toggle, "Demo Mode (Offline)" button, accent #00c9a5.

10. **ConfirmModal**: Backdrop blur, bg-[#0A0A0A] rounded-2xl, icon badge (danger/warning/info), cancel + confirm buttons, spring scale animation.

### Animation System (EXACT — Framer Motion)
- Tab switching: opacity 0→1, y 15→0, 150ms
- Card entrance: opacity 0→1, y 40→0, scale 0.96→1, filter blur(12px)→none, 900ms cubic-bezier
- Badge pop: spring stiffness 200, damping 15
- Drawer slide: spring damping 28, stiffness 300
- Modal: scale 0.95→1, opacity 0→1, 150ms
- Alert banner: spring from right, damping 25, stiffness 300
- Circular gauge: strokeDashoffset animation 600ms ease-out
- Factor bars: width animation 500ms ease-out

### Scrollbar (EXACT)
- Width: 5px
- Track: rgba(255,255,255,0.02)
- Thumb: rgba(255,255,255,0.1), border-radius 4px
- Thumb hover: rgba(255,255,255,0.2)

### Design Principles
- **Extreme data density:** Like a Bloomberg Terminal — pack as much information as possible without feeling cluttered. Use tiny fonts (10-12px) for labels, monospace for data.
- **Dark-first:** Pure black (#000000) backgrounds with subtle white overlays for depth. No bright backgrounds anywhere.
- **Emerald accent consistency:** The teal-green (#008a6e / #00c9a5) accent should be used sparingly but consistently — active states, primary buttons, focus rings, positive indicators.
- **Monospace for numbers:** ALL financial data (prices, percentages, scores) MUST use JetBrains Mono with tabular numbers.
- **Subtle glassmorphism:** Cards use rgba(255,255,255,0.03) backgrounds with rgba(255,255,255,0.06) borders — frosted glass on dark.
- **Spring animations:** Framer Motion springs — high damping (25-28), moderate stiffness (280-300).
- **Professional but modern:** Tool a professional trader would use, not a toy. Not as dated as traditional Bloomberg terminal.
- **Consistent badge language:** Interactive (emerald), positive (green), warning (amber), negative (rose) — same pattern everywhere.
- **Upper-heavy hierarchy:** Section headers always 10px, uppercase, bold, wide letter-spacing, muted color.

### Responsive Behavior
- Desktop: Full sidebar + header + main content layout
- Tablet: Collapsible sidebar, header tabs scroll horizontally
- Mobile: Hidden sidebar (hamburger menu), stacked cards, full-width chat panel

### Language
- UI labels in Bahasa Indonesia (Pasar, Portofolio, Backtest, Analitik, Daftar Pantau, etc.)
- Technical terms in English (BPS, Sharpe, CAGR, MACD, etc.)
```

---

## Tips untuk Google Stitch

1. **Generate beberapa varian** — minta 3-4 versi berbeda untuk setiap screen
2. **Fokus ke density** — QUANTBIT adalah terminal, bukan consumer app. Data harus packed tapi readable
3. **Consistent accent** — pastikan emerald teal (#00c9a5) konsisten di semua screens
4. **Dark theme** — jangan generate light theme. QUANTBIT adalah dark-first terminal
5. **Monospace numbers** — pastikan semua angka menggunakan monospace font
6. **Indonesian labels** — gunakan Bahasa Indonesia untuk UI labels

## Referensi

- Live app: https://quantbit-terminal.pages.dev
- GitHub: https://github.com/InitialJawa/QUANTBIT
- Source code: `src/components/` untuk semua React components
