import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const __root = join(__dirname, "..");

// Config B weights for analytics rank computation
const W = { quality: 0.25, growth: 0.30, value: 0.10, momentum: 0.35, dividend: 0.00 };

function run(cmd: string): string {
  return execSync(cmd, { cwd: __root, encoding: "utf-8", timeout: 120000 });
}

function esc(v: any): string {
  if (v == null || v === undefined) return "NULL";
  if (typeof v === "number") return isFinite(v) ? String(v) : "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function main() {
  console.log("=== Compute Rank History ===");

  // Get all dates that have scores
  const datesRaw = run(`npx wrangler d1 execute quantbit-db --remote --json --command="SELECT DISTINCT score_date FROM stock_scores ORDER BY score_date"`);
  const datesData = JSON.parse(datesRaw);
  const dates: string[] = (datesData[0]?.results || []).map((r: any) => r.score_date);

  if (dates.length === 0) {
    console.log("No score dates found");
    return;
  }

  console.log(`${dates.length} dates to process`);

  let totalInserts = 0;

  for (const date of dates) {
    // Fetch scores for this date
    const raw = run(`npx wrangler d1 execute quantbit-db --remote --json --command="SELECT ticker,quality,growth,value,momentum,dividend FROM stock_scores WHERE score_date=${esc(date)}"`);
    const data = JSON.parse(raw);
    const rows: any[] = data[0]?.results || [];

    if (rows.length === 0) continue;

    // Compute total score per ticker using Config B weights
    const scored = rows.map((r: any) => {
      const q = r.quality ?? 50;
      const g = r.growth ?? 50;
      const v = r.value ?? 50;
      const m = r.momentum ?? 50;
      const d = r.dividend ?? 50;
      return {
        ticker: r.ticker,
        quality: q,
        growth: g,
        value: v,
        momentum: m,
        dividend: d,
        total: q * W.quality + g * W.growth + v * W.value + m * W.momentum + d * W.dividend,
      };
    });

    // Sort and rank by each factor
    const sortBy = (key: string) => [...scored].sort((a: any, b: any) => b[key] - a[key]);
    const rank = (sorted: any[], key: string) => {
      const map = new Map<string, number>();
      sorted.forEach((s, i) => map.set(s.ticker, i + 1));
      return map;
    };

    const totalSorted = sortBy("total");
    const qualitySorted = sortBy("quality");
    const growthSorted = sortBy("growth");
    const valueSorted = sortBy("value");
    const momentumSorted = sortBy("momentum");
    const dividendSorted = sortBy("dividend");

    const totalRank = rank(totalSorted, "total");
    const qualityRank = rank(qualitySorted, "quality");
    const growthRank = rank(growthSorted, "growth");
    const valueRank = rank(valueSorted, "value");
    const momentumRank = rank(momentumSorted, "momentum");
    const dividendRank = rank(dividendSorted, "dividend");

    // Generate SQL
    const sqlLines: string[] = [
      `DELETE FROM rank_history WHERE date=${esc(date)};`,
    ];
    for (const s of scored) {
      sqlLines.push(
        `INSERT INTO rank_history(ticker,date,total_score,total_rank,quality_score,quality_rank,growth_score,growth_rank,value_score,value_rank,momentum_score,momentum_rank,dividend_score,dividend_rank) VALUES(${esc(s.ticker)},${esc(date)},${s.total},${totalRank.get(s.ticker)},${s.quality},${qualityRank.get(s.ticker)},${s.growth},${growthRank.get(s.ticker)},${s.value},${valueRank.get(s.ticker)},${s.momentum},${momentumRank.get(s.ticker)},${s.dividend},${dividendRank.get(s.ticker)});`
      );
    }

    const sql = sqlLines.join("\n");
    const tmpFile = join(__root, "db", "seeds", "_rank_history.sql");
    const { writeFileSync } = await import("fs");
    writeFileSync(tmpFile, sql + "\n", "utf-8");
    run(`npx wrangler d1 execute quantbit-db --remote --file="${tmpFile}"`);

    totalInserts += scored.length;
    console.log(`  ${date}: ${scored.length} tickers ranked`);
  }

  console.log(`\nDone! ${totalInserts} total rank records inserted`);
}

main().catch(e => { console.error(e); process.exit(1); });
