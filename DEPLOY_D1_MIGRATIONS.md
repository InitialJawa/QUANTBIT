# Production D1 Migration Guide

How to apply DB migrations to the production Cloudflare D1 database.

## Quick Reference

```bash
# 1. Authenticate with Cloudflare (one-time)
export CLOUDFLARE_API_TOKEN=your-token-with-d1-edit
# OR
npx wrangler login

# 2. Check current state
npm run db:status
# Expected: 0000, 0001 applied; 0002 pending (or all applied if done)

# 3. Apply pending migrations
npm run db:migrate

# 4. Verify
npm run db:status
# Expected: all 3 migrations applied
```

## Auth Setup

### Option A: API Token (recommended for CI/CD)

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token" → "Custom Token"
3. Permissions: **Account → D1 → Edit**
4. Zone Resources: Include → All zones (or specific)
5. Save the token (you only see it once)
6. Set the env var:
   ```bash
   export CLOUDFLARE_API_TOKEN=your-token
   ```

### Option B: OAuth login (for local dev)

```bash
npx wrangler login
# Opens browser, OAuth flow
```

## Available Commands

| Command | Description | Auth needed |
|---------|-------------|:-----------:|
| `npm run db:status` | Show applied vs pending migrations | ✅ remote |
| `npm run db:status:local` | Same, against miniflare D1 | ❌ no |
| `npm run db:migrate` | Apply all pending migrations | ✅ remote |
| `npm run db:migrate:local` | Apply against miniflare D1 | ❌ no |
| `npm run db:migrate:dry-run` | Show what would execute (file-based) | ❌ no |

## Adding a New Migration

```bash
# 1. Pick the next number (e.g. 0003)
# 2. Create db/migrations/0003_add_xyz.sql
cat > db/migrations/0003_add_xyz.sql << 'EOF'
-- Migration 0003: Add XYZ feature
-- (description here)
CREATE TABLE IF NOT EXISTS xyz (
  id TEXT PRIMARY KEY,
  ...
);
EOF

# 3. Verify locally
npm run db:migrate:local
npm run db:status:local

# 4. Apply to production (with auth)
npm run db:migrate
npm run db:status
```

## Migration File Conventions

- **Naming**: `NNNN_descriptive_name.sql` (4-digit zero-padded)
- **Idempotent**: Always use `CREATE TABLE IF NOT EXISTS` + `CREATE INDEX IF NOT EXISTS`
- **Never DROP**: Migrations are append-only. To "remove" something, add a new migration.
- **Never modify**: Once a migration is applied to production, never edit it. Create a new one.
- **Order matters**: Migrations are applied in alphanumeric order (0000 first, 0001 next, etc.).
- **Foreign keys**: Tables that reference others should be created AFTER the referenced table.

## Troubleshooting

### "not authenticated" / "CLOUDFLARE_API_TOKEN required"

```bash
# Option 1: Set token
export CLOUDFLARE_API_TOKEN=...

# Option 2: Login via browser
npx wrangler login

# Option 3: Test locally (no auth)
npm run db:migrate:local
```

### "no such table: _migrations"

The first time you run `db:migrate` on a fresh D1, the runner auto-applies 0000 first (it creates `_migrations`). This is expected.

### "table already exists" error

The migration SQL uses `IF NOT EXISTS`, so re-running is safe. If you see this error, your SQL file has a syntax issue.

### Migration applied but table not visible

Wait a few seconds (D1 eventual consistency). Or verify with:
```bash
npx wrangler d1 execute quantbit-db --remote \
  --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

## Current Migrations

| # | Name | Description |
|---|------|-------------|
| 0000 | `_migrations_tracker` | Creates `_migrations` table for runner state |
| 0001 | `init` | 8 original tables (users, sessions, portfolios, watchlists, trade_logs, cached_reports, idx_scan_data, engine_state) + 5 indexes |
| 0002 | `ai_memory` | `ai_sessions` + `ai_messages` (per-user chat memory) + 3 indexes |

See `db/AGENTS.md` for full conventions.
