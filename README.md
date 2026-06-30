<div align="center">

# QUANTBIT — Quantitative Stock Terminal

[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare_Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![Gemini](https://img.shields.io/badge/Gemini_AI-2.5_Flash-F4B400?style=for-the-badge&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)

<p align="center">
  <b>Terminal finansial kuantitatif deterministik untuk screening, backtesting data riil, dan manajemen portofolio Bursa Efek Indonesia (BEI / IDX), dilengkapi AI agent 4-level (read-only tools, action approval, proactive alerts) + Adaptive DCA + Buy Pressure Score.</b>
</p>

**Versi 1.0.0** · 2026-06-26 · Progress ~97% · Sprint: *3 Faktor Investasi — AMAN, AGRESIF, DIVIDEN*

🌐 **Live**: [quantbit-terminal.pages.dev](https://quantbit-terminal.pages.dev) · 216+ tests · 5 AI providers dengan circuit breaker

</div>

---

## ⚖️ Filosofi Sistem: Data Akurat vs AI Halusinasi

QUANTBIT dibangun di atas prinsip akurasi data mutlak. **Sistem ini TIDAK menggunakan AI Agent untuk menghitung metrik keuangan, melakukan screening, atau menjalankan simulasi backtest.** Semua logika matematika finansial, kalkulasi bobot portofolio, dan deteksi tren pasar dieksekusi secara deterministik menggunakan kode TypeScript murni.

Peran AI (5 provider — OpenRouter / Groq / Gemini / Cohere / Mistral) diisolasi hanya pada **presentation layer** untuk:
1. Merangkum angka-angka matematis menjadi naratif (Executive Summary)
2. Agent interface untuk Portfolio/Market (8 read-only tools, 10 actions dengan inline approval)
3. Proactive alerts (6 rules dengan 5-min cooldown per rule)
4. Persona **"Rico Lubis"** — Jakarta Tech Founder style, no-Jaksel, natural bahasa

**Zero auto-execute.** Semua `AIAction` WAJIB klik `[Approve]` di `AIActionApprovalCard` sebelum dispatch ke deterministic handler. AI tidak pernah pegang uang Anda.

---

## 🆕 Apa yang Baru

### Sesi 8 (2026-06-26) — Sprint: 3 Faktor Investasi

| Perubahan | Detail |
|---|---|
| **3 Faktor Investasi** | QM/BG dihapus. Profil baru hasil backtest optimasi step 0.05 (2015-2026, IDX80 Top 5): **AMAN** (Q30/G45/V10/M0/D15), **AGRESIF** (Q20/G60/V10/M10/D0), **DIVIDEN** (Q15/G20/V5/M0/D60) |
| **Dividend sub-factor** | `calcDividend()` di sync_engine scoring dari `dividendYield` Yahoo. Dividend cache dipisah ke `src/engine/dividendCache.ts` |
| **AI Agent Levels 1-4** | Smarter Q&A, 8 read-only tools, 10 actions dengan inline approval, 6 proactive rules |
| **Adaptive DCA + BPS** | Buy Pressure Score (5 faktor), 4-way backtest comparison (Adaptive vs Lump Sum vs DCA bulanan vs DCA kuartalan) |
| **Pre-2021 data diarsipkan** | Yahoo Finance pre-2021 corrupt, IDX warehouse fundamentals hanya tersedia dari 2021 |
| **Vite copy plugin** | `data/years/`, `idx80_scan.json`, `fundamental_idx_all.json` otomatis di-copy ke `dist/data/` saat build |
| **203+ tests** | 168 unit (engine + AI) + 18 component (vitest) + 17 E2E (Playwright) + 30+ manual cases |

### Sesi 7 (2026-06-25) — AI Session Memory + Provider Chain
- **AI session memory per-user** di D1 (`ai_sessions` + `ai_messages` tables) — AI ingat percakapan sebelumnya lintas page-load
- **5 AI providers dengan circuit breaker** — OpenRouter (4 model) + Groq + Gemini + Cohere + Mistral, auto-cooldown saat 429/403
- **OpenRouter quota tracking** — `/api/ai/status` expose sisa free quota real-time
- **"Rico Lubis" persona** — Jakarta Tech Founder style, no-Jaksel, natural bahasa
- **Notification system overhaul** — persistent (localStorage), AI context integration, toast default off, usePortfolioManager inside NotificationProvider
- **Dev mock provider** — chat tetap jalan tanpa API key (dev only)
- **Profile sync PATCH debounce** — fix browser connection pool exhaustion

### Sesi 6 (2026-06-25) — AI Depth Upgrade
- **Levels 1-4 fully shipped** — Smarter Q&A → 8 read-only tools → 10 actions (inline approval) → 6 proactive rules
- **4-layer test coverage** — 95 unit + 18 component + 17 E2E + 30+ manual
- **AIActionApprovalCard** — inline [Approve]/[Reject] card, zero auto-execute
- **Proactive alerts** — BPS rules + IHSG drop + crisis override, 5-min cooldown per rule

### Sesi 5 (2026-06-25) — Adaptive DCA Engine
- **BPS (Buy Pressure Score)** — 5 faktor (Valuasi 30%, Momentum 25%, Breadth 15%, Drawdown 20%, Fear 10%)
- **3 baseline simulators** — Lump Sum, Monthly DCA, Quarterly DCA
- **4-way comparison** di SimulationTab

### Earlier Sprints
- **Sesi 4 (2026-06-25)** — Code Health Audit: 13 critical/high issues fixed, O(n²) → O(n) IHSG window, dev-session security hole closed
- **Sesi 3 (2026-06-23)** — Data audit: 31 stale prices sync, sector mismatch fix, gold unit consistency
- **Sesi 2 (2026-06-22)** — UI overhaul: true black + cyan accent, floating AI chat
- **Sesi 1 (2026-06-21)** — Project bootstrap: deterministic engine, Express API, Vite + React 19 + Tailwind 4

---

## 🏗️ Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│  Data Sources                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  IDX API     │  │ Yahoo Finance│  │  GoAPI.id (opt)  │   │
│  │ (fundamental)│  │ (price, IHSG,│  │  (live prices)   │   │
│  │  ★ primary   │  │  GC=F, div)  │  │                  │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘   │
└─────────┼─────────────────┼───────────────────┼─────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Collectors & Fetchers (scripts/ + collectors/)             │
│  • fetch_idx_fundamental.py  (cloudscraper, 947 companies)  │
│  • fetch_historical_data.ts  (Yahoo prices 2021+, scoring)  │
│  • fetch_dividend_history.ts (per-ticker events)            │
│  • post_process_live_market.py (gold + IHSG synthesis)     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Deterministic Engine (src/engine/, src/marketData.ts,      │
│  src/marketRegimeEngine.ts) — NO AI                        │
│                                                              │
│  • Multi-factor scoring (Q/G/V/M/D)                        │
│  • runStrategy() — algo / custom / adaptive_dca             │
│  • shouldTriggerExit() — per-ticker exit evaluation        │
│  • BPS (Buy Pressure Score) — 5-faktor market timing       │
│  • Crash protection (60-day drawdown)                       │
│  • DCA baselines (Lump Sum / Monthly / Quarterly)          │
└──────────────────────────┬──────────────────────────────────┘
                           │  numbers only
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  AI Layer (src/ai/, src/components/AICockpit.tsx)          │
│  • Executive Summary (Gemini 2.5 Flash)                    │
│  • 8 read-only tools (JSON-block function calling)         │
│  • 10 actions → AIActionApprovalCard (user approves)       │
│  • 6 proactive rules (5-min cooldown per rule)             │
│  • Per-user session memory (D1 / in-memory)                │
│  • 5 provider chain (OpenRouter → Cohere → Mistral          │
│    → Groq → Gemini) with circuit breaker                    │
│  • Dev mock (offline testing)                               │
│  • "Rico Lubis" Jakarta Tech Founder persona               │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  React UI (src/components/) + Tailwind CSS 4               │
│  • Portfolio / Market / Backtest / Leaders / Analytics     │
│  • Floating AI Chat (bottom-right, with proactive badge)    │
│  • BuyPressureDashboard (circular gauge + 5 sub-factors)  │
│  • AlertBanner (regime-based)                               │
│  • Notification center (persistent, rule engine)            │
│  • AI Test Harness (dev-only, 4 tabs)                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  State / Persistence                                        │
│  • D1 (Cloudflare) / SQLite (local) — 8 tables + AI memory │
│  • EngineConfigContext — single source of truth (PRD-009)  │
│  • localStorage — chat history, UI prefs, notifications,    │
│    fired rules, dev session                                 │
│  • MCP server (Model Context Protocol) — external AI agents │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 3 Faktor Investasi

Profil hasil **backtest optimasi** (`scripts/backtest_optimize_weights.ts`, step 0.05, 2015-2026, IDX80 Top 5):

| Profil | Q | G | V | M | D | Filosofi | Cocok untuk |
|---|---:|---:|---:|---:|---:|---|---|
| **AMAN** | 30% | 45% | 10% | 0% | 15% | Risk-adjusted (Sharpe × 10 − DD/8 + Sortino × 5 + CAGR × 0.5) | Konservatif — growth sebagai engine, quality sebagai safety, dividen sebagai buffer |
| **AGRESIF** | 20% | 60% | 10% | 10% | 0% | Growth-heavy (CAGR × 3 + Return/100 + Sharpe × 5) | Investor muda — prioritas capital appreciation, momentum kecil untuk timing |
| **DIVIDEN** | 15% | 20% | 5% | 0% | 60% | Yield focus (Sharpe × 8 − DD/8 + Sortino × 4 + CAGR × 0.3) | Income investor — dividend yield, growth moderate, quality sebagai safety net |
| **Custom** | *user* | *user* | *user* | *user* | *user* | Bebas | Tickers + bobot sesuai riset sendiri |

> [!NOTE]
> **Value (1/PB) terbukti negative-alpha** di IDX80 2021-2026 (CAGR -5.42% vs IHSG -3.62%). Semua profile default ditekan ke 5-10%. Lihat ADR-009.

### Simulation Modes
- **Algo** — Top N ranking dari scoring engine
- **Custom** — Universe eksklusif yang user pilih sendiri
- **Adaptive DCA** — BPS-driven deploy, baseline comparison 4-way

### Strategy Sync Flow (PRD-009 v2)

```
[Backtest] → user configures → runStrategy() → result
         ↓
[SYNC TO PORTO] → copy snapshot to engineConfig
         ↓
[Portfolio] → reads engineConfig → drives Market, Notifications, AI
```

**Setting Backtest = Setting Portfolio** (sama persis setelah SYNC). Portfolio edit setting → cascade ke semua modul. Notification rules membaca dari `engineConfig` (threshold-based, bukan real-time). Mode `"custom"` = exclusive universe (bukan forced holding).

---

## 🤖 AI Agent (Quantbit AI — 4 Levels)

Lokasi: `src/components/FloatingAIChat.tsx` + `src/ai/` + `src/hooks/useAITools.ts`. AI = **interface only**, math tetap deterministic di `engine/`. Semua action wajib approval user.

### Level 1 — Smarter Q&A
- Chat history persist (DB-backed per-user, per-page-load session)
- 10K chars memory budget injected ke system prompt (last 20 messages)
- Welcome message, "Start New Session" button, trash history
- **"Rico Lubis" persona** — Jakarta Tech Founder style, no-Jaksel, natural bahasa

### Level 2 — Read-only Tool Use
8 tools (JSON-block function calling — portable across providers):
- `get_portfolio_state`, `get_bps_now`, `get_regime_details`
- `get_ticker_metrics`, `get_market_history`
- `get_backtest_config`, `get_engine_config`, `get_active_universe`

### Level 3 — Action API + Inline Approval
10 actions → `AIActionApprovalCard` → user klik [Approve] → deterministic handler:
- `buy_stock`, `sell_stock`, `move_to_gold`
- `set_active_profile`, `set_universe`, `set_topN`
- `toggle_dca_active`, `add_to_watchlist`, `remove_from_watchlist`
- `sync_backtest_to_portfolio`

**Critical safety**: zero auto-execute. AI SELALU hanya propose, user SELALU confirm.

### Level 4 — Proactive Agent
6 rules dengan hardcoded 5-min cooldown per rule:
1. `bpsAggressive` — BPS 70-89
2. `bpsDeploy` — BPS ≥ 90 (capitulasi)
3. `bpsLow` — BPS < 30
4. `dcaOffHighBps` — BPS ≥ 80 tapi `dcaActive=false`
5. `crisisOverride` — `isCrisisMode()` aktif
6. `ihsgDrop` — IHSG monthly drop > crashSensitivity

Toggleable via Settings → AI Agent (default ON).

### AI Provider Chain (5 providers, circuit breaker)

| Priority | Provider | Model | Pool | Notes |
|---:|---|---|---|---|
| 1-4 | **OpenRouter** | 4 free models | 4 different pools | Primary (no geo-block) |
| 5 | **Cohere** | `command-a-plus-05-2026` | Cohere direct | 1000 req/min free |
| 6 | **Mistral** | `mistral-small-latest` | Mistral direct | 1 req/sec free |
| 7-8 | **Groq** | `groq/compound` + llama | Groq direct | Geo-blocked from CF edge |
| 9 | **Gemini** | `gemma-4-26b-a4b-it` | Google direct | 1500 RPD, geo-blocked |

**Circuit breaker** (`src/server/aiChatHandler.ts`): kalau provider return 429 → cooldown 5 menit, 401/403 → cooldown 15 menit. Otomatis skip ke provider berikutnya. Cooldown visible di `GET /api/ai/status`.

**OpenRouter quota tracking** — `getOpenRouterQuota()` cache 30s, expose `usage`/`limit`/`limit_remaining`/`reset_at`. Default 50 req/day free, $10 credits = 1000/day.

### AI Dev Mock

Kalau belum setup API key, aktifkan **Use Dev Mock** di Settings → AI Agent. AI chat return canned response untuk testing flow UI tanpa API call. Guarded by `IS_DEV = import.meta.env.DEV === true` — production tidak pernah pake dev mock.

### MCP Server (Model Context Protocol)

`src/mcp/` — exposes Quantbit engine ke external AI agent (Claude Desktop, Cursor, dll). Run via `npm run serve-mcp`. Auto-start opt-in via `QUANTBIT_MCP_AUTOSTART=1`.

### AI Test Harness (dev only)

`src/components/AITestHarness.tsx` — panel guarded by `import.meta.env.DEV`. 4 tab:
- **Tools** — test `extractToolCalls()` regex parser
- **Actions** — test 10 action builders dengan preview
- **Cooldown** — test 5-min gate + bypass
- **Storage** — inspect/clear localStorage

---

## 🔔 Notification System

Lokasi: `src/contexts/NotificationContext.tsx` + `src/engine/notificationRules.ts`.

- **Persistent** — localStorage (`quantbit_notifications`, cap 50)
- **Rule engine** — threshold-based, deduplication via `firedRules` Set
- **Rules**:
  - `rule_tickerOutOfTopN` — ticker dropped dari Top N
  - `rule_crashProtectionTriggered` — IHSG drop > sensitivity
  - `rule_customUniverseBreach` — ticker di portfolio tidak di customUniverse
  - `rule_singleModeTrigger` — single ticker drop > singleSellTrigger
  - IHSG drop alerts (custom thresholds)
- **AI context** — last 5 alerts di-include ke `AILiveContext` untuk AI situational awareness
- **Toast default off** — user opt-in via Settings
- **Reset** — `clearAll()` / `resetRule(ruleId)` tersedia

---

## 🌟 Fitur Utama

### Quantitative Engine (deterministic, no AI)
- **📊 Multi-Faktor Kuantitatif** — Quality (ROE), Growth (EPS change), Value (1/PER), Momentum (MA cross), Dividend (yield) — semua deterministic
- **⏳ Backtester Riil** — Yahoo Finance historical 2021+, lot BEI (1 lot = 100 lembar), pajak, komisi, slippage, dividen neto
- **🛡️ Crash Protection** — 60-day IHSG drawdown → rotasi otomatis ke Emas (`GC=F`) atau Kas (IDR)
- **💼 Portfolio Ledger** — alokasi bobot, floating P&L, dividen, log trade
- **📈 Adaptive DCA + BPS** — Buy Pressure Score (5 faktor) + 4-way backtest comparison (Adaptive vs Lump Sum vs DCA bulanan vs DCA kuartalan)

### AI Layer (interface only, no math)
- **🤖 AI Agent 4-Level** — Smarter Q&A → 8 read-only tools → 10 actions (inline approval) → 6 proactive rules
- **💬 Session Memory** — AI ingat percakapan sebelumnya per-user via D1 (per-page-load session, DB-backed history)
- **🔌 5 AI Providers** — OpenRouter (4 model) + Groq (2) + Gemini (2) + Cohere + Mistral, dengan **circuit breaker** auto-cooldown saat 429/403
- **🧠 OpenRouter Quota Tracking** — `/api/ai/status` expose sisa free quota (50 req/day default, $10 credits = 1000/day)
- **🎭 "Rico Lubis" Persona** — Jakarta Tech Founder style, no-Jaksel, natural bahasa, domain-locked ke QuantBit context
- **🛠️ AI Dev Mock** — chat tetap jalan tanpa API key (dev mode only) — untuk testing offline

### Platform
- **🔔 Notification System** — persistent (localStorage), rule engine, threshold-based: `tickerOutOfTopN`, `crashProtectionTriggered`, `customUniverseBreach`, `singleModeTrigger`, IHSG drop alerts
- **⏰ Daily Data Pipeline** — cron 14:00 UTC weekdays → auto-update `live_market.json` + commit ke main
- **🔧 MCP Server** — Model Context Protocol untuk AI agent integration external (Claude Desktop, Cursor, dll)
- **🧪 AI Test Harness** — dev-only panel (4 tabs: Tools / Actions / Cooldown / Storage) untuk test AI infra tanpa UI

---

## 🔌 Sumber Data (Current)

| Kategori | Sumber | Mekanisme | Penggunaan |
|---|---|---|---|
| **Fundamental (primary)** | **IDX API** | `collectors/fetch_idx_fundamental.py` (cloudscraper) | Balance sheet, income, cashflow — 947 companies, 32 fields, 60-month history (2021+) |
| **Harga Historis** | **Yahoo Finance** | `scripts/fetch_historical_data.ts` (yahoo-finance2) | OHLCV + Adjusted Close, 830 ticker IDX, 2021+ |
| **Dividen** | **Yahoo Finance** | `scripts/fetch_dividend_history.ts` | Per-ticker events, disums per tahun |
| **IHSG (^JKSE)** | **Yahoo Finance** | API call | Benchmark + macro trend |
| **Emas (GC=F)** | **Yahoo Finance** | `scripts/post_process_live_market.py` | Crash Protection rotation target (IDR/gram) |
| **Live Prices** | **GoAPI.id** (opt) | REST | Alternatif real-time prices |
| **AI Naratif** | **5 provider chain** | `src/server/aiChatHandler.ts` | Executive Summary, SWOT, narrative, agent Q&A |

### AI Provider Chain (priority order)

Karena **Cloudflare Pages edge geo-block** Gemini/Groq direct, default chain adalah **OpenRouter proxy** (route via pool mereka, no geo-restriction):

| # | Provider | Model | Pool | Status |
|---|---|---|---|---|
| 1 | **OpenRouter** | `openai/gpt-oss-120b:free` | OpenInference | Default primary |
| 2 | **OpenRouter** | `nvidia/nemotron-3-super-120b:free` | Nvidia | Backup pool |
| 3 | **OpenRouter** | `cohere/north-mini-code:free` | Cohere via OR | Backup pool |
| 4 | **OpenRouter** | `meta-llama/llama-3.3-70b-instruct:free` | Venice | Often rate-limited |
| 5 | **Cohere** | `command-a-plus-05-2026` | Cohere direct | 1000 req/min free |
| 6 | **Mistral** | `mistral-small-latest` | Mistral direct | 1 req/sec free |
| 7 | **Groq** | `groq/compound` | Groq direct | Geo-blocked from CF edge |
| 8 | **Groq** | `llama-3.3-70b-versatile` | Groq direct | Fallback |
| 9 | **Gemini** | `gemma-4-26b-a4b-it` | Google direct | 1500 RPD, geo-blocked |

**Circuit breaker:** kalau provider return 429 → cooldown 5 menit, 401/403 → cooldown 15 menit. Otomatis skip ke provider berikutnya. Cooldown visible di `/api/ai/status`.

> [!TIP]
> **Mulai 2026-06-24, IDX API menjadi sumber fundamental utama** (DECISIONS). Yahoo Fundamental, FMP, Sectors.app, dan hash fallback sudah dihentikan.

---

## 📋 Data yang Dibutuhkan Project

### 1. Environment & API Keys (`.env.local`)

#### Core / AI Provider
| Key | Wajib? | Fungsi |
|---|---|---|
| `GEMINI_API_KEY` | Recommended | AI Summary + chat (Gemini direct, geo-blocked di CF edge) |
| `OPENROUTER_API_KEY` | **Sangat direkomendasikan** | Primary chain — 4 free models, no geo-restriction, route via OpenRouter pool |
| `GROQ_API_KEY` | Opsional | Groq compound + llama-3.3-70b (fast, geo-blocked) |
| `COHERE_API_KEY` | Opsional | Cohere `command-a-plus` — 1000 req/min free, generous |
| `MISTRAL_API_KEY` | Opsional | Mistral small — 1 req/sec free |
| `GOAPI_API_KEY` | Opsional | Live stock prices BEI |

#### AI Model Overrides (opsional)
| Key | Default | Fungsi |
|---|---|---|
| `OPENROUTER_MODEL` | `openai/gpt-oss-120b:free` | OpenRouter model #1 |
| `OPENROUTER_MODEL_2` | `nvidia/nemotron-3-super-120b:free` | OpenRouter model #2 (Nvidia pool) |
| `OPENROUTER_MODEL_3` | `cohere/north-mini-code:free` | OpenRouter model #3 |
| `OPENROUTER_MODEL_4` | `meta-llama/llama-3.3-70b-instruct:free` | OpenRouter model #4 (Venice, often limited) |
| `GROQ_MODEL` | `groq/compound` | Groq primary |
| `GROQ_FALLBACK_MODEL` | `llama-3.3-70b-versatile` | Groq fallback |
| `GEMINI_MODEL` | `gemma-4-26b-a4b-it` | Gemini primary (1500 RPD) |
| `GEMINI_FALLBACK_MODEL` | `gemma-4-31b-it` | Gemini fallback |
| `COHERE_MODEL` | `command-a-plus-05-2026` | Cohere model |
| `MISTRAL_MODEL` | `mistral-small-latest` | Mistral model |
| `COOLDOWN_429_MS` | `300000` (5 min) | Circuit breaker cooldown setelah rate limit |
| `COOLDOWN_403_MS` | `900000` (15 min) | Circuit breaker cooldown setelah auth error |

#### Email Notifications
| Key | Fungsi |
|---|---|
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS` | SMTP (dev — pakai nodemailer) |
| `RESEND_API_KEY` | Resend API (production — Cloudflare) |
| `EMAIL_TO`, `EMAIL_FROM` | Recipient & sender |

#### Runtime
| Key | Default | Fungsi |
|---|---|---|
| `PORT` | `3001` | Express API port |
| `QUANTBIT_MCP_AUTOSTART` | unset | Set ke `1` untuk auto-start MCP server (CLI invocation by default) |

> [!TIP]
> **Recommended minimum**: `OPENROUTER_API_KEY` saja. Ini unlock 4 free model via different pools = reliable untuk daily use. Tambah `$10 credits` di OpenRouter untuk 1000 req/day (vs default 50/day).

### 2. Static Seed Data (di-repo, sebagian `gitignored`)

| File | Ukuran | Isi |
|---|---:|---|
| `data/DaftarSaham.csv` | 95 KB | **830 emiten IDX** — Code, Name, ListingDate, Shares, ListingBoard, Sector, LastPrice, MarketCap |
| `data/idx_fundamentals_all.json` | 41 MB | IDX warehouse fundamentals (947 companies × 60 months) |
| `data/idx80_scan.json` | 190 KB | Hasil scan IDX80 (Q/G/V/M/D scores per ticker) |
| `data/fundamental_snapshots.json` | 20 KB | Snapshot fundamental + dividend history |
| `data/regime_history.json` | 300 B | Market regime history (untuk rotasi Crash Protection) |
| `data/live_market.json` | 622 B | Live market cache (gold, IHSG, USDIDR) |
| `data/years/2021..2026.json` | varies | Historical prices, year-split (built via `npm run split-data`) |
| `data/data.js` | 46 KB | Bundled static data (legacy) |

### 3. External Data (runtime fetch)

Lihat tabel **Sumber Data** di atas.

### 4. Database (Cloudflare D1 / local SQLite)

11 tabel via migrations `db/migrations/0000..0002`:
- `users`, `sessions` — auth (PBKDF2)
- `portfolios`, `watchlists`, `trade_logs` — ledger user
- `cached_reports`, `idx_scan_data`, `engine_state` — cache & engine
- `ai_sessions`, `ai_messages` — AI chat memory

Local parity: `data/historical_market.sqlite` (via `npm run build:db`).

---

## 🛠️ Instalasi & Setup Lokal

### Prasyarat
- Node.js 18+
- Python 3.10+ (untuk collectors)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (untuk deploy)

### Langkah Instalasi

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local — set OPENROUTER_API_KEY (recommended) atau minimal GEMINI_API_KEY
# Lihat section "Environment & API Keys" di atas untuk semua keys yang tersedia

# 3. Python env untuk collectors
python -m venv .venv && source .venv/bin/activate
pip install -r collectors/requirements.txt

# 4. Pull IDX fundamental warehouse
python collectors/fetch_idx_fundamental.py

# 5. Build historical prices + scoring
npx tsx scripts/fetch_historical_data.ts
npx tsx scripts/fetch_dividend_history.ts

# 6. Build local SQLite + split year files
npm run build:db
npm run split-data

# 7. Apply DB migrations (D1)
npm run db:migrate:local      # local
npm run db:migrate             # production

# 8. Run dev server (API :3001 + Vite :5173)
npm run dev
# Equivalent (kalau mau debug terpisah):
# Terminal 1: npm run serve-api    # Express on :3001, baca API key dari .env.local
# Terminal 2: npx vite             # Vite on :5173, proxy /api/* ke :3001
```

Buka **http://localhost:5173**.

### Dev Mock (offline / no API key)

Kalau belum setup AI provider key, aktifkan **Use Dev Mock** di Settings → AI Agent. AI chat akan return canned response untuk testing flow UI tanpa API call. Dev only — tidak jalan di production.

---

## 🔄 Data Pipeline

```bash
# Collectors (Python)
python collectors/fetch_idx_fundamental.py           # IDX fundamental bulanan
python scripts/post_process_live_market.py          # live_market.json (emas + IHSG)

# Fetchers (TypeScript)
npx tsx scripts/fetch_historical_data.ts            # Yahoo prices + scoring 2021+
npx tsx scripts/fetch_dividend_history.ts           # dividen per ticker

# Build & migrate
npm run build:db                                     # bangun SQLite lokal
npm run split-data                                   # split historical_market_data.json per tahun
npm run db:migrate:apply 0001_init                  # apply migration tertentu
npm run db:migrate:dry-run                           # preview migrations

# Daily (opsional via .github/workflows/daily-data-pipeline.yml)
# Hanya post_process_live_market.py yang jalan otomatis
```

> [!WARNING]
> **Data scope: 2021+ only.** Pre-2021 year files dan `historical_market_data.json` diarsipkan karena (1) Yahoo Finance pre-2021 banyak corrupt/bolong, (2) IDX warehouse fundamentals hanya tersedia dari 2021. Endpoint `/api/backtest-data` reject `from < 2021`. Lihat section **Pesan Untuk Pengembang Berikutnya** di bawah.

---

## ✅ Testing

```bash
npm test              # 168 unit tests (engine + AI pure functions, via tsx --test)
npm run test:ui       # 18 component tests (vitest + @testing-library/react, jsdom)
npm run test:e2e      # 17 Playwright E2E tests (auto-start dev server)
npm run lint          # TypeScript type checking (tsc --noEmit)
```

**Total: 203+ automated tests** + 30+ manual cases di [`docs/MANUAL_TEST_GUIDE.md`](./docs/MANUAL_TEST_GUIDE.md).

| Lapisan | Test runner | Tests | Speed |
|---|---|---:|---:|
| Engine + AI unit | `tsx --test` (node:test) | 168 | ~1s |
| Component | `vitest run` | 18 | ~2s |
| E2E | `playwright test` | 17 | TBD |
| Manual | Manual + Dev Test Harness | 30+ | – |

### Dev Test Harness (AI infra)

`src/components/AITestHarness.tsx` — panel dev-only (guarded by `import.meta.env.DEV`) dengan 4 tab:
- **Tools** — test `extractToolCalls()` regex parser
- **Actions** — test 10 action builders dengan preview
- **Cooldown** — test 5-min gate + bypass
- **Storage** — inspect/clear localStorage (chat history, notifications, fired rules)

---

## 🚀 Deployment

Production: **Cloudflare Pages** + D1 (`quantbit-db`) → [quantbit-terminal.pages.dev](https://quantbit-terminal.pages.dev).

```bash
# Build artifacts
npm run build
# → dist/data/ berisi years/, idx80_scan.json, fundamental_idx_all.json, live_market.json
# → dist/_worker.js (CF Pages Functions dari functions/api/)
# → dist/_routes.json (route config)
# → dist/index.html + assets

# Deploy ke Cloudflare Pages
npx wrangler pages deploy dist

# Migrate D1 production (per migration baru)
npm run db:migrate                    # apply semua pending
npm run db:migrate:apply 0002_ai_memory  # apply satu migration tertentu
npm run db:status                     # cek applied vs pending
```

Lihat [`docs/DEPLOY_D1_MIGRATIONS.md`](./docs/DEPLOY_D1_MIGRATIONS.md) untuk detail D1 setup (API token, wrangler login, dll).

Helper script: `scripts/apply-prod-migration.sh` — wrapper bash untuk apply migration ke production.

### CI/CD — Daily Data Pipeline

`.github/workflows/daily-data-pipeline.yml` jalan otomatis **Senin-Jumat 14:00 UTC (21:00 WIB)**:

- ✅ Auto: `python scripts/post_process_live_market.py` → update `live_market.json` (gold + IHSG + USDIDR)
- ✅ Auto: `npm run build` (verify)
- ✅ Auto: commit & push `data/live_market.json` ke main dengan tag `[skip ci]`
- ⚙️ Manual (`workflow_dispatch`): `run_fetch` → full Yahoo historical pull, `run_fundamentals` → IDX scrape (heavy, jarang)

Kenapa IDX scrape & Yahoo fetch nggak di-cron? Karena (1) Yahoo API rate-limit bisa ke-trigger, (2) IDX scrape 947 companies butuh ~30 menit dan rentang memory crash kalau barengan. Manual trigger lebih aman.

Konfigurasi: `wrangler.toml` (D1 binding, env vars, compatibility date 2026-06-18, `nodejs_compat` flag).

---

## 📁 Struktur Folder (Actual)

```bash
QUANTBIT/
├── AGENTS.md                        # Root DOX rail
├── README.md                        # File ini
├── vitest.config.ts                 # Vitest config (jsdom + React plugin)
├── vitest.setup.ts                  # Vitest setup (env shim, mocks, cleanup)
├── playwright.config.ts             # Playwright E2E config
│
├── docs/                            # Dokumentasi & guides
│   ├── AGENTS.md                    # Docs DOX rail
│   ├── PROJECT_MASTER.md            # Project identity & SOT
│   ├── CURRENT_STATE.md             # Current state & tasks
│   ├── NEXT_ACTION.md               # Priority queue
│   ├── AI_ONBOARDING.md             # AI onboarding guide
│   ├── DECISIONS.md                 # Architecture decisions log
│   ├── MASTER_CHRONICLE.md          # Major milestones
│   ├── KNOWN_ISSUES.md              # Known issues tracker
│   ├── agent.md                     # Quick reference (Indonesian)
│   ├── DEPLOY_D1_MIGRATIONS.md      # Production D1 migration guide
│   ├── MANUAL_TEST_GUIDE.md         # 30+ manual test cases (AI Levels 1-4)
│   ├── about-quantbit.html          # Project presentation HTML
│   ├── presentasi-script.md         # Presentation script
│   ├── ADR-*.md                     # Architecture Decision Records
│   ├── audit/                       # Research reports & audit data
│   └── archive/                     # Historical task lists
│
├── data/                            # Raw datasets, historical market, caches
│   ├── DaftarSaham.csv              # 830 emiten IDX (static)
│   ├── idx_page.html                # IDX page snapshot (debug)
│   ├── years/                       # 2021..2026 year-split historical (built via split-data)
│   ├── idx80_scan.json              # IDX80 scan results (Q/G/V/M/D scores)
│   ├── fundamental_idx_all.json     # IDX warehouse (JSON mirror, 41 MB)
│   ├── fundamental_idx.parquet      # IDX warehouse (primary, 345 KB)
│   ├── fundamental_snapshots.json   # Per-ticker snapshots + dividends
│   ├── live_market.json             # Gold + IHSG + USDIDR (cache)
│   ├── regime_history.json          # Market regime history
│   └── yahoo/                       # Yahoo Finance cache (gitignored)
│
├── external/                        # Git submodules
│   └── idx-api/                     # NeaByteLab/IDX-API reference
│
├── collectors/                      # Python data collectors
│   ├── fetch_idx_fundamental.py     # IDX warehouse puller (cloudscraper)
│   └── requirements.txt             # cloudscraper, pandas, dll
│
├── scripts/                         # TS data pipeline & helpers
│   ├── AGENTS.md                    # Scripts DOX rail
│   ├── fetch_historical_data.ts     # Yahoo prices + scoring (master, 2021+)
│   ├── fetch_dividend_history.ts    # Dividend events per ticker
│   ├── backtest_optimize_weights.ts # Weight grid search (step 0.05)
│   ├── post_process_live_market.py  # Gold + IHSG synthesis
│   ├── build-db.ts                  # SQLite builder (local parity)
│   ├── build-cf.ts                  # CF Pages bundler
│   ├── split-data.ts                # Year chunking (skip if missing)
│   ├── migrate.ts                   # DB migration runner (status/apply/dry-run)
│   ├── migrate-normscores.ts        # Rank-based normalization recompute
│   ├── scrape_idx_fundamentals.py   # Legacy, superseded by collectors/
│   ├── run_backtest_comparison.cjs  # Backtest weight-config comparison
│   ├── apply-prod-migration.sh      # Bash helper untuk D1 migration
│   ├── run-presentation.ps1         # PowerShell presentation launcher
│   └── debug/                       # Debug & investigation scripts
│       ├── debug_backtest.cjs       # Backtest debug runner
│       ├── debug_full_backtest.cjs  # Full backtest debug
│       ├── debug_ranks.cjs          # Rank calculation debug
│       ├── idx_api_investigate.cjs  # IDX API investigation
│       ├── idx_html_extract.cjs     # IDX HTML extractor
│       └── audit_idx_api.py         # IDX API audit script
│
├── db/                              # Schema & migrations
│   ├── AGENTS.md                    # DB DOX rail
│   └── migrations/
│       ├── 0000_migrations_tracker.sql  # _migrations table
│       ├── 0001_init.sql                # 8 tables + 5 indexes
│       └── 0002_ai_memory.sql           # ai_sessions + ai_messages + 3 indexes
│
├── functions/api/[[path]].ts        # Cloudflare Pages Functions (prod API)
│                                   # Includes all /api/* endpoints, AI chat, auth, engine
├── server.ts                        # Express dev API (port 3001, reads .env.local)
│
├── src/                             # React UI + deterministic engine
│   ├── components/                  # 36+ React components (AIActionApprovalCard, BuyPressureDashboard, dll)
│   ├── components/AITestHarness.tsx # Dev-only AI test panel (4 tabs)
│   ├── contexts/                    # Auth, EngineConfig, Notification, AICockpit
│   ├── hooks/                       # useAITools, useProactiveAgent, useDataFeed, useMarketRegimeSync
│   ├── engine/                      # core.ts, buyPressure.ts, dividendCache.ts, dcaBaselines.ts
│   ├── ai/                          # aiClient.ts, systemKnowledge.ts, toolCallParser.ts
│   ├── server/                      # aiChatHandler.ts, aiMemory.ts, yahooApi.ts
│   ├── data/                        # Bundled data (raw_stocks_data.ts, dividend_snapshots.json, archive/)
│   ├── mcp/                         # MCP server (Model Context Protocol)
│   ├── marketData.ts                # Stock universe & MKT constants
│   ├── marketRegimeEngine.ts        # Crisis detection (60-day drawdown)
│   └── types/                       # TypeScript types (ai.ts, dll)
│
├── PLAN/                            # Product Requirements Documents
│   ├── Prd quantbit ecosystem v1.0.md
│   └── Adaptive_DCA_Engine_QuantBit.md
│
├── docs/                            # AI Context Persistence System
│   ├── PROJECT_MASTER.md            # Project identity & architecture
│   ├── CURRENT_STATE.md             # Active sprint + recent changes
│   ├── NEXT_ACTION.md               # Priority queue
│   ├── DECISIONS.md                 # Append-only keputusan arsitektur
│   ├── KNOWN_ISSUES.md              # 38+ issues tracked
│   ├── AI_ONBOARDING.md             # Onboarding buat AI baru
│   └── audit/, archive/             # Historical reference
│
├── handover/                        # Session snapshots (HANDOVER_YYYY_MM_DD_Sn.md)
├── e2e/                             # Playwright E2E tests
│   ├── auth.setup.ts                # Dev-session localStorage seed
│   ├── ai-chat.spec.ts              # 10 chat tests
│   ├── ai-proactive.spec.ts         # 7 proactive alert tests
│   └── README.md                    # E2E usage docs
│
├── .github/workflows/               # CI/CD
│   └── daily-data-pipeline.yml      # Cron 14:00 UTC weekdays
│
├── public/                          # Static assets (favicon, logo)
└── wrangler.toml                    # CF Pages + D1 config (binding, env, compat)
```

---

## 🗺️ Roadmap

**Done (97%):**
- 3 profil investasi + dividend factor
- AI Agent Levels 1-4 + session memory
- Adaptive DCA + BPS
- Vite copy plugin untuk CF Pages
- 216 tests (4 layers)
- IDX API sebagai fundamental source
- Crash protection unified
- O(n²) → O(n) IHSG window

**P2 / Deferred:**
- Profile UX (ticker-level overrides, import/export)
- Notification persistence (TTL not enforced)
- Telegram bot
- **Pre-2021 data backfill** (butuh historical archive — lihat section di bawah)
- Proactive alert chip in chat
- Auto-execute BPS recommendation
- CI workflow untuk Playwright
- Cross-browser E2E

---

## 📜 Pesan Untuk Pengembang Berikutnya (LEGACY NOTE)

> *Ditulis oleh maintainer sebelum project ini. Kalau kamu menemukan repo ini dan pemimpin sebelumnya sudah "angkat tangan" karena pusing — kamu tidak sendirian. Tapi sebelum nyerah, baca dulu ini.*

### Apa yang terjadi?

Project ini dibangun dengan ambisi backtest **15-20 tahun** data IDX supaya kita bisa lihat pola krisis 2008, 2015 (jebolnya IHSG saat Yuan devalue), 2018 (trade war Trump round 1), 2020 (COVID crash), dan bandingkan dengan profile yang kita punya sekarang. Idealnya, ketika ada krisis baru, kita bisa bilang *"ini mirip 2015, portofolio defensif dulu"* — bukan nebak.

**Tapi kenyataannya:**

1. **Yahoo Finance (sumber utama harga) gratisannya payah untuk pre-2022.** Data 2015-2020 bolong-bolong, adjusted close sering tidak match dengan saham yang ada corporate action (stock split, rights issue, delisting). Saya sudah verifikasi sendiri dan akhirnya menyerah. Sudah diarsipkan `data/years/2000..2020` karena corrupt.

2. **IDX Warehouse hanya publish dari 2021.** Mereka migrasi sistem ~2020/2021, data fundamental sebelum itu tidak konsisten / tidak ada schema 통일. Saya pakai IDX API sebagai primary source (DECISIONS 2026-06-24) — bagus untuk 2021+, kosong untuk sebelumnya.

3. **API premium (GoAPI, EODHD, Bloomberg, Sectors.app) — mahal.** Untuk personal project ini, ROI-nya nggak masuk akal. Saya dokumentasikan opsinya di `.env.example` tapi tidak built-in ke pipeline.

### Apa yang bisa kamu lakukan?

Kalau kamu (atau tim, atau donatur) punya **salah satu** ini, project ini bisa di-unlock ke potensi penuhnya:

| Sumber | Data | Cara |
|---|---|---|
| **IDX historis (lokal)** | Laporan keuangan 2015-2020 | Scraping arsip IDX (sulit, paginated) atau download bulk dari RTI/Stockbit premium |
| **Yahoo Finance Premium** | Adjusted close + dividends 2015+ | `yfinance` premium tier (~$30/mo) atau Sectors.app |
| **EODHD / GoAPI** | IDX 2000-2025 | Bayar API, swap `yahoo-finance2` ke `eodhd` di `scripts/fetch_historical_data.ts` |
| **CSMAR / Wind / Bloomberg** | IDX 20 tahun | Academic license (kamu mahasiswa? coba kontak kampus) |
| **Arsip Kaggle** | "IDX Historical" dataset | Cari di kaggle.com/datasets — kadang ada yang upload |

### Kalau kamu berhasil backfill

1. **Jangan drop-in file mentah.** Pipeline project ini expect JSON format tertentu:
   - Year files: `data/years/{YYYY}.json` (format = `[{date, ticker, open, high, low, close, adjClose, volume}]` per ticker per day)
   - Fundamentals: `data/idx_fundamentals_all.json` (skema IDX warehouse, lihat `data/AGENTS.md`)
2. **Run `npm run split-data`** kalau punya 1 file besar.
3. **Update `fetch_historical_data.ts` floor date** dari `2021-01-01` ke date yang lebih awal.
4. **Tambah entry** di `data/AGENTS.md` dan `DECISIONS.md` biar maintainer berikutnya tahu.
5. **Submit PR** — kalau backfill-nya benar, project ini akan langsung terasa 5x lebih powerful. Backtest "Yuan Devaluation 2015" pakai data riil = Priceless.

### Kenapa saya nyerah (semi)

Saya bukan nyerah sepenuhnya — project ini ~97% jalan dan core engine (3 profil, BPS, AI agent) sudah solid. Yang missing itu **the cherry on top**: backtest jangka panjang. Tapi saya tidak punya waktu/budget untuk beli API premium, dan scraping IDX arsip butuh effort yang kalau dihitung jam-nya lebih worth dibayar.

Kalau kamu developer berikutnya dan nemu project ini:

- **Mulai dari `docs/AI_ONBOARDING.md`** — semua context ada di sana
- **Baca `docs/CURRENT_STATE.md`** — sprint terakhir dan kenapa step terhenti
- **Join diskusi di GitHub Issues** (kalau masih ada) atau buka issue baru
- **Jangan takut refactor** — project ini masih hidup, ada 216 tests, biar aman

Dan kalau kamu berhasil backfill pre-2021 — **tolong kabarin**. Saya masih di sini (mungkin), dan itu akan jadi closing chapter yang sempurna.

— *Maintainer, 2026-06-26*

---

## ⚖️ Lisensi

MIT. Bebas digunakan, dimodifikasi, dikembangkan untuk kebutuhan analisis finansial berbasis data riil Anda.

> [!WARNING]
> **Disclaimer:** QuantBit adalah tool edukasi & riset. Bukan saran finansial. Semua keputusan investasi adalah tanggung jawab Anda. Data Yahoo Finance gratis memiliki limitasi akurasi — terutama untuk periode sebelum 2022. Untuk keputusan finansial material, gunakan API premium atau data primer dari broker Anda.
