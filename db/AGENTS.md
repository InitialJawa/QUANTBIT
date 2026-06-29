# AGENTS.md — db/

## Purpose
Database schema and migrations — sequential SQL files in `db/migrations/`.

## Ownership
- Root AGENTS.md governs project-wide rules
- This file governs all files under `db/`

## Local Contracts
- Sequential migration files: `db/migrations/NNNN_name.sql` (4-digit zero-padded)
- Each migration uses `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS` (idempotent — safe to re-run)
- `db/migrations/0000_migrations_tracker.sql` creates `_migrations` table for tracking applied state
- Compatible with both Cloudflare D1 and local SQLite (use `wrangler d1 execute --local` for local)

## Current Migrations

| # | Name | Description | Status |
|---|------|-------------|--------|
| 0000 | `_migrations_tracker` | Creates `_migrations` table for runner state | required |
| 0001 | `init` | 8 original tables (users, sessions, portfolios, watchlists, trade_logs, cached_reports, idx_scan_data, engine_state) + 5 indexes | required |
| 0002 | `ai_memory` | `ai_sessions` + `ai_messages` (per-user chat memory) + 3 indexes — see `src/server/aiMemory.ts` | required |
| 0003 | `market_data` | `daily_overview`, `stock_fundamentals`, `stock_daily`, `engine_snapshots` — DB as SOT for market data, replaces file-based JSON | applied (local SQLite) |

## Seed Script

- `npm run db:seed` runs `scripts/seed-db.ts` (TypeScript, requires better-sqlite3 native build)
- **Fallback**: `python3 scripts/seed-db.py` (pure Python, no native deps) — use when better-sqlite3 fails or in constrained environments
  - Creates all 4 migration-0003 tables and seeds from `data/years/*.json` + `data/idx80_scan.json` + `data/fundamental_snapshots.json`

## Work Guidance
- **New migration**: create `db/migrations/NNNN_descriptive_name.sql` with the next sequential number
- **Apply to production**: `npm run db:migrate` (runs `wrangler d1 execute ... --remote` for each pending file)
- **Check status**: `npm run db:status` — shows applied vs pending
- **Dry run**: `npm run db:migrate:dry-run` — show what would execute without actually running
- **Apply one**: `npm run db:migrate:apply 0002_ai_memory` — apply specific migration
- **Local dev SQLite parity**: `scripts/build-db.ts` creates matching tables in `data/historical_market.sqlite`
- **Never DROP** in migrations — use `IF NOT EXISTS` for safety
- **Never modify** an existing migration file — create a new one instead (immutability)

## Verification
- Validate SQL syntax before applying
- Run `npm run db:status` before AND after migration
- Verify with direct wrangler query:
  ```bash
  npx wrangler d1 execute quantbit-db --remote \
    --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
  ```
- Test on local SQLite first: `wrangler d1 execute --local` (uses miniflare)

## Child DOX Index
- `db/migrations/` — sequential migration files (NNNN_name.sql format)
- `scripts/migrate.ts` — migration runner (status / apply / dry-run subcommands)
- `scripts/db-query.py` — Python SQLite query bridge (used by server.ts + MCP for local dev)
- `scripts/export-backtest-json.py` — Python backtest data export (reconstructs day entries from normalized tables)
- `scripts/seed-db.py` — Python seed script (fallback when better-sqlite3 can't build)
- `src/db/localDb.ts` — TypeScript DB access layer (for future use)
- `db/AGENTS.md` — this file
