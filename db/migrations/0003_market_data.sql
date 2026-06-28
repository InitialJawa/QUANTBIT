-- ─────────────────────────────────────────────────────────────
-- Migration 0003: Market data tables (DB as single source of truth)
--
-- Replaces file-based data (data/years/*.json) and live price
-- feeds. Semua data market dibaca dari DB — engine, UI, backtest
-- semua pake source yang sama, gak ada lagi carried-forward / stale
-- fallback / divergence antara historical vs live price.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS daily_overview (
  date TEXT PRIMARY KEY,
  ihsg_close REAL NOT NULL,
  gold_idr REAL,
  usdidr_rate REAL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_fundamentals (
  ticker TEXT PRIMARY KEY,
  quality REAL DEFAULT 0,
  growth REAL DEFAULT 0,
  value REAL DEFAULT 0,
  momentum REAL DEFAULT 0,
  dividend REAL DEFAULT 0,
  final_score REAL DEFAULT 0,
  sector TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock_daily (
  date TEXT NOT NULL,
  ticker TEXT NOT NULL,
  close REAL,
  adj_close REAL,
  volume INTEGER,
  rank_prod INTEGER,
  rank_res INTEGER,
  norm_score REAL,
  raw_metrics TEXT,
  PRIMARY KEY (date, ticker)
);

CREATE TABLE IF NOT EXISTS engine_snapshots (
  date TEXT PRIMARY KEY,
  data TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_daily_overview_date ON daily_overview(date);
CREATE INDEX IF NOT EXISTS idx_stock_daily_date ON stock_daily(date);
CREATE INDEX IF NOT EXISTS idx_stock_daily_ticker ON stock_daily(ticker);
