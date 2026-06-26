import YahooFinance from "yahoo-finance2";
import { IDX80_TICKERS } from "../src/constants/idx80";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const yahooFinance = new YahooFinance();

// Yahoo historical() returns dividends per ex-date as a small number
// (e.g., 100 for BBCA). We sum by calendar year to get annual DPS.
//
// This script replaces the hardcoded dividend_per_share values in
// scripts/fetch_historical_data.ts:54 (FUNDAMENTAL_SNAPSHOTS) with real
// data from Yahoo Finance.
//
// Usage:
//   npx tsx scripts/fetch_dividend_history.ts           # fetch all
//   npx tsx scripts/fetch_dividend_history.ts --smoke   # BBCA only, year 2024

const SMOKE = process.argv.includes("--smoke");
const PERIOD_START = "2010-01-01";
const PERIOD_END = new Date().toISOString().slice(0, 10);
const DELAY_MS = 800; // Yahoo rate limit courtesy

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchAnnualDps(ticker: string): Promise<Record<string, number>> {
  const cleanTicker = ticker.replace(".JK", "");
  const annual: Record<string, number> = {};
  try {
    const result = await yahooFinance.historical(cleanTicker + ".JK", {
      period1: PERIOD_START,
      period2: PERIOD_END,
      events: "dividends",
    });
    for (const row of result) {
      const d = (row as any).date as Date | string;
      const div = (row as any).dividends as number;
      if (!div || div <= 0) continue;
      const dateStr = typeof d === "string" ? d : d.toISOString();
      const year = dateStr.slice(0, 4);
      annual[year] = (annual[year] ?? 0) + div;
    }
  } catch (err: any) {
    console.warn(`  [${ticker}] fetch error: ${err.message ?? err}`);
  }
  return annual;
}

async function main() {
  const tickers = SMOKE ? ["BBCA.JK"] : IDX80_TICKERS;

  const out: Record<string, Record<string, { dividend_per_share: number }>> = {};
  const existingPath = join(process.cwd(), "data", "dividend_history.json");
  if (!SMOKE && existsSync(existingPath)) {
    try {
      Object.assign(out, JSON.parse(readFileSync(existingPath, "utf-8")));
      console.log(`Loaded existing data: ${Object.keys(out).length} tickers already cached.`);
    } catch {}
  }

  let updated = 0;
  let skipped = 0;
  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    const cleanTicker = ticker.replace(".JK", "");
    process.stdout.write(`[${i + 1}/${tickers.length}] ${ticker} ... `);
    if (out[cleanTicker] && Object.keys(out[cleanTicker]).length > 0 && !SMOKE) {
      console.log("cached");
      skipped++;
      continue;
    }
    const annual = await fetchAnnualDps(ticker);
    const years = Object.keys(annual);
    if (years.length === 0) {
      console.log("no data");
      out[cleanTicker] = {};
    } else {
      out[cleanTicker] = {};
      for (const y of years) {
        out[cleanTicker][y] = { dividend_per_share: Math.round(annual[y]) };
      }
      console.log(`${years.length} years, latest ${years[years.length - 1]}=${annual[years[years.length - 1]]}`);
      updated++;
    }
    if (i < tickers.length - 1) await sleep(DELAY_MS);
  }

  if (!SMOKE) {
    writeFileSync(existingPath, JSON.stringify(out, null, 2));
    console.log(`\nWrote data/dividend_history.json — ${Object.keys(out).length} tickers, ${updated} updated, ${skipped} cached.`);
  } else {
    console.log("\nSmoke result:", JSON.stringify(out, null, 2));
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
