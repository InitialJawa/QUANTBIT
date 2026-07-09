/**
 * Simulasi: Current Strategy vs Proposed Strategy
 * Menggunakan crashDetection yang SAMA dengan engine asli
 */

const API = "https://quantbit-terminal.pages.dev/api/backtest-data";
const FROM = "2021-01-04";
const TO = "2026-07-08";
const CAP = 100_000_000;
const TOP_N = 5;

interface DayData {
  date: string;
  ihsgPrice: number;
  goldPrice: number;
  stockAdjPrices: Record<string, number>;
  stockPrices: Record<string, number>;
  stockNormScores?: Record<string, Record<string, number>>;
}

// ── Fetch data ──
async function fetchData(): Promise<DayData[]> {
  const url = `${API}?configType=prod&from=${FROM}&to=${TO}`;
  const res = await fetch(url);
  const json: any = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

// ── Crash detector (sama persis dengan engine asli) ──
function detectCrash(ihsgPrices: number[], current: number, sensitivity: number): boolean {
  const window60 = ihsgPrices.slice(Math.max(0, ihsgPrices.length - 60));
  const max60d = Math.max(...window60);
  const dropPct = ((current - max60d) / max60d) * 100;

  const window20 = ihsgPrices.slice(Math.max(0, ihsgPrices.length - 20));
  const sma20 = window20.reduce((s, d) => s + d, 0) / window20.length;
  const window50 = ihsgPrices.slice(Math.max(0, ihsgPrices.length - 50));
  const sma50 = window50.reduce((s, d) => s + d, 0) / window50.length;

  const fastCrash = dropPct <= -sensitivity;
  const grindPriceRatio = 1 - (sensitivity * 0.5) / 100;
  const grindSmaRatio = 1 - (sensitivity * 0.2) / 100;
  const slowGrind = current < sma50 * grindPriceRatio && sma20 < sma50 * grindSmaRatio;

  return fastCrash || slowGrind;
}

function detectRecovery(ihsgPrices: number[], current: number): boolean {
  const window20 = ihsgPrices.slice(Math.max(0, ihsgPrices.length - 20));
  const sma20 = window20.reduce((s, d) => s + d, 0) / window20.length;
  const ihsg5dAgo = ihsgPrices[Math.max(0, ihsgPrices.length - 5)];
  const ret5d = ((current - ihsg5dAgo) / ihsg5dAgo) * 100;
  const trendRecovery = current > sma20;
  const momentumRecovery = ret5d >= 2.5 && current > sma20;
  return trendRecovery || momentumRecovery;
}

// ── Rank computation ──
function computeRanks(
  scores: Record<string, Record<string, number>>,
  weights: { quality: number; growth: number; value: number; momentum: number; dividend: number }
): Record<string, number> {
  const entries = Object.entries(scores).map(([tkr, s]) => {
    const total = (s.quality ?? 50) * weights.quality +
      (s.growth ?? 50) * weights.growth +
      (s.value ?? 50) * weights.value +
      (s.momentum ?? 50) * weights.momentum +
      (s.dividend ?? 50) * weights.dividend;
    return { ticker: tkr, score: total };
  });
  entries.sort((a, b) => b.score - a.score);
  const ranks: Record<string, number> = {};
  entries.forEach((e, i) => { ranks[e.ticker] = i + 1; });
  return ranks;
}

// ── EMA smooth ──
function computeSmoothRank(
  currentRanks: Record<string, number>,
  prevEma: Record<string, number> | null,
  days: number
): Record<string, number> {
  if (!prevEma || days === 0) return currentRanks;
  const alpha = 2 / (days + 1);
  const result: Record<string, number> = {};
  const allTickers = new Set([...Object.keys(currentRanks), ...Object.keys(prevEma)]);
  for (const tkr of allTickers) {
    const curr = currentRanks[tkr] ?? 99;
    const prev = prevEma[tkr] ?? curr;
    result[tkr] = prev + alpha * (curr - prev);
  }
  return result;
}

// ── Strategy Simulation ──
interface SimConfig {
  label: string;
  smoothEma: number;          // 0 = off (raw rank)
  dualMomentum: boolean;
  volWeighted: boolean;
  trailingStopPct: number;    // 0 = off
  rebalanceThreshold: number; // rank threshold for routine sell
  enableEmergencyExit: boolean; // daily rank >= 15 check
}

interface SimResult {
  label: string;
  finalValue: number;
  totalReturn: number;
  totalTrades: number;
  maxDrawdown: number;
  cagr: number;
  sharpe: number;
}

function simulate(data: DayData[], config: SimConfig): SimResult {
  const weights = { quality: 0.30, growth: 0.45, value: 0.10, momentum: 0.00, dividend: 0.15 };
  const crashSensitivity = 10;

  let cash = CAP;
  let positions: Record<string, number> = {};
  let highWaterMarks: Record<string, number> = {};
  let prevEma: Record<string, number> | null = null;
  let inCrash = false;
  let exitCooldown = 0;
  let totalTrades = 0;
  let lastRebalanceKey = "";
  let maxVal = CAP;
  let maxDrawdown = 0;
  let dailyReturns: number[] = [];
  let ihsgWindow: number[] = [];
  let prevPortfolioVal = CAP;

  for (let i = 0; i < data.length; i++) {
    const day = data[i];
    ihsgWindow.push(day.ihsgPrice);
    if (ihsgWindow.length > 200) ihsgWindow.shift();

    // Skip if no scores
    if (!day.stockNormScores) continue;

    // Compute ranks
    const rawRanks = computeRanks(day.stockNormScores, weights);
    const smoothRanks = computeSmoothRank(rawRanks, prevEma, config.smoothEma);
    prevEma = smoothRanks;
    const ranks = config.smoothEma > 0 ? smoothRanks : rawRanks;

    // Position value
    let stocksVal = 0;
    for (const [tkr, shs] of Object.entries(positions)) {
      const price = day.stockPrices[tkr] ?? 100;
      stocksVal += shs * price;
      highWaterMarks[tkr] = Math.max(highWaterMarks[tkr] ?? price, price);
    }
    const totalVal = cash + stocksVal;

    // Max drawdown
    if (totalVal > maxVal) maxVal = totalVal;
    const dd = (totalVal - maxVal) / maxVal * 100;
    if (dd < maxDrawdown) maxDrawdown = dd;

    // Daily return for Sharpe
    if (i > 0) {
      dailyReturns.push((totalVal - prevPortfolioVal) / prevPortfolioVal);
    }
    prevPortfolioVal = totalVal;

    // ── Crash detection (sama persis engine asli) ──
    if (exitCooldown > 0) exitCooldown--;

    const isCrashed = inCrash ? false : detectCrash(ihsgWindow, day.ihsgPrice, crashSensitivity);
    const isRecovered = inCrash ? detectRecovery(ihsgWindow, day.ihsgPrice) : false;

    if (isCrashed && !inCrash && exitCooldown <= 0) {
      // Liquidate all positions
      for (const [tkr, shs] of Object.entries(positions)) {
        const price = day.stockPrices[tkr] ?? 100;
        cash += shs * price;
        delete positions[tkr];
        delete highWaterMarks[tkr];
        totalTrades++;
      }
      inCrash = true;
      exitCooldown = 20;
      continue; // skip trading on crash day
    }

    if (isRecovered && inCrash && exitCooldown <= 0) {
      inCrash = false;
      exitCooldown = 20;
      // Will re-enter in rebalancing section below
    }

    if (inCrash) continue; // don't trade during crash

    // ── Trailing stop (per-stock) ──
    if (config.trailingStopPct > 0) {
      for (const [tkr, shs] of Object.entries(positions)) {
        const price = day.stockPrices[tkr] ?? 100;
        const hwm = highWaterMarks[tkr] ?? price;
        const drawdown = (price - hwm) / hwm;
        if (drawdown < -(config.trailingStopPct / 100)) {
          cash += shs * price;
          delete positions[tkr];
          delete highWaterMarks[tkr];
          totalTrades++;
        }
      }
    }

    // ── Emergency exit (daily rank >= 15) ──
    if (config.enableEmergencyExit) {
      for (const [tkr, shs] of Object.entries(positions)) {
        const rank = ranks[tkr] ?? 99;
        if (rank >= 15) {
          const price = day.stockPrices[tkr] ?? 100;
          cash += shs * price;
          delete positions[tkr];
          delete highWaterMarks[tkr];
          totalTrades++;
        }
      }
    }

    // ── Dual momentum filter ──
    let allowBuy = true;
    let validTickers = [...Object.keys(day.stockPrices)];
    if (config.dualMomentum) {
      const ihsg6m = data[Math.max(0, i - 125)];
      const ihsgMom = ihsg6m && ihsg6m.ihsgPrice > 0
        ? (day.ihsgPrice - ihsg6m.ihsgPrice) / ihsg6m.ihsgPrice
        : 0;
      if (ihsgMom < -0.05) {
        allowBuy = false; // IHSG 6m negative → skip buying
      } else {
        validTickers = validTickers.filter(tkr => {
          const price6m = data[Math.max(0, i - 125)]?.stockPrices?.[tkr];
          if (!price6m || price6m <= 0) return true;
          return (day.stockPrices[tkr] - price6m) / price6m > -0.15;
        });
      }
    }

    // ── Monthly rebalancing ──
    const date = new Date(day.date);
    const periodKey = `${date.getFullYear()}-${date.getMonth()}`;
    const isMonthChange = periodKey !== lastRebalanceKey;
    const isInitial = i === 0;

    if ((isMonthChange || isInitial) && allowBuy) {
      lastRebalanceKey = periodKey;

      // Sell positions above threshold
      for (const [tkr, shs] of Object.entries(positions)) {
        const rank = ranks[tkr] ?? 99;
        if (rank > config.rebalanceThreshold) {
          const price = day.stockPrices[tkr] ?? 100;
          cash += shs * price;
          delete positions[tkr];
          delete highWaterMarks[tkr];
          totalTrades++;
        }
      }

      // Pick top N candidates
      const candidates = Object.entries(ranks)
        .filter(([tkr]) => validTickers.includes(tkr))
        .filter(([tkr]) => (day.stockPrices[tkr] ?? 0) > 0)
        .filter(([tkr]) => !positions[tkr]) // not already held (unless we sold above)
        .sort((a, b) => a[1] - b[1])
        .slice(0, TOP_N);

      const targetCount = TOP_N - Object.keys(positions).length;
      const toBuy = candidates.slice(0, targetCount);

      if (toBuy.length > 0 && cash > 0) {
        // Weighting
        let alloc: number[];
        const buyCount = toBuy.length + Object.keys(positions).length;
        if (config.volWeighted) {
          const w = [0.30, 0.25, 0.20, 0.15, 0.10];
          alloc = w.slice(0, buyCount);
          const tw = alloc.reduce((a, b) => a + b, 0);
          alloc = alloc.map(a => a / tw);
        } else {
          alloc = Array(buyCount).fill(1 / buyCount);
        }

        // Only allocate to the NEW positions
        const newAlloc = alloc.slice(Object.keys(positions).length);

        for (let ci = 0; ci < toBuy.length; ci++) {
          const tkr = toBuy[ci][0];
          const price = day.stockPrices[tkr];
          if (price <= 0) continue;
          const allocCash = cash * newAlloc[ci];
          const shares = Math.floor(allocCash / price);
          if (shares >= 100) {
            positions[tkr] = (positions[tkr] || 0) + shares;
            cash -= shares * price;
            highWaterMarks[tkr] = price;
            totalTrades++;
          }
        }
      }
    }
  }

  // Final valuation
  const lastDay = data[data.length - 1];
  let finalStockVal = 0;
  for (const [tkr, shs] of Object.entries(positions)) {
    finalStockVal += shs * (lastDay.stockPrices[tkr] ?? 100);
  }
  const finalValue = cash + finalStockVal;
  const totalReturn = ((finalValue - CAP) / CAP) * 100;

  const years = (new Date(TO).getTime() - new Date(FROM).getTime()) / (365.25 * 86400000);
  const cagr = years > 0.5 ? (Math.pow(finalValue / CAP, 1 / years) - 1) * 100 : 0;

  const avgRet = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const stdRet = Math.sqrt(dailyReturns.reduce((s, r) => s + (r - avgRet) ** 2, 0) / Math.max(1, dailyReturns.length));
  const sharpe = stdRet > 0 ? (avgRet * 252) / (stdRet * Math.sqrt(252)) : 0;

  return {
    label: config.label,
    finalValue: Math.round(finalValue),
    totalReturn: Math.round(totalReturn * 100) / 100,
    totalTrades,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    cagr: Math.round(cagr * 100) / 100,
    sharpe: Math.round(sharpe * 1000) / 1000,
  };
}

// ── Main ──
async function main() {
  console.log("=== STRATEGY SIMULATION (crash detection = engine asli) ===\n");
  console.log(`Range: ${FROM} → ${TO} | Capital: Rp ${CAP.toLocaleString("id-ID")} | Top ${TOP_N} | Weight: Aman (Q30 G45 V10 M0 D15)\n`);

  const data = await fetchData();
  console.log(`${data.length} days, ${Object.keys(data[0]?.stockPrices || {}).length} tickers\n`);

  const strategies: SimConfig[] = [
    // Strategi sekarang
    { label: "1. SEKARANG (enableCrossover=ON, topN=5, rebalance bulanan)", smoothEma: 0, dualMomentum: false, volWeighted: false, trailingStopPct: 0, rebalanceThreshold: 7, enableEmergencyExit: true },
    // Buy & hold + crash protection (yang dulu 191%)
    { label: "2. BUY&HOLD + crash (no crossover, no swap)", smoothEma: 0, dualMomentum: false, volWeighted: false, trailingStopPct: 0, rebalanceThreshold: 99, enableEmergencyExit: false },
    // Smooth rank + buffer zone
    { label: "3. Smooth 20 + Buffer 12 (ganti crossover)", smoothEma: 20, dualMomentum: false, volWeighted: false, trailingStopPct: 0, rebalanceThreshold: 12, enableEmergencyExit: false },
    // + dual momentum
    { label: "4. + Dual Momentum IHSG+stock 6m", smoothEma: 20, dualMomentum: true, volWeighted: false, trailingStopPct: 0, rebalanceThreshold: 12, enableEmergencyExit: false },
    // + vol weighted
    { label: "5. + Vol Weighted sizing", smoothEma: 20, dualMomentum: true, volWeighted: true, trailingStopPct: 0, rebalanceThreshold: 12, enableEmergencyExit: false },
    // Full
    { label: "6. FULL: Smooth+Dual+Vol+Trailing20", smoothEma: 20, dualMomentum: true, volWeighted: true, trailingStopPct: 20, rebalanceThreshold: 12, enableEmergencyExit: false },
  ];

  const results: SimResult[] = [];
  for (const s of strategies) {
    const t0 = Date.now();
    const r = simulate(data, s);
    const ms = Date.now() - t0;
    console.log(`  ${s.label}: +${r.totalReturn.toFixed(2)}% (${ms}ms)`);
    results.push(r);
  }

  console.log("\n\n" + "=".repeat(120));
  console.log("STRATEGI".padEnd(50) + "Final Rp".padEnd(20) + "Return%".padEnd(12) + "CAGR%".padEnd(10) + "Sharpe".padEnd(10) + "MaxDD%".padEnd(10) + "Trades");
  console.log("=".repeat(120));
  for (const r of results) {
    const retStr = (r.totalReturn >= 0 ? "+" : "") + r.totalReturn.toFixed(2) + "%";
    console.log(
      r.label.padEnd(50) +
      r.finalValue.toLocaleString("id-ID").padEnd(20) +
      retStr.padEnd(12) +
      (r.cagr >= 0 ? "+" : "") + r.cagr.toFixed(2) + "%".padEnd(7) +
      (r.sharpe >= 0 ? "+" : "") + r.sharpe.toFixed(3).padEnd(9) +
      (r.maxDrawdown >= 0 ? "+" : "") + r.maxDrawdown.toFixed(2).padEnd(9) +
      String(r.totalTrades)
    );
  }
  console.log("=".repeat(120));
}

main().catch(console.error);
