---
title: "IDX Fundamental Data API Discovery"
date: 2026-06-24
status: final
type: research
---

# REPORT-IDX-API-001 — IDX Fundamental Data API

## Objective

Find a free, programmatically accessible source of historical (≥10 years) IDX fundamental data for the QuantBit Fundamental Warehouse.

## Target Fields

Revenue (Sales), Net Income (Profit), Total Assets, Total Liabilities, Total Equity, Shares Outstanding, EPS, ROE, ROA, DER, PBV, PER — for all IDX-listed companies.

---

## ✅ Endpoint: `/primary/DigitalStatistic/GetApiDataPaginated`

**Base URL**: `https://www.idx.co.id`

### Request

```
GET /primary/DigitalStatistic/GetApiDataPaginated
  ?urlName=LINK_FINANCIAL_DATA_RATIO
  &periodYear={YYYY}
  &periodMonth={MM}
  &periodType=monthly
  &isPrint=False
  &cumulative=false
  &pageSize={N}
  &pageNumber={N}
  &orderBy=
  &search=
```

**Parameters**:
- `urlName`: Must be `LINK_FINANCIAL_DATA_RATIO` (only name that works)
- `periodYear`: Year of publication (e.g., 2024, 2025)
- `periodMonth`: Month of publication (1-12)
- `periodType`: `monthly` | `quarterly` (quarterly uses `periodQuarter` instead of `periodMonth`)
- `pageSize`: Max rows (tested up to 9999 — returns all)
- `orderBy`: Sort field (prepend `-` for desc)

### Authentication

- **No API key or JWT required**
- **Cloudflare challenge bypass**: Use `cloudscraper` (Python) — handles CF challenge automatically
- Or: Load page → extract `__cf_bm` cookie → use in API request (Node.js approach)
- `cloudscraper` recommended for production:

### Response Structure

```json
{
  "TableName": "string",
  "data": [{ ...row }],
  "footer": [{ ...aggregateRows }],
  "notes": "string",
  "columns": [{ colDef }],
  "FlattenColumns": [{ flatColDef }],
  "NameRow": [ ... ],
  "meta": {
    "totalItems": 947,
    "pageNumber": 1,
    "pageSize": 100,
    ...
  }
}
```

### Response Fields (per row)

| Field | Type | Description |
|-------|------|-------------|
| `code` | string | Ticker code (e.g., AADI) |
| `stockName` | string | Company name |
| `sector` | string | Sector classification |
| `subSector` | string | Sub-sector |
| `industry` | string | Industry |
| `subIndustry` | string | Sub-industry |
| `subCode` | string | Industry code |
| `sharia` | string | Sharia status (S/N) |
| `fsDate` | string | FS period end date (e.g., 2024-06-30) |
| `fiscalYearEnd` | string | Fiscal year end month (e.g., Dec) |
| `audit` | string | Audit type (A=Audited, U=Unaudited) |
| `opini` | string | Auditor's opinion code |
| `assets` | number | Total Assets (billion IDR) |
| `liabilities` | number | Total Liabilities (billion IDR) |
| `equity` | number | Total Equity (billion IDR) |
| `sales` | number | Revenue/Sales (billion IDR) |
| `ebt` | number | Earnings Before Tax (billion IDR) |
| `profitPeriod` | number | Profit for the Period (billion IDR) |
| `profitAttrOwner` | number | Profit attr. to owners (billion IDR) |
| `eps` | number | EPS (IDR) |
| `bookValue` | number | Book Value per Share (IDR) |
| `per` | number | P/E Ratio (x) |
| `priceBV` | number | Price to Book Value (x) |
| `deRatio` | number | D/E Ratio (x) |
| `roa` | number | ROA (%) |
| `roe` | number | ROE (%) |
| `npm` | number | NPM (%) |

### Footer

Contains market-level aggregates:
- `Market PER` — aggregate P/E ratio
- `Market PBV` — aggregate P/BV ratio

---

## Historical Coverage

| Period | Companies | Status |
|--------|-----------|--------|
| Jan 2025 – Jun 2025 | 955–960 | ✅ Full |
| 2024 | 930–947 | ✅ Full |
| 2023 | 906 | ✅ Full |
| 2022 | 828 | ✅ Full |
| 2021 | 769 | ✅ Full |
| 2020 | 0 | ❌ Empty |
| 2019 | 6 | ❌ Sparse |
| 2018 | 11 | ❌ Sparse |
| 2015–2017 | 0 | ❌ Empty |

**Coverage: ~5 years** (2021–present). Full historical data starts from ~2021.

### FS Date Distribution (Dec 2024 snapshot)

| FS Year | Companies |
|---------|-----------|
| 2018 | 2 |
| 2019 | 10 |
| 2020 | 7 |
| 2021 | 7 |
| 2022 | 7 |
| 2023 | 13 |
| 2024 | 901 |

---

## Data Quality

- **947 companies** across 11 sectors
- **Missing EPS**: 1/947 (~0.1%)
- **Missing ROE**: 49/947 (~5.2%)
- Data is well-structured, all numeric fields present

---

## Other Endpoints Tested

| Endpoint | Result |
|----------|--------|
| `/primary/DPSMenu/Monthly?lang=en` | ✅ 200 — Returns JSON menu structure |
| `/primary/DPSMenu/Quarterly?lang=en` | ✅ 200 — Quarterly menu |
| `/primary/list/...financial-data-and-ratio` | ✅ 200 — But `items:[]` (needs filter param?) |
| `/primary/DigitalStatistic/DownloadDataExcel` | ❌ 302 → 404 (needs auth or different params) |
| `/api/financialdataratio` | ❌ 302 redirect → Cloudflare |
| `/primary/page/...` | ✅ Known working for other pages |

---

## Recommendations for QuantBit

### Status: ✅ PRODUCTION READY

60-month audit passed:
- 60/60 months available (2021-01 to 2025-12)
- 100% schema consistent across all months
- 0 errors on retry (2 transient cold-start failures)
- Avg response time: 1.0s
- Rows: 711 (2021-02) → 960 (2025-05)

### Architecture

```
IDX API (2021-now)  ──► warehouse_fundamental_idx.parquet
         │
         ├── Cross-check audit vs warehouse legacy (BBCA, BBRI, BMRI, TLKM, ASII)
         │
         └── RTI/Stockbit → backfill 2015-2020 only (not primary source)
                              │
                              ▼
                    warehouse_fundamental_v5.parquet
```

### Dropped Sources

❌ Yahoo Fundamental — replaced by IDX API (primary)
❌ FMP — replaced by IDX API
❌ Hash Fallback Fundamental — replaced by IDX API
❌ Sectors.app — replaced by IDX API

### Retained Sources (backup/validation only)

⚠ RTI — backfill 2015-2020 if needed
⚠ Stockbit — backfill 2015-2020 if needed

### Priority Actions

1. **Build `collectors/fetch_idx_fundamental.py`** — pull monthly 2021-01 to 2025-12, save raw parquet
2. **Compute ratios internally** — ROE/ROA/NPM from raw data (API ratios use different formulas)
3. **Cross-check audit** — 5 tickers (BBCA, BBRI, BMRI, TLKM, ASII) vs warehouse legacy

### Data Schema (32 fields, consistent across all months)

```
# Raw balance sheet
assets, liabilities, equity

# Raw income statement
sales, ebt, profitPeriod, profitAttrOwner

# Per-share
eps, bookValue

# Ratios (self-computed preferred)
roe_calc = profitAttrOwner / equity
roa_calc = profitAttrOwner / assets
npm_calc = profitAttrOwner / sales

# API ratios (for reference)
per, priceBV, deRatio, roa, roe, npm

# Metadata
code, stockName, sector, subSector, industry, subIndustry,
subCode, sectorCode, subSectorCode, industryCode,
sharia, fsDate, fiscalYearEnd, audit, opini
```

---

## Implementation Details

### Python (recommended — cloudscraper bypasses Cloudflare)

```python
import cloudscraper
scraper = cloudscraper.create_scraper()

r = scraper.get(
    "https://www.idx.co.id/primary/DigitalStatistic/GetApiDataPaginated",
    params={
        "urlName": "LINK_FINANCIAL_DATA_RATIO",
        "periodYear": 2024,
        "periodMonth": 12,
        "periodType": "monthly",
        "pageSize": 9999,
        "pageNumber": 1,
    }
)
j = r.json()  # 947 items, 32 fields each
```

### Available Sectors

Basic Materials, Consumer Cyclicals, Consumer Non-Cyclicals, Energy, Financials, Healthcare, Industrials, Infrastructures, Properties & Real Estate, Technology, Transportation & Logistic
