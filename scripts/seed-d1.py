#!/usr/bin/env python3
"""Seed remote D1 database from local SQLite via Cloudflare API directly.

Usage:
    export CLOUDFLARE_API_TOKEN=...
    export CLOUDFLARE_ACCOUNT_ID=...
    python3 scripts/seed-d1.py
"""

import json
import os
import sqlite3
import sys
import time
import urllib.request
import urllib.error

LOCAL_DB = os.path.join(os.path.dirname(__file__), "..", "data", "historical_market.sqlite")
DB_ID = "6535096c-b60e-44c3-8b8a-308f0897b980"

# D1 limit: ~80KB per statement. Each table row is ~X bytes.
# Per-table chunk sizes calculated from avg row size:
STOCK_DAILY_CHUNK = 250    # 250 rows × 250 bytes ≈ 62KB
OVERVIEW_CHUNK = 1000      # 1000 rows × 65 bytes ≈ 65KB
FUNDAMENTALS_CHUNK = 192   # all in one


def d1_query(sql: str) -> dict:
    token = os.environ["CLOUDFLARE_API_TOKEN"]
    account = os.environ["CLOUDFLARE_ACCOUNT_ID"]
    url = f"https://api.cloudflare.com/client/v4/accounts/{account}/d1/database/{DB_ID}/query"
    body = json.dumps({"sql": sql}).encode()
    req = urllib.request.Request(
        url, data=body,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST"
    )
    resp = urllib.request.urlopen(req, timeout=60)
    return json.loads(resp.read())


def esc(val):
    if val is None:
        return "NULL"
    if isinstance(val, (int, float)):
        return str(val)
    return "'" + str(val).replace("'", "''") + "'"


def seed_table(table: str, columns: list, rows: list, chunk_size: int):
    if not rows:
        print(f"  {table}: 0 rows, skip")
        return True

    col_list = ", ".join(columns)
    n = len(rows)
    print(f"  {table}: {n} rows ({chunk_size} per batch)")
    failed = 0
    start_time = time.time()

    for start in range(0, n, chunk_size):
        batch = rows[start:start + chunk_size]
        values = ["(" + ", ".join(esc(v) for v in row) + ")" for row in batch]
        sql = f"INSERT OR REPLACE INTO {table} ({col_list}) VALUES\n"
        sql += ",\n".join(values) + ";"

        batch_no = start // chunk_size + 1
        total = n // chunk_size + (1 if n % chunk_size else 0)
        label = f"  [{batch_no}/{total}]"

        t0 = time.time()
        try:
            result = d1_query(sql)
            elapsed = time.time() - t0
            if result.get("success"):
                print(f"\r{label} OK ({elapsed:.1f}s)" + " " * 20)
            else:
                err = result.get("errors", [{}])[0].get("message", "?")
                print(f"\r{label} FAIL: {err[:100]}" + " " * 20)
                failed += 1
                if failed >= 3:
                    print("  Too many failures, aborting")
                    return False
        except urllib.error.HTTPError as e:
            elapsed = time.time() - t0
            err_body = e.read().decode()
            print(f"\r{label} HTTP {e.code}: {err_body[:200]}" + " " * 20)
            failed += 1
            if failed >= 3:
                return False
        except Exception as e:
            elapsed = time.time() - t0
            print(f"\r{label} ERROR: {str(e)[:100]}" + " " * 20)
            failed += 1
            if failed >= 3:
                return False

    elapsed = time.time() - start_time
    print(f"  {table}: done in {elapsed:.0f}s")
    return True


def verify():
    print("\nVerifying...")
    conn = sqlite3.connect(LOCAL_DB)
    ok = True
    for table in ["daily_overview", "stock_daily", "stock_fundamentals"]:
        local_count = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
        try:
            result = d1_query(f"SELECT COUNT(*) as cnt FROM {table}")
            if isinstance(result, list):
                remote_count = result[0]["results"][0]["cnt"]
            else:
                remote_count = result["result"][0]["results"][0]["cnt"]
            match = "OK" if local_count == remote_count else "MISMATCH"
            if match != "OK":
                ok = False
            print(f"  {table}: local={local_count} remote={remote_count} {match}")
        except Exception as e:
            print(f"  {table}: verify error — {e}")
            ok = False
    conn.close()
    return ok


def main():
    if not os.path.exists(LOCAL_DB):
        print(f"ERROR: {LOCAL_DB} not found")
        return 1
    if not os.environ.get("CLOUDFLARE_API_TOKEN"):
        print("ERROR: CLOUDFLARE_API_TOKEN not set")
        return 1
    if not os.environ.get("CLOUDFLARE_ACCOUNT_ID"):
        print("ERROR: CLOUDFLARE_ACCOUNT_ID not set")
        return 1

    conn = sqlite3.connect(LOCAL_DB)

    rows = conn.execute(
        "SELECT date, ihsg_close, gold_idr, usdidr_rate FROM daily_overview ORDER BY date"
    ).fetchall()
    if not seed_table("daily_overview", ["date", "ihsg_close", "gold_idr", "usdidr_rate"],
                       rows, OVERVIEW_CHUNK):
        return 1

    rows = conn.execute(
        "SELECT date, ticker, close, adj_close, volume, rank_prod, rank_res, norm_score, raw_metrics "
        "FROM stock_daily ORDER BY date"
    ).fetchall()
    if not seed_table("stock_daily",
                       ["date", "ticker", "close", "adj_close", "volume", "rank_prod", "rank_res",
                        "norm_score", "raw_metrics"],
                       rows, STOCK_DAILY_CHUNK):
        return 1

    rows = conn.execute(
        "SELECT ticker, quality, growth, value, momentum, dividend, final_score, sector, industry, updated_at "
        "FROM stock_fundamentals ORDER BY ticker"
    ).fetchall()
    if not seed_table("stock_fundamentals",
                       ["ticker", "quality", "growth", "value", "momentum", "dividend", "final_score",
                        "sector", "industry", "updated_at"],
                       rows, FUNDAMENTALS_CHUNK):
        return 1

    conn.close()
    verify()
    print("\nDone.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
