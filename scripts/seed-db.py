#!/usr/bin/env python3
"""
seed-db.py — Create + seed local SQLite DB with migration 0003 schema.

Creates data/historical_market.sqlite with tables:
  - daily_overview      (date, ihsg_close, gold_idr, usdidr_rate)
  - stock_daily         (date, ticker, close, adj_close, volume, rank_prod, rank_res, norm_score)
  - stock_fundamentals  (ticker, quality, growth, value, momentum, dividend, final_score, sector, industry)
  - engine_snapshots    (date, data)

Seeds from data/years/*.json and data/idx80_scan.json / idx_fundamentals_all.json / fundamental_snapshots.json.

Usage: python3 scripts/seed-db.py
"""

import json
import os
import sqlite3
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "historical_market.sqlite"
YEARS_DIR = ROOT / "data" / "years"

SCHEMA_SQL = """
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
"""


def open_db() -> sqlite3.Connection:
    db = sqlite3.connect(str(DB_PATH))
    db.execute("PRAGMA journal_mode=WAL")
    db.execute("PRAGMA synchronous=OFF")
    return db


def ensure_tables(db: sqlite3.Connection):
    db.executescript(SCHEMA_SQL)
    db.commit()
    print("  Tables created/verified.")


def seed_market_data(db: sqlite3.Connection):
    year_files = sorted(f for f in os.listdir(YEARS_DIR) if f.endswith(".json"))
    if not year_files:
        print("  No year JSON files found.")
        return

    cur = db.cursor()
    total_days = 0
    total_rows = 0

    for fname in year_files:
        path = YEARS_DIR / fname
        with open(path) as f:
            entries = json.load(f)
        print(f"  {fname}: {len(entries)} days")

        for day in entries:
            date = day["date"]
            cur.execute(
                "INSERT OR REPLACE INTO daily_overview (date, ihsg_close, gold_idr, usdidr_rate) "
                "VALUES (?, ?, ?, ?)",
                (date, day.get("ihsgPrice"), day.get("goldPrice"), day.get("usdidrRate")),
            )

            tickers = (day.get("stockPrices") or {}).keys()
            for ticker in tickers:
                norm_scores = (day.get("stockNormScores") or {}).get(ticker) or {}
                raw_metrics = json.dumps({
                    "open": (day.get("stockOpens") or {}).get(ticker),
                    "high": (day.get("stockHighs") or {}).get(ticker),
                    "low": (day.get("stockLows") or {}).get(ticker),
                    "norm_scores": norm_scores,
                })
                cur.execute(
                    "INSERT OR REPLACE INTO stock_daily (date, ticker, close, adj_close, volume, "
                    "rank_prod, rank_res, norm_score, raw_metrics) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        date,
                        ticker,
                        (day.get("stockPrices") or {}).get(ticker),
                        (day.get("stockAdjPrices") or {}).get(ticker),
                        (day.get("stockVolumes") or {}).get(ticker),
                        (day.get("stockRanksProd") or {}).get(ticker),
                        (day.get("stockRanksRes") or {}).get(ticker),
                        None,  # norm_score — stored as sub-object in raw_metrics
                        raw_metrics,
                    ),
                )
                total_rows += 1
            total_days += 1

        db.commit()

    print(f"  Done: {total_days} days, {total_rows} stock rows")


def seed_fundamentals(db: sqlite3.Connection):
    sources = [
        ROOT / "data" / "idx80_scan.json",
        ROOT / "data" / "idx_fundamentals_all.json",
        ROOT / "data" / "fundamental_snapshots.json",
    ]

    cur = db.cursor()
    total = 0

    for fp in sources:
        if not fp.exists():
            print(f"  SKIP (not found): {fp.name}")
            continue

        with open(fp) as f:
            raw = json.load(f)

        stocks = []
        if isinstance(raw, dict):
            stocks = raw.get("stocks") or raw.get("data") or []
            if not stocks and all(isinstance(v, dict) for v in raw.values()):
                # fundamental_snapshots format: {ticker: {year: {dividend_per_share}}}
                for ticker, years in raw.items():
                    for year, snap in years.items():
                        if isinstance(snap, dict) and snap.get("dividend_per_share", 0) > 0:
                            cur.execute(
                                "INSERT OR REPLACE INTO stock_fundamentals "
                                "(ticker, quality, growth, value, momentum, dividend, final_score, "
                                "sector, industry, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
                                (ticker.upper(), 0, 0, 0, 0, float(snap["dividend_per_share"]), 0, "", ""),
                            )
                            total += 1
                db.commit()
                print(f"  {fp.name}: (dividend snapshots) -> {total} total")
                continue
        elif isinstance(raw, list):
            stocks = raw

        for s in stocks:
            ticker = (s.get("ticker") or s.get("Ticker") or s.get("kode") or "").upper()
            if not ticker:
                continue
            cur.execute(
                "INSERT OR REPLACE INTO stock_fundamentals "
                "(ticker, quality, growth, value, momentum, dividend, final_score, sector, industry, updated_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))",
                (
                    ticker,
                    _float(s, "quality", "Quality", ("SCORES", "quality")),
                    _float(s, "growth", "Growth", ("SCORES", "growth")),
                    _float(s, "value", "Value", ("SCORES", "value")),
                    _float(s, "momentum", "Momentum", ("SCORES", "momentum")),
                    _float(s, "dividend", "Dividend", ("SCORES", "dividend")),
                    _float(s, "final_score", "FinalScore", "SCORE"),
                    s.get("sector") or s.get("Sector") or "",
                    s.get("industry") or s.get("Industry") or "",
                ),
            )
            total += 1
        db.commit()
        print(f"  {fp.name}: {len(stocks)} entries -> {total} total")

    print(f"  Done: {total} fundamentals rows")


def _float(obj, *keys):
    """Get nested float value from object, trying multiple key paths."""
    for key in keys:
        if isinstance(key, str):
            v = obj.get(key) if isinstance(obj, dict) else None
            if v is not None:
                try:
                    return float(v)
                except (ValueError, TypeError):
                    pass
        elif isinstance(key, (tuple, list)):
            # Nested path like ("SCORES", "quality")
            cur = obj
            for k in key:
                if isinstance(cur, dict):
                    cur = cur.get(k)
                else:
                    cur = None
                    break
            if cur is not None:
                try:
                    return float(cur)
                except (ValueError, TypeError):
                    pass
    return 0.0


def main():
    print("Seeding DB from data/years/*.json + idx scans\n")

    if not YEARS_DIR.exists():
        print(f"ERROR: years dir not found at {YEARS_DIR}")
        return 1

    db = open_db()
    ensure_tables(db)
    seed_market_data(db)
    seed_fundamentals(db)
    db.close()

    size_mb = os.path.getsize(DB_PATH) / 1024 / 1024
    print(f"\nDone. DB at: {DB_PATH} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    exit(main())
