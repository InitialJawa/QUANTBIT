import fs from "fs";
import path from "path";
import Database from "better-sqlite3";
import { COMBINED_TICKERS } from "../src/constants/idx80.ts";

// Historical fallback values for when Yahoo Finance data is unavailable.
// Gold price in USD per troy ounce (approximate yearly start/average).
const HISTORICAL_GOLD_USD_YEARLY: Record<number, number> = {
  2000: 280, 2001: 265, 2002: 300, 2003: 360, 2004: 410,
  2005: 440, 2006: 600, 2007: 700, 2008: 870, 2009: 970,
  2010: 1225, 2011: 1570, 2012: 1670, 2013: 1410, 2014: 1270,
  2015: 1160, 2016: 1250, 2017: 1260, 2018: 1270, 2019: 1400,
  2020: 1770, 2021: 1800, 2022: 1800, 2023: 1940, 2024: 2060,
  2025: 2350, 2026: 2600,
};

// Historical USD/IDR exchange rate (approximate yearly average).
const HISTORICAL_USDIDR_YEARLY: Record<number, number> = {
  2000: 8400, 2001: 10400, 2002: 9300, 2003: 8500, 2004: 9000,
  2005: 9700, 2006: 9100, 2007: 9100, 2008: 9700, 2009: 10400,
  2010: 9100, 2011: 8700, 2012: 9600, 2013: 12200, 2014: 12400,
  2015: 13800, 2016: 13300, 2017: 13500, 2018: 14300, 2019: 14100,
  2020: 14500, 2021: 14400, 2022: 15000, 2023: 15400, 2024: 15700,
  2025: 16000, 2026: 16600,
};

// Build monthly-granular series from yearly averages via linear interpolation
function buildMonthlySeries(yearly: Record<number, number>): Record<string, number> {
  const years = Object.keys(yearly).map(Number).sort((a, b) => a - b);
  const monthly: Record<string, number> = {};
  for (let i = 0; i < years.length; i++) {
    const yr = years[i];
    const val = yearly[yr];
    const nextVal = i < years.length - 1 ? yearly[years[i + 1]] : val;
    for (let m = 1; m <= 12; m++) {
      const t = (m - 1) / 11; // 0 at Jan, 1 at Dec
      const interp = val + (nextVal - val) * t;
      monthly[`${yr}-${String(m).padStart(2, "0")}`] = Math.round(interp);
    }
  }
  return monthly;
}

const HISTORICAL_GOLD_USD = buildMonthlySeries(HISTORICAL_GOLD_USD_YEARLY);
const HISTORICAL_USDIDR = buildMonthlySeries(HISTORICAL_USDIDR_YEARLY);

// 2000-01-01 to Today for extended backtest
const START_TIME = Math.floor(new Date("2000-01-01").getTime() / 1000);
const END_TIME = Math.floor(new Date().getTime() / 1000);

const TICKERS = [...COMBINED_TICKERS, "^JKSE", "GC=F", "IDR=X"];

// We keep some real fundamental point-in-time for the main ones. For the rest of the 80, we generate a stable but slightly randomized set of static fundamentals so the ranking distribution is stable but relies heavily on momentum.
const FUNDAMENTAL_SNAPSHOTS: Record<string, Record<number, { roe: number, pb: number, pe: number, der: number, roa: number, net_margin: number, dividend_per_share: number }>> = {
  BBCA: {
    2018: { roe: 0.20, pb: 4.1, pe: 26.0, der: 0.15, roa: 0.035, net_margin: 0.38, dividend_per_share: 145 },
    2019: { roe: 0.18, pb: 4.4, pe: 28.0, der: 0.15, roa: 0.034, net_margin: 0.39, dividend_per_share: 155 },
    2020: { roe: 0.16, pb: 4.2, pe: 27.0, der: 0.15, roa: 0.031, net_margin: 0.36, dividend_per_share: 145 },
    2021: { roe: 0.19, pb: 4.6, pe: 29.0, der: 0.14, roa: 0.034, net_margin: 0.37, dividend_per_share: 170 },
    2022: { roe: 0.21, pb: 4.8, pe: 25.0, der: 0.13, roa: 0.036, net_margin: 0.40, dividend_per_share: 205 },
    2023: { roe: 0.22, pb: 4.9, pe: 24.0, der: 0.12, roa: 0.037, net_margin: 0.42, dividend_per_share: 228 },
    2024: { roe: 0.23, pb: 4.8, pe: 24.5, der: 0.12, roa: 0.038, net_margin: 0.43, dividend_per_share: 270 },
    2025: { roe: 0.23, pb: 4.5, pe: 22.0, der: 0.12, roa: 0.037, net_margin: 0.44, dividend_per_share: 310 }
  },
  BBRI: {
    2018: { roe: 0.17, pb: 2.3, pe: 15.0, der: 0.18, roa: 0.025, net_margin: 0.25, dividend_per_share: 120 },
    2019: { roe: 0.16, pb: 2.5, pe: 16.0, der: 0.18, roa: 0.024, net_margin: 0.26, dividend_per_share: 130 },
    2020: { roe: 0.11, pb: 2.1, pe: 21.0, der: 0.19, roa: 0.015, net_margin: 0.18, dividend_per_share: 80 },
    2021: { roe: 0.14, pb: 2.2, pe: 18.0, der: 0.18, roa: 0.020, net_margin: 0.21, dividend_per_share: 120 },
    2022: { roe: 0.17, pb: 2.4, pe: 14.5, der: 0.18, roa: 0.026, net_margin: 0.24, dividend_per_share: 188 },
    2023: { roe: 0.18, pb: 2.3, pe: 14.0, der: 0.17, roa: 0.027, net_margin: 0.26, dividend_per_share: 220 },
    2024: { roe: 0.18, pb: 1.8, pe: 11.5, der: 0.18, roa: 0.026, net_margin: 0.25, dividend_per_share: 240 },
    2025: { roe: 0.18, pb: 1.6, pe: 10.0, der: 0.18, roa: 0.025, net_margin: 0.24, dividend_per_share: 260 }
  },
  BMRI: {
    2018: { roe: 0.16, pb: 1.8, pe: 14.0, der: 0.16, roa: 0.022, net_margin: 0.24, dividend_per_share: 160 },
    2019: { roe: 0.17, pb: 1.9, pe: 15.0, der: 0.16, roa: 0.023, net_margin: 0.25, dividend_per_share: 180 },
    2020: { roe: 0.09, pb: 1.5, pe: 22.0, der: 0.17, roa: 0.013, net_margin: 0.14, dividend_per_share: 100 },
    2021: { roe: 0.15, pb: 1.7, pe: 15.0, der: 0.16, roa: 0.021, net_margin: 0.22, dividend_per_share: 175 },
    2022: { roe: 0.20, pb: 2.0, pe: 12.0, der: 0.15, roa: 0.025, net_margin: 0.27, dividend_per_share: 260 },
    2023: { roe: 0.21, pb: 2.1, pe: 11.0, der: 0.15, roa: 0.026, net_margin: 0.28, dividend_per_share: 350 },
    2024: { roe: 0.21, pb: 1.9, pe: 11.0, der: 0.15, roa: 0.026, net_margin: 0.28, dividend_per_share: 380 },
    2025: { roe: 0.21, pb: 1.7, pe: 10.5, der: 0.15, roa: 0.025, net_margin: 0.28, dividend_per_share: 410 }
  },
  TLKM: {
    2018: { roe: 0.16, pb: 3.2, pe: 18.0, der: 0.40, roa: 0.090, net_margin: 0.14, dividend_per_share: 163 },
    2019: { roe: 0.16, pb: 3.0, pe: 17.5, der: 0.42, roa: 0.085, net_margin: 0.14, dividend_per_share: 154 },
    2020: { roe: 0.15, pb: 2.8, pe: 16.0, der: 0.45, roa: 0.080, net_margin: 0.15, dividend_per_share: 168 },
    2021: { roe: 0.17, pb: 3.3, pe: 17.0, der: 0.48, roa: 0.095, net_margin: 0.16, dividend_per_share: 149 },
    2022: { roe: 0.16, pb: 2.9, pe: 18.0, der: 0.46, roa: 0.088, net_margin: 0.14, dividend_per_share: 167 },
    2023: { roe: 0.14, pb: 2.5, pe: 16.5, der: 0.44, roa: 0.074, net_margin: 0.11, dividend_per_share: 186 },
    2024: { roe: 0.14, pb: 2.0, pe: 15.0, der: 0.45, roa: 0.072, net_margin: 0.11, dividend_per_share: 195 },
    2025: { roe: 0.13, pb: 1.8, pe: 13.5, der: 0.44, roa: 0.070, net_margin: 0.11, dividend_per_share: 210 }
  },
  ASII: {
    2018: { roe: 0.13, pb: 1.6, pe: 13.5, der: 0.38, roa: 0.072, net_margin: 0.09, dividend_per_share: 220 },
    2019: { roe: 0.13, pb: 1.4, pe: 12.0, der: 0.37, roa: 0.068, net_margin: 0.09, dividend_per_share: 215 },
    2020: { roe: 0.08, pb: 1.1, pe: 16.0, der: 0.39, roa: 0.041, net_margin: 0.08, dividend_per_share: 114 },
    2021: { roe: 0.12, pb: 1.2, pe: 11.5, der: 0.38, roa: 0.055, net_margin: 0.09, dividend_per_share: 194 },
    2022: { roe: 0.15, pb: 1.3, pe: 9.5, der: 0.35, roa: 0.065, net_margin: 0.10, dividend_per_share: 640 },
    2023: { roe: 0.13, pb: 1.1, pe: 8.5, der: 0.40, roa: 0.045, net_margin: 0.10, dividend_per_share: 521 },
    2024: { roe: 0.13, pb: 0.8, pe: 7.0, der: 0.40, roa: 0.045, net_margin: 0.10, dividend_per_share: 410 },
    2025: { roe: 0.13, pb: 0.7, pe: 6.5, der: 0.40, roa: 0.044, net_margin: 0.10, dividend_per_share: 440 }
  },
  ADRO: {
    2018: { roe: 0.10, pb: 0.8, pe: 9.0, der: 0.32, roa: 0.055, net_margin: 0.12, dividend_per_share: 110 },
    2019: { roe: 0.11, pb: 0.7, pe: 8.5, der: 0.30, roa: 0.060, net_margin: 0.13, dividend_per_share: 95 },
    2020: { roe: 0.04, pb: 0.5, pe: 14.0, der: 0.34, roa: 0.021, net_margin: 0.06, dividend_per_share: 60 },
    2021: { roe: 0.22, pb: 1.1, pe: 6.0, der: 0.31, roa: 0.110, net_margin: 0.20, dividend_per_share: 280 },
    2022: { roe: 0.38, pb: 1.5, pe: 2.8, der: 0.24, roa: 0.190, net_margin: 0.29, dividend_per_share: 510 },
    2023: { roe: 0.24, pb: 0.8, pe: 3.5, der: 0.20, roa: 0.125, net_margin: 0.23, dividend_per_share: 360 },
    2024: { roe: 0.20, pb: 0.7, pe: 4.8, der: 0.20, roa: 0.105, net_margin: 0.21, dividend_per_share: 320 },
    2025: { roe: 0.10, pb: 0.7, pe: 7.2, der: 0.20, roa: 0.054, net_margin: 0.25, dividend_per_share: 180 }
  },
  PTBA: {
    2018: { roe: 0.32, pb: 2.1, pe: 7.2, der: 0.15, roa: 0.170, net_margin: 0.24, dividend_per_share: 340 },
    2019: { roe: 0.22, pb: 1.7, pe: 7.5, der: 0.15, roa: 0.130, net_margin: 0.19, dividend_per_share: 326 },
    2020: { roe: 0.14, pb: 1.3, pe: 10.0, der: 0.16, roa: 0.080, net_margin: 0.14, dividend_per_share: 74 },
    2021: { roe: 0.33, pb: 1.6, pe: 5.5, der: 0.14, roa: 0.180, net_margin: 0.28, dividend_per_share: 688 },
    2022: { roe: 0.44, pb: 2.2, pe: 3.5, der: 0.12, roa: 0.220, net_margin: 0.30, dividend_per_share: 1090 },
    2023: { roe: 0.24, pb: 1.4, pe: 6.2, der: 0.11, roa: 0.110, net_margin: 0.13, dividend_per_share: 397 },
    2024: { roe: 0.15, pb: 1.3, pe: 8.9, der: 0.11, roa: 0.080, net_margin: 0.08, dividend_per_share: 250 },
    2025: { roe: 0.14, pb: 1.3, pe: 8.9, der: 0.11, roa: 0.053, net_margin: 0.08, dividend_per_share: 220 }
  },
  ESSA: {
    2018: { roe: 0.08, pb: 1.3, pe: 16.0, der: 0.85, roa: 0.035, net_margin: 0.06, dividend_per_share: 5 },
    2019: { roe: 0.05, pb: 1.1, pe: 22.0, der: 0.80, roa: 0.020, net_margin: 0.04, dividend_per_share: 5 },
    2020: { roe: -0.04, pb: 0.9, pe: -18.0, der: 0.95, roa: -0.015, net_margin: -0.03, dividend_per_share: 0 },
    2021: { roe: 0.12, pb: 1.5, pe: 12.0, der: 0.65, roa: 0.050, net_margin: 0.08, dividend_per_share: 15 },
    2022: { roe: 0.35, pb: 2.8, pe: 8.0, der: 0.35, roa: 0.180, net_margin: 0.22, dividend_per_share: 45 },
    2023: { roe: 0.15, pb: 1.6, pe: 11.5, der: 0.22, roa: 0.080, net_margin: 0.12, dividend_per_share: 10 },
    2024: { roe: 0.12, pb: 1.3, pe: 11.0, der: 0.00, roa: 0.084, net_margin: 0.16, dividend_per_share: 5 },
    2025: { roe: 0.12, pb: 1.3, pe: 11.0, der: 0.00, roa: 0.084, net_margin: 0.16, dividend_per_share: 30 }
  },
  GOTO: {
    2018: { roe: -0.80, pb: 12.0, pe: -5.0, der: 0.05, roa: -0.600, net_margin: -2.50, dividend_per_share: 0 },
    2019: { roe: -0.60, pb: 8.0, pe: -6.0, der: 0.05, roa: -0.450, net_margin: -1.80, dividend_per_share: 0 },
    2020: { roe: -0.40, pb: 6.0, pe: -8.0, der: 0.08, roa: -0.320, net_margin: -1.20, dividend_per_share: 0 },
    2021: { roe: -0.25, pb: 3.5, pe: -12.0, der: 0.12, roa: -0.200, net_margin: -0.80, dividend_per_share: 0 },
    2022: { roe: -0.18, pb: 1.6, pe: -15.0, der: 0.10, roa: -0.150, net_margin: -0.55, dividend_per_share: 0 },
    2023: { roe: -0.12, pb: 0.8, pe: -20.0, der: 0.08, roa: -0.090, net_margin: -0.35, dividend_per_share: 0 },
    2024: { roe: -0.03, pb: 1.7, pe: -50.0, der: 0.28, roa: 0.003, net_margin: -0.03, dividend_per_share: 0 },
    2025: { roe: -0.03, pb: 1.7, pe: -50.0, der: 0.28, roa: 0.003, net_margin: -0.03, dividend_per_share: 0 }
  }
};

// ─── IDX Warehouse Fundamentals (Priority 1 — Official IDX Data) ─────────────────
interface WarehouseRecord {
  code: string;
  period: string;
  assets: number | null;
  equity: number | null;
  sales: number | null;
  profitAttrOwner: number | null;
  eps: number | null;
  bookValue: number | null;
  per: number | null;
  priceBV: number | null;
  deRatio: number | null;
}

let idxWarehouse: Record<string, Record<string, WarehouseRecord>> = {};

function loadIDXWarehouse() {
  const whPath = path.join(process.cwd(), "data", "fundamental_idx_all.json");
  if (!fs.existsSync(whPath)) {
    console.log("IDX warehouse not found, skipping.");
    return;
  }
  const raw = JSON.parse(fs.readFileSync(whPath, "utf-8"));
  let count = 0;
  for (const rec of raw) {
    const code = rec.code;
    const period = rec.period;
    if (!idxWarehouse[code]) idxWarehouse[code] = {};
    idxWarehouse[code][period] = rec;
    count++;
  }
  console.log(`Loaded IDX warehouse: ${count} records for ${Object.keys(idxWarehouse).length} companies`);
}

function getLatestWarehousePeriod(ticker: string, date: Date): WarehouseRecord | null {
  const periods = idxWarehouse[ticker];
  if (!periods) return null;
  const dateStr = date.toISOString().split("T")[0];
  let best: { period: string; date: Date } | null = null;
  for (const period of Object.keys(periods)) {
    const pd = new Date(`${period}-01`);
    if (pd <= date && (!best || pd > best.date)) {
      best = { period, date: pd };
    }
  }
  return best ? periods[best.period] : null;
}

function computeFromWarehouse(rec: WarehouseRecord) {
  const { profitAttrOwner, equity, assets, sales, priceBV, per, deRatio } = rec;
  const roe = equity && profitAttrOwner ? profitAttrOwner / equity : 0;
  const pb = priceBV ?? 1.5;
  const pe = per ?? 15;
  const der = deRatio ?? 0.5;
  const roa = assets && profitAttrOwner ? profitAttrOwner / assets : 0;
  const net_margin = sales && profitAttrOwner ? profitAttrOwner / sales : 0;
  return { roe, pb, pe, der, roa, net_margin, dividend_per_share: 0 };
}

// ─── Legacy Snapshots (Priority 2 - Pre-2021 / Limited Tickers) ──────────────────

// ─── Fundamental Resolution Pipeline ─────────────────────────────────────────────

function generateFallbackFundamentals(ticker: string, year: number) {
  const hash = ticker.split("").reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
  const stablePseudoRoe = 0.05 + (Math.abs(hash % 20) / 100);
  const stablePseudoPb = 1.0 + (Math.abs(hash % 30) / 10);
  return {
    roe: stablePseudoRoe + ((year % 3) * 0.01),
    pb: stablePseudoPb + ((year % 2) * 0.1),
    pe: 15.0, der: 0.5, roa: 0.05, net_margin: 0.10, dividend_per_share: Math.abs(hash % 100)
  };
}

// Returns point-in-time correct fundamental snapshot for a stock.
// Priority 1: IDX Warehouse (2021-2025, 976 companies, official IDX data)
// Priority 2: Hardcoded snapshots (18 tickers, 2018-2025)
// Priority 3: Auto-generated fallback (pre-2021 or unrecognized tickers)
function getPointInTimeFundamentals(ticker: string, date: Date) {
  // Priority 1: IDX Warehouse — latest monthly snapshot before this date
  const wh = getLatestWarehousePeriod(ticker, date);
  if (wh) {
    return { year: date.getFullYear(), ...computeFromWarehouse(wh) };
  }

  // Priority 2: Hardcoded snapshots for known tickers (2018-2025)
  const currentYear = date.getFullYear();
  const lagCutoff = new Date(currentYear, 2, 31);
  let reportYear = currentYear - 1;
  if (date.getTime() < lagCutoff.getTime()) reportYear = currentYear - 2;
  if (reportYear < 1995) reportYear = 1995;
  if (reportYear > 2025) reportYear = 2025;

  const snaps = FUNDAMENTAL_SNAPSHOTS[ticker];
  if (snaps && snaps[reportYear]) {
    return { year: reportYear, ...snaps[reportYear] };
  }

  // Priority 3: Auto-generated fallback (no look-ahead bias)
  return { year: reportYear, ...generateFallbackFundamentals(ticker, reportYear) };
}

async function fetchTicker(ticker: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${START_TIME}&period2=${END_TIME}&interval=1d`;
  console.log(`Fetching ${ticker}...`);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "application/json"
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${ticker}: ${response.statusText}`);
  }

  const json: any = await response.json();
  const result = json?.chart?.result?.[0];
  if (!result) {
    throw new Error(`No chart result for ${ticker}`);
  }

  const timestamps = result.timestamp || [];
  const quote = result.indicators?.quote?.[0] || {};
  const adjclose = result.indicators?.adjclose?.[0]?.adjclose || quote.close || [];

  const data: Record<string, { open: number, high: number, low: number, close: number, adjClose: number, volume: number }> = {};
  
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    const dateStr = new Date(ts * 1000).toISOString().split("T")[0];
    
    const open = quote.open?.[i] || quote.close?.[i] || 0;
    const high = quote.high?.[i] || quote.close?.[i] || 0;
    const low = quote.low?.[i] || quote.close?.[i] || 0;
    const close = quote.close?.[i] || 0;
    const adjClose = adjclose[i] || close || 0;
    const volume = quote.volume?.[i] || 0;

    if (!close && !adjClose) continue;

    data[dateStr] = {
      open,
      high,
      low,
      close,
      adjClose,
      volume
    };
  }

  console.log(`Successfully fetched ${ticker}: ${Object.keys(data).length} rows.`);
  return data;
}

async function main() {
  // Load IDX Warehouse — official fundamental data for 976 companies (2021-2025)
  loadIDXWarehouse();
  console.log("Starting price data download...");

  const allData: Record<string, any> = {};

  for (const ticker of TICKERS) {
    try {
      allData[ticker] = await fetchTicker(ticker);
    } catch (err: any) {
      console.error(`Error fetching ticker ${ticker}:`, err.message);
      try {
        console.log(`Retrying ${ticker}...`);
        allData[ticker] = await fetchTicker(ticker);
      } catch (err2: any) {
        console.error(`Double failure for ${ticker}. Exiting.`);
        process.exit(1);
      }
    }
  }

  const dateSet = new Set<string>();
  const ihsgData = allData["^JKSE"] || {};
  Object.keys(ihsgData).forEach(d => dateSet.add(d));

  for (const t of TICKERS) {
    if (t === "GC=F" || t === "IDR=X") continue;
    const tickData = allData[t] || {};
    Object.keys(tickData).forEach(d => dateSet.add(d));
  }

  const sortedDates = Array.from(dateSet).sort();
  console.log(`Total merged trading days: ${sortedDates.length}`);

  const rowList: any[] = [];
  const lastKnownPrices: Record<string, number> = {};
  const lastKnownAdjPrices: Record<string, number> = {};
  const lastKnownVolumes: Record<string, number> = {};
  const lastKnownOpens: Record<string, number> = {};
  const lastKnownHighs: Record<string, number> = {};
  const lastKnownLows: Record<string, number> = {};

  const stockKeys = COMBINED_TICKERS.map(t => t.split(".")[0]);

  // Populate first unadjusted daily price grid so we can look back 60 trading days for momentum cleanly
  const rawClosesForMomentum: Record<string, number[]> = {};
  stockKeys.forEach(k => { rawClosesForMomentum[k] = []; });

  for (let idx = 0; idx < sortedDates.length; idx++) {
    const dateStr = sortedDates[idx];
    const dateObj = new Date(dateStr);
    const dayOfWeek = dateObj.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Fetch primary indices
    let ihsg = 0;
    const ihsgRow = allData["^JKSE"]?.[dateStr];
    if (ihsgRow) {
      ihsg = ihsgRow.close;
      lastKnownPrices["^JKSE"] = ihsg;
    } else {
      ihsg = lastKnownPrices["^JKSE"] || 6000;
    }

    const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}`;
    let usdidr = HISTORICAL_USDIDR[monthKey] || 15000;
    const usdidrRow = allData["IDR=X"]?.[dateStr];
    if (usdidrRow) {
      usdidr = usdidrRow.close;
      lastKnownPrices["IDR=X"] = usdidr;
    } else {
      usdidr = lastKnownPrices["IDR=X"] || HISTORICAL_USDIDR[monthKey] || 15000;
    }

    let gold_usd = HISTORICAL_GOLD_USD[monthKey] || 1800;
    const goldRow = allData["GC=F"]?.[dateStr];
    if (goldRow) {
      gold_usd = goldRow.close;
      lastKnownPrices["GC=F"] = gold_usd;
    } else {
      gold_usd = lastKnownPrices["GC=F"] || HISTORICAL_GOLD_USD[monthKey] || 1800;
    }
    const goldPriceIdrPerGram = Math.round((gold_usd * usdidr) / 31.1034768);

    // Filter stocks alive today
    const activeTickersToday: string[] = [];
    const stockPrices: Record<string, number> = {};
    const stockAdjPrices: Record<string, number> = {};
    const stockVolumes: Record<string, number> = {};
    const stockOpens: Record<string, number> = {};
    const stockHighs: Record<string, number> = {};
    const stockLows: Record<string, number> = {};

    for (const key of stockKeys) {
      const fullTicker = `${key}.JK`;
      const sRow = allData[fullTicker]?.[dateStr];

      // GOTO IPO is April 11, 2022. Prevent look-ahead/survivorship bias.
      if (key === "GOTO" && dateStr < "2022-04-11") {
        rawClosesForMomentum[key].push(0); // keep index aligned, but mark inactive
        continue;
      }

      if (sRow) {
        stockPrices[key] = Math.round(sRow.close);
        stockAdjPrices[key] = Math.round(sRow.adjClose);
        stockVolumes[key] = Math.round(sRow.volume);
        stockOpens[key] = Math.round(sRow.open);
        stockHighs[key] = Math.round(sRow.high);
        stockLows[key] = Math.round(sRow.low);

        lastKnownPrices[key] = sRow.close;
        lastKnownAdjPrices[key] = sRow.adjClose;
        lastKnownVolumes[key] = sRow.volume;
        lastKnownOpens[key] = sRow.open;
        lastKnownHighs[key] = sRow.high;
        lastKnownLows[key] = sRow.low;
      } else {
        if (lastKnownPrices[key] !== undefined) {
          stockPrices[key] = Math.round(lastKnownPrices[key]);
          stockAdjPrices[key] = Math.round(lastKnownAdjPrices[key]);
          stockVolumes[key] = 0;
          stockOpens[key] = Math.round(lastKnownOpens[key]);
          stockHighs[key] = Math.round(lastKnownHighs[key]);
          stockLows[key] = Math.round(lastKnownLows[key]);
        } else {
          continue; // IPO hasn't occurred yet, skip
        }
      }
      
      activeTickersToday.push(key);
      rawClosesForMomentum[key].push(stockPrices[key]);
    }

    // Now, compute point-in-time scoring & ranks look-ahead free!
    const scoredTickersProd: { ticker: string, score: number }[] = [];
    const scoredTickersRes: { ticker: string, score: number }[] = [];

    // Extract raw metrics for active tickers today so we can linearly normalize cross-sectionally
    const rawMetrics: Record<string, { qROE: number, vPB: number, gROEChg: number, mReturn: number }> = {};
    
    for (const ticker of activeTickersToday) {
      const currentPrice = stockPrices[ticker];
      const fToday = getPointInTimeFundamentals(ticker, dateObj);
      const fPrevYear = getPointInTimeFundamentals(ticker, new Date(dateObj.getFullYear() - 1, 2, 31));

      // Quality: ROE
      const qROE = fToday.roe;

      // Value: inverted PB (higher inverted PB is cheap, which is better!)
      const vPB = fToday.pb > 0 ? (1.0 / fToday.pb) : 0;

      // Growth: year-over-year change in ROE
      const gROEChg = fToday.roe - fPrevYear.roe;

      // Momentum: 60 trading days price rate of return
      const currentPriceList = rawClosesForMomentum[ticker];
      const curP = currentPriceList[currentPriceList.length - 1];
      const prevIdx = Math.max(0, currentPriceList.length - 61);
      const prevP = currentPriceList[prevIdx];
      
      let mReturn = 0;
      if (curP > 0 && prevP > 0) {
        mReturn = ((curP - prevP) / prevP) * 100;
      }

      rawMetrics[ticker] = { qROE, vPB, gROEChg, mReturn };
    }

    // Linearly normalize metrics between 40 and 95 across active tickers today
    const tickersToScore = Object.keys(rawMetrics);
    
    const qs = tickersToScore.map(t => rawMetrics[t].qROE);
    const vs = tickersToScore.map(t => rawMetrics[t].vPB);
    const gs = tickersToScore.map(t => rawMetrics[t].gROEChg);
    const ms = tickersToScore.map(t => rawMetrics[t].mReturn);

    const minQ = Math.min(...qs), maxQ = Math.max(...qs);
    const minV = Math.min(...vs), maxV = Math.max(...vs);
    const minG = Math.min(...gs), maxG = Math.max(...gs);
    const minM = Math.min(...ms), maxM = Math.max(...ms);

    const stockRawMetrics: Record<string, { qROE: number; vPB: number; gROEChg: number; mReturn: number }> = {};
    const stockNormScores: Record<string, { quality: number; growth: number; value: number; momentum: number }> = {};

    for (const ticker of tickersToScore) {
      const r = rawMetrics[ticker];

      const normQ = maxQ > minQ ? 40 + 55 * (r.qROE - minQ) / (maxQ - minQ) : 67.5;
      const normV = maxV > minV ? 40 + 55 * (r.vPB - minV) / (maxV - minV) : 67.5;
      const normG = maxG > minG ? 40 + 55 * (r.gROEChg - minG) / (maxG - minG) : 67.5;
      const normM = maxM > minM ? 40 + 55 * (r.mReturn - minM) / (maxM - minM) : 67.5;

      stockRawMetrics[ticker] = r;
      stockNormScores[ticker] = { quality: normQ, growth: normG, value: normV, momentum: normM };

      // Composite Config F (Prod): weights = { quality: 0.25, growth: 0.1, value: 0.3, momentum: 0.35 }
      const scoreProd = normQ * 0.25 + normG * 0.10 + normV * 0.30 + normM * 0.35;

      // Composite Config B (Res): weights = { quality: 0.25, growth: 0.3, value: 0.1, momentum: 0.35 }
      const scoreRes = normQ * 0.25 + normG * 0.30 + normV * 0.10 + normM * 0.35;

      scoredTickersProd.push({ ticker, score: scoreProd });
      scoredTickersRes.push({ ticker, score: scoreRes });
    }

    // Sort descending by score
    scoredTickersProd.sort((a, b) => b.score - a.score);
    scoredTickersRes.sort((a, b) => b.score - a.score);

    // Map ranks (lower is better, e.g. index + 1)
    const stockRanksProd: Record<string, number> = {};
    const stockRanksRes: Record<string, number> = {};

    stockKeys.forEach(k => {
      stockRanksProd[k] = 99; // delisted or unlisted default
      stockRanksRes[k] = 99;
    });

    scoredTickersProd.forEach((item, rIdx) => {
      stockRanksProd[item.ticker] = rIdx + 1;
    });

    scoredTickersRes.forEach((item, rIdx) => {
      stockRanksRes[item.ticker] = rIdx + 1;
    });

    rowList.push({
      date: dateStr,
      ihsgPrice: Math.round(ihsg),
      goldPrice: goldPriceIdrPerGram,
      usdidrRate: Math.round(usdidr),
      stockPrices,
      stockAdjPrices,
      stockVolumes,
      stockOpens,
      stockHighs,
      stockLows,
      stockRanksProd, // point-in-time Config F
      stockRanksRes,  // point-in-time Config B
      stockRawMetrics, // raw pre-normalization metrics (qROE, vPB, gROEChg, mReturn)
      stockNormScores  // normalized scores (quality, growth, value, momentum) for runtime re-ranking
    });
  }

  // Write to JSON (source of truth untuk git)
  const dir0 = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir0)) fs.mkdirSync(dir0, { recursive: true });
  const jsonPath = path.join(dir0, "historical_market_data.json");
  fs.writeFileSync(jsonPath, JSON.stringify(rowList, null, 2));
  console.log(`Wrote ${rowList.length} records to JSON at ${jsonPath}.`);

  // Write to SQLite (primary storage for server)
  const dir1 = path.join(process.cwd(), "data");
  if (!fs.existsSync(dir1)) {
    fs.mkdirSync(dir1, { recursive: true });
  }
  const dbPath = path.join(dir1, "historical_market.sqlite");
  const db = new Database(dbPath);
  db.pragma("journal_mode = DELETE");
  db.pragma("synchronous = OFF");
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_market (
      date           TEXT PRIMARY KEY,
      ihsgPrice      REAL,
      goldPrice      REAL,
      usdidrRate     REAL,
      stockPrices    TEXT,
      stockAdjPrices TEXT,
      stockVolumes   TEXT,
      stockOpens     TEXT,
      stockHighs     TEXT,
      stockLows      TEXT,
      stockRanksProd  TEXT,
      stockRanksRes   TEXT,
      stockRawMetrics TEXT,
      stockNormScores TEXT
    )
  `);
  const insert = db.prepare(`
    INSERT OR REPLACE INTO daily_market
      (date, ihsgPrice, goldPrice, usdidrRate, stockPrices, stockAdjPrices, stockVolumes,
       stockOpens, stockHighs, stockLows, stockRanksProd, stockRanksRes,
       stockRawMetrics, stockNormScores)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const transaction = db.transaction((rows: typeof rowList) => {
    for (const row of rows) {
      insert.run(
        row.date, row.ihsgPrice ?? null, row.goldPrice ?? null, row.usdidrRate ?? null,
        JSON.stringify(row.stockPrices ?? {}), JSON.stringify(row.stockAdjPrices ?? {}),
        JSON.stringify(row.stockVolumes ?? {}), JSON.stringify(row.stockOpens ?? {}),
        JSON.stringify(row.stockHighs ?? {}), JSON.stringify(row.stockLows ?? {}),
        JSON.stringify(row.stockRanksProd ?? {}), JSON.stringify(row.stockRanksRes ?? {}),
        JSON.stringify(row.stockRawMetrics ?? {}), JSON.stringify(row.stockNormScores ?? {})
      );
    }
  });
  transaction(rowList);
  db.close();
  console.log(`Wrote ${rowList.length} records to SQLite at ${dbPath}.`);

  // Keep JSON for frontend import (src/data/), until SimulationTab is refactored to use API
  const dir2 = path.join(process.cwd(), "src", "data");
  if (!fs.existsSync(dir2)) {
    fs.mkdirSync(dir2, { recursive: true });
  }
  const outPath2 = path.join(dir2, "historical_market_data.json");
  fs.writeFileSync(outPath2, JSON.stringify(rowList, null, 2));
  console.log(`Wrote offline-ready frontend bundle to ${outPath2}.`);

  // Copy IDX warehouse for frontend SimulationTab import
  const whSrc = path.join(process.cwd(), "data", "fundamental_idx_all.json");
  const whDst = path.join(dir2, "fundamental_idx_all.json");
  fs.copyFileSync(whSrc, whDst);
  console.log(`Copied IDX warehouse to ${whDst}.`);
}

main().catch(err => {
  console.error("Historical Data Downloader failed:", err);
  process.exit(1);
});
