#!/usr/bin/env python3
"""Pull monthly IDX fundamental snapshots from IDX API.

Usage:
    python collectors/fetch_idx_fundamental.py
    python collectors/fetch_idx_fundamental.py --year-from 2024 --year-to 2025
    python collectors/fetch_idx_fundamental.py --month 2024-12
    python collectors/fetch_idx_fundamental.py --output data/my_fundamental.parquet

Default: pull all months 2021-01 to 2025-12 into data/fundamental_idx.parquet
"""

import argparse
import hashlib
import json
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import cloudscraper

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("idx-fundamental")

IDX_BASE = "https://www.idx.co.id"
API_PATH = "/primary/DigitalStatistic/GetApiDataPaginated"

FIELDS_RAW = [
    "code", "stockName", "sector", "subSector", "industry", "subIndustry",
    "subCode", "sectorCode", "subSectorCode", "industryCode",
    "sharia", "fsDate", "fiscalYearEnd", "audit", "opini",
    "assets", "liabilities", "equity",
    "sales", "ebt", "profitPeriod", "profitAttrOwner",
    "eps", "bookValue",
    "per", "priceBV", "deRatio", "roa", "roe", "npm",
]

FIELDS_NUMERIC = [
    "assets", "liabilities", "equity",
    "sales", "ebt", "profitPeriod", "profitAttrOwner",
    "eps", "bookValue",
    "per", "priceBV", "deRatio", "roa", "roe", "npm",
]

CURRENT_YEAR = datetime.now().year
ALL_MONTHS = []
for y in range(2021, CURRENT_YEAR + 1):
    for m in range(1, 13):
        ALL_MONTHS.append((y, m))


def parse_args():
    parser = argparse.ArgumentParser(description="Fetch IDX fundamental data")
    parser.add_argument("--year-from", type=int, default=2021, help="Start year (default: 2021)")
    parser.add_argument("--year-to", type=int, default=CURRENT_YEAR, help=f"End year (default: {CURRENT_YEAR})")
    parser.add_argument("--month", type=str, help="Single month to pull, e.g. 2024-12")
    parser.add_argument("--output", type=str, default="data/fundamental_idx", help="Output path stem (without extension)")
    parser.add_argument("--page-size", type=int, default=9999, help="Page size for API (default: 9999)")
    parser.add_argument("--delay", type=float, default=1.2, help="Delay between requests in seconds (default: 1.2)")
    parser.add_argument("--force", action="store_true", help="Re-pull months even if already saved")
    parser.add_argument("--json-only", action="store_true", help="Skip parquet output (save JSON only)")
    return parser.parse_args()


def to_float(v):
    if v is None or v == "" or v == "-":
        return None
    try:
        return float(str(v).replace(",", ""))
    except (ValueError, TypeError):
        return None


def clean_row(row):
    cleaned = {}
    for k in FIELDS_RAW:
        v = row.get(k)
        if k in FIELDS_NUMERIC:
            cleaned[k] = to_float(v)
        else:
            cleaned[k] = v if v != "" else None
    return cleaned


def pull_month(scraper, year, month, page_size=9999):
    url = f"{IDX_BASE}{API_PATH}"
    params = {
        "urlName": "LINK_FINANCIAL_DATA_RATIO",
        "periodYear": year,
        "periodMonth": month,
        "periodType": "monthly",
        "pageSize": page_size,
        "pageNumber": 1,
    }
    r = scraper.get(url, params=params, timeout=60)
    r.raise_for_status()
    j = r.json()

    raw_rows = j.get("data", [])
    rows = [clean_row(row) for row in raw_rows]
    schema_hash = hashlib.md5(json.dumps(j.get("columns", []), sort_keys=True).encode()).hexdigest()

    return {
        "month": f"{year}-{month:02d}",
        "year": year,
        "month_num": month,
        "count": len(rows),
        "rows": rows,
        "schema_hash": schema_hash,
    }


def archive_existing(output_stem):
    """Backup existing fundamental JSON to data/archive/ with timestamp before overwriting."""
    json_path = Path(f"{output_stem}_all.json")
    if not json_path.exists():
        return
    archive_dir = json_path.parent / "archive"
    archive_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_name = f"{json_path.stem}_{timestamp}.json"
    backup_path = archive_dir / backup_name
    import shutil
    shutil.copy2(str(json_path), str(backup_path))
    log.info("Archived existing %s -> %s (%s)", json_path.name, backup_path, _size_str(backup_path))


def save_results(all_results, output_stem, json_only=False):
    records = []
    for r in all_results:
        for row in r["rows"]:
            row["period"] = r["month"]
            records.append(row)

    json_path = Path(f"{output_stem}_all.json")
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    log.info("Saved %d records to %s", len(records), json_path)

    if not json_only:
        try:
            import pandas as pd
            df = pd.DataFrame(records)
            parquet_path = Path(f"{output_stem}.parquet")
            df.to_parquet(parquet_path, index=False)
            log.info("Saved %d records to %s (%s)", len(df), parquet_path, _size_str(parquet_path))
        except ImportError:
            log.warning("pandas/pyarrow not available, skipping parquet output")


def _size_str(path):
    size = os.path.getsize(path)
    if size > 1024 * 1024:
        return f"{size / 1024 / 1024:.1f} MB"
    elif size > 1024:
        return f"{size / 1024:.1f} KB"
    return f"{size} B"


def load_existing(output_stem):
    json_path = Path(f"{output_stem}_all.json")
    if not json_path.exists():
        return set()
    try:
        with open(json_path, encoding="utf-8") as f:
            records = json.load(f)
        existing_months = set()
        for r in records:
            p = r.get("period")
            if p:
                existing_months.add(p)
        log.info("Found %d existing records across %d months in %s", len(records), len(existing_months), json_path)
        return existing_months
    except (json.JSONDecodeError, KeyError):
        log.warning("Could not read existing %s, will re-pull all", json_path)
        return set()


def main():
    args = parse_args()

    if args.month:
        parts = args.month.split("-")
        months = [(int(parts[0]), int(parts[1]))]
    else:
        months = []
        for y in range(args.year_from, args.year_to + 1):
            for m in range(1, 13):
                months.append((y, m))

    log.info("Target: %d months (%s-%s)", len(months), f"{months[0][0]}-{months[0][1]:02d}", f"{months[-1][0]}-{months[-1][1]:02d}")

    existing = set()
    if not args.force:
        existing = load_existing(args.output)
    else:
        log.info("--force: re-pulling all months")

    output_stem = args.output
    scraper = cloudscraper.create_scraper()
    results = []
    errors = []

    for y, m in months:
        month_key = f"{y}-{m:02d}"
        if month_key in existing:
            log.info("SKIP %s — already in output", month_key)
            continue

        for attempt in range(1, 4):
            try:
                result = pull_month(scraper, y, m, args.page_size)
                if result["count"] == 0:
                    log.warning("%s → 0 rows (empty month)", month_key)
                else:
                    log.info("%s → %d rows (hash: %s)", month_key, result["count"], result["schema_hash"][:8])
                results.append(result)
                break
            except Exception as e:
                log.warning("%s attempt %d/3 failed: %s", month_key, attempt, e)
                if attempt < 3:
                    time.sleep(2)
                else:
                    log.error("%s failed after 3 attempts, skipping", month_key)
                    errors.append({"month": month_key, "error": str(e)})

        time.sleep(args.delay)

    if not results and not errors:
        log.info("Nothing to pull — all months already exist")
        if existing:
            log.info("Use --force to re-pull")
        return

    if results:
        archive_existing(output_stem)
        save_results(results, output_stem, args.json_only)

    summary = {
        "pull_date": datetime.now().isoformat(),
        "total_target": len(months),
        "pulled": len(results),
        "skipped": len([m for m in months if f"{m[0]}-{m[1]:02d}" in existing]),
        "errors": len(errors),
        "total_records": sum(r["count"] for r in results),
        "error_list": errors,
    }

    meta_path = Path(f"{output_stem}_pull_meta.json")
    with open(meta_path, "w") as f:
        json.dump(summary, f, indent=2)
    log.info("Pull summary: %d months, %d records, %d errors", summary["pulled"], summary["total_records"], summary["errors"])

    if errors:
        sys.exit(1)


if __name__ == "__main__":
    main()
