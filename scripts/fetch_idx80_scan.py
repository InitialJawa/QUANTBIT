"""
Fetch live market data for IDX80 tickers from Yahoo Finance and update idx80_scan.json.
"""
import json
import os
import time
import logging
from datetime import datetime, timezone

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

ROOT = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
SCAN_PATH = os.path.join(ROOT, "data", "idx80_scan.json")

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


def build_stock(ticker, info):
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

    for field in ["quality", "value", "growth", "momentum"]:
        stock.setdefault(field, 0)

    return stock


def load_existing():
    if os.path.exists(SCAN_PATH):
        with open(SCAN_PATH) as f:
            return json.load(f)
    return {"lastUpdated": None, "stocks": []}


def fetch_yahoo_price(symbol):
    import urllib.request
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.request.quote(symbol)}?range=1d&interval=1d"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        resp = urllib.request.urlopen(req, timeout=10)
        data = json.loads(resp.read())
        meta = data.get("chart", {}).get("result", [{}])[0].get("meta", {})
        return meta.get("regularMarketPrice")
    except Exception as e:
        log.warning(f"urllib fallback failed for {symbol}: {e}")
        return None


def main():
    try:
        import yfinance as yf
    except ImportError:
        log.error("yfinance not installed. Run: pip install yfinance")
        return 1

    existing = load_existing()
    existing_map = {s["ticker"]: s for s in existing.get("stocks", [])}

    stocks = []
    total = len(TICKERS)
    for i, ticker in enumerate(TICKERS):
        log.info(f"[{i+1}/{total}] Fetching {ticker}")
        info = fetch_ticker(yf, ticker)
        if info:
            stock = build_stock(ticker, info)
            if stock.get("currentPrice") is None:
                price = fetch_yahoo_price(ticker)
                if price is not None:
                    stock["currentPrice"] = price
            stocks.append(stock)
        else:
            price = fetch_yahoo_price(ticker)
            if price is not None:
                now = datetime.now(timezone.utc).isoformat()
                stock = {"ticker": ticker, "currentPrice": price, "lastUpdated": now}
                for field in ["sector", "industry", "longBusinessSummary", "changePercent",
                              "volume", "peRatio", "pbRatio", "dividendYield", "marketCap",
                              "trailingEps", "fiftyTwoWeekHigh", "fiftyTwoWeekLow",
                              "fiftyDayAverage", "twoHundredDayAverage", "totalRevenue",
                              "netIncome", "operatingCashflow", "freeCashflow", "grossProfit",
                              "ebitda", "revenueGrowth", "earningsGrowth", "returnOnEquity",
                              "debtToEquity", "operatingMargin", "grossMargins"]:
                    stock.setdefault(field, None)
                for field in ["quality", "value", "growth", "momentum"]:
                    stock.setdefault(field, 0)
                stocks.append(stock)
            elif ticker in existing_map:
                log.info(f"  Using cached data for {ticker}")
                stocks.append(existing_map[ticker])
        time.sleep(0.3)

    now = datetime.now(timezone.utc).isoformat()
    result = {"lastUpdated": now, "stocks": stocks}

    with open(SCAN_PATH, "w") as f:
        json.dump(result, f, indent=2)

    log.info(f"OK: idx80_scan.json updated — {len(stocks)} tickers, timestamp {now}")
    return 0


if __name__ == "__main__":
    exit(main())
