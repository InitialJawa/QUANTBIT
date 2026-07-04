-- Migration 0004: V2 Schema — Single Source of Truth
-- 19 tables, normalized, foreign keys everywhere, no JSON blobs

-- Drop old V1 tables (safe to re-run)
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS cached_reports;
DROP TABLE IF EXISTS engine_state;
DROP TABLE IF EXISTS daily_overview;
DROP TABLE IF EXISTS stock_fundamentals;
DROP TABLE IF EXISTS engine_snapshots;
DROP TABLE IF EXISTS idx_scan_data;

-- Recreate V2 tables

-- 1. Ticker catalog
CREATE TABLE IF NOT EXISTS tickers (
  ticker        TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  sector        TEXT NOT NULL,
  industry      TEXT NOT NULL,
  is_active     INTEGER DEFAULT 1,
  is_idx80      INTEGER DEFAULT 0,
  listed_date   TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tickers_sector ON tickers(sector);
CREATE INDEX IF NOT EXISTS idx_tickers_idx80 ON tickers(is_idx80, is_active);

-- 2. User profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id            TEXT PRIMARY KEY,
  display_name  TEXT,
  theme         TEXT DEFAULT 'terminal',
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now'))
);

-- 3. Pipeline execution log
CREATE TABLE IF NOT EXISTS pipeline_runs (
  id            TEXT PRIMARY KEY,
  status        TEXT DEFAULT 'started',
  started_at    TEXT DEFAULT (datetime('now')),
  completed_at  TEXT,
  error         TEXT
);

-- 4. Daily market overview (replaces daily_overview)
CREATE TABLE IF NOT EXISTS market_daily (
  date          TEXT NOT NULL,
  ihsg_close    REAL NOT NULL,
  ihsg_open     REAL,
  ihsg_high     REAL,
  ihsg_low      REAL,
  gold_close    REAL NOT NULL,
  gold_open     REAL,
  gold_high     REAL,
  gold_low      REAL,
  usdidr_rate   REAL NOT NULL,
  is_market_day INTEGER DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (date)
);

CREATE INDEX IF NOT EXISTS idx_market_daily_date ON market_daily(date);

-- 5. Per-stock daily data (replaces stock_daily)
DROP TABLE IF EXISTS stock_daily;
CREATE TABLE IF NOT EXISTS stock_daily (
  date              TEXT NOT NULL,
  ticker            TEXT NOT NULL,
  close             REAL NOT NULL,
  adj_close         REAL NOT NULL,
  open              REAL,
  high              REAL,
  low               REAL,
  volume            BIGINT,
  is_carried_forward INTEGER DEFAULT 0,
  created_at        TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (date, ticker),
  FOREIGN KEY (ticker) REFERENCES tickers(ticker)
);

CREATE INDEX IF NOT EXISTS idx_stock_daily_date ON stock_daily(date);
CREATE INDEX IF NOT EXISTS idx_stock_daily_ticker ON stock_daily(ticker);
CREATE INDEX IF NOT EXISTS idx_stock_daily_composite ON stock_daily(date, ticker);

-- 6. Per-ticker norm scores (replaces stock_fundamentals)
CREATE TABLE IF NOT EXISTS stock_scores (
  ticker        TEXT NOT NULL,
  score_date    TEXT NOT NULL,
  quality       REAL,
  growth        REAL,
  value         REAL,
  momentum      REAL,
  dividend      REAL,
  source        TEXT DEFAULT 'pipeline',
  created_at    TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (ticker, score_date),
  FOREIGN KEY (ticker) REFERENCES tickers(ticker)
);

CREATE INDEX IF NOT EXISTS idx_stock_scores_date ON stock_scores(score_date);
CREATE INDEX IF NOT EXISTS idx_stock_scores_final ON stock_scores(quality, growth, value, momentum, dividend);

-- 7. IDX80 scan snapshots (replaces idx_scan_data JSON blob)
CREATE TABLE IF NOT EXISTS idx80_scans (
  ticker        TEXT NOT NULL,
  scan_date     TEXT NOT NULL,
  current_price REAL,
  change_pct    REAL,
  pe_ratio      REAL,
  pb_ratio      REAL,
  market_cap    BIGINT,
  volume        BIGINT,
  dividend_yield REAL,
  week_52_high  REAL,
  week_52_low   REAL,
  created_at    TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (ticker, scan_date),
  FOREIGN KEY (ticker) REFERENCES tickers(ticker)
);

CREATE INDEX IF NOT EXISTS idx_idx80_scans_date ON idx80_scans(scan_date);

-- 8. Portfolios
CREATE TABLE IF NOT EXISTS portfolios (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  ticker        TEXT NOT NULL,
  shares        INTEGER NOT NULL DEFAULT 0,
  buy_price     REAL NOT NULL,
  added_at      TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_profiles(id),
  FOREIGN KEY (ticker) REFERENCES tickers(ticker),
  UNIQUE(user_id, ticker)
);

CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id, ticker);

-- 9. Cash holdings (extracted from users table)
CREATE TABLE IF NOT EXISTS cash_holdings (
  user_id       TEXT PRIMARY KEY,
  cash_amount   REAL NOT NULL DEFAULT 0,
  gold_grams    REAL NOT NULL DEFAULT 0,
  updated_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

-- 10. Watchlists
CREATE TABLE IF NOT EXISTS watchlists (
  user_id       TEXT NOT NULL,
  ticker        TEXT NOT NULL,
  added_at      TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, ticker),
  FOREIGN KEY (user_id) REFERENCES user_profiles(id),
  FOREIGN KEY (ticker) REFERENCES tickers(ticker)
);

-- 11. Trade logs
CREATE TABLE IF NOT EXISTS trade_logs (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  ticker        TEXT NOT NULL,
  action        TEXT NOT NULL CHECK(action IN ('buy', 'sell', 'gold_buy', 'gold_sell')),
  shares        INTEGER,
  grams         REAL,
  price         REAL NOT NULL,
  total         REAL NOT NULL,
  fee           REAL DEFAULT 0,
  tax           REAL DEFAULT 0,
  executed_at   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_profiles(id),
  FOREIGN KEY (ticker) REFERENCES tickers(ticker)
);

CREATE INDEX IF NOT EXISTS idx_trade_logs_user ON trade_logs(user_id, executed_at DESC);

-- 12. Backtest sessions
CREATE TABLE IF NOT EXISTS backtest_sessions (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  config_snapshot TEXT NOT NULL,
  date_start      TEXT NOT NULL,
  date_end        TEXT NOT NULL,
  status          TEXT DEFAULT 'running' CHECK(status IN ('running', 'completed', 'failed')),
  results_json    TEXT,
  started_at      TEXT DEFAULT (datetime('now')),
  completed_at    TEXT,
  FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_backtest_sessions_user ON backtest_sessions(user_id, started_at DESC);

-- 13. Backtest trade logs
CREATE TABLE IF NOT EXISTS backtest_logs (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL,
  date          TEXT NOT NULL,
  action        TEXT NOT NULL CHECK(action IN ('buy', 'sell', 'gold_buy', 'gold_sell', 'dividend', 'rebalance')),
  ticker        TEXT,
  shares        INTEGER,
  price         REAL,
  total         REAL,
  message       TEXT,
  FOREIGN KEY (session_id) REFERENCES backtest_sessions(id),
  FOREIGN KEY (ticker) REFERENCES tickers(ticker)
);

CREATE INDEX IF NOT EXISTS idx_backtest_logs_session ON backtest_logs(session_id, date);

-- 14. Strategy profiles
CREATE TABLE IF NOT EXISTS strategy_profiles (
  id              TEXT PRIMARY KEY,
  user_id         TEXT,
  name            TEXT NOT NULL,
  weight_quality  REAL NOT NULL DEFAULT 0.25,
  weight_growth   REAL NOT NULL DEFAULT 0.25,
  weight_value    REAL NOT NULL DEFAULT 0.25,
  weight_momentum REAL NOT NULL DEFAULT 0.25,
  weight_dividend REAL NOT NULL DEFAULT 0.00,
  is_default      INTEGER DEFAULT 0,
  created_at      TEXT DEFAULT (datetime('now')),
  updated_at      TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

-- 15. User strategy config
CREATE TABLE IF NOT EXISTS user_strategy_configs (
  user_id             TEXT PRIMARY KEY,
  active_profile_id   TEXT NOT NULL DEFAULT 'aman',
  simulation_mode     TEXT DEFAULT 'algo' CHECK(simulation_mode IN ('algo', 'custom', 'adaptive_dca')),
  top_n_count         INTEGER DEFAULT 5,
  crash_sensitivity   REAL DEFAULT 10,
  safe_haven_asset    TEXT DEFAULT 'emas' CHECK(safe_haven_asset IN ('emas', 'cash')),
  reserve_buffer_pct  REAL DEFAULT 50,
  enable_crossover    INTEGER DEFAULT 1,
  dca_active          INTEGER DEFAULT 1,
  universe            TEXT DEFAULT 'idx80',
  custom_universe     TEXT,
  data_feed           TEXT DEFAULT 'yahoo',
  updated_at          TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

-- 16. AI sessions
CREATE TABLE IF NOT EXISTS ai_sessions (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  title         TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  updated_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_sessions_user ON ai_sessions(user_id, updated_at DESC);

-- 17. AI messages
CREATE TABLE IF NOT EXISTS ai_messages (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL,
  role          TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
  content       TEXT NOT NULL,
  tool_calls    TEXT,
  tool_results  TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES ai_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON ai_messages(session_id, created_at);

-- 18. Notification rules
CREATE TABLE IF NOT EXISTS notification_rules (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  rule_type     TEXT NOT NULL CHECK(rule_type IN ('ticker_out_of_topn', 'crash_protection', 'universe_breach', 'custom')),
  ticker        TEXT,
  threshold     REAL,
  enabled       INTEGER DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_profiles(id),
  FOREIGN KEY (ticker) REFERENCES tickers(ticker)
);

-- 19. User notifications
CREATE TABLE IF NOT EXISTS user_notifications (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  rule_id       TEXT,
  type          TEXT NOT NULL,
  message       TEXT NOT NULL,
  is_read       INTEGER DEFAULT 0,
  created_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES user_profiles(id),
  FOREIGN KEY (rule_id) REFERENCES notification_rules(id)
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON user_notifications(user_id, created_at DESC);
