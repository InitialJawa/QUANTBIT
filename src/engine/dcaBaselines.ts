// ─────────────────────────────────────────────────────────────
// DCA Baselines — compare Adaptive DCA vs traditional strategies
// For each baseline, simulate the same historical period with a
// simpler "dumb" strategy and produce comparable metrics.
//
// Baselines:
//   - lump_sum:      buy top N at day 0, hold until end
//   - monthly_dca:   invest capital/12 every month into top N
//   - quarterly_dca: invest capital/4 every quarter into top N
//
// Comparison metrics produced alongside Adaptive DCA result:
//   finalValue, totalInvested, cagr, sharpe, maxDrawdown,
//   avgBuyPrice, cashUtilization
// ─────────────────────────────────────────────────────────────
import {
  type BacktestConfig,
  type BacktestDayData,
  type ChartPoint,
  DEFAULT_FEES,
  type ExecutionFees,
  type ProfileWeights,
  type TradeLog,
} from "./types";
import { computeDayRankings, pickTopTickersByRank, getCleanTickerList } from "./ranker";
import { computeInitialAllocation, computeSellProceeds } from "./allocator";

export type DcaBaseline = "lump_sum" | "monthly_dca" | "quarterly_dca";

export interface BaselineInput {
  dayData: BacktestDayData[];
  config: Omit<BacktestConfig, "simulationMode" | "singleTicker" | "crossoverMode" | "singleSellTrigger" | "singleBuyTrigger" | "activeProfileId" | "enableAdaptiveWeights">;
  profileWeights: ProfileWeights;
  universeTickers: { idx80: string[]; idx30: string[]; lq45: string[] };
  baseline: DcaBaseline;
  fees?: ExecutionFees;
}

export interface BaselineResult {
  baseline: DcaBaseline;
  label: string;
  finalValue: number;
  totalInvested: number;
  totalDividends: number;
  cagr: number;
  sharpe: number;
  maxDrawdown: number;
  avgBuyPrice: number;
  cashUtilization: number; // 0-100, % of initial capital that was deployed
  chartData: ChartPoint[];
  logs: TradeLog[];
}

const BASELINE_LABEL: Record<DcaBaseline, string> = {
  lump_sum: "Lump Sum",
  monthly_dca: "Monthly DCA",
  quarterly_dca: "Quarterly DCA",
};

function getIntervalDays(baseline: DcaBaseline): number {
  if (baseline === "monthly_dca") return 21; // ~21 trading days per month
  if (baseline === "quarterly_dca") return 63; // ~63 trading days per quarter
  return Number.MAX_SAFE_INTEGER; // lump sum = once
}

function recalcRanks(day: BacktestDayData, weights: ProfileWeights): Record<string, number> {
  if (day.stockNormScores) {
    return computeDayRankings(day.stockNormScores, weights);
  }
  return day.stockRanks;
}

export function runBaselineDca(input: BaselineInput): BaselineResult {
  const { dayData: rawInput, config, profileWeights, universeTickers, baseline, fees = DEFAULT_FEES } = input;
  const label = BASELINE_LABEL[baseline];
  const intervalDays = getIntervalDays(baseline);

  // Pre-compute ranks for every day using the same weights as the
  // adaptive DCA strategy. Ensures apples-to-apples comparison.
  const dayData: BacktestDayData[] = rawInput.map((d) => {
    const stockRanks = recalcRanks(d, profileWeights);
    return { ...d, stockRanks };
  });

  const filtered = dayData.filter(
    (d) => d.date >= config.simStartDate && d.date <= config.simEndDate,
  );

  if (filtered.length === 0) {
    throw new Error("Tidak ada data dalam rentang tanggal.");
  }

  const cap = config.capital;
  const bufferCash = cap * (config.reserveBufferPct / 100);
  const investableCap = cap - bufferCash;

  const cleanIdx80 = getCleanTickerList(universeTickers.idx80);
  const cleanIdx30 = getCleanTickerList(universeTickers.idx30);
  const cleanLq45 = getCleanTickerList(universeTickers.lq45);

  const getUniverseTickers = (): string[] => {
    if (config.universe === "idx80") return cleanIdx80;
    if (config.universe === "idx30") return cleanIdx30;
    if (config.universe === "lq45") return cleanLq45;
    return cleanIdx80;
  };

  const day0 = filtered[0];
  let positions: Record<string, number> = {};
  let cash = investableCap;
  let totalSpent = 0;
  let totalSharesBought = 0;
  let totalDividends = 0;
  let lastDeploymentDay = -intervalDays;
  const logs: TradeLog[] = [];
  const chartData: ChartPoint[] = [];
  let maxVal = cap;
  let maxDD = 0;
  const dailyReturnTracker: number[] = [];
  let lastPortfolioVal = cap;

  const initialIHSG = day0.ihsgPrice;
  const initialGold = day0.goldPrice;

  for (let stepIndex = 0; stepIndex < filtered.length; stepIndex++) {
    const day = filtered[stepIndex];
    const today = new Date(day.date);
    const month = today.getMonth();
    const year = today.getFullYear();
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;

    // Lump sum: invest everything day 0.
    // Monthly DCA: invest investableCap/12 every ~21 trading days.
    // Quarterly DCA: invest investableCap/4 every ~63 trading days.
    let deployAmount = 0;
    if (baseline === "lump_sum" && stepIndex === 0) {
      deployAmount = investableCap;
    } else if (stepIndex - lastDeploymentDay >= intervalDays) {
      const numDeployments = baseline === "monthly_dca" ? 12 : 4;
      const remainingCash = cash;
      const desiredPerDeployment = investableCap / numDeployments;
      deployAmount = Math.min(desiredPerDeployment, remainingCash);
      lastDeploymentDay = stepIndex;
    }

    if (deployAmount > 0 && cash > 0) {
      // Pick top N tickers for today using the same weights.
      const topTickers = pickTopTickersByRank(
        day.stockRanks, day.stockPrices, getUniverseTickers(), config.topNCount,
      );
      if (topTickers.length > 0) {
        const alloc = computeInitialAllocation(deployAmount, topTickers, day.stockPrices, day.stockVolumes, fees);
        // Merge with existing positions for cumulative avg-price.
        Object.entries(alloc.positions).forEach(([ticker, newShares]) => {
          const oldShares = positions[ticker] || 0;
          const totalShares = oldShares + newShares;
          if (totalShares > 0) {
            positions[ticker] = totalShares;
            totalSharesBought += newShares;
            // For avgBuyPrice, track running spend.
            const price = day.stockPrices[ticker] || 0;
            totalSpent += newShares * price;
          }
        });
        cash -= (deployAmount - alloc.cash); // actual cash spent (after rounding)
        logs.push({
          date: day.date,
          type: "BUY",
          message: `[${label}] Deploy Rp ${Math.round(deployAmount).toLocaleString("id-ID")} ke ${Object.keys(alloc.positions).length} emiten.`,
        });
      }
    }

    // Compute portfolio value.
    let stocksValue = 0;
    Object.entries(positions).forEach(([ticker, shares]) => {
      const price = day.stockPrices[ticker] || 100;
      stocksValue += shares * price;
    });

    const todayPortfolioVal = cash + stocksValue + bufferCash;

    // H4 fix: track max drawdown properly (was discarded with `void dd`)
    if (todayPortfolioVal > maxVal) maxVal = todayPortfolioVal;
    const ddPct = maxVal > 0 ? ((maxVal - todayPortfolioVal) / maxVal) * 100 : 0;
    if (ddPct > maxDD) maxDD = ddPct;

    // M7 fix: track daily returns for accurate Sharpe (was using 8-day samples)
    if (stepIndex > 0 && lastPortfolioVal > 0) {
      dailyReturnTracker.push(((todayPortfolioVal - lastPortfolioVal) / lastPortfolioVal) * 100);
    }
    lastPortfolioVal = todayPortfolioVal;

    // Sample chart every 8 days.
    if (stepIndex % 8 === 0 || stepIndex === filtered.length - 1) {
      chartData.push({
        date: day.date,
        "Strategi Rebalancer": Math.round(todayPortfolioVal),
        "Benchmark IHSG": Math.round((day.ihsgPrice / initialIHSG) * cap),
        "Benchmark Emas": Math.round((day.goldPrice / initialGold) * cap),
        ranks: { ...day.stockRanks },
      });
    }
  }

  const lastDay = filtered[filtered.length - 1];
  let finalStocksValue = 0;
  Object.entries(positions).forEach(([ticker, shares]) => {
    finalStocksValue += shares * (lastDay.stockPrices[ticker] || 100);
  });
  const finalValue = cash + finalStocksValue + bufferCash;

  // Metrics.
  const years = Math.max(0.1, (new Date(lastDay.date).getTime() - new Date(day0.date).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  const cagr = (Math.pow(finalValue / cap, 1 / years) - 1) * 100;

  // Daily returns for Sharpe — M7 fix: use actual daily returns, not 8-day samples
  const dailyReturns = dailyReturnTracker;
  const meanRet = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const variance = dailyReturns.length > 1
    ? dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanRet, 2), 0) / (dailyReturns.length - 1)
    : 0;
  const stdDev = Math.sqrt(variance);
  const annVol = stdDev * Math.sqrt(252) / 100;
  const sharpe = annVol > 0 ? (cagr / 100 - 0.05) / annVol : 0;

  // H4 fix: use properly tracked max drawdown (was re-computed from 8-day sampled chartData)
  const maxDrawdown = maxDD;

  const avgBuyPrice = totalSharesBought > 0 ? totalSpent / totalSharesBought : 0;
  const cashUtilization = cap > 0 ? (totalSpent / cap) * 100 : 0;

  return {
    baseline,
    label,
    finalValue: Math.round(finalValue),
    totalInvested: Math.round(totalSpent),
    totalDividends: Math.round(totalDividends),
    cagr,
    sharpe,
    maxDrawdown,
    avgBuyPrice: Math.round(avgBuyPrice),
    cashUtilization: Math.min(100, cashUtilization),
    chartData,
    logs,
  };
}
