/**
 * DIAGNOSTIC: Reproduce production 0-trades issue
 * Tests all 4 profiles with exact production params AND default params
 * Fetches real data from production API
 */

import { runStrategy } from "../src/engine/core";
import type { BacktestDayData, BacktestConfig, ProfileWeights, ScoreLookup } from "../src/engine/types";
import { IDX80_TICKERS, IDX30_TICKERS, LQ45_TICKERS } from "../src/constants/idx80";

const PROD_API = "https://quantbit.pro/api/backtest-data";
const LOCAL_API = "http://localhost:8788/api/backtest-data";
const FROM = "2021-01-04";
const TO = "2026-07-17";

// Production user's exact config
const PROD_CONFIG: Partial<BacktestConfig> = {
  topNCount: 5,
  safeHavenAsset: "emas",
  crashSensitivity: 11,
  crossoverMode: "instant",
  universe: "idx80",  // "all" falls back to idx80 in engine
  enableCrashProtection: true,
  reserveBufferPct: 10,
  simulationMode: "algo",
  singleSellTrigger: 8,
  singleBuyTrigger: 5,
  enableAdaptiveWeights: false,
};

// Default CLI test config
const DEFAULT_CONFIG: Partial<BacktestConfig> = {
  topNCount: 4,
  safeHavenAsset: "kas",
  crashSensitivity: 10,
  crossoverMode: "monthly",
  universe: "idx80",
  enableCrashProtection: true,
  reserveBufferPct: 10,
  simulationMode: "algo",
  singleSellTrigger: 8,
  singleBuyTrigger: 5,
  enableAdaptiveWeights: false,
};

const PROFILES: Record<string, ProfileWeights> = {
  aman: { quality: 0.30, growth: 0.45, value: 0.10, momentum: 0.00, dividend: 0.15 },
  agresif: { quality: 0.20, growth: 0.60, value: 0.10, momentum: 0.10, dividend: 0.00 },
  dividen: { quality: 0.15, growth: 0.20, value: 0.05, momentum: 0.00, dividend: 0.60 },
  "growth-heavy": { quality: 0.10, growth: 0.70, value: 0.05, momentum: 0.10, dividend: 0.05 },
};

async function fetchData(apiBase: string, configType: string) {
  const url = `${apiBase}?configType=${configType}&from=${FROM}&to=${TO}`;
  console.log(`  Fetching: ${url}`);
  const res = await fetch(url);
  const json: any = await res.json();
  if (!json.success) throw new Error(json.error || "API failed");
  console.log(`  API response: ${json.data.length} days, configType=${json.configType}`);
  console.log(`  scoreLookup dates: ${json.scoreLookup?.dates?.length ?? 0}`);
  if (json.scoreLookup?.dates?.length > 0) {
    console.log(`  scoreLookup range: ${json.scoreLookup.dates[0]} → ${json.scoreLookup.dates[json.scoreLookup.dates.length - 1]}`);
  }
  return { data: json.data, scoreLookup: json.scoreLookup };
}

function runProfile(
  profileId: string,
  data: BacktestDayData[],
  scoreLookup: ScoreLookup | undefined,
  configOverrides: Partial<BacktestConfig>,
  label: string,
) {
  const profile = PROFILES[profileId];
  if (!profile) throw new Error(`Unknown profile: ${profileId}`);

  const config: BacktestConfig = {
    capital: 100_000_000,
    ...configOverrides,
    simStartDate: FROM,
    simEndDate: TO,
    customUniverse: [],
    activeProfileId: profileId,
  };

  const result = runStrategy({
    dayData: data,
    config,
    profileWeights: profile,
    universeTickers: { idx80: IDX80_TICKERS, idx30: IDX30_TICKERS, lq45: LQ45_TICKERS },
    scoreLookup,
  });

  return result;
}

function printResult(profileId: string, configLabel: string, result: any) {
  const d = result.diagnostics;
  console.log(`\n  ── ${profileId} (${configLabel}) ──`);
  console.log(`  Return: ${result.totalReturnPct >= 0 ? "+" : ""}${result.totalReturnPct.toFixed(2)}% | CAGR: ${result.cagr.toFixed(2)}% | Sharpe: ${result.sharpe?.toFixed(3) ?? "—"}`);
  console.log(`  IHSG: ${result.ihsgReturnPct >= 0 ? "+" : ""}${result.ihsgReturnPct.toFixed(2)}% | Gold: ${result.goldReturnPct >= 0 ? "+" : ""}${result.goldReturnPct.toFixed(2)}%`);
  console.log(`  Trades: ${result.totalTrades} | Dividends: Rp ${result.totalDividends.toLocaleString("id-ID")}`);
  console.log(`  Max DD: ${result.maxDrawdown.toFixed(2)}% | Crash triggered: ${result.crashTriggered} (count: ${result.crashCount})`);
  console.log(`  Final: Rp ${result.finalValue.toLocaleString("id-ID")} (stock: Rp ${d.finalStockValue.toLocaleString("id-ID")}, cash: Rp ${d.finalCash.toLocaleString("id-ID")}, gold: ${d.finalGoldValue.toLocaleString("id-ID")})`);
  console.log(`  Buffer: Rp ${d.bufferCash.toLocaleString("id-ID")} | Allocated tickers: ${d.initialAllocatedTickers} | ScoreLookup: ${d.scoreLookupAvailable}`);

  if (result.finalPositions && Object.keys(result.finalPositions).length > 0) {
    console.log(`  Positions: ${Object.entries(result.finalPositions).map(([t, s]) => `${t}:${s}`).join(", ")}`);
  }
  if (result.finalInCrashState) {
    console.log(`  ⚠️  ENDED IN CRASH STATE`);
  }

  // Print first 5 log entries
  const logs = result.logs.slice(0, 5);
  for (const log of logs) {
    console.log(`  [${log.date}] ${log.type}: ${log.message}`);
  }
  if (result.logs.length > 5) {
    console.log(`  ... (${result.logs.length - 5} more log entries)`);
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("  DIAGNOSTIC: Production 0-trades Issue Reproduction");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Try production API first, fallback to local
  let apiBase = PROD_API;
  let useProdApi = true;
  try {
    console.log("Testing production API...");
    const testRes = await fetch(`${PROD_API}?configType=prod&from=2026-07-01&to=2026-07-10&light`);
    const testJson = await testRes.json();
    if (!testJson.success) throw new Error("API returned error");
    console.log("  ✅ Production API reachable\n");
  } catch (e: any) {
    console.log(`  ❌ Production API unreachable: ${e.message}`);
    console.log("  Falling back to local API (http://localhost:8788)...");
    apiBase = LOCAL_API;
    useProdApi = false;
    console.log();
  }

  // Fetch data with prod configType (for aman/dividen profiles)
  console.log("Fetching data (configType=prod)...");
  const prodData = await fetchData(apiBase, "prod");

  // Fetch data with res configType (for agresif/growth-heavy profiles)
  console.log("\nFetching data (configType=res)...");
  const resData = await fetchData(apiBase, "res");

  // ─── TEST 1: Production Config (all profiles) ───
  console.log("\n\n═══════════════════════════════════════════════════════════════");
  console.log("  TEST 1: Production Config (TopN=5, Emas, Sens=11%, Instant)");
  console.log("═══════════════════════════════════════════════════════════════");

  for (const profileId of ["aman", "agresif", "dividen", "growth-heavy"]) {
    const { data, scoreLookup } = (profileId === "agresif" || profileId === "growth-heavy") ? resData : prodData;
    try {
      const result = runProfile(profileId, data, scoreLookup, PROD_CONFIG, "Production");
      printResult(profileId, "Production", result);
    } catch (e: any) {
      console.log(`\n  ── ${profileId} (Production) ──`);
      console.log(`  ❌ ERROR: ${e.message}`);
    }
  }

  // ─── TEST 2: Default Config (all profiles) ───
  console.log("\n\n═══════════════════════════════════════════════════════════════");
  console.log("  TEST 2: Default Config (TopN=4, Kas, Sens=10%, Monthly)");
  console.log("═══════════════════════════════════════════════════════════════");

  for (const profileId of ["aman", "agresif", "dividen", "growth-heavy"]) {
    const { data, scoreLookup } = (profileId === "agresif" || profileId === "growth-heavy") ? resData : prodData;
    try {
      const result = runProfile(profileId, data, scoreLookup, DEFAULT_CONFIG, "Default");
      printResult(profileId, "Default", result);
    } catch (e: any) {
      console.log(`\n  ── ${profileId} (Default) ──`);
      console.log(`  ❌ ERROR: ${e.message}`);
    }
  }

  // ─── TEST 3: What happens WITHOUT scoreLookup ───
  console.log("\n\n═══════════════════════════════════════════════════════════════");
  console.log("  TEST 3: Without scoreLookup (simulates empty stock_scores)");
  console.log("═══════════════════════════════════════════════════════════════");

  for (const profileId of ["aman", "dividen", "growth-heavy"]) {
    const { data } = prodData;
    try {
      const result = runProfile(profileId, data, undefined, PROD_CONFIG, "No ScoreLookup");
      printResult(profileId, "No Scores", result);
    } catch (e: any) {
      console.log(`\n  ── ${profileId} (No Scores) ──`);
      console.log(`  ❌ ERROR: ${e.message}`);
    }
  }

  // ─── TEST 4: Analyze scoreLookup ───
  console.log("\n\n═══════════════════════════════════════════════════════════════");
  console.log("  TEST 4: ScoreLookup Analysis");
  console.log("═══════════════════════════════════════════════════════════════");

  if (prodData.scoreLookup) {
    const sl = prodData.scoreLookup;
    console.log(`  Total dates: ${sl.dates.length}`);
    console.log(`  First date: ${sl.dates[0]}`);
    console.log(`  Last date: ${sl.dates[sl.dates.length - 1]}`);
    const firstDateScores = sl.byDate[sl.dates[0]];
    if (firstDateScores) {
      const tickers = Object.keys(firstDateScores);
      console.log(`  Tickers with scores: ${tickers.length}`);
      // Show top 5 for each factor
      for (const factor of ["quality", "growth", "value", "momentum", "dividend"]) {
        const sorted = tickers
          .map(t => ({ t, v: firstDateScores[t][factor] ?? 0 }))
          .sort((a, b) => b.v - a.v);
        console.log(`  Top ${factor}: ${sorted.slice(0, 3).map(s => `${s.t}:${s.v}`).join(", ")}`);
      }
    }
  } else {
    console.log("  ❌ No scoreLookup available!");
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  DONE");
  console.log("═══════════════════════════════════════════════════════════════");
}

main().catch(e => {
  console.error("FATAL:", e);
  process.exit(1);
});
