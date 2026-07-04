-- Migration 0006: Backtest Intermediate Table
-- Pre-computed technical indicators for fast backtest strategy computation.
-- Populated by scripts/compute-intermediate.ts, updated every 6 hours.

CREATE TABLE IF NOT EXISTS backtest_intermediate (
  date          TEXT NOT NULL,
  ticker        TEXT NOT NULL,
  close         REAL,
  sma20         REAL,
  sma50         REAL,
  sma200        REAL,
  rsi14         REAL,
  macd          REAL,
  macd_signal   REAL,
  atr14         REAL,
  max_drawdown  REAL,
  volume        BIGINT,
  created_at    TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (date, ticker),
  FOREIGN KEY (ticker) REFERENCES tickers(ticker)
);

CREATE INDEX IF NOT EXISTS idx_intermediate_date ON backtest_intermediate(date);
CREATE INDEX IF NOT EXISTS idx_intermediate_ticker ON backtest_intermediate(ticker);
