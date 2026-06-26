# AGENTS.md — data/

## Purpose
Raw datasets, historical market data, caches, and SQLite databases.

## Ownership
- Root AGENTS.md governs project-wide rules
- This file governs all files under `data/`

## Local Contracts
- Historical market data in JSON format
- SQLite databases for fundamentals and cache
- Kaggle dataset integration
- Yahoo Finance cache directory

## Work Guidance
- `data/` is gitignored — large datasets not tracked
- Rebuild via `npm run build:db` if corrupted
- Yahoo cache in `data/yahooCache/`
- **Data scope: 2021+ only.** Pre-2021 year files (2000-2020) and `historical_market_data.json` were archived 2026-06 (Yahoo pre-2021 data quality was unreliable, IDX warehouse fundamentals only available from 2021). The API `/api/backtest-data` returns 400 if `from < 2021`. `fetch_historical_data.ts` and `fetch_dividend_history.ts` are pinned to `2021-01-01` onwards.

## Verification
- Run `npm run build:db` to validate data integrity

## Child DOX Index
- `data/yahoo/` — Yahoo Finance data fetching module
- `data/yahooCache/` — Yahoo Finance cache
- `data/kaggle/` — Kaggle dataset scripts
- `data/years/` — Year-split historical market data (2021+ only; pre-2021 archived)
