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
  volatility: number | null;
  sharpe: number | null;
  sortino: number | null;
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

  const totalReturnPct = cap > 0 ? ((currentPortfolioVal - cap) / cap) * 100 : 0;
  const ihsgReturnPct = initialIhsgPrice > 0 ? ((lastIhsgPrice - initialIhsgPrice) / initialIhsgPrice) * 100 : 0;
  const goldReturnPct = initialGoldPrice > 0 ? ((lastGoldPrice - initialGoldPrice) / initialGoldPrice) * 100 : 0;

  const daysDiff = Math.ceil(
    (new Date(lastDayDate).getTime() - new Date(day0Date).getTime()) / (1000 * 60 * 60 * 24)
  ) || 1;
  const yearsElapsed = daysDiff / 365.25;
  const cagr = cap > 0 && currentPortfolioVal > 0
    ? Math.pow(currentPortfolioVal / cap, 1 / yearsElapsed) - 1
    : 0;

  const validReturns = dailyReturns.filter(r => Number.isFinite(r));
  const insufficientData = validReturns.length < 2;

  const annVolatility = insufficientData
    ? null
    : calcStdDev(validReturns) * Math.sqrt(252) / 100;

  const negativeReturns = validReturns.filter(r => r < 0);
  const downsideVol = !insufficientData && negativeReturns.length > 1
    ? calcStdDev(negativeReturns) * Math.sqrt(252) / 100
    : annVolatility;

  const rf = 0.050;
  const sharpe = annVolatility !== null && annVolatility > 0 ? (cagr - rf) / annVolatility : null;
  const sortino = downsideVol !== null && downsideVol > 0 ? (cagr - rf) / downsideVol : null;
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
    volatility: annVolatility !== null ? annVolatility * 100 : null,
    sharpe,
    sortino,
    calmar,
    turnoverPct: turnoverRatio * 100,
    winRatePct: winRateRatio * 100,
    bench6040FinalVal,
    bench6040ReturnPct,
  };
}
