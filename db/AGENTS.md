# AGENTS.md — db/

## Purpose
Database schema and migrations — single source of truth for SQL schema.

## Ownership
- Root AGENTS.md governs project-wide rules
- This file governs all files under `db/`

## Local Contracts
- Single schema file: `schema.sql`
- Compatible with both Cloudflare D1 and local SQLite
- Migrations follow sequential naming convention

## Work Guidance
- Apply migrations via Cloudflare Wrangler CLI for production
- Local development auto-creates tables via `build:db` script

## Verification
- Validate SQL syntax before applying
- Test migrations on local SQLite first

## Child DOX Index
(None — single schema file)
