"""
Post-processor: generate live_market.json from idx80_scan.json data.
Reads the latest IDX80 scan, calculates changes, and writes a fresh live_market.json.
"""
import json
import os
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
SCAN_PATH = os.path.join(ROOT, "data", "idx80_scan.json")
LIVE_PATH = os.path.join(ROOT, "data", "live_market.json")


def load_json(path):
    if not os.path.exists(path):
        return None
    with open(path, "r") as f:
        return json.load(f)


def save_json(path, data):
    with open(path, "w") as f:
        json.dump(data, f, indent=2)


def compute_change(current, previous):
    if previous and previous != 0:
        return round((current - previous) / previous * 100, 2)
    return 0


def main():
    scan = load_json(SCAN_PATH)
    if not scan:
        print("ERROR: idx80_scan.json not found")
        return 1

    existing_live = load_json(LIVE_PATH)
    stocks = scan.get("stocks", [])
    stock_map = {s["ticker"].replace(".JK", ""): s for s in stocks}

    # --- IHSG from ^JKSE ticker ---
    ihsg_ticker = stock_map.get("^JKSE", {})
    ihsg_price = ihsg_ticker.get("currentPrice", 6101)
    ihsg_prev = None
    if existing_live:
        ihsg_prev = existing_live.get("ihsg", {}).get("value")

    # --- USDIDR from IDR=X ticker ---
    usdidr_ticker = stock_map.get("IDR", {}) or stock_map.get("IDR=X", {})
    usdidr_price = usdidr_ticker.get("currentPrice") or (existing_live.get("usdidr", {}).get("value") if existing_live else None) or 17840
    usdidr_prev = None
    if existing_live:
        usdidr_prev = existing_live.get("usdidr", {}).get("value")

    # --- Gold from GC=F ticker (USD/oz, convert to IDR/gram) ---
    gold_ticker = stock_map.get("GC", {}) or stock_map.get("GC=F", {})
    gold_usd_per_oz = gold_ticker.get("currentPrice", None)
    if gold_usd_per_oz is None:
        try:
            import urllib.request
            gurl = "https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?range=1d&interval=1d"
            gresp = urllib.request.urlopen(urllib.request.Request(gurl, headers={"User-Agent": "Mozilla/5.0"}), timeout=10)
            gdata = json.loads(gresp.read())
            gmeta = gdata.get("chart", {}).get("result", [{}])[0].get("meta", {})
            gold_usd_per_oz = gmeta.get("regularMarketPrice", None)
        except Exception as e:
            print(f"  Warning: could not fetch gold from Yahoo: {e}")
    if gold_usd_per_oz is not None:
        gold_price = round((gold_usd_per_oz * usdidr_price) / 31.1035)
    else:
        gold_price = existing_live.get("gold", {}).get("value", 2493304) if existing_live else 2493304
    gold_prev = None
    if existing_live:
        gold_prev = existing_live.get("gold", {}).get("value")

    # --- Oil ---
    oil_prev = None
    if existing_live:
        oil_prev = existing_live.get("oil", {}).get("value")

    # --- Stock prices (top liquid) ---
    tracked = ["BBCA", "BBRI", "BMRI", "TLKM", "ASII", "ADRO", "PTBA", "ESSA", "GOTO"]
    stock_prices = {}
    for t in tracked:
        s = stock_map.get(t)
        if s:
            stock_prices[t] = s["currentPrice"]
        elif existing_live and t in existing_live.get("stock_prices", {}):
            stock_prices[t] = existing_live["stock_prices"][t]
        else:
            stock_prices[t] = 0

    now = datetime.now()
    live = {
        "last_update": now.strftime("%Y-%m-%d"),
        "market_last_update": scan.get("lastUpdated", now.strftime("%Y-%m-%d %H:%M:%S WIB")),
        "ihsg": {
            "value": ihsg_price,
            "daily": compute_change(ihsg_price, ihsg_prev) if ihsg_prev else 0,
            "weekly": 0,
            "monthly": 0,
        },
        "usdidr": {
            "value": usdidr_price,
            "daily": compute_change(usdidr_price, usdidr_prev) if usdidr_prev else 0,
            "weekly": 0,
            "monthly": 0,
        },
        "gold": {
            "value": gold_price,
            "daily": compute_change(gold_price, gold_prev) if gold_prev else 0,
            "weekly": 0,
            "monthly": 0,
        },
        "oil": {
            "value": existing_live.get("oil", {}).get("value", 88) if existing_live else 88,
            "daily": 0,
            "weekly": 0,
            "monthly": 0,
        },
        "stock_prices": stock_prices,
    }

    save_json(LIVE_PATH, live)
    print(f"OK: live_market.json updated from {SCAN_PATH}")
    print(f"    IHSG: {ihsg_price}, USDIDR: {usdidr_price}, Gold: {gold_price}")
    print(f"    Stocks: {len([v for v in stock_prices.values() if v > 0])}/{len(tracked)} found")

    return 0


if __name__ == "__main__":
    exit(main())
