-- Migration 0007: Ticker Detail Tables
-- Supporting tables for full-page ticker detail (8 tab route /ticker/:code)
-- Populated by new pipeline scripts: compute-rank-history, compute-signals, compute-rotation, sync-financial-statements

-- 1. Rank History — time-series rank positions per ticker
-- Populated by scripts/compute-rank-history.ts every pipeline run
CREATE TABLE IF NOT EXISTS rank_history (
  ticker          TEXT NOT NULL,
  date            TEXT NOT NULL,
  total_score     REAL,
  total_rank      INTEGER,
  quality_score   REAL,
  quality_rank    INTEGER,
  growth_score    REAL,
  growth_rank     INTEGER,
  value_score     REAL,
  value_rank      INTEGER,
  momentum_score  REAL,
  momentum_rank   INTEGER,
  dividend_score  REAL,
  dividend_rank   INTEGER,
  created_at      TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (ticker, date),
  FOREIGN KEY (ticker) REFERENCES tickers(ticker)
);

CREATE INDEX IF NOT EXISTS idx_rank_history_date ON rank_history(date);
CREATE INDEX IF NOT EXISTS idx_rank_history_ticker ON rank_history(ticker);

-- 2. Rotation History — time-series rotation status per ticker
-- Populated by scripts/compute-rotation.ts every pipeline run
CREATE TABLE IF NOT EXISTS rotation_history (
  ticker          TEXT NOT NULL,
  date            TEXT NOT NULL,
  sector          TEXT,
  industry        TEXT,
  rotation_label  TEXT,
  rotation_status TEXT,
  quality_score   REAL,
  growth_score    REAL,
  momentum_score  REAL,
  created_at      TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (ticker, date),
  FOREIGN KEY (ticker) REFERENCES tickers(ticker)
);

CREATE INDEX IF NOT EXISTS idx_rotation_history_date ON rotation_history(date);
CREATE INDEX IF NOT EXISTS idx_rotation_history_ticker ON rotation_history(ticker);
CREATE INDEX IF NOT EXISTS idx_rotation_history_sector ON rotation_history(sector, date);

-- 3. Signal History — time-series signal tier changes per ticker
-- Populated by scripts/compute-signals.ts every pipeline run
CREATE TABLE IF NOT EXISTS signal_history (
  ticker          TEXT NOT NULL,
  date            TEXT NOT NULL,
  signal_tier     INTEGER,
  signal_label    TEXT,
  signal_reason   TEXT,
  created_at      TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (ticker, date),
  FOREIGN KEY (ticker) REFERENCES tickers(ticker)
);

CREATE INDEX IF NOT EXISTS idx_signal_history_date ON signal_history(date);
CREATE INDEX IF NOT EXISTS idx_signal_history_ticker ON signal_history(ticker);

-- 4. Company Profile — detailed company information
-- Populated by pipeline-sync.ts (fundamentals step) or dedicated script
CREATE TABLE IF NOT EXISTS company_profile (
  ticker            TEXT PRIMARY KEY,
  name              TEXT,
  sector            TEXT,
  industry          TEXT,
  description       TEXT,
  website           TEXT,
  employees         INTEGER,
  market_cap        REAL,
  pe_ratio          REAL,
  pb_ratio          REAL,
  dividend_yield    REAL,
  roe               REAL,
  roa               REAL,
  profit_margin     REAL,
  operating_margin  REAL,
  revenue_growth    REAL,
  earnings_growth   REAL,
  debt_to_equity    REAL,
  current_ratio     REAL,
  fifty_two_week_high REAL,
  fifty_two_week_low  REAL,
  fifty_day_avg     REAL,
  two_hundred_day_avg REAL,
  beta              REAL,
  updated_at        TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (ticker) REFERENCES tickers(ticker)
);

-- 5. Financial Statements — historical financial data
-- Populated by scripts/sync-financial-statements.ts
CREATE TABLE IF NOT EXISTS financial_statements (
  ticker            TEXT NOT NULL,
  fiscal_date       TEXT NOT NULL,
  period_type       TEXT DEFAULT 'annual' CHECK(period_type IN ('annual', 'quarterly')),
  revenue           REAL,
  net_income        REAL,
  gross_profit      REAL,
  operating_income  REAL,
  ebitda            REAL,
  total_assets      REAL,
  total_liabilities REAL,
  equity            REAL,
  operating_cf      REAL,
  investing_cf      REAL,
  financing_cf      REAL,
  free_cash_flow    REAL,
  eps               REAL,
  created_at        TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (ticker, fiscal_date, period_type),
  FOREIGN KEY (ticker) REFERENCES tickers(ticker)
);

CREATE INDEX IF NOT EXISTS idx_financial_statements_ticker ON financial_statements(ticker, fiscal_date DESC);
