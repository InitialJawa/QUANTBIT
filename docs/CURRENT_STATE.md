# CURRENT STATE

| Field | Value |
|-------|-------|
| Tanggal | 2026-07-01 |
| Status | Development |
| Progress | ~99% |
| Sprint | Sesi 16 — DB sebagai SOT: Seed Production D1 (2026-07-01) |

## Active Architecture

```
EngineConfigContext (SOT for LIVE strategy) — ADR-003, ADR-010, ADR-011
  ├── profiles[] — AMAN, AGRESIF, DIVIDEN, Custom N (weight profiles)
  ├── activeProfileId — profile aktif (getter: activeProfile)
  ├── topNCount, universe, crash/crossover settings
  ├── simulationMode: "algo" | "custom" | "adaptive_dca"
  ├── customUniverse: string[] (exclusive, custom mode)
  ├── enableAdaptiveWeights: boolean (auto-adjust weights)
  └── dcaActive: boolean (DCA Rekomendasi — Portfolio-only)
       │
       ├── AppSidebar (renderPortfolioContent)
       │     └── StrategySettingsPanel (10 strategy fields, write)
       ├── SimulationTab
       │     ├── handleRunAlgoBacktest uses:
       │     │   effectiveConfig = backtestUseLiveStrategy
       │     │     ? {...backtestConfig, ...engineConfig}  ← engineConfig menang untuk 10 strategy keys
       │     │     : backtestConfig
       │     └── AppSidebar (renderBacktestContent)
       │           └── StrategySettingsPanel (10 strategy fields, read-only when ON, write when OFF)
       │
       ├── App.tsx / useDataFeed (live market data overlay)
       ├── buyPressure.ts (BPS with crisis override)
       ├── marketRegimeEngine.ts (crash detection, regime)
       ├── aiClient.ts (context injection)
       ├── useProactiveAgent.ts (market insight)
       └── Strategy Says banner / Alert Pop-ups
```

## Komponen Kunci

| Layer | Deskripsi | File |
|---|---|---|
| **EngineConfigContext** | React context + useReducer, persistent ke localStorage | `src/contexts/EngineConfigContext.tsx` |
| **isCrashActive()** | Stateless crash gate (no cooldown/state machine) | `src/marketRegimeEngine.ts:179` |
| **marketData.ts** | RS, MKT module-level singletons | `src/services/marketData.ts` |
| **data pipeline** | GA tiap hari 06:30 + 14:00 UTC | `.github/workflows/daily-data-pipeline.yml` |
| **D1 production** | `stock_fundamentals` (populated via force-sync), `daily_overview` + `stock_daily` (KOSONG — belum di-seed) | `functions/api/[[path]].ts` |
| **Local SQLite** | 120.793 rows stock_daily, 1322 rows daily_overview, 188 stock_fundamentals | `data/historical_market.sqlite` |

## Data Flow SAAT INI (yang jalan di production)

```
GA workflow tiap hari:
  fetch_idx80_scan.py → idx80_scan.json (scores real)
  sync-daily-data.ts  → data/years/*.json + rebuild local SQLite
  force-sync          → populate D1 idx_scan_data + stock_fundamentals (price-computed scores)
  commit + push       → CF Pages auto-deploy

Production API:
  /api/engine/idx80     → D1 idx_scan_data + stock_fundamentals
  /api/backtest-data    → D1 daily_overview + stock_daily (KOSONG) → fallback ke file statis
  /api/db-sync-status   → D1 daily_overview (KOSONG) → fallback ke file
```

## Gap Utama

- **`daily_overview` + `stock_daily` di D1 production KOSONG** — perlu di-seed dari local SQLite
- **Belum ada `seed-d1.py`** — script untuk push local SQLite → remote D1 via wrangler
- **GA workflow belum punya `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`** — perlu di-set di GitHub Secrets

## Existing data in local SQLite

```
daily_overview:   2021-01-04 → 2026-07-01  (1322 rows)
stock_daily:      2021-01-04 → 2026-07-01  (120.793 rows, 95 tickers)
stock_fundamentals: 188 rows dengan quality>0
```

## User Preferences (dari sesi ini)

- **No more planning/analysis** — langsung eksekusi
- **Crash gate**: `detectCrashAlgo()` langsung, bukan state machine + cooldown
- **All panels** baca dari satu crash gate function, no independent logic
- **Analytics scores**: dari DB (`stock_fundamentals`)
- **User settings** (`crashSensitivity`) harus di-respect semua komponen
- **DB is single source of truth** — semua engine baca dari D1, bukan file statis
