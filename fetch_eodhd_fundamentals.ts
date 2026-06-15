import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const API_KEY = process.env.EODHD_API_KEY || process.argv.find(a => a.startsWith("--key="))?.split("=")[1];
if (!API_KEY) {
  console.error("Usage: set EODHD_API_KEY env or pass --key=YOUR_KEY");
  process.exit(1);
}

const BASE = "https://eodhd.com/api";
const DB_PATH = path.join(process.cwd(), "data", "fundamentals.sqlite");
const PROGRESS_PATH = path.join(process.cwd(), "data", "fundamentals_progress.json");

interface Progress {
  allTickers: string[];
  completed: string[];
  failed: { ticker: string; error: string }[];
}

function loadProgress(): Progress {
  if (fs.existsSync(PROGRESS_PATH)) {
    return JSON.parse(fs.readFileSync(PROGRESS_PATH, "utf-8"));
  }
  return { allTickers: [], completed: [], failed: [] };
}

function saveProgress(p: Progress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(p, null, 2));
}

function initDB(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS fundamentals_raw (
      ticker TEXT PRIMARY KEY,
      fetched_at TEXT NOT NULL,
      general JSON,
      highlights JSON,
      valuation JSON,
      technicals JSON,
      splits_dividends JSON,
      earnings JSON,
      financials JSON
    );

    CREATE TABLE IF NOT EXISTS fundamentals_yearly (
      ticker TEXT NOT NULL,
      year INTEGER NOT NULL,
      roe REAL,
      der REAL,
      roa REAL,
      net_margin REAL,
      dividend_per_share REAL,
      eps REAL,
      book_value_per_share REAL,
      shares_outstanding REAL,
      total_equity REAL,
      total_assets REAL,
      total_debt REAL,
      net_income REAL,
      total_revenue REAL,
      PRIMARY KEY (ticker, year)
    );
  `);
}

function extractYearlyData(ticker: string, data: any) {
  const bsYearly = data?.Financials?.Balance_Sheet?.yearly || {};
  const isYearly = data?.Financials?.Income_Statement?.yearly || {};
  const sharesHist = data?.SharesStats?.outstandingShares || {};
  const dividends = data?.SplitsDividends || {};

  const allYears = new Set([
    ...Object.keys(bsYearly).map(Number),
    ...Object.keys(isYearly).map(Number),
  ]);

  const rows: any[] = [];
  for (const yr of allYears) {
    if (yr < 1995 || yr > 2030) continue;
    const bs = bsYearly[yr] || {};
    const is = isYearly[yr] || {};
    const yearStr = String(yr);

    const totalEquity = bs.totalEquity || bs.commonStockEquity || 0;
    const totalAssets = bs.totalAssets || 0;
    const totalDebt = bs.totalDebt || bs.longTermDebt || 0;
    const netIncome = is.netIncome || 0;
    const totalRevenue = is.totalRevenue || 0;
    let sharesOutstanding = sharesHist[yearStr] || 0;

    const roe = totalEquity > 0 ? netIncome / totalEquity : 0;
    const der = totalEquity > 0 ? totalDebt / totalEquity : 0;
    const roa = totalAssets > 0 ? netIncome / totalAssets : 0;
    const net_margin = totalRevenue > 0 ? netIncome / totalRevenue : 0;
    const eps = sharesOutstanding > 0 ? netIncome / sharesOutstanding : 0;
    const bvps = sharesOutstanding > 0 ? totalEquity / sharesOutstanding : 0;
    const div = dividends?.dividendPerShare || 0;

    rows.push({
      ticker, year: yr,
      roe, der, roa, net_margin,
      dividend_per_share: div,
      eps, book_value_per_share: bvps,
      shares_outstanding: sharesOutstanding,
      total_equity: totalEquity,
      total_assets: totalAssets,
      total_debt: totalDebt,
      net_income: netIncome,
      total_revenue: totalRevenue,
    });
  }
  return rows;
}

async function fetchTickerList(): Promise<string[]> {
  console.log("Fetching IDX common stock list...");
  const url = `${BASE}/exchange-symbol-list/JK?api_token=${API_KEY}&fmt=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ticker list: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Unexpected response format");
  const stocks = data
    .filter((s: any) => s.Type === "Common Stock")
    .map((s: any) => s.Code);
  console.log(`Found ${stocks.length} common stocks on IDX`);
  return stocks.sort();
}

async function fetchFundamentals(ticker: string): Promise<any> {
  const url = `${BASE}/v1.1/fundamentals/${ticker}.JK?api_token=${API_KEY}&fmt=json`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 429) {
      console.log("Rate limited, waiting 60s...");
      await new Promise(r => setTimeout(r, 60000));
      return fetchFundamentals(ticker);
    }
    if (res.status === 404) return null;
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

async function main() {
  const IS_CLOUD = !!process.env.VERCEL || process.env.NODE_ENV === "production";
  if (IS_CLOUD) {
    console.log("[INFO] Detected cloud (read‑only) environment – skipping database sync.");
    return;
  }
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = DELETE");
  db.pragma("synchronous = OFF");
  initDB(db);

  const insertRaw = db.prepare(`
    INSERT OR REPLACE INTO fundamentals_raw (ticker, fetched_at, general, highlights, valuation, technicals, splits_dividends, earnings, financials)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertYearly = db.prepare(`
    INSERT OR REPLACE INTO fundamentals_yearly (ticker, year, roe, der, roa, net_margin, dividend_per_share, eps, book_value_per_share, shares_outstanding, total_equity, total_assets, total_debt, net_income, total_revenue)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const progress = loadProgress();
  let tickers = progress.allTickers;
  if (tickers.length === 0) {
    tickers = await fetchTickerList();
    progress.allTickers = tickers;
    saveProgress(progress);
  } else {
    console.log(`Resuming with ${tickers.length} tickers (${progress.completed.length} done, ${progress.failed.length} failed)`);
  }

  const completed = new Set(progress.completed);
  const skip = [...completed];

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    if (completed.has(ticker)) {
      if ((i + 1) % 50 === 0) console.log(`[${i + 1}/${tickers.length}] Skipping ${ticker} (already done)`);
      continue;
    }

    process.stdout.write(`[${i + 1}/${tickers.length}] Fetching ${ticker}... `);
    try {
      const data = await fetchFundamentals(ticker);
      if (!data) {
        console.log("SKIP (no data)");
        progress.failed.push({ ticker, error: "No data returned (404/empty)" });
        saveProgress(progress);
        continue;
      }

      const transaction = db.transaction(() => {
        insertRaw.run(
          ticker,
          new Date().toISOString(),
          JSON.stringify(data.General || {}),
          JSON.stringify(data.Highlights || {}),
          JSON.stringify(data.Valuation || {}),
          JSON.stringify(data.Technicals || {}),
          JSON.stringify(data.SplitsDividends || {}),
          JSON.stringify(data.Earnings || {}),
          JSON.stringify(data.Financials || {})
        );
        const yearly = extractYearlyData(ticker, data);
        for (const row of yearly) {
          insertYearly.run(
            row.ticker, row.year,
            row.roe, row.der, row.roa, row.net_margin,
            row.dividend_per_share,
            row.eps, row.book_value_per_share,
            row.shares_outstanding,
            row.total_equity, row.total_assets, row.total_debt,
            row.net_income, row.total_revenue
          );
        }
      });
      transaction();

      completed.add(ticker);
      progress.completed.push(ticker);
      saveProgress(progress);

      const years = db.prepare("SELECT COUNT(*) as c FROM fundamentals_yearly WHERE ticker = ?").get(ticker) as any;
      console.log(`OK (${years.c} years)`);
    } catch (err: any) {
      console.log(`FAIL: ${err.message}`);
      progress.failed.push({ ticker, error: err.message });
      saveProgress(progress);
    }

    if ((i + 1) % 20 === 0) {
      const done = progress.completed.length;
      const fail = progress.failed.length;
      const total = tickers.length;
      console.log(`\n--- Progress: ${done + fail}/${total} | OK: ${done} | Failed: ${fail} | Left: ${total - done - fail} ---\n`);
    }
  }

  const d = db.prepare("SELECT COUNT(DISTINCT ticker) as t FROM fundamentals_raw").get() as any;
  const y = db.prepare("SELECT COUNT(*) as c FROM fundamentals_yearly").get() as any;
  console.log(`\n✅ COMPLETE! ${d.t} tickers saved, ${y.c} yearly records in ${DB_PATH}`);

  if (progress.failed.length > 0) {
    console.log(`\n⚠️  ${progress.failed.length} tickers failed:`);
    progress.failed.forEach(f => console.log(`  - ${f.ticker}: ${f.error}`));
  }

  db.close();
  fs.unlinkSync(PROGRESS_PATH);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
