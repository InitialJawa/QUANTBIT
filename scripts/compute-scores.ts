// Hitung momentum dari stock_daily -> stock_scores
// Quality/Growth/Value nanti dari IDX scraper

import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCORE_DATE = "2026-07-03";
const SQL_FILE = join(__dirname, "..", "db", "seeds", "seed_scores.sql");

const SQL_QUERY = `SELECT l.ticker,(l.close-COALESCE(p6.close,l.close))/COALESCE(NULLIF(p6.close,0),l.close) as mom6m,(l.close-COALESCE(p12.close,l.close))/COALESCE(NULLIF(p12.close,0),l.close) as mom12m FROM (SELECT ticker,close FROM stock_daily WHERE date=(SELECT MAX(date) FROM stock_daily)) l LEFT JOIN (SELECT ticker,close FROM stock_daily WHERE(ticker,date) IN(SELECT ticker,MAX(date) FROM stock_daily WHERE date<='2026-01-03' GROUP BY ticker)) p6 ON l.ticker=p6.ticker LEFT JOIN (SELECT ticker,close FROM stock_daily WHERE(ticker,date) IN(SELECT ticker,MAX(date) FROM stock_daily WHERE date<='2025-07-03' GROUP BY ticker)) p12 ON l.ticker=p12.ticker`;

function run(cmd: string): string {
  return execSync(cmd, { cwd: join(__dirname, ".."), encoding: "utf-8", timeout: 60000 });
}

async function main() {
  console.log("=== Compute Momentum ===");

  const raw = run(
    `npx wrangler d1 execute quantbit-db --remote --json --command="${SQL_QUERY}"`
  );
  const data = JSON.parse(raw);
  const rows = data[0]?.results;
  if (!rows || rows.length === 0) { console.log("No data"); return; }

  console.log(`${rows.length} tickers`);

  // Percentile ranks
  const mom6 = [...rows].sort((a: any, b: any) => a.mom6m - b.mom6m);
  const mom12 = [...rows].sort((a: any, b: any) => a.mom12m - b.mom12m);
  const n = rows.length;
  const rank6 = new Map(mom6.map((r: any, i: number) => [r.ticker, i / (n - 1)]));
  const rank12 = new Map(mom12.map((r: any, i: number) => [r.ticker, i / (n - 1)]));

  // Generate SQL
  const inserts = [`DELETE FROM stock_scores WHERE score_date = '${SCORE_DATE}';`];
  for (const r of rows) {
    const score = Math.round(((rank6.get(r.ticker)! + rank12.get(r.ticker)!) / 2) * 1000) / 10;
    inserts.push(`INSERT INTO stock_scores(ticker,score_date,momentum) VALUES('${r.ticker}','${SCORE_DATE}',${score});`);
  }

  writeFileSync(SQL_FILE, inserts.join("\n") + "\n", "utf-8");
  console.log(`SQL: ${inserts.length - 1} rows`);

  // Seed
  console.log("Seeding...");
  run(`npx wrangler d1 execute quantbit-db --remote --file="${SQL_FILE}"`);

  // Verify
  const v = run(`npx wrangler d1 execute quantbit-db --remote --command="SELECT COUNT(*) as total FROM stock_scores WHERE score_date='${SCORE_DATE}'"`);
  console.log(v);
  console.log("Done!");
}

main().catch(console.error);
