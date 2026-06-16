import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

const API_KEY = process.env.SECTORS_API_KEY || process.argv.find(a => a.startsWith("--key="))?.split("=")[1];
if (!API_KEY) {
  console.error("Usage: set SECTORS_API_KEY env or pass --key=YOUR_KEY");
  process.exit(1);
}

const BASE = "https://api.sectors.app/v2";
const DB_PATH = path.join(process.cwd(), "data", "sectors_fundamentals.sqlite");
const PROGRESS_PATH = path.join(process.cwd(), "data", "sectors_progress.json");
const TICKER_LIST_PATH = path.join(process.cwd(), "data", "sectors_tickers.json");

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
      overview JSON,
      valuation JSON,
      financials JSON,
      dividend JSON
    );
    CREATE TABLE IF NOT EXISTS fundamentals_yearly (
      ticker TEXT NOT NULL,
      year INTEGER NOT NULL,
      roe REAL,
      der REAL,
      roa REAL,
      net_profit_margin REAL,
      gross_profit_margin REAL,
      operating_profit_margin REAL,
      eps REAL,
      book_value_per_share REAL,
      dividend_per_share REAL,
      dividend_yield REAL,
      payout_ratio REAL,
      shares_outstanding REAL,
      total_equity REAL,
      total_assets REAL,
      total_debt REAL,
      net_income REAL,
      total_revenue REAL,
      ebitda REAL,
      free_cash_flow REAL,
      operating_cash_flow REAL,
      pe REAL,
      pb REAL,
      PRIMARY KEY (ticker, year)
    );
  `);
}

async function sectorsGet(path: string): Promise<any> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, { headers: { Authorization: API_KEY } });
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("retry-after") || "60", 10);
    console.log(`Rate limited, waiting ${retryAfter}s...`);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return sectorsGet(path);
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

async function fetchTickerList(): Promise<string[]> {
  const cached = fs.existsSync(TICKER_LIST_PATH)
    ? JSON.parse(fs.readFileSync(TICKER_LIST_PATH, "utf-8"))
    : null;
  if (cached && Array.isArray(cached) && cached.length > 500) {
    console.log(`Using cached ticker list (${cached.length} stocks)`);
    return cached;
  }

  console.log("Fetching all IDX stock symbols via Screener...");
  const allTickers: string[] = [];
  let cursor: string | null = null;
  let page = 0;

  do {
    let url = "/companies/?limit=250&where=listing_date%20%3E%20%271900-01-01%27";
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
    const data = await sectorsGet(url);
    const results = data.results || [];
    for (const r of results) {
      if (r.symbol) allTickers.push(r.symbol);
    }
    page++;
    cursor = data.next_url ? new URL(data.next_url).searchParams.get("cursor") : null;
    console.log(`  Page ${page}: ${results.length} results (total: ${allTickers.length})`);
  } while (cursor);

  console.log(`Found ${allTickers.length} IDX stocks`);
  fs.writeFileSync(TICKER_LIST_PATH, JSON.stringify(allTickers, null, 2));
  return allTickers.sort();
}

function extractYearlyData(ticker: string, report: any): any[] {
  const { financials, valuation } = report;

  if (!financials || typeof financials !== "object") {
    return [];
  }

  const yearsSet = new Set<number>();
  for (const key of Object.keys(financials)) {
    const num = Number(key);
    if (!isNaN(num) && num >= 1990 && num <= 2030) yearsSet.add(num);
  }

  const rows: any[] = [];
  for (const yr of [...yearsSet].sort()) {
    const fy = financials[String(yr)] || {};
    const vy = valuation?.[String(yr)] || {};

    const totalEquity = fy.total_equity ?? 0;
    const totalAssets = fy.total_assets ?? 0;
    const totalDebt = fy.total_debt ?? 0;
    const netIncome = fy.net_income ?? fy.earnings ?? fy.net_profit ?? 0;
    const totalRevenue = fy.total_revenue ?? fy.revenue ?? 0;
    const sharesOutstanding = fy.outstanding_shares ?? 0;
    const ebitda = fy.ebitda ?? 0;
    const freeCashFlow = fy.free_cash_flow ?? 0;
    const operatingCashFlow = fy.operating_cash_flow ?? 0;

    const dividendPerShare = fy.total_dividend ?? 0;
    const dividendYield = fy.total_yield ?? vy.total_yield ?? 0;
    const payoutRatio = fy.payout_ratio ?? 0;

    rows.push({
      ticker, year: yr,
      roe: fy.roe ?? (totalEquity > 0 ? netIncome / totalEquity : 0),
      der: fy.debt_to_equity_ratio ?? (totalEquity > 0 ? totalDebt / totalEquity : 0),
      roa: fy.roa ?? (totalAssets > 0 ? netIncome / totalAssets : 0),
      net_profit_margin: fy.net_profit_margin ?? (totalRevenue > 0 ? netIncome / totalRevenue : 0),
      gross_profit_margin: fy.gross_profit_margin ?? 0,
      operating_profit_margin: fy.operating_profit_margin ?? 0,
      eps: fy.eps ?? (sharesOutstanding > 0 ? netIncome / sharesOutstanding : 0),
      book_value_per_share: sharesOutstanding > 0 ? totalEquity / sharesOutstanding : 0,
      dividend_per_share: dividendPerShare,
      dividend_yield: dividendYield,
      payout_ratio: payoutRatio,
      shares_outstanding: sharesOutstanding,
      total_equity: totalEquity,
      total_assets: totalAssets,
      total_debt: totalDebt,
      net_income: netIncome,
      total_revenue: totalRevenue,
      ebitda,
      free_cash_flow: freeCashFlow,
      operating_cash_flow: operatingCashFlow,
      pe: vy.pe ?? 0,
      pb: vy.pb ?? 0,
    });
  }
  return rows;
}

async function fetchCompanyReport(ticker: string): Promise<any> {
  const data = await sectorsGet(`/company/report/${ticker}/?sections=financials,valuation,dividend`);
  return data;
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

  const insertYearly = db.prepare(`
    INSERT OR REPLACE INTO fundamentals_yearly (
      ticker, year,
      roe, der, roa,
      net_profit_margin, gross_profit_margin, operating_profit_margin,
      eps, book_value_per_share,
      dividend_per_share, dividend_yield, payout_ratio,
      shares_outstanding,
      total_equity, total_assets, total_debt,
      net_income, total_revenue,
      ebitda, free_cash_flow, operating_cash_flow,
      pe, pb
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertRaw = db.prepare(`
    INSERT OR REPLACE INTO fundamentals_raw (ticker, fetched_at, overview, valuation, financials, dividend)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const progress = loadProgress();
  let tickers = progress.allTickers;
  if (tickers.length === 0) {
    tickers = await fetchTickerList();
    progress.allTickers = tickers;
    saveProgress(progress);
  } else {
    console.log(`Resuming: ${tickers.length} tickers (${progress.completed.length} done, ${progress.failed.length} failed)`);
  }

  const completed = new Set(progress.completed);

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    if (completed.has(ticker)) {
      if ((i + 1) % 50 === 0) console.log(`[${i + 1}/${tickers.length}] Skipping ${ticker}`);
      continue;
    }

    process.stdout.write(`[${i + 1}/${tickers.length}] Fetching ${ticker}... `);
    try {
      const report = await fetchCompanyReport(ticker);
      if (!report || report.error) {
        console.log("SKIP (no data)");
        progress.failed.push({ ticker, error: report?.error || "No data" });
        saveProgress(progress);
        continue;
      }

      const transaction = db.transaction(() => {
        insertRaw.run(
          ticker,
          new Date().toISOString(),
          JSON.stringify(report.overview || {}),
          JSON.stringify(report.valuation || {}),
          JSON.stringify(report.financials || {}),
          JSON.stringify(report.dividend || {})
        );
        const yearly = extractYearlyData(ticker, report);
        for (const row of yearly) {
          insertYearly.run(
            row.ticker, row.year,
            row.roe, row.der, row.roa,
            row.net_profit_margin, row.gross_profit_margin, row.operating_profit_margin,
            row.eps, row.book_value_per_share,
            row.dividend_per_share, row.dividend_yield, row.payout_ratio,
            row.shares_outstanding,
            row.total_equity, row.total_assets, row.total_debt,
            row.net_income, row.total_revenue,
            row.ebitda, row.free_cash_flow, row.operating_cash_flow,
            row.pe, row.pb
          );
        }
      });
      transaction();

      completed.add(ticker);
      progress.completed.push(ticker);
      saveProgress(progress);

      const count = db.prepare("SELECT COUNT(*) as c FROM fundamentals_yearly WHERE ticker = ?").get(ticker) as any;
      console.log(`OK (${count.c} years)`);
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

  const t = db.prepare("SELECT COUNT(DISTINCT ticker) as c FROM fundamentals_raw").get() as any;
  const y = db.prepare("SELECT COUNT(*) as c FROM fundamentals_yearly").get() as any;
  console.log(`\nCOMPLETE! ${t.c} tickers saved, ${y.c} yearly records in ${DB_PATH}`);

  if (progress.failed.length > 0) {
    console.log(`\n${progress.failed.length} tickers failed:`);
    progress.failed.forEach(f => console.log(`  - ${f.ticker}: ${f.error}`));
  }

  db.close();
  if (progress.failed.length === 0 && fs.existsSync(PROGRESS_PATH)) {
    fs.unlinkSync(PROGRESS_PATH);
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
