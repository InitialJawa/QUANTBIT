import sqlite3, json, os, math
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
JSON_PATH = DATA_DIR / "idx_fundamentals_all.json"
DB_PATH = DATA_DIR / "fundamentals.sqlite"

with open(JSON_PATH) as f:
    source_data = json.load(f)

db = sqlite3.connect(str(DB_PATH))
db.execute("PRAGMA journal_mode = DELETE")
db.execute("PRAGMA synchronous = OFF")

db.executescript("""
    CREATE TABLE IF NOT EXISTS fundamentals_yearly (
        ticker TEXT NOT NULL,
        year INTEGER NOT NULL,
        roe REAL,
        der REAL,
        roa REAL,
        net_margin REAL,
        eps REAL,
        book_value_per_share REAL,
        per REAL,
        price_bv REAL,
        total_equity REAL,
        total_assets REAL,
        total_sales REAL,
        ebt REAL,
        net_income REAL,
        shares_outstanding REAL,
        source TEXT NOT NULL DEFAULT 'idx_api',
        PRIMARY KEY (ticker, year)
    );

    CREATE INDEX IF NOT EXISTS idx_fy_ticker ON fundamentals_yearly(ticker);
    CREATE INDEX IF NOT EXISTS idx_fy_year ON fundamentals_yearly(year);
""")

def safe_float(v):
    if v is None:
        return None
    try:
        f = float(v)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (ValueError, TypeError):
        return None

insert_sql = """
    INSERT OR REPLACE INTO fundamentals_yearly
        (ticker, year, roe, der, roa, net_margin, eps, book_value_per_share,
         per, price_bv, total_equity, total_assets, total_sales, ebt, net_income, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'idx_api')
"""

total = 0
for entry in source_data:
    year_str = entry.get("year")
    if not year_str:
        continue
    try:
        year = int(year_str)
    except (ValueError, TypeError):
        continue

    records = entry.get("records", [])
    if not records:
        continue

    for r in records:
        ticker = (r.get("code") or "").strip()
        if not ticker:
            continue

        roe = safe_float(r.get("roe"))
        der = safe_float(r.get("deRatio"))
        roa = safe_float(r.get("roa"))
        npm = safe_float(r.get("npm"))
        eps = safe_float(r.get("eps"))
        bv = safe_float(r.get("bookValue"))
        per = safe_float(r.get("per"))
        pbv = safe_float(r.get("priceBV"))
        assets = safe_float(r.get("assets"))
        liabilities = safe_float(r.get("liabilities"))
        equity = safe_float(r.get("equity"))
        sales = safe_float(r.get("sales"))
        ebt = safe_float(r.get("ebt"))
        profit = safe_float(r.get("profitPeriod"))
        shares_float = safe_float(r.get("totalShares"))

        # Normalize ROE: 2021-2022 uses decimal (0.15=15%), 2023+ uses percentage (20.43=20.43%)
        if roe is not None and year <= 2022:
            if abs(roe) < 2:  # looks like decimal format
                roe = roe * 100

        # Normalize ROA: same pattern
        if roa is not None and year <= 2022:
            if abs(roa) < 2:  # looks like decimal format
                roa = roa * 100

        # Normalize NPM: if decimal format, convert to percentage
        if npm is not None and year <= 2022:
            if abs(npm) < 2:
                npm = npm * 100

        row = (
            ticker, year,
            roe, der, roa, npm,
            eps, bv, per, pbv,
            equity, assets, sales, ebt, profit
        )
        db.execute(insert_sql, row)
        total += 1

db.commit()

counts = db.execute("SELECT year, COUNT(*) FROM fundamentals_yearly GROUP BY year ORDER BY year").fetchall()
print(f"Total records inserted: {total}")
print(f"Records by year:")
for y, c in counts:
    print(f"  {y}: {c}")

ticker_count = db.execute("SELECT COUNT(DISTINCT ticker) FROM fundamentals_yearly").fetchone()[0]
print(f"Unique tickers: {ticker_count}")
print(f"Database: {DB_PATH}")
db.close()
