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
- Python scripts for scraping tasks (IDX fundamentals, etc.)

## Verification
- Run script with `--dry-run` or test flag if available
- Verify output files exist after execution

## Child DOX Index
(None — individual scripts are self-contained)
