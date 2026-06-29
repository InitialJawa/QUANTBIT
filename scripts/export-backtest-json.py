#!/usr/bin/env python3
"""
export-backtest-json.py — Export historical market data from SQLite to the
exact same JSON format as data/years/*.json (per-day nested dicts).

Run: python3 scripts/export-backtest-json.py [start_date] [end_date]
Outputs JSON array of day entries to stdout.

This ensures server.ts and functions/ both read from the same DB schema.
"""

import json
import os
import sqlite3
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, "data", "historical_market.sqlite")


def main():
    start_date = sys.argv[1] if len(sys.argv) > 1 else "2000-01-01"
    end_date = sys.argv[2] if len(sys.argv) > 2 else "2100-12-31"

    if not os.path.exists(DB_PATH):
        json.dump({"error": f"DB not found at {DB_PATH}"}, sys.stdout)
        sys.exit(1)

    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    cur = db.cursor()

    # 1. Get daily_overview for date range
    cur.execute(
        "SELECT date, ihsg_close, gold_idr, usdidr_rate FROM daily_overview "
        "WHERE date >= ? AND date <= ? ORDER BY date",
        (start_date, end_date),
    )
    overview_rows = {row["date"]: dict(row) for row in cur.fetchall()}
    dates = sorted(overview_rows.keys())

    if not dates:
        json.dump({"error": "No data for range"}, sys.stdout)
        db.close()
        sys.exit(1)

    # 2. Get stock_daily for same range
    cur.execute(
        "SELECT date, ticker, close, adj_close, volume, rank_prod, rank_res, "
        "norm_score, raw_metrics FROM stock_daily "
        "WHERE date >= ? AND date <= ? ORDER BY date, ticker",
        (start_date, end_date),
    )
    stock_rows = cur.fetchall()
    db.close()

    # Group stock rows by date
    stocks_by_date: dict = {}
    for row in stock_rows:
        r = dict(row)
        date = r.pop("date")
        ticker = r.pop("ticker")
        if date not in stocks_by_date:
            stocks_by_date[date] = {}
        stocks_by_date[date][ticker] = r

    # 3. Reconstruct per-day entries
    result = []
    for date in dates:
        day_stocks = stocks_by_date.get(date, {})
        stock_prices = {}
        stock_adj_prices = {}
        stock_volumes = {}
        stock_norm_scores = {}
        stock_ranks_prod = {}
        stock_ranks_res = {}

        for ticker, s in day_stocks.items():
            if s["close"] is not None:
                stock_prices[ticker] = s["close"]
            if s["adj_close"] is not None:
                stock_adj_prices[ticker] = s["adj_close"]
            if s["volume"] is not None:
                stock_volumes[ticker] = s["volume"]
            if s["rank_prod"] is not None:
                stock_ranks_prod[ticker] = s["rank_prod"]
            if s["rank_res"] is not None:
                stock_ranks_res[ticker] = s["rank_res"]

            # Parse norm_scores from raw_metrics JSON
            if s["raw_metrics"]:
                try:
                    raw = json.loads(s["raw_metrics"])
                    if "norm_scores" in raw:
                        stock_norm_scores[ticker] = raw["norm_scores"]
                except (json.JSONDecodeError, TypeError):
                    pass

        od = overview_rows[date]
        entry = {
            "date": date,
            "ihsgPrice": od["ihsg_close"],
            "goldPrice": od["gold_idr"],
            "usdidrRate": od["usdidr_rate"],
            "stockPrices": stock_prices,
            "stockAdjPrices": stock_adj_prices,
            "stockVolumes": stock_volumes,
            "stockNormScores": stock_norm_scores,
            "stockRanksProd": stock_ranks_prod,
            "stockRanksRes": stock_ranks_res,
        }
        result.append(entry)

    json.dump(result, sys.stdout)


if __name__ == "__main__":
    main()
