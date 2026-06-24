export function calcStdDev(vals: number[]): number {
  if (vals.length < 2) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sqDiffs = vals.map(v => Math.pow(v - mean, 2));
  const variance = sqDiffs.reduce((a, b) => a + b, 0) / (vals.length - 1);
  return Math.sqrt(variance);
}

export interface MetricsInput {
  cap: number;
  currentPortfolioVal: number;
  day0Date: string;
  lastDayDate: string;
  dailyReturns: number[];
  maxDrawdownValue: number;
  totalTransactionVolume: number;
  initialIhsgPrice: number;
  lastIhsgPrice: number;
  initialGoldPrice: number;
  lastGoldPrice: number;
}

export interface MetricsResult {
  totalReturnPct: number;
  ihsgReturnPct: number;
  goldReturnPct: number;
  cagr: number;
  volatility: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  turnoverPct: number;
  winRatePct: number;
  bench6040FinalVal: number;
  bench6040ReturnPct: number;
}

export function computeMetrics(input: MetricsInput): MetricsResult {
  const {
    cap,
    currentPortfolioVal,
    day0Date,
    lastDayDate,
    dailyReturns,
    maxDrawdownValue,
    totalTransactionVolume,
    initialIhsgPrice,
    lastIhsgPrice,
    initialGoldPrice,
    lastGoldPrice,
  } = input;

  const totalReturnPct = ((currentPortfolioVal - cap) / cap) * 100;
  const ihsgReturnPct = ((lastIhsgPrice - initialIhsgPrice) / initialIhsgPrice) * 100;
  const goldReturnPct = ((lastGoldPrice - initialGoldPrice) / initialGoldPrice) * 100;

  const daysDiff = Math.ceil(
    (new Date(lastDayDate).getTime() - new Date(day0Date).getTime()) / (1000 * 60 * 60 * 24)
  ) || 1;
  const yearsElapsed = daysDiff / 365.25;
  const cagr = Math.pow(currentPortfolioVal / cap, 1 / yearsElapsed) - 1;

  const annVolatility = calcStdDev(dailyReturns) * Math.sqrt(252) / 100;

  const negativeReturns = dailyReturns.filter(r => r < 0);
  const downsideVol = negativeReturns.length > 1
    ? calcStdDev(negativeReturns) * Math.sqrt(252) / 100
    : annVolatility;

  const rf = 0.050;
  const sharpe = annVolatility > 0 ? (cagr - rf) / annVolatility : 0;
  const sortino = downsideVol > 0 ? (cagr - rf) / downsideVol : 0;
  const calmar = maxDrawdownValue > 0 ? cagr / (maxDrawdownValue / 100) : 0;

  const avgPortfolioVal = (cap + currentPortfolioVal) / 2;
  const turnoverRatio = totalTransactionVolume / avgPortfolioVal;

  const positiveReturnDays = dailyReturns.filter(ret => ret > 0).length;
  const winRateRatio = dailyReturns.length > 0 ? positiveReturnDays / dailyReturns.length : 0;

  const bench6040FinalVal = Math.round(
    (0.6 * (lastIhsgPrice / initialIhsgPrice) + 0.4 * (lastGoldPrice / initialGoldPrice)) * cap
  );
  const bench6040ReturnPct = 0.6 * ihsgReturnPct + 0.4 * goldReturnPct;

  return {
    totalReturnPct,
    ihsgReturnPct,
    goldReturnPct,
    cagr: cagr * 100,
    volatility: annVolatility * 100,
    sharpe,
    sortino,
    calmar,
    turnoverPct: turnoverRatio * 100,
    winRatePct: winRateRatio * 100,
    bench6040FinalVal,
    bench6040ReturnPct,
  };
}
