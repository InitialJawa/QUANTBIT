"""
Standalone scraper for IDX financial ratios.
Scrapes the official IDX API for all listed companies, all years 2000-2026.
Free, no API key needed.
"""
import os
import sys
import json
import time
from urllib.parse import urlencode
from curl_cffi import requests

BASE_URL = "https://www.idx.co.id/primary/DigitalStatistic/GetApiDataPaginated"
DATA_DIR = os.path.join(os.path.dirname(os.path.realpath(__file__)), "..", "data")
OUTPUT_FILE = os.path.join(DATA_DIR, "idx_fundamentals_all.json")

HEADERS = {
    "accept": "application/json, text/plain, */*",
    "accept-language": "en-US,en;q=0.9",
    "referer": "https://www.idx.co.id/id/data-pasar/laporan-statistik/digital-statistic/monthly/financial-report-and-ratio-of-listed-companies/financial-data-and-ratio",
}

YEAR_START = 2000
YEAR_END = 2026


def build_url(page_number: int, year: int) -> str:
    params = {
        "urlName": "LINK_FINANCIAL_DATA_RATIO",
        "periodQuarter": 4,
        "periodYear": year,
        "type": "yearly",
        "isPrint": "false",
        "cumulative": "false",
        "pageSize": 100,
        "pageNumber": page_number,
        "orderBy": "",
        "search": "",
    }
    return f"{BASE_URL}?{urlencode(params)}"


def fetch_page(url: str) -> dict | None:
    for attempt in range(2):
        try:
            r = requests.get(url, headers=HEADERS, impersonate="chrome", timeout=(10, 30))
            if r.status_code == 200:
                return r.json()
            elif r.status_code == 429:
                wait = 30 * (attempt + 1)
                print(f"  429 rate limit, waiting {wait}s...")
                time.sleep(wait)
            else:
                print(f"  HTTP {r.status_code}, retrying...")
                time.sleep(3)
        except requests.RequestsError as e:
            print(f"  Connection error: {e}")
            break
        except Exception as e:
            print(f"  Error: {e}, retrying...")
            time.sleep(5)
    return None


def scrape_year(year: int) -> list[dict]:
    all_records = []
    page = 1
    # First page check: if no records and totalItems is 0/None, skip this year
    url = build_url(page, year)
    data = fetch_page(url)
    if not data:
        return []
    records = data.get("data", [])
    meta = data.get("meta", {})
    total_items = meta.get("totalItems", 0)
    real_records = [r for r in records if r.get("code")]
    if total_items == 0 or not real_records:
        print(f"  No data for year {year}")
        return []
    all_records.extend(real_records)
    print(f"  Page 1: {len(real_records)} records (total {total_items})")
    page += 1
    time.sleep(0.5)

    while len(all_records) < total_items:
        url = build_url(page, year)
        print(f"  Page {page}...", end=" ", flush=True)
        data = fetch_page(url)
        if not data:
            break
        records = data.get("data", [])
        real_records = [r for r in records if r.get("code")]
        all_records.extend(real_records)
        print(f" got {len(real_records)} (total: {len(all_records)}/{total_items})")
        page += 1
        time.sleep(0.5)

    return all_records


def main():
    os.makedirs(DATA_DIR, exist_ok=True)

    # Check for existing combined file to resume
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r") as f:
            existing = json.load(f)
        existing_by_year = {y["year"]: y for y in existing} if isinstance(existing, list) else {}
        print(f"Loaded existing data with {len(existing_by_year)} years")
    else:
        existing_by_year = {}

    all_years_data = list(existing_by_year.values())

    for year in range(YEAR_START, YEAR_END + 1):
        if year in existing_by_year:
            count = len(existing_by_year[year].get("records", []))
            print(f"[{year}] Skipping (already have {count} records)")
            continue

        print(f"\n[{year}] Scraping...")
        records = scrape_year(year)
        if not records:
            print(f"[{year}] No data (IDX may not have records for this year)")
            # still save empty entry so we don't retry
            all_years_data.append({"year": year, "count": 0, "records": []})
        else:
            all_years_data.append({"year": year, "count": len(records), "records": records})
            print(f"[{year}] Saved {len(records)} records")

        # Save after each year so we can resume on interrupt
        with open(OUTPUT_FILE, "w") as f:
            json.dump(all_years_data, f, indent=2)

    total_records = sum(y["count"] for y in all_years_data)
    print(f"\nDone! {len(all_years_data)} years, {total_records} total records")
    print(f"Saved to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
