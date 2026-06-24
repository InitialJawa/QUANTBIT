import { ProfileWeights } from "./types";

export function computeDayRankings(
  stockNormScores: Record<string, { quality: number; growth: number; value: number; momentum: number }>,
  profileWeights: ProfileWeights
): Record<string, number> {
  const scores: { ticker: string; score: number }[] = [];

  for (const [ticker, ns] of Object.entries(stockNormScores)) {
    const s =
      (ns.quality ?? 50) * profileWeights.quality +
      (ns.growth ?? 50) * profileWeights.growth +
      (ns.value ?? 50) * profileWeights.value +
      (ns.momentum ?? 50) * profileWeights.momentum;
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
