-- ─────────────────────────────────────────────────────────────
-- Migration 0000: _migrations tracker table
--
-- Records which migrations have been applied. Created before any
-- schema migrations so the runner can introspect state.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS _migrations (
  name TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
