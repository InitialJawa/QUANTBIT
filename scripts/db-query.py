#!/usr/bin/env python3
"""
db-query.py — Read-only SQLite query bridge for Node.js.

Usage:
  python3 scripts/db-query.py <sql> <params_json>
  python3 scripts/db-query.py "SELECT * FROM daily_overview WHERE date >= ? AND date <= ? ORDER BY date" '["2021-01-01","2026-12-31"]'

Outputs JSON array of rows (stdout). Errors to stderr.
"""

import json
import os
import sqlite3
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT, "data", "historical_market.sqlite")


def main():
    if len(sys.argv) < 2:
        print("Usage: db-query.py <sql> [params_json]", file=sys.stderr)
        sys.exit(1)

    sql = sys.argv[1]
    params = json.loads(sys.argv[2]) if len(sys.argv) > 2 else []

    if not os.path.exists(DB_PATH):
        json.dump({"error": f"DB not found at {DB_PATH}"}, sys.stdout)
        sys.exit(1)

    try:
        db = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
        cur = db.cursor()
        cur.execute(sql, params)
        rows = [dict(row) for row in cur.fetchall()]
        db.close()
        json.dump(rows, sys.stdout, default=str)
    except Exception as e:
        json.dump({"error": str(e)}, sys.stdout)
        sys.exit(1)


if __name__ == "__main__":
    main()
