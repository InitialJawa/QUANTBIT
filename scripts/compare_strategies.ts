import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { runStrategy } from "../src/engine/index.ts";
import type { BacktestDayData, BacktestResult, ProfileWeights } from "../src/engine/types.ts";
import { IDX80_TICKERS, IDX30_TICKERS, LQ45_TICKERS } from "../src/constants/idx80.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CAPITAL = 100_000_000;
const START = "2021-01-04";
const END = "2026-06-24";
const UNIVERSE = "idx80";
const TOP_N = 5;

function loadData(): BacktestDayData[] {
  const yearsDir = join(__dirname, "..", "data", "years");
  const files = readdirSync(yearsDir).filter(f => f.endsWith(".json")).sort();
  const all: BacktestDayData[] = [];
  for (const f of files) {
    const raw = readFileSync(join(yearsDir, f), "utf8");
    const chunk: BacktestDayData[] = JSON.parse(raw);
    all.push(...chunk);
  }
  all.sort((a, b) => a.date.localeCompare(b.date));
  return all;
}

interface TestConfig {
  label: string;
  desc: string;
  profileWeights: ProfileWeights;
  crashSensitivity: number;
  singleSellTrigger: number;
  enableCrashProtection: boolean;
  enableCrossover: boolean;
  safeHavenAsset: "emas" | "kas";
}

const TESTS: TestConfig[] = [
  // BASELINE — Aman, default settings
  {
    label: "BASELINE (Aman Default)",
    desc: "Aman Q30/G45/V10/M0/D15, crash:10, sell:8, crossover ON",
    profileWeights: { quality: 0.30, growth: 0.45, value: 0.10, momentum: 0.00, dividend: 0.15 },
    crashSensitivity: 10,
    singleSellTrigger: 8,
    enableCrashProtection: true,
    enableCrossover: true,
    safeHavenAsset: "emas",
  },
  // OPTION A — Momentum matters (use weights with M > 0)
  {
    label: "A. Momentum Matters",
    desc: "Agresif Q20/G60/V10/M10/D0, crash:10, sell:8, crossover ON",
    profileWeights: { quality: 0.20, growth: 0.60, value: 0.10, momentum: 0.10, dividend: 0.00 },
    crashSensitivity: 10,
    singleSellTrigger: 8,
    enableCrashProtection: true,
    enableCrossover: true,
    safeHavenAsset: "emas",
  },
  // OPTION A variant — Aman + momentum (hybrid weight)
  {
    label: "A2. Aman + Momentum 10%",
    desc: "Q25/G40/V10/M10/D15, crash:10, sell:8, crossover ON",
    profileWeights: { quality: 0.25, growth: 0.40, value: 0.10, momentum: 0.10, dividend: 0.15 },
    crashSensitivity: 10,
    singleSellTrigger: 8,
    enableCrashProtection: true,
    enableCrossover: true,
    safeHavenAsset: "emas",
  },
  // OPTION B — Exit by drawdown only (no crash protection, rely on single sell trigger)
  {
    label: "B. Drawdown Exit Only",
    desc: "Aman Q30/G45/V10/M0/D15, crash:OFF, sell:8, crossover ON",
    profileWeights: { quality: 0.30, growth: 0.45, value: 0.10, momentum: 0.00, dividend: 0.15 },
    crashSensitivity: 10,
    singleSellTrigger: 8,
    enableCrashProtection: false,
    enableCrossover: true,
    safeHavenAsset: "emas",
  },
  // OPTION B2 — relaxed triggers
  {
    label: "B2. Drawdown Exit + Relaxed",
    desc: "Aman Q30/G45/V10/M0/D15, crash:OFF, sell:15, crossover ON",
    profileWeights: { quality: 0.30, growth: 0.45, value: 0.10, momentum: 0.00, dividend: 0.15 },
    crashSensitivity: 10,
    singleSellTrigger: 15,
    enableCrashProtection: false,
    enableCrossover: true,
    safeHavenAsset: "emas",
  },
  // OPTION C — Hybrid: relaxed crash, same weights
  {
    label: "C. Hybrid Relaxed",
    desc: "Aman Q30/G45/V10/M0/D15, crash:20, sell:12, crossover ON",
    profileWeights: { quality: 0.30, growth: 0.45, value: 0.10, momentum: 0.00, dividend: 0.15 },
    crashSensitivity: 20,
    singleSellTrigger: 12,
    enableCrashProtection: true,
    enableCrossover: true,
    safeHavenAsset: "emas",
  },
  // NO EXIT — buy and hold top N, no sell at all
  {
    label: "D. No Exit (Buy & Hold Top N)",
    desc: "Aman Q30/G45/V10/M0/D15, crash:OFF, crossover:OFF",
    profileWeights: { quality: 0.30, growth: 0.45, value: 0.10, momentum: 0.00, dividend: 0.15 },
    crashSensitivity: 10,
    singleSellTrigger: 99,
    enableCrashProtection: false,
    enableCrossover: false,
    safeHavenAsset: "emas",
  },
  // STRICT — very tight exit
  {
    label: "E. Super Ketat",
    desc: "Aman Q30/G45/V10/M0/D15, crash:5, sell:5, crossover ON",
    profileWeights: { quality: 0.30, growth: 0.45, value: 0.10, momentum: 0.00, dividend: 0.15 },
    crashSensitivity: 5,
    singleSellTrigger: 5,
    enableCrashProtection: true,
    enableCrossover: true,
    safeHavenAsset: "emas",
  },
  // WARREN — Buffett-inspired
  {
    label: "F. Warren (Buffett)",
    desc: "Q45/G10/V30/M0/D15, crash:10, sell:8, crossover ON",
    profileWeights: { quality: 0.45, growth: 0.10, value: 0.30, momentum: 0.00, dividend: 0.15 },
    crashSensitivity: 10,
    singleSellTrigger: 8,
    enableCrashProtection: true,
    enableCrossover: true,
    safeHavenAsset: "emas",
  },
  // WARREN — crash OFF
  {
    label: "F2. Warren Relaxed",
    desc: "Q45/G10/V30/M0/D15, crash:OFF, sell:8, crossover ON",
    profileWeights: { quality: 0.45, growth: 0.10, value: 0.30, momentum: 0.00, dividend: 0.15 },
    crashSensitivity: 10,
    singleSellTrigger: 8,
    enableCrashProtection: false,
    enableCrossover: true,
    safeHavenAsset: "emas",
  },
  // WARREN — more value tilt
  {
    label: "F3. Warren Value++",
    desc: "Q35/G10/V40/M0/D15, crash:10, sell:8, crossover ON",
    profileWeights: { quality: 0.35, growth: 0.10, value: 0.40, momentum: 0.00, dividend: 0.15 },
    crashSensitivity: 10,
    singleSellTrigger: 8,
    enableCrashProtection: true,
    enableCrossover: true,
    safeHavenAsset: "emas",
  },
];

function runTest(dayData: BacktestDayData[], t: TestConfig): BacktestResult | null {
  try {
    return runStrategy({
      dayData,
      config: {
        capital: CAPITAL,
        reserveBufferPct: 10,
        topNCount: TOP_N,
        universe: UNIVERSE,
        simulationMode: "algo",
        singleTicker: "BBCA",
        enableCrashProtection: t.enableCrashProtection,
        crashSensitivity: t.crashSensitivity,
        singleSellTrigger: t.singleSellTrigger,
        singleBuyTrigger: 5,
        safeHavenAsset: t.safeHavenAsset,
        enableCrossover: t.enableCrossover,
        simStartDate: START,
        simEndDate: END,
        customUniverse: [],
        enableAdaptiveWeights: false,
        activeProfileId: "compare",
      },
      profileWeights: t.profileWeights,
      universeTickers: {
        idx80: IDX80_TICKERS,
        idx30: IDX30_TICKERS,
        lq45: LQ45_TICKERS,
      },
    });
  } catch (e) {
    console.error(`  ERROR: ${e}`);
    return null;
  }
}

function computeScore(r: BacktestResult): number {
  return r.sharpe * 10 - r.maxDrawdown / 8 + r.sortino * 5 + r.cagr * 0.5;
}

function main() {
  console.log("Loading data...");
  const dayData = loadData();
  const filtered = dayData.filter(d => d.date >= START && d.date <= END);
  console.log(`Loaded ${filtered.length} days (${filtered[0]?.date} → ${filtered[filtered.length-1]?.date})`);

  const results: { label: string; desc: string; result: BacktestResult; score: number }[] = [];

  for (const t of TESTS) {
    console.log(`\n${"=".repeat(70)}`);
    console.log(`  ${t.label}`);
    console.log(`  ${t.desc}`);
    console.log(`${"=".repeat(70)}`);

    const r = runTest(filtered, t);
    if (r) {
      const score = computeScore(r);
      results.push({ label: t.label, desc: t.desc, result: r, score });
      console.log(`  Return:    ${r.totalReturnPct.toFixed(2)}%`);
      console.log(`  CAGR:      ${r.cagr.toFixed(2)}%`);
      console.log(`  Sharpe:    ${r.sharpe.toFixed(4)}`);
      console.log(`  Sortino:   ${r.sortino.toFixed(4)}`);
      console.log(`  Max DD:    ${r.maxDrawdown.toFixed(2)}%`);
      console.log(`  Calmar:    ${r.calmar.toFixed(4)}`);
      console.log(`  Volatility:${r.volatility.toFixed(2)}%`);
      console.log(`  Win Rate:  ${r.winRatePct.toFixed(1)}%`);
      console.log(`  Trades:    ${r.totalTrades}`);
      console.log(`  Dividends: ${(r.totalDividends / 1e6).toFixed(2)}M`);
      console.log(`  Final Val: ${(r.finalValue / 1e6).toFixed(2)}M`);
      console.log(`  IHSG:      ${r.ihsgReturnPct.toFixed(2)}%`);
      console.log(`  Emas:      ${r.goldReturnPct.toFixed(2)}%`);
      console.log(`  Score:     ${score.toFixed(2)}`);
    }
  }

  console.log(`\n\n${"=".repeat(90)}`);
  console.log(`  RANKING`);
  console.log(`${"=".repeat(90)}`);
  console.log(`  ${"#".padEnd(3)} ${"Label".padEnd(28)} ${"CAGR%".padStart(6)} ${"Sharpe".padStart(7)} ${"Sortino".padStart(7)} ${"DD%".padStart(6)} ${"Return%".padStart(8)} ${"Calmar".padStart(7)} ${"Score".padStart(6)}`);
  console.log(`  ${"-".repeat(83)}`);

  results.sort((a, b) => b.score - a.score);
  results.forEach((r, i) => {
    console.log(
      `  ${String(i + 1).padEnd(3)} ` +
      `${r.label.padEnd(28)} ` +
      `${r.result.cagr.toFixed(2).padStart(6)} ` +
      `${r.result.sharpe.toFixed(3).padStart(7)} ` +
      `${r.result.sortino.toFixed(3).padStart(7)} ` +
      `${r.result.maxDrawdown.toFixed(1).padStart(6)} ` +
      `${r.result.totalReturnPct.toFixed(1).padStart(8)} ` +
      `${r.result.calmar.toFixed(3).padStart(7)} ` +
      `${r.score.toFixed(1).padStart(6)}`
    );
  });

  console.log(`\n\nIHSG return: ${results[0]?.result.ihsgReturnPct.toFixed(2) ?? "?"}%`);
  console.log(`Emas return: ${results[0]?.result.goldReturnPct.toFixed(2) ?? "?"}%`);
}

main();
