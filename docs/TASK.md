# TASK.md — Session SOT

## Project
**QUANTBIT** — Quantitative Stock Terminal (React 19 + Vite 6 + TypeScript)
Repo: `https://github.com/InitialJawa/QUANTBIT`

## Current Status
- **Version**: 1.0.2 (2026-07-16)
- **Progress**: ~97%
- **Live**: https://quantbit-terminal.pages.dev

## Architecture
```
GitHub Actions (cron tiap 6 jam)
  └→ pipeline-sync.ts → D1 Cloudflare
  └→ compute-intermediate.ts → D1 (SMA/RSI/MACD/ATR) [FIXED: RSI Wilder smoothing]

Frontend React → CF Pages Functions → D1 Cloudflare
  └→ /api/stocks/*, /api/engine/*, /api/backtest/*
  └→ /api/auth/*, /api/yahoo/live-prices

Dev mode: npm run dev (Express + Vite concurrently)
Production: CF Pages Functions + D1
```

## Key Constraints
- **NO AI for financial math**
- **DB = single source of truth** — semua dari D1
- **No Express, no SQLite lokal, no mock** — full serverless
- **Ask before adding dependencies**


## Test Commands
```bash
npx tsc --noEmit       # TypeScript check — ✅ pass
npx vite build         # Bundle build — ✅ pass
npm run dev            # Dev server (Express + Vite)
```

## Data Gaps
- `company_profile` table: 0 baris — perlu script populate dari yfinance
- `financial_statements` table: 0 baris — perlu script populate dari yfinance

---

## Sesi 27 (2026-07-16): Backtest Engine Bug Audit & Fix

### Status: 17/18 bugs FIXED, tsc pass, vite build pass

### Critical Fixes (C1-C3)
| # | File | Fix |
|---|------|-----|
| C1 | `scripts/compute-intermediate.ts` | RSI: cumulative gain/loss → Wilder's smoothing. Sekarang RSI(14) akurat untuk semua data |
| C2 | `functions/api/backtest/run.ts` | Zero fees → apply slippage 0.25%, buyFee 0.15%, sellFee 0.25%, tax 0.10% |
| C3 | `functions/api/backtest/run.ts` | Crash detection: SMA crossover single stock → SMA death cross + RSI threshold (lebih robust) |

### High Fixes (H1-H7)
| # | File | Fix |
|---|------|-----|
| H1 | `src/engine/core.ts` | Phantom price Rp 100 → skip delisted/missing tickers di valuation, liquidation, sell |
| H2 | `src/engine/core.ts` | `alloc.positions.length` → `Object.keys(alloc.positions).length` |
| H3 | `src/engine/buyPressurePure.ts` | Split: pure functions (no React) → `buyPressurePure.ts`, React hook → `buyPressure.ts` |
| H4 | `src/engine/dcaBaselines.ts` | Max drawdown: `void dd` → track `maxDD` properly per-day |
| H5 | `scripts/pipeline-sync.ts` | Tambah step 3: jalankan `compute-intermediate.ts` setelah pipeline sync |
| H6 | `src/server/db.ts` | Apply migration 0006 (backtest_intermediate) + 0007 (rank/rotation/signal) |
| H7 | `functions/api/backtest/run.ts` | SQL injection: string interpolation → parameterized queries |

### Medium Fixes (M1-M7)
| # | File | Fix |
|---|------|-----|
| M1 | `src/engine/core.ts` | Dividend enrichment: yieldPct=0 hardcode → neutral 50 (real data dari dividendCache) |
| M2 | `src/engine/ranker.ts` | Dividend fallback: `?? 0` → `?? 50` (consistent dengan faktor lain) |
| M3 | `src/engine/allocator.ts` | Liquidation: `|| 100` → skip delisted tickers |
| M4 | `src/engine/metrics.ts` | CAGR: guard div-by-zero + negative portfolio → return 0 |
| M5 | `scripts/compute-intermediate.ts` | Max drawdown: all-time single value → rolling per-date array |
| M6 | `functions/api/backtest-data.ts` | Default weights: tambah `dividend: 0` field |
| M7 | `src/engine/dcaBaselines.ts` | Daily returns: dari 8-day samples → actual daily returns |

### Known Remaining Issues
| # | Severity | Issue | Notes |
|---|----------|-------|-------|
| C4 | HIGH | Look-ahead bias: backtest-data.ts + backtest/run.ts pakai scores hari ini untuk semua tanggal | Perlu `stock_scores_history` table (schema change) |
| A1 | MED | Dua backtest engine paralel (core.ts vs backtest/run.ts) | CF endpoint simplified, client-side lebih lengkap |
| A2 | MED | `runStrategy()` 671 baris, 0 unit tests | Perlu test suite |
| A3 | LOW | `computeAdaptiveWeights` + `getDividendPerShare` tidak di-export dari barrel | |

### Files Changed
```
src/engine/core.ts                    — H1, H2, M1
src/engine/buyPressurePure.ts         — NEW (H3)
src/engine/buyPressure.ts             — H3 (refactored)
src/engine/ranker.ts                  — M2
src/engine/allocator.ts               — M3
src/engine/metrics.ts                 — M4
src/engine/dcaBaselines.ts            — H4, M7, H2
scripts/compute-intermediate.ts       — C1, M5
scripts/pipeline-sync.ts              — H5
src/server/db.ts                      — H6
functions/api/backtest/run.ts         — C2, C3, H7
functions/api/backtest-data.ts        — M6
```
