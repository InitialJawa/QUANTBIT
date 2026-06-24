# AGENTS.md — collectors/

## Purpose
Data collectors that pull external data into QuantBit's warehouse (raw parquet/JSON files under `data/`).

## Scope
- IDX fundamental data (balance sheet, income statement, ratios)
- Market data (prices, scans, indices)
- Any external data source that needs periodic fetching

## Conventions
- All collectors must be **idempotent** — safe to re-run, skip already-pulled data
- Use **`cloudscraper`** for Cloudflare-bypassed HTTP (proven reliable)
- Output raw data to `data/` — prefer parquet for structured data, JSON for compatibility
- CLI args via `argparse` for month ranges and output paths
- Structured logging via `logging` module (not `print()`)
- Retry logic: at least 3 attempts with 2s backoff
- Error tolerance: don't abort the whole batch on one month failure — log and continue

## Output Files
- `data/fundamental_idx.parquet` — master fundamental warehouse (all months, indexed by code+period)
- `data/fundamental_idx_all.json` — JSON mirror for legacy compatibility

## Child DOX Index
- `fetch_idx_fundamental.py` — IDX fundamental monthly puller
- `requirements.txt` — Python dependencies for collectors
