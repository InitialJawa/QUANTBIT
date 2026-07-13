# TASK.md — Session SOT

## Project
**QUANTBIT** — Quantitative Stock Terminal (React 19 + Vite 6 + TypeScript)
Repo: `https://github.com/InitialJawa/QUANTBIT`

## Current Status
- **Version**: 1.0.1 (2026-07-12)
- **Progress**: ~97%
- **Live**: https://quantbit-terminal.pages.dev

## Architecture
```
GitHub Actions (cron tiap 6 jam)
  └→ pipeline-sync.ts → D1 Cloudflare
  └→ compute-intermediate.ts → D1 (SMA/RSI/MACD/ATR)

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
npx tsc --noEmit       # TypeScript check
npx vite build         # Bundle build
npm run dev            # Dev server (Express + Vite)
```

## Data Gaps
- `company_profile` table: 0 baris — perlu script populate dari yfinance
- `financial_statements` table: 0 baris — perlu script populate dari yfinance
