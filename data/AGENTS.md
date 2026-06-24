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

## Verification
- Run `npm run build:db` to validate data integrity

## Child DOX Index
- `data/yahoo/` — Yahoo Finance data fetching module
- `data/yahooCache/` — Yahoo Finance cache
- `data/kaggle/` — Kaggle dataset scripts
- `data/years/` — Year-split historical market data (2021+ only; pre-2021 archived)
