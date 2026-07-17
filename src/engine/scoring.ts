import type { BacktestDayData } from "./types";

interface ScoreResult {
  quality: number;
  growth: number;
  value: number;
  momentum: number;
  dividend: number;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function percentileRank(sorted: number[], value: number): number {
  if (sorted.length <= 1) return 50;
  let lo = 0, hi = sorted.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < value) lo = mid + 1; else hi = mid;
  }
  return Math.round((lo / (sorted.length - 1)) * 100);
}

export function enrichDayDataWithScores(dayData: BacktestDayData[]): void {
  const tickerDates: Record<string, string[]> = {};
  const tickerPriceArr: Record<string, number[]> = {};

  for (const day of dayData) {
    for (const [ticker, price] of Object.entries(day.stockPrices || {})) {
      if (typeof price !== "number" || price <= 0) continue;
      if (!tickerDates[ticker]) { tickerDates[ticker] = []; tickerPriceArr[ticker] = []; }
      tickerDates[ticker].push(day.date);
      tickerPriceArr[ticker].push(price);
    }
  }

  const tickerScoreArr: Record<string, ScoreResult[]> = {};
  for (const [ticker, prices] of Object.entries(tickerPriceArr)) {
    const len = prices.length;
    const arr: ScoreResult[] = new Array(len);
    for (let i = 0; i < len; i++) {
      if (i < 19) {
        arr[i] = { quality: 50, growth: 50, value: 50, momentum: 50, dividend: 50 };
        continue;
      }
      let sum = 0, sumSq = 0;
      for (let j = i - 19; j <= i; j++) {
        const r = (prices[j] - prices[j - 1]) / prices[j - 1];
        sum += r; sumSq += r * r;
      }
      const mean = sum / 20;
      const variance = Math.max(0, sumSq / 20 - mean * mean);
      const stdev = Math.sqrt(variance);
      const quality = clamp(Math.round((1 - stdev * 30) * 100), 0, 100);

      const gi = Math.max(0, i - 119);
      const gRet = (prices[i] - prices[gi]) / prices[gi];
      const growth = clamp(Math.round((gRet + 0.5) * 66.7), 0, 100);

      const vi = Math.max(0, i - 251);
      let smaSum = 0;
      for (let j = vi; j <= i; j++) smaSum += prices[j];
      const sma = smaSum / (i - vi + 1);
      const vRatio = sma > 0 ? prices[i] / sma : 1;
      const value = clamp(Math.round((2 - vRatio) * 50), 0, 100);

      const mRet = (prices[i] - prices[i - 19]) / prices[i - 19];
      const momentum = clamp(Math.round((mRet + 0.3) * 166.7), 0, 100);

      arr[i] = { quality, growth, value, momentum, dividend: 50 };
    }
    tickerScoreArr[ticker] = arr;
  }

  const tickerDateIdx: Record<string, Record<string, number>> = {};
  for (const [ticker, dates] of Object.entries(tickerDates)) {
    const map: Record<string, number> = {};
    for (let i = 0; i < dates.length; i++) map[dates[i]] = i;
    tickerDateIdx[ticker] = map;
  }

  for (const day of dayData) {
    const tickersInDay = Object.entries(day.stockPrices || {})
      .filter(([_, p]) => typeof p === "number" && p > 0)
      .map(([t]) => t);

    const rawByDim: Record<string, { ticker: string; raw: number }[]> = {
      quality: [], growth: [], value: [], momentum: [], dividend: [],
    };
    const preScores: Record<string, ScoreResult> = {};

    for (const ticker of tickersInDay) {
      const idx = tickerDateIdx[ticker]?.[day.date];
      const sc = (idx !== undefined && tickerScoreArr[ticker])
        ? tickerScoreArr[ticker][idx]
        : { quality: 50, growth: 50, value: 50, momentum: 50, dividend: 50 };
      preScores[ticker] = sc;
      for (const dim of ["quality", "growth", "value", "momentum", "dividend"] as const) {
        rawByDim[dim].push({ ticker, raw: sc[dim] });
      }
    }

    const finalScores: Record<string, ScoreResult> = {};
    for (const ticker of tickersInDay) {
      finalScores[ticker] = { ...preScores[ticker] };
    }

    for (const dim of ["quality", "growth", "value", "momentum", "dividend"] as const) {
      const entries = rawByDim[dim];
      if (entries.length < 2) continue;
      const sorted = entries.map(e => e.raw).sort((a, b) => a - b);
      const allSame = sorted[0] === sorted[sorted.length - 1];
      if (allSame) {
        for (const e of entries) finalScores[e.ticker][dim] = e.raw;
      } else {
        for (const e of entries) {
          finalScores[e.ticker][dim] = percentileRank(sorted, e.raw);
        }
      }
    }

    (day as any).stockNormScores = finalScores;
  }
}
