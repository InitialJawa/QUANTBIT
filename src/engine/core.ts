import {
  BacktestDayData,
  BacktestConfig,
  ProfileWeights,
  ExecutionFees,
  BacktestResult,
  ChartPoint,
  TradeLog,
  DEFAULT_FEES,
  StrategiesInput,
} from "./types";
import { computeDayRankings, pickTopTickersByRank, getCleanTickerList } from "./ranker";
import { detectCrashAlgo, detectRecoveryAlgo } from "./crashDetector";
import {
  computeInitialAllocation,
  liquidateHoldings,
  computeGoldPurchase,
  computeGoldSale,
  computeRebalanceSwap,
  computeSellProceeds,
} from "./allocator";
import { computeMetrics } from "./metrics";

export function runStrategy(input: StrategiesInput): BacktestResult {
  const { dayData: rawInput, config, profileWeights, universeTickers, fees = DEFAULT_FEES } = input;

  const activeProfileKey: "stockRanksProd" | "stockRanksRes" = config.activeProfileId === "res" ? "stockRanksRes" : "stockRanksProd";

  const dayData: BacktestDayData[] = rawInput.map(d => {
    if (d.stockNormScores && typeof d.stockNormScores === "object") {
      const stockRanks = computeDayRankings(d.stockNormScores, profileWeights);
      return { ...d, stockRanks };
    }
    return {
      ...d,
      stockRanks: d[activeProfileKey as keyof BacktestDayData] as Record<string, number> || d.stockRanks,
    };
  });

  const filtered = dayData.filter(
    d => d.date >= config.simStartDate && d.date <= config.simEndDate
  );

  if (filtered.length === 0) {
    throw new Error("Tidak ada data dalam rentang tanggal yang dipilih.");
  }

  const cap = config.capital;
  const bufferCash = cap * (config.reserveBufferPct / 100);
  const initialInvestable = cap - bufferCash;

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

  let topTickers: string[];
  if (config.simulationMode === "custom") {
    const customUniverse = (config.customUniverse || []).filter(
      t => day0.stockPrices[t] && day0.stockPrices[t] > 0
    );
    topTickers = customUniverse;
  } else if (config.simulationMode === "algo") {
    const rankedTickers = pickTopTickersByRank(
      day0.stockRanks, day0.stockPrices, getUniverseTickers(), config.topNCount
    );
    const customTickers = config.customTickers || [];
    const customWithPrice = customTickers.filter(t => day0.stockPrices[t] && day0.stockPrices[t] > 0);
    topTickers = [...customWithPrice, ...rankedTickers.filter(t => !customWithPrice.includes(t))].slice(0, Math.max(config.topNCount, customWithPrice.length));
  } else {
    topTickers = [];
  }

  const initialAlloc = computeInitialAllocation(
    initialInvestable, topTickers, day0.stockPrices, day0.stockVolumes, fees
  );

  let positions = { ...initialAlloc.positions };
  let cash = initialAlloc.cash;
  let goldGrams = 0;
  let inCrashState = false;
  let crashCooldown = 0;
  let totalTransactionVolume = initialAlloc.totalVolume;
  let lastRebalanceMonth = -1;
  let pendingTickers = [...initialAlloc.pendingTickers];

  let totalSwaps = 0;
  let totalDividendsEarned = 0;
  let maxVal = cap;
  let maxDrawdownValue = 0;

  const chartData: ChartPoint[] = [];
  const logs: TradeLog[] = [];

  const initialIhsgPrice = day0.ihsgPrice;
  const initialGoldPrice = day0.goldPrice;

  let lastJulyYear = 2019;
  const dailyReturns: number[] = [];
  let lastDayVal = cap;

  const configName = config.activeProfileId === "res"
    ? "Config B (Backtest Optimized)"
    : "Config F (Fundamental Focus)";

  logs.push({
    date: day0.date,
    type: "BUY",
    message: `Inisialisasi portofolio ${topTickers.length} emiten`,
  });

  const getPointInTimeDate = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  for (let stepIndex = 0; stepIndex < filtered.length; stepIndex++) {
    const day = filtered[stepIndex];
    const dateObj = new Date(day.date);
    const currentYear = dateObj.getFullYear();
    const currentMonth = dateObj.getMonth();

    if (pendingTickers.length > 0) {
      for (let pi = pendingTickers.length - 1; pi >= 0; pi--) {
        const pt = pendingTickers[pi];
        const availPrice = day.stockPrices?.[pt.ticker];
        if (availPrice && availPrice > 0) {
          const entryPrice = availPrice * (1 + fees.slippage);
          const costPerShare = entryPrice * (1 + fees.buyFee);
          let maxLots = Math.floor(pt.capital / (costPerShare * 100));
          let sharesToBuy = maxLots * 100;
          if (sharesToBuy > 0) {
            positions[pt.ticker] = sharesToBuy;
            cash -= sharesToBuy * costPerShare;
            totalTransactionVolume += sharesToBuy * entryPrice;
            logs.push({
              date: day.date,
              type: "BUY",
              message: `Eksekusi pembelian ditunda #${pt.ticker} ${sharesToBuy} lembar @ ${Math.round(entryPrice).toLocaleString("id-ID")}`,
            });
          }
          pendingTickers.splice(pi, 1);
        }
      }
    }

    let stocksValue = 0;
    Object.entries(positions).forEach(([ticker, shares]) => {
      const price = day.stockPrices[ticker] || 100;
      stocksValue += shares * price;
    });

    const goldVal = goldGrams * day.goldPrice;
    const todayPortfolioVal = cash + goldVal + stocksValue + bufferCash;

    if (stepIndex > 0) {
      const ret = ((todayPortfolioVal - lastDayVal) / lastDayVal) * 100;
      dailyReturns.push(ret);
    }
    lastDayVal = todayPortfolioVal;

    if (todayPortfolioVal > maxVal) {
      maxVal = todayPortfolioVal;
    } else {
      const dd = ((maxVal - todayPortfolioVal) / maxVal) * 100;
      if (dd > maxDrawdownValue) maxDrawdownValue = dd;
    }

    if (currentYear > lastJulyYear && currentMonth >= 5 && dateObj.getDate() >= 15) {
      let yearlyDividends = 0;
      Object.entries(positions).forEach(([ticker, shares]) => {
        const dps = getDividendPerShare(ticker, dateObj);
        if (dps > 0 && shares > 0) {
          const divPaid = Math.round(shares * dps * 0.90);
          yearlyDividends += divPaid;
        }
      });
      if (yearlyDividends > 0) {
        cash += yearlyDividends;
        totalDividendsEarned += yearlyDividends;
        logs.push({
          date: day.date,
          type: "REBALANCE",
          message: `Dividen Tahunan Dikreditkan: Rp ${yearlyDividends.toLocaleString("id-ID")} (net 90% setelah pajak)`,
        });
      }
      lastJulyYear = currentYear;
    }

    let crashSignaled = false;
    let crashReason = "";

    if (config.enableCrashProtection) {
      if (config.simulationMode === "algo" || config.simulationMode === "custom") {
        const ihsgPricesWindow = filtered.slice(0, stepIndex + 1).map(d => d.ihsgPrice);
        const result = detectCrashAlgo(ihsgPricesWindow, day.ihsgPrice, config.crashSensitivity);
        crashSignaled = result.signaled;
        crashReason = result.reason;
      }
    }

    if (crashSignaled && !inCrashState && crashCooldown <= 0) {
      logs.push({
        date: day.date,
        type: "CRASH_TRIGGER",
        message: `⚠️ CRASH: ${crashReason}`,
      });

      const liq = liquidateHoldings(positions, day.stockPrices, fees);
      positions = {};
      cash += liq.proceeds;
      totalTransactionVolume += liq.totalVolume;

      inCrashState = true;

      if (config.safeHavenAsset === "emas") {
        const gold = computeGoldPurchase(cash, day.goldPrice);
        goldGrams = gold.goldGrams;
        cash = gold.cash;
      }

      crashCooldown = 20;
    }

    if (inCrashState && crashCooldown <= 0) {
      let recoverySignaled = false;

      if (config.simulationMode === "algo" || config.simulationMode === "custom") {
        const ihsgPricesWindow = filtered.slice(0, stepIndex + 1).map(d => d.ihsgPrice);
        const result = detectRecoveryAlgo(ihsgPricesWindow, day.ihsgPrice);
        recoverySignaled = result.signaled;

        if (result.signaled) {
          logs.push({
            date: day.date,
            type: "CRASH_RECOVERY",
            message: `✅ RECOVERY: ${result.reason}`,
          });
        }
      }

      if (recoverySignaled) {
        inCrashState = false;
        let recoveryCash = cash;

        if (goldGrams > 0) {
          const goldSale = computeGoldSale(goldGrams, day.goldPrice);
          recoveryCash += goldSale.cash;
          goldGrams = 0;
        }

        let reentryTickers: string[];
        if (config.simulationMode === "custom") {
          reentryTickers = (config.customUniverse || []).filter(
            t => day.stockPrices[t] && day.stockPrices[t] > 0
          );
        } else if (config.simulationMode === "algo") {
          reentryTickers = pickTopTickersByRank(
            day.stockRanks, day.stockPrices, getUniverseTickers(), config.topNCount
          );
        } else {
          reentryTickers = [];
        }

        const reentryAlloc = computeInitialAllocation(
          recoveryCash, reentryTickers, day.stockPrices, day.stockVolumes, fees
        );

        Object.entries(reentryAlloc.positions).forEach(([t, shares]) => {
          positions[t] = (positions[t] || 0) + shares;
        });
        cash = reentryAlloc.cash;
        totalTransactionVolume += reentryAlloc.totalVolume;
        pendingTickers.push(...reentryAlloc.pendingTickers);

        logs.push({
          date: day.date,
          type: "CRASH_RECOVERY",
          message: `Re-entry ${reentryTickers.length} emiten setelah recovery pasar`,
        });

        crashCooldown = 20;
      }
    }

    if (crashCooldown > 0) crashCooldown--;

    if (!inCrashState && config.enableCrossover && (config.simulationMode === "algo" || config.simulationMode === "custom")) {
      const ownedTickers = Object.entries(positions)
        .filter(([_, shares]) => shares > 0)
        .map(([ticker]) => ticker);

      const isMonthChange = currentMonth !== lastRebalanceMonth;

      for (const ticker of ownedTickers) {
        const currentRank = day.stockRanks[ticker] || 5;
        const isEmergencyExit = currentRank >= 15;
        const isRoutineExit = isMonthChange && currentRank >= 10;

        if (isEmergencyExit || isRoutineExit) {
          const sellResult = computeSellProceeds(positions[ticker], day.stockPrices[ticker] || 100, fees);
          const swapProceeds = sellResult.proceeds;
          totalTransactionVolume += sellResult.volume;
          delete positions[ticker];

          let topCandidates: string[];
          if (config.simulationMode === "custom") {
            topCandidates = (config.customUniverse || []).filter(
              t => day.stockPrices[t] && day.stockPrices[t] > 0
            );
          } else {
            topCandidates = pickTopTickersByRank(
              day.stockRanks, day.stockPrices, getUniverseTickers(), 4
            );
          }
          const swapInTicker = topCandidates.find(t => !positions[t] || positions[t] === 0) || topCandidates[0];

          if (swapInTicker) {
            const swapResult = computeRebalanceSwap(
              ticker, swapProceeds, day.stockPrices, day.stockVolumes, swapInTicker, fees
            );

            if (swapResult.shares > 0) {
              positions[swapInTicker] = (positions[swapInTicker] || 0) + swapResult.shares;
              cash += swapResult.cashRemainder;
              totalTransactionVolume += swapResult.totalVolume;
              logs.push({
                date: day.date,
                type: "REBALANCE",
                message: `Swap #${ticker}→${swapInTicker} (Rank ${currentRank}), ${swapResult.shares} lot @ Rp ${(day.stockPrices[swapInTicker] || 0).toLocaleString("id-ID")}`,
              });
            } else {
              cash += swapProceeds;
            }
            totalSwaps++;
          } else {
            cash += swapProceeds;
          }
        }
      }

      if (isMonthChange) lastRebalanceMonth = currentMonth;
    }

    if (stepIndex % 8 === 0 || stepIndex === filtered.length - 1) {
      const benchmarkIhsgVal = Math.round((day.ihsgPrice / initialIhsgPrice) * cap);
      const benchmarkGoldVal = Math.round((day.goldPrice / initialGoldPrice) * cap);

      chartData.push({
        date: day.date,
        "Strategi Rebalancer": Math.round(todayPortfolioVal),
        "Benchmark IHSG": benchmarkIhsgVal,
        "Benchmark Emas": benchmarkGoldVal,
        ranks: { ...day.stockRanks },
      });

      if (stepIndex === filtered.length - 1 && day.date < config.simEndDate) {
        chartData.push({
          date: config.simEndDate,
          "Strategi Rebalancer": Math.round(todayPortfolioVal),
          "Benchmark IHSG": benchmarkIhsgVal,
          "Benchmark Emas": benchmarkGoldVal,
          ranks: { ...day.stockRanks },
        });
      }
    }
  }

  const currentPortfolioVal = cash +
    (Object.entries(positions).reduce((sum, [t, s]) => sum + s * (filtered[filtered.length - 1].stockPrices[t] || 100), 0)) +
    (goldGrams * filtered[filtered.length - 1].goldPrice) + bufferCash;

  const lastDayObj = filtered[filtered.length - 1];

  const metrics = computeMetrics({
    cap,
    currentPortfolioVal,
    day0Date: day0.date,
    lastDayDate: lastDayObj.date,
    dailyReturns,
    maxDrawdownValue,
    totalTransactionVolume,
    initialIhsgPrice,
    lastIhsgPrice: lastDayObj.ihsgPrice,
    initialGoldPrice,
    lastGoldPrice: lastDayObj.goldPrice,
  });

  const ihsgFinalValue = Math.round((lastDayObj.ihsgPrice / initialIhsgPrice) * cap);
  const goldFinalValue = Math.round((lastDayObj.goldPrice / initialGoldPrice) * cap);

  const allLogs: TradeLog[] = [
    {
      date: lastDayObj.date,
      type: "REBALANCE",
      message: `Portfolio akhir: Rp ${currentPortfolioVal.toLocaleString("id-ID")} (${metrics.totalReturnPct >= 0 ? "+" : ""}${metrics.totalReturnPct.toFixed(2)}%)`,
    },
    ...logs,
  ];

  return {
    finalValue: Math.round(currentPortfolioVal),
    ihsgFinalValue,
    goldFinalValue,
    totalReturnPct: metrics.totalReturnPct,
    ihsgReturnPct: metrics.ihsgReturnPct,
    goldReturnPct: metrics.goldReturnPct,
    maxDrawdown: maxDrawdownValue,
    totalTrades: totalSwaps,
    totalDividends: totalDividendsEarned,
    cagr: metrics.cagr,
    volatility: metrics.volatility,
    sharpe: metrics.sharpe,
    sortino: metrics.sortino,
    calmar: metrics.calmar,
    winRatePct: metrics.winRatePct,
    turnoverPct: metrics.turnoverPct,
    bench6040FinalVal: metrics.bench6040FinalVal,
    bench6040ReturnPct: metrics.bench6040ReturnPct,
    configName,
    logs: allLogs,
    chartData,
  };
}

let dividendCache: Record<string, Record<string, number>> = {};

export function setDividendCache(cache: Record<string, Record<string, number>>) {
  dividendCache = cache;
}

function getDividendPerShare(ticker: string, date: Date): number {
  const year = date.getFullYear().toString();
  return dividendCache[ticker]?.[year] || 0;
}

export interface StrategyEvaluation {
  shouldExit: boolean;
  reason: string;
  targetSafeHaven: "emas" | "kas" | null;
}

export function evaluateStrategy(
  config: BacktestConfig,
  marketData: { ihsgPrice: number; peak60?: number; dayRanks?: Record<string, number> }
): StrategyEvaluation {
  if (!config.enableCrashProtection) {
    return { shouldExit: false, reason: "Crash protection disabled", targetSafeHaven: null };
  }

  if (config.simulationMode !== "algo" && config.simulationMode !== "custom") {
    return { shouldExit: false, reason: "Non-algo mode uses own trigger", targetSafeHaven: null };
  }

  if (marketData.peak60 !== undefined) {
    const drop = ((marketData.ihsgPrice - marketData.peak60) / marketData.peak60) * 100;
    if (drop <= -config.crashSensitivity) {
      return {
        shouldExit: true,
        reason: `IHSG dropped ${Math.abs(drop).toFixed(1)}% from 60d peak (threshold: ${config.crashSensitivity}%)`,
        targetSafeHaven: config.safeHavenAsset,
      };
    }
  }

  return { shouldExit: false, reason: "IHSG within tolerance", targetSafeHaven: null };
}

export function shouldTriggerExit(
  ticker: string,
  position: { shares: number; buyPrice: number; currentPrice: number },
  config: BacktestConfig,
  marketData: { ihsgPrice: number; peak60?: number }
): StrategyEvaluation {
  if (!position || position.shares <= 0) {
    return { shouldExit: false, reason: "No position", targetSafeHaven: null };
  }

  const strategy = evaluateStrategy(config, marketData);
  if (strategy.shouldExit) {
    return strategy;
  }

  const drawdown = ((position.currentPrice - position.buyPrice) / position.buyPrice) * 100;
  if (drawdown <= -config.singleSellTrigger) {
    return {
      shouldExit: true,
      reason: `${ticker} dropped ${Math.abs(drawdown).toFixed(1)}% (sell trigger: ${config.singleSellTrigger}%)`,
      targetSafeHaven: config.safeHavenAsset,
    };
  }

  return { shouldExit: false, reason: "Position healthy", targetSafeHaven: null };
}

export function getActiveUniverse(config: BacktestConfig): string[] {
  if (config.simulationMode === "custom") {
    return [...(config.customUniverse || [])];
  }
  if (config.simulationMode === "algo" && config.customTickers.length > 0) {
    return [...config.customTickers];
  }
  return [];
}
