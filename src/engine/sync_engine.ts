import YahooFinance from "yahoo-finance2";
const yahooFinance = new YahooFinance();
import { COMBINED_TICKERS } from "../constants/idx80.ts";
import fs from "fs";
import path from "path";

const API_BASE = process.env.API_BASE || "http://localhost:8788";

function calcQuality(stats: any, fin: any) {
  let score = 50;
  if (fin?.returnOnEquity) {
    if (fin.returnOnEquity > 0.15) score += 20;
    else if (fin.returnOnEquity > 0) score += 10;
    else score -= 10;
  }
  if (fin?.debtToEquity) {
    if (fin.debtToEquity < 50) score += 20;
    else if (fin.debtToEquity > 150) score -= 20;
  }
  return Math.min(100, Math.max(1, score));
}

function calcValue(stats: any, summary: any) {
  let score = 50;
  if (summary?.forwardPE) {
    if (summary.forwardPE < 10) score += 30;
    else if (summary.forwardPE < 15) score += 10;
    else if (summary.forwardPE > 25) score -= 20;
  }
  if (summary?.priceToBook) {
    if (summary.priceToBook < 1) score += 20;
    else if (summary.priceToBook > 3) score -= 10;
  }
  return Math.min(100, Math.max(1, score));
}

function calcGrowth(fin: any) {
  let score = 50;
  if (fin?.revenueGrowth) {
    if (fin.revenueGrowth > 0.2) score += 25;
    else if (fin.revenueGrowth > 0.1) score += 10;
    else if (fin.revenueGrowth < 0) score -= 10;
  }
  if (fin?.earningsGrowth) {
    if (fin.earningsGrowth > 0.2) score += 25;
    else if (fin.earningsGrowth > 0) score += 10;
    else if (fin.earningsGrowth < 0) score -= 20;
  }
  return Math.min(100, Math.max(1, score));
}

function calcDividend(detail: any) {
  let score = 50;
  const dy = detail?.dividendYield;
  if (dy != null) {
    const pct = dy * 100;
    if (pct > 8) score += 35;
    else if (pct > 5) score += 25;
    else if (pct > 3) score += 15;
    else if (pct > 1.5) score += 5;
    else if (pct < 0.3) score -= 15;
  }
  return Math.min(100, Math.max(1, score));
}

let ACTIVE_UNIVERSE = [...COMBINED_TICKERS];

export async function refreshActiveUniverse() {
  try {
    const resp = await fetch(`${API_BASE}/api/engine/active-universe`);
    if (resp.ok) {
      const data = await resp.json() as { tickers?: unknown };
      if (Array.isArray(data.tickers)) {
        ACTIVE_UNIVERSE = data.tickers;
        console.log(`[Universe Update] Pulled ${ACTIVE_UNIVERSE.length} tickers from D1.`);
      }
    }
  } catch (err: any) {
    console.log("[Universe Update] Defaulting to base list.", err.message);
  }
}

export async function runIdx80Scan() {
  await refreshActiveUniverse();
  console.log(`Starting Quantitative Scan for ${ACTIVE_UNIVERSE.length} stocks...`);
  const results: any[] = [];

  const concurrencyLimit = 15;
  const pool = [...ACTIVE_UNIVERSE];
  
  const worker = async () => {
    while (pool.length > 0) {
      const ticker = pool.shift();
      if (!ticker) break;
      try {
        const quote: any = await yahooFinance.quoteSummary(ticker, {
          modules: ["price", "defaultKeyStatistics", "summaryDetail", "financialData", "summaryProfile"]
        });
        
        const price = quote.price?.regularMarketPrice || 0;
        const change = quote.price?.regularMarketChangePercent || 0;
        
        const quality = calcQuality(quote.defaultKeyStatistics, quote.financialData);
        const value = calcValue(quote.defaultKeyStatistics, quote.summaryDetail);
        const growth = calcGrowth(quote.financialData);
        
        let momentum = 50;
        if (quote.summaryDetail?.fiftyDayAverage && quote.summaryDetail?.twoHundredDayAverage) {
           if (quote.summaryDetail.fiftyDayAverage > quote.summaryDetail.twoHundredDayAverage) momentum += 30;
           if (price > quote.summaryDetail.fiftyDayAverage) momentum += 20;
           if (price < quote.summaryDetail.twoHundredDayAverage) momentum -= 20;
        }
        momentum = Math.min(100, Math.max(1, momentum));

        const dividend = calcDividend(quote.summaryDetail);

        const fin = quote.financialData || {};
        const stat = quote.defaultKeyStatistics || {};
        const detail = quote.summaryDetail || {};
        const profile = quote.summaryProfile || {};
        const fiftyTwoWeekHigh = detail.fiftyTwoWeekHigh || price;
        const fiftyTwoWeekLow = detail.fiftyTwoWeekLow || price;

        const data = {
          ticker,
          companyName: quote.price?.longName || quote.price?.shortName || ticker,
          sector: profile.sector || "Unknown",
          industry: profile.industry || "Unknown",
          longBusinessSummary: profile.longBusinessSummary || "",
          currentPrice: price,
          changePercent: change * 100,
          quality,
          value,
          growth,
          momentum,
          dividend,
          volume: detail.volume || 0,
          peRatio: detail.trailingPE || detail.forwardPE || 0,
          pbRatio: stat.priceToBook || 0,
          dividendYield: (detail.dividendYield || 0) * 100,
          marketCap: quote.price?.marketCap || 0,
          trailingEps: stat.trailingEps || 0,
          fiftyTwoWeekHigh,
          fiftyTwoWeekLow,
          fiftyDayAverage: detail.fiftyDayAverage || price,
          twoHundredDayAverage: detail.twoHundredDayAverage || price,
          totalRevenue: fin.totalRevenue || 0,
          netIncome: fin.netIncome || 0,
          operatingCashflow: fin.operatingCashflow || 0,
          freeCashflow: fin.freeCashflow || 0,
          grossProfit: fin.grossProfit || 0,
          ebitda: fin.ebitda || 0,
          revenueGrowth: fin.revenueGrowth || 0,
          earningsGrowth: fin.earningsGrowth || 0,
          returnOnEquity: fin.returnOnEquity || 0,
          debtToEquity: fin.debtToEquity || 0,
          operatingMargin: fin.operatingMargin || 0,
          grossMargins: fin.grossMargins || 0,
          lastUpdated: new Date().toISOString()
        };
        
        results.push(data);
        console.log(`Scanned ${ticker} - DONE`);
      } catch (err: any) {
        console.error(`Error scanning ${ticker}:`, err.message);
      }
    }
  };

  const workers = Array.from({ length: concurrencyLimit }, () => worker());
  await Promise.all(workers);

  // Save to D1 API
  try {
    const resp = await fetch(`${API_BASE}/api/engine/idx-data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lastUpdated: new Date().toISOString(), count: results.length, stocks: results })
    });
    if (resp.ok) {
      console.log("IDX80 Scan data successfully synced to D1!");
    } else {
      console.error("Error saving scan data to D1:", await resp.text());
    }
  } catch (err) {
    console.error("Error saving scan data to D1:", err);
  }

  // Local cache fallback
  if (results.length > 0) {
    const dataPath = path.join(process.cwd(), "data", "idx80_scan.json");
    if (!fs.existsSync(path.dirname(dataPath))) fs.mkdirSync(path.dirname(dataPath), { recursive: true });
    fs.writeFileSync(dataPath, JSON.stringify({ lastUpdated: new Date().toISOString(), stocks: results }, null, 2));
  }
}

export async function startScannerCron() {
  console.log("Scheduling IDX80 Scanner to run every 15 minutes...");
  const { default: cron } = await import("node-cron");
  cron.schedule("*/15 * * * *", () => {
    runIdx80Scan();
  });
  
  setTimeout(() => {
    runIdx80Scan();
  }, 5000);
}

import { fileURLToPath } from "url";
const isMain = process.argv[1] && (path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url)));
if (isMain) {
  runIdx80Scan().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
