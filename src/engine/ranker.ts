import { ProfileWeights, BacktestDayData } from "./types";

export function computeDayRankings(
  stockNormScores: Record<string, { quality: number; growth: number; value: number; momentum: number; dividend: number }>,
  profileWeights: ProfileWeights
): Record<string, number> {
  if (!stockNormScores) return {};

  const scores: { ticker: string; score: number }[] = [];

  for (const [ticker, ns] of Object.entries(stockNormScores)) {
    const s =
      (ns.quality ?? 50) * profileWeights.quality +
      (ns.growth ?? 50) * profileWeights.growth +
      (ns.value ?? 50) * profileWeights.value +
      (ns.momentum ?? 50) * profileWeights.momentum +
      (ns.dividend ?? 0) * profileWeights.dividend;
    scores.push({ ticker, score: s });
  }

  scores.sort((a, b) => b.score - a.score);

  const stockRanks: Record<string, number> = {};
  scores.forEach((item, idx) => {
    stockRanks[item.ticker] = idx + 1;
  });

  return stockRanks;
}

export function pickTopTickersByRank(
  dayRanks: Record<string, number>,
  dayPrices: Record<string, number>,
  allowedTickers: string[],
  count: number
): string[] {
  if (!dayRanks) return [];

  return Object.entries(dayRanks)
    .filter(([ticker]) => {
      if (!allowedTickers.includes(ticker)) return false;
      const price = dayPrices[ticker];
      return price !== undefined && price > 0;
    })
    .sort((a, b) => a[1] - b[1])
    .slice(0, count)
    .map(([ticker]) => ticker);
}

export function getCleanTickerList(
  tickers: string[]
): string[] {
  return tickers.map(t => t.replace(".JK", ""));
}

export function computeAdaptiveWeights(
  dayData: BacktestDayData[],
  currentIndex: number,
  lookbackDays: number,
  profileWeights: ProfileWeights,
  topN: number
): ProfileWeights {
  const startIdx = Math.max(0, currentIndex - lookbackDays);
  if (currentIndex - startIdx < 10) return profileWeights;

  const day0 = dayData[startIdx];
  const dayN = dayData[currentIndex];

  // Dividend is fixed — not adjusted by adaptive weighting.
  const dividendFixed = profileWeights.dividend;
  const adaptiveFactors: (keyof ProfileWeights)[] = ["quality", "growth", "value", "momentum"];
  const adaptiveScale = 1.0 - dividendFixed;
  const factorReturns: Record<string, number> = {};

  for (const factor of adaptiveFactors) {
    const ns0 = day0.stockNormScores;
    const nsN = dayN.stockNormScores;
    if (!ns0 || !nsN) {
      factorReturns[factor] = 0;
      continue;
    }

    const entries = Object.entries(ns0)
      .filter(([ticker, _]) => nsN[ticker] && day0.stockPrices[ticker] > 0 && dayN.stockPrices[ticker] > 0)
      .map(([ticker, scores]) => ({
        ticker,
        scores0: scores,
        scoresN: nsN[ticker],
      }));

    entries.sort((a, b) => {
      const sa = (a.scores0[factor] ?? 50);
      const sb = (b.scores0[factor] ?? 50);
      return sb - sa;
    });

    const top = entries.slice(0, Math.min(topN, entries.length));

    let totalReturn = 0;
    let count = 0;
    for (const e of top) {
      const p0 = day0.stockPrices[e.ticker];
      const pN = dayN.stockPrices[e.ticker];
      if (p0 > 0 && pN > 0) {
        totalReturn += (pN - p0) / p0;
        count++;
      }
    }

    factorReturns[factor] = count > 0 ? totalReturn / count : 0;
  }

  const returns = adaptiveFactors.map(f => factorReturns[f]);
  const minRet = Math.min(...returns);
  const maxRet = Math.max(...returns);
  const range = maxRet - minRet;

  const baseWeight = 0.25 * adaptiveScale;
  const minWeight = 0.10 * adaptiveScale;
  const maxWeight = 0.50 * adaptiveScale;

  let weights: Record<string, number> = {};
  let totalAdjusted = 0;

  if (range < 0.001) {
    for (const f of adaptiveFactors) weights[f] = baseWeight;
  } else {
    for (const f of adaptiveFactors) {
      const normalized = (factorReturns[f] - minRet) / range;
      const adjusted = minWeight + normalized * (maxWeight - minWeight);
      weights[f] = adjusted;
      totalAdjusted += adjusted;
    }

    for (const f of adaptiveFactors) {
      weights[f] = (weights[f] / totalAdjusted) * adaptiveScale;
    }
  }

  return {
    quality: weights.quality,
    growth: weights.growth,
    value: weights.value,
    momentum: weights.momentum,
    dividend: dividendFixed,
  };
}
