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

// Determine signal tier from score factors
// 5 = FULL LOCK (total>=80, quality>=70, momentum>=60)
// 4 = Solid (total>=65, quality>=50)
// 3 = Sedang Anget (total>=50)
// 2 = Dingin (total>=35)
// 1 = Awasi (total<35)
function getTier(q: number, g: number, v: number, m: number): { tier: number; label: string } {
  const total = q * 0.25 + g * 0.30 + v * 0.10 + m * 0.35;
  if (total >= 80 && q >= 70 && m >= 60) return { tier: 5, label: "FULL LOCK" };
  if (total >= 65 && q >= 50) return { tier: 4, label: "Solid" };
  if (total >= 50) return { tier: 3, label: "Sedang Anget" };
  if (total >= 35) return { tier: 2, label: "Dingin" };
  return { tier: 1, label: "Awasi" };
}

async function main() {
  console.log("=== Compute Signal History ===");

  // Get latest score date
  const dateRaw = run(`npx wrangler d1 execute quantbit-db --remote --json --command="SELECT MAX(score_date) as max_date FROM stock_scores"`);
  const dateData = JSON.parse(dateRaw);
  const scoreDate: string = dateData[0]?.results?.[0]?.max_date || TODAY;

  // Fetch scores
  const raw = run(`npx wrangler d1 execute quantbit-db --remote --json --command="SELECT ticker,quality,growth,value,momentum FROM stock_scores WHERE score_date=${esc(scoreDate)}"`);
  const data = JSON.parse(raw);
  const rows: any[] = data[0]?.results || [];

  if (rows.length === 0) {
    console.log("No score data for", scoreDate);
    return;
  }

  // Compute signals
  const signals = rows.map((r: any) => {
    const { tier, label } = getTier(r.quality ?? 50, r.growth ?? 50, r.value ?? 50, r.momentum ?? 50);
    let reason = "";
    if (tier === 5) reason = "Skor total tinggi + kualitas kuat + momentum positif";
    else if (tier === 4) reason = "Skor total baik dengan fundamental solid";
    else if (tier === 3) reason = "Skor rata-rata, perlu dipantau";
    else if (tier === 2) reason = "Skor rendah, waspadai pelemahan lanjutan";
    else reason = "Skor sangat rendah, hindari dulu";
    return { ticker: r.ticker, tier, label, reason };
  });

  // Sort by tier desc
  signals.sort((a, b) => b.tier - a.tier);

  // Generate SQL (replace current date)
  const sqlLines: string[] = [
    `DELETE FROM signal_history WHERE "date"=${esc(scoreDate)};`,
  ];
  for (const s of signals) {
    sqlLines.push(
      `INSERT INTO signal_history("ticker","date","signal_tier","signal_label","signal_reason") VALUES(${esc(s.ticker)},${esc(scoreDate)},${s.tier},${esc(s.label)},${esc(s.reason)});`
    );
  }

  const tmpFile = join(__root, "db", "seeds", "_signals.sql");
  writeFileSync(tmpFile, sqlLines.join("\n") + "\n", "utf-8");
  run(`npx wrangler d1 execute quantbit-db --remote --file="${tmpFile}"`);

  console.log(`${signals.length} signals computed for ${scoreDate}`);
  console.log(`  Tier 5: ${signals.filter(s => s.tier === 5).length}`);
  console.log(`  Tier 4: ${signals.filter(s => s.tier === 4).length}`);
  console.log(`  Tier 3: ${signals.filter(s => s.tier === 3).length}`);
  console.log(`  Tier 2: ${signals.filter(s => s.tier === 2).length}`);
  console.log(`  Tier 1: ${signals.filter(s => s.tier === 1).length}`);
  console.log("Done!");
}

main().catch(e => { console.error(e); process.exit(1); });
