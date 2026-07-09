import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const __root = join(__dirname, "..");
const TODAY = new Date().toISOString().split("T")[0];

function run(cmd: string): string {
  return execSync(cmd, { cwd: __root, encoding: "utf-8", timeout: 120000 });
}

function esc(v: any): string {
  if (v == null || v === undefined) return "NULL";
  if (typeof v === "number") return isFinite(v) ? String(v) : "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

// Compute rotation status based on score levels and trend
function getRotation(q: number, g: number, v: number, m: number): { label: string; status: string } {
  const total = q * 0.25 + g * 0.30 + v * 0.10 + m * 0.35;

  if (total >= 75 && q >= 70 && m >= 65) return { label: "Konsisten Peak", status: "up" };
  if (total >= 70 && g >= 75) return { label: "Breakout", status: "up" };
  if (total >= 65 && m >= 70) return { label: "Momentum", status: "up" };
  if (total >= 60 && q >= 60) return { label: "Solid", status: "stable" };
  if (total >= 55 && g >= 60) return { label: "Akumulasi", status: "up" };
  if (total >= 50) return { label: "Konsolidasi", status: "stable" };
  if (total >= 40) return { label: "Spekulatif", status: "stable" };
  if (total >= 30) return { label: "Tekanan", status: "down" };
  if (total >= 20) return { label: "Lemah", status: "down" };
  return { label: "Distribusi", status: "down" };
}

async function main() {
  console.log("=== Compute Rotation History ===");

  // Get latest score date
  const dateRaw = run(`npx wrangler d1 execute quantbit-db --remote --json --command="SELECT MAX(score_date) as max_date FROM stock_scores"`);
  const dateData = JSON.parse(dateRaw);
  const scoreDate: string = dateData[0]?.results?.[0]?.max_date || TODAY;

  // Fetch scores + sector info
  const raw = run(`npx wrangler d1 execute quantbit-db --remote --json --command="SELECT s.ticker,s.quality,s.growth,s.value,s.momentum,t.sector,t.industry FROM stock_scores s LEFT JOIN tickers t ON s.ticker=t.ticker WHERE s.score_date=${esc(scoreDate)}"`);
  const data = JSON.parse(raw);
  const rows: any[] = data[0]?.results || [];

  if (rows.length === 0) {
    console.log("No score data for", scoreDate);
    return;
  }

  const sqlLines: string[] = [
    `DELETE FROM rotation_history WHERE "date"=${esc(scoreDate)};`,
  ];

  for (const r of rows) {
    const q = r.quality ?? 50;
    const g = r.growth ?? 50;
    const v = r.value ?? 50;
    const m = r.momentum ?? 50;
    const { label, status } = getRotation(q, g, v, m);

    sqlLines.push(
      `INSERT INTO rotation_history("ticker","date","sector","industry","rotation_label","rotation_status","quality_score","growth_score","momentum_score") VALUES(${esc(r.ticker)},${esc(scoreDate)},${esc(r.sector)},${esc(r.industry)},${esc(label)},${esc(status)},${q},${g},${m});`
    );
  }

  const tmpFile = join(__root, "db", "seeds", "_rotation.sql");
  writeFileSync(tmpFile, sqlLines.join("\n") + "\n", "utf-8");
  run(`npx wrangler d1 execute quantbit-db --remote --file="${tmpFile}"`);

  console.log(`${rows.length} rotations computed for ${scoreDate}`);
  console.log("Done!");
}

main().catch(e => { console.error(e); process.exit(1); });
