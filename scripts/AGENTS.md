# AGENTS.md — scripts/

## Purpose
Data pipeline scripts — fetching historical data, building databases, splitting datasets, scraping fundamentals.

## Ownership
- Root AGENTS.md governs project-wide rules
- This file governs all files under `scripts/`

## Local Contracts
- All scripts must be idempotent (safe to re-run)
- Python scripts use `scripts/` Python env; TypeScript scripts use `tsx`
- Output files go to `data/`, `daily/`, `hourly/`, `minutes/` as appropriate

## Work Guidance
- `npm run build:db` — build SQLite DB from JSON market data
- `npm run split-data` — split large JSON into yearly chunks
- Scripts are NOT part of the main build (except via npm scripts)
- `fetch_historical_data.ts` — master pipeline: downloads Yahoo prices + scores with IDX Warehouse fundamentals
- IDX fundamentals scraping now in `collectors/` (fetches via IDX API, outputs warehouse parquet+JSON)
- `scrape_idx_fundamentals.py` — legacy, superseded by `collectors/fetch_idx_fundamental.py`

## Verification
- Run script with `--dry-run` or test flag if available
- Verify output files exist after execution

## Child DOX Index
- `fetch_historical_data.ts` — master pipeline (Yahoo prices + IDX Warehouse scoring)
- `migrate-normscores.ts` — rank-based normalization recompute + stockRanksProd/Res (B2 fix)
- `split-data.ts` — year chunking of historical_market_data.json
- `build-db.ts` / `build-cf.ts` — D1/CF Pages bundling
- `post_process_live_market.py` — derive live_market.json dari idx80_scan + GC=F fetch
- `scrape_idx_fundamentals.py` — legacy, superseded by `collectors/fetch_idx_fundamental.py`
- `run_backtest_comparison.cjs` — backtest weight-config comparison (used during rebalancing fix)
