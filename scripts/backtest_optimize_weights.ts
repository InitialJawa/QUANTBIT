/**
 * Backtest weight optimiser — fine-tune step 0.05 around sweet spots.
 * Juga coba AGRESIF dengan search space lebih luas.
 *
 * Run: npx tsx scripts/backtest_optimize_weights.ts
 */

import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { runStrategy } from "../src/engine";
import type { BacktestDayData, BacktestResult, StrategiesInput, ProfileWeights } from "../src/engine/types";
import { IDX80_TICKERS, IDX30_TICKERS, LQ45_TICKERS } from "../src/constants/idx80";

const CAPITAL = 100_000_000;
const START = "2015-01-05";
const END = new Date().toISOString().slice(0, 10);
const UNIVERSE = "idx80";
const TOP_N = 5;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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

// ── Weight combo generator (step 0.05) ─────────────────────────
function* genWeightsFine(min: Partial<ProfileWeights>, max: Partial<ProfileWeights>): Generator<ProfileWeights> {
  const keys: (keyof ProfileWeights)[] = ["quality", "growth", "value", "momentum", "dividend"];
  const step = 0.05;
  const range = (k: keyof ProfileWeights) => {
    const lo = Math.round((min[k] ?? 0) / step);
    const hi = Math.round((max[k] ?? 1.0) / step);
    const r: number[] = [];
    for (let i = lo; i <= hi; i++) r.push(i * step);
    return r;
  };

  const qs = range("quality"), gs = range("growth"), vs = range("value"), ms = range("momentum"), ds = range("dividend");
  for (const q of qs)
  for (const g of gs)
  for (const v of vs)
  for (const m of ms)
  for (const d of ds) {
    if (Math.abs(q + g + v + m + d - 1.0) < 0.001) {
      yield { quality: q, growth: g, value: v, momentum: m, dividend: d };
    }
  }
}

// ── Weight combo generator (step 0.10, wider) ──────────────────
function* genWeights10(min: Partial<ProfileWeights>, max: Partial<ProfileWeights>): Generator<ProfileWeights> {
  const step = 0.10;
  const range = (k: keyof ProfileWeights) => {
    const lo = Math.round((min[k] ?? 0) / step);
    const hi = Math.round((max[k] ?? 1.0) / step);
    const r: number[] = [];
    for (let i = lo; i <= hi; i++) r.push(i * step);
    return r;
  };

  const qs = range("quality"), gs = range("growth"), vs = range("value"), ms = range("momentum"), ds = range("dividend");
  for (const q of qs)
  for (const g of gs)
  for (const v of vs)
  for (const m of ms)
  for (const d of ds) {
    if (Math.abs(q + g + v + m + d - 1.0) < 0.001) {
      yield { quality: q, growth: g, value: v, momentum: m, dividend: d };
    }
  }
}

interface ProfileDef {
  name: string;
  min: Partial<ProfileWeights>;
  max: Partial<ProfileWeights>;
  step: "fine" | "wide";
  scoreFn: (r: BacktestResult) => number;
}

const PROFILES: ProfileDef[] = [
  // ── AMAN refine ──
  {
    name: "AMAN",
    min: { quality: 0.25, growth: 0.15, value: 0.05, momentum: 0, dividend: 0.05 },
    max: { quality: 0.55, growth: 0.45, value: 0.20, momentum: 0.10, dividend: 0.30 },
    step: "fine",
    scoreFn: (r) => r.sharpe * 10 - r.maxDrawdown / 8 + r.sortino * 5 + r.cagr * 0.5,
  },
  // ── DIVIDEN refine ──
  {
    name: "DIVIDEN",
    min: { quality: 0.05, growth: 0.05, value: 0, momentum: 0, dividend: 0.30 },
    max: { quality: 0.40, growth: 0.30, value: 0.15, momentum: 0.10, dividend: 0.75 },
    step: "fine",
    scoreFn: (r) => r.sharpe * 8 - r.maxDrawdown / 8 + r.sortino * 4 + r.cagr * 0.3,
  },
  // ── AGRESIF wider search ──
  {
    name: "AGRESIF",
    min: { growth: 0.10, momentum: 0.10 },
    max: { quality: 0.50, growth: 0.60, value: 0.20, momentum: 0.60, dividend: 0.30 },
    step: "wide",
    scoreFn: (r) => r.cagr * 3 + r.totalReturnPct / 100 + r.sharpe * 5,
  },
];

interface RunResult {
  weights: ProfileWeights;
  result: BacktestResult;
  score: number;
}

function runProfile(profile: ProfileDef, dayData: BacktestDayData[], universeTickers: any): RunResult[] {
  const gen = profile.step === "fine" ? genWeightsFine : genWeights10;
  const results: RunResult[] = [];
  let count = 0;
  const startTime = Date.now();

  for (const weights of gen(profile.min, profile.max)) {
    count++;
    // Skip any weight below 0 (shouldn't happen but safe)
    if (weights.quality < 0 || weights.growth < 0 || weights.value < 0 || weights.momentum < 0 || weights.dividend < 0) continue;

    try {
      const result = runStrategy({
        dayData,
        config: {
          capital: CAPITAL, reserveBufferPct: 10, topNCount: TOP_N,
          universe: UNIVERSE, simulationMode: "algo", singleTicker: "BBCA",
          enableCrashProtection: true, crashSensitivity: 10, singleSellTrigger: 8,
          singleBuyTrigger: 5, safeHavenAsset: "emas", enableCrossover: true,
          simStartDate: START, simEndDate: END, customUniverse: [],
          enableAdaptiveWeights: false, activeProfileId: profile.name.toLowerCase(),
        },
        profileWeights: weights,
        universeTickers,
      });
      const score = profile.scoreFn(result);
      results.push({ weights, result, score });
    } catch (_) {}
  }

  results.sort((a, b) => b.score - a.score);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n  Ran ${count} combos in ${elapsed}s`);
  return results;
}

function print(name: string, results: RunResult[], topN = 10) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`  PROFIL: ${name}`);
  console.log(`${"=".repeat(70)}`);
  console.log(`  Top ${topN}:`);
  console.log(`  ${"─".repeat(100)}`);
  console.log(`  #   Q   G   V   M   D  | CAGR%  Sharpe Sortino DD%   Ret%   Score`);
  console.log(`  ${"─".repeat(100)}`);

  for (let i = 0; i < Math.min(topN, results.length); i++) {
    const { weights: w, result: r, score } = results[i];
    console.log(
      `  ${String(i + 1).padStart(2)} ` +
      `${String(Math.round(w.quality * 100)).padStart(3)} ` +
      `${String(Math.round(w.growth * 100)).padStart(3)} ` +
      `${String(Math.round(w.value * 100)).padStart(3)} ` +
      `${String(Math.round(w.momentum * 100)).padStart(3)} ` +
      `${String(Math.round(w.dividend * 100)).padStart(3)} ` +
      `| ${r.cagr.toFixed(1).padStart(5)} ` +
      `${r.sharpe.toFixed(2).padStart(6)} ` +
      `${r.sortino.toFixed(2).padStart(6)} ` +
      `${r.maxDrawdown.toFixed(1).padStart(5)} ` +
      `${r.totalReturnPct.toFixed(1).padStart(7)} ` +
      `${score.toFixed(1).padStart(7)}`
    );
  }
}

function main() {
  console.log(`Loading data...`);
  const dayData = loadData();
  console.log(`Loaded ${dayData.length} days from ${dayData[0]?.date} to ${dayData[dayData.length - 1]?.date}`);

  const universeTickers = { idx80: IDX80_TICKERS, idx30: IDX30_TICKERS, lq45: LQ45_TICKERS };

  for (const profile of PROFILES) {
    const results = runProfile(profile, dayData, universeTickers);
    print(profile.name, results, 15);
  }
}

main();
