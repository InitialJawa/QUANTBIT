"""
Fetch live market data for IDX80 tickers from Yahoo Finance and update idx80_scan.json.
Scores (quality, growth, value, momentum) are read from local SQLite stock_fundamentals
(populated from fetch_historical_data.ts norm_scores via seed-db.py). Falls back to
price-based computation when DB is unavailable.
"""
import json
import os
import time
import logging
import sqlite3
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

ROOT = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
SCAN_PATH = os.path.join(ROOT, "data", "idx80_scan.json")
DB_PATH = os.path.join(ROOT, "data", "historical_market.sqlite")


def load_scores_from_db():
    """Load quality/growth/value/momentum from local SQLite stock_fundamentals."""
    if not os.path.exists(DB_PATH):
        log.info("DB not found, will compute scores from price data")
        return None
    try:
        db = sqlite3.connect(DB_PATH)
        cur = db.cursor()
        cur.execute("SELECT ticker, quality, growth, value, momentum FROM stock_fundamentals WHERE quality > 0")
        scores = {}
        for row in cur.fetchall():
            ticker, quality, growth, value, momentum = row
            scores[ticker] = {"quality": quality, "growth": growth, "value": value, "momentum": momentum}
        db.close()
        log.info(f"Loaded {len(scores)} score records from DB")
        return scores
    except Exception as e:
        log.warning(f"Failed to load scores from DB: {e}")
        return None

TICKERS = [
    "AADI.JK", "AKRA.JK", "ADRO.JK", "ADMR.JK", "AMRT.JK", "ASII.JK", "ANTM.JK",
    "BBCA.JK", "BBRI.JK", "BBNI.JK", "AMMN.JK", "BBTN.JK", "BMRI.JK", "BRPT.JK",
    "BUMI.JK", "CUAN.JK", "EMTK.JK", "DEWA.JK", "ESSA.JK", "CPIN.JK", "GOTO.JK",
    "EXCL.JK", "HRTA.JK", "ICBP.JK", "INDF.JK", "INKP.JK", "ITMG.JK", "JPFA.JK",
    "INCO.JK", "KLBF.JK", "ISAT.JK", "MBMA.JK", "MAPI.JK", "PGAS.JK", "PGEO.JK",
    "PTBA.JK", "MDKA.JK", "SCMA.JK", "SMGR.JK", "MEDC.JK", "TLKM.JK", "UNVR.JK",
    "WIFI.JK", "BREN.JK", "TPIA.JK", "UNTR.JK", "BYAN.JK", "MIKA.JK", "ENRG.JK",
    "INDY.JK", "TOWR.JK", "MIDI.JK", "MAPA.JK", "ACES.JK", "BUKA.JK", "HRUM.JK",
    "BNGA.JK", "ARTO.JK", "BDMN.JK", "BRIS.JK", "JSMR.JK", "NISP.JK", "WIKA.JK",
    "ADHI.JK", "PTPP.JK", "WSKT.JK", "PNBN.JK", "INTP.JK", "SMRA.JK", "CTRA.JK",
    "ASRI.JK", "PWON.JK", "TBIG.JK", "TINS.JK", "MTEL.JK", "BSDE.JK", "SMDR.JK",
    "TMAS.JK", "NELY.JK", "SIDO.JK", "MYOR.JK", "ULTJ.JK", "CLEO.JK", "ROTI.JK",
    "WOOD.JK", "TKIM.JK", "SMAR.JK", "LSIP.JK", "TRAM.JK", "TRIL.JK", "MYRX.JK",
    "RIMO.JK", "KREN.JK", "SUGI.JK", "NUSA.JK",
    "^JKSE", "IDR=X",
]

FIELD_MAP = {
    "shortName": "companyName",
    "longName": "companyName",
    "sector": "sector",
    "industry": "industry",
    "longBusinessSummary": "longBusinessSummary",
    "currentPrice": "currentPrice",
    "regularMarketChangePercent": "changePercent",
    "volume": "volume",
    "trailingPE": "peRatio",
    "priceToBook": "pbRatio",
    "dividendYield": "dividendYield",
    "marketCap": "marketCap",
    "trailingEps": "trailingEps",
    "fiftyTwoWeekHigh": "fiftyTwoWeekHigh",
    "fiftyTwoWeekLow": "fiftyTwoWeekLow",
    "fiftyDayAverage": "fiftyDayAverage",
    "twoHundredDayAverage": "twoHundredDayAverage",
    "totalRevenue": "totalRevenue",
    "netIncomeToCommon": "netIncome",
    "operatingCashflow": "operatingCashflow",
    "freeCashflow": "freeCashflow",
    "grossProfits": "grossProfit",
    "ebitda": "ebitda",
    "revenueGrowth": "revenueGrowth",
    "earningsGrowth": "earningsGrowth",
    "returnOnEquity": "returnOnEquity",
    "debtToEquity": "debtToEquity",
    "operatingMargins": "operatingMargin",
    "grossMargins": "grossMargins",
}


def fetch_ticker(yf, ticker, retries=3):
    for attempt in range(retries):
        try:
            t = yf.Ticker(ticker)
            info = t.info
            if not info or info.get("quoteType") is None:
                raise ValueError("empty info")
            return info
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2)
            else:
                log.warning(f"Failed {ticker}: {e}")
                return None


def build_stock(ticker, info, scores=None):
    now = datetime.now(timezone.utc).isoformat()
    stock = {"ticker": ticker, "lastUpdated": now}

    company = info.get("longName") or info.get("shortName") or ""
    stock["companyName"] = company

    for yf_key, our_key in FIELD_MAP.items():
        if yf_key in ("shortName", "longName"):
            continue
        val = info.get(yf_key)
        if val is not None:
            if our_key == "dividendYield" and val is not None:
                val = round(val * 100, 4)
            stock[our_key] = val

    for field in ["sector", "industry", "longBusinessSummary", "currentPrice",
                  "changePercent", "volume", "peRatio", "pbRatio", "dividendYield",
                  "marketCap", "trailingEps", "fiftyTwoWeekHigh", "fiftyTwoWeekLow",
                  "fiftyDayAverage", "twoHundredDayAverage", "totalRevenue", "netIncome",
                  "operatingCashflow", "freeCashflow", "grossProfit", "ebitda",
                  "revenueGrowth", "earningsGrowth", "returnOnEquity", "debtToEquity",
                  "operatingMargin", "grossMargins"]:
        stock.setdefault(field, None)

    if scores:
        stock["quality"] = round(scores.get("quality", 50), 2)
        stock["growth"] = round(scores.get("growth", 50), 2)
        stock["value"] = round(scores.get("value", 50), 2)
        stock["momentum"] = round(scores.get("momentum", 50), 2)
    else:
        for field in ["quality", "value", "growth", "momentum"]:
            stock.setdefault(field, 50)

    return stock


def compute_scores_from_prices(closes):
    """Fallback: compute quality/growth/value/momentum from price history.
    Mirrors functions/api/[[path]].ts compute* functions for consistency with runIdx80Scan."""
    scores = {"quality": 50, "growth": 50, "value": 50, "momentum": 50}

    if len(closes) < 10:
        return scores

    # Momentum: 5-day avg vs 15-day-old avg
    if len(closes) >= 20:
        recent = sum(closes[-5:]) / 5
        older = sum(closes[-20:-15]) / 5
        pct_diff = ((recent - older) / max(older, 1)) * 100
        scores["momentum"] = max(0, min(100, 50 + pct_diff * 7))

    # Quality: price stability vs median
    sorted_c = sorted(closes)
    median = sorted_c[len(sorted_c) // 2]
    latest = closes[-1]
    stability = 1 - abs(latest - median) / max(median, 1)
    scores["quality"] = max(0, min(100, 50 + stability * 30))

    # Value: inverse percentile in range
    if len(closes) >= 20:
        mn, mx = min(closes), max(closes)
        if mx - mn >= 1:
            percentile = (latest - mn) / (mx - mn)
            scores["value"] = max(0, min(100, (1 - percentile) * 60 + 20))

    # Growth: total return
    if len(closes) >= 20:
        first = closes[0]
        total_return = ((latest - first) / max(first, 1)) * 100
        scores["growth"] = max(0, min(100, 50 + total_return * 2))

    return scores


def load_existing():
    if os.path.exists(SCAN_PATH):
        with open(SCAN_PATH) as f:
            return json.load(f)
    return {"lastUpdated": None, "stocks": []}


def fetch_yahoo_prices_60d(ticker):
    """Fetch ~60 trading days of closing prices for score computation."""
    import urllib.request
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.request.quote(ticker)}?range=3mo&interval=1d"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
        result = data.get("chart", {}).get("result", [{}])[0]
        quotes = result.get("indicators", {}).get("quote", [{}])[0]
        opens = quotes.get("open", [])
        closes = []
        for i, o in enumerate(opens):
            if o is not None:
                c = (quotes.get("close", []) or [None] * len(opens))[i]
                if c is not None:
                    closes.append(c)
        return closes
    except Exception as e:
        log.warning(f"Failed to fetch 60d prices for {ticker}: {e}")
        return None


def main():
    try:
        import yfinance as yf
    except ImportError:
        log.error("yfinance not installed. Run: pip install yfinance")
        return 1

    db_scores = load_scores_from_db()
    use_db_scores = db_scores is not None
    if not use_db_scores:
        log.info("DB scores unavailable — will compute from price data")

    existing = load_existing()
    existing_map = {s["ticker"]: s for s in existing.get("stocks", [])}

    stocks = []
    total = len(TICKERS)
    for i, ticker in enumerate(TICKERS):
        log.info(f"[{i+1}/{total}] Fetching {ticker}")
        info = fetch_ticker(yf, ticker)
        ticker_key = ticker.replace(".JK", "")
        scores = None
        if use_db_scores:
            scores = db_scores.get(ticker_key) or db_scores.get(ticker)
        if info:
            stock = build_stock(ticker, info, scores)
            stocks.append(stock)
        else:
            price = fetch_yahoo_prices_60d(ticker)
            if price:
                now = datetime.now(timezone.utc).isoformat()
                stock = {"ticker": ticker, "currentPrice": price[-1], "lastUpdated": now}
                for field in ["sector", "industry", "longBusinessSummary", "changePercent",
                              "volume", "peRatio", "pbRatio", "dividendYield", "marketCap",
                              "trailingEps", "fiftyTwoWeekHigh", "fiftyTwoWeekLow",
                              "fiftyDayAverage", "twoHundredDayAverage", "totalRevenue",
                              "netIncome", "operatingCashflow", "freeCashflow", "grossProfit",
                              "ebitda", "revenueGrowth", "earningsGrowth", "returnOnEquity",
                              "debtToEquity", "operatingMargin", "grossMargins"]:
                    stock.setdefault(field, None)
                sc = scores if scores else compute_scores_from_prices(price)
                stock["quality"] = round(sc.get("quality", 50), 2)
                stock["growth"] = round(sc.get("growth", 50), 2)
                stock["value"] = round(sc.get("value", 50), 2)
                stock["momentum"] = round(sc.get("momentum", 50), 2)
                stocks.append(stock)
            elif ticker in existing_map:
                log.info(f"  Using cached data for {ticker}")
                s = dict(existing_map[ticker])
                if scores:
                    s["quality"] = round(scores.get("quality", 50), 2)
                    s["growth"] = round(scores.get("growth", 50), 2)
                    s["value"] = round(scores.get("value", 50), 2)
                    s["momentum"] = round(scores.get("momentum", 50), 2)
                stocks.append(s)
        time.sleep(0.3)

    now = datetime.now(timezone.utc).isoformat()
    result = {"lastUpdated": now, "stocks": stocks}

    with open(SCAN_PATH, "w") as f:
        json.dump(result, f, indent=2)

    log.info(f"OK: idx80_scan.json updated — {len(stocks)} tickers, timestamp {now}")
    return 0


if __name__ == "__main__":
    exit(main())
