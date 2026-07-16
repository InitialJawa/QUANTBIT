export function calcStdDev(vals: number[]): number {
  if (vals.length < 2) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sqDiffs = vals.map(v => Math.pow(v - mean, 2));
  const variance = sqDiffs.reduce((a, b) => a + b, 0) / (vals.length - 1);
  return Math.sqrt(variance);
}

function calcSkewness(vals: number[]): number {
  const n = vals.length;
  if (n < 3) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const m3 = vals.reduce((s, v) => s + Math.pow(v - mean, 3), 0) / n;
  const m2 = vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
  if (m2 === 0) return 0;
  return m3 / Math.pow(m2, 1.5);
}

function calcKurtosis(vals: number[]): number {
  const n = vals.length;
  if (n < 4) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const m4 = vals.reduce((s, v) => s + Math.pow(v - mean, 4), 0) / n;
  const m2 = vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / n;
  if (m2 === 0) return 0;
  return m4 / Math.pow(m2, 2) - 3;
}

function calcOmegaRatio(returns: number[], threshold: number = 0): number {
  if (returns.length === 0) return 1;
  const gains = returns.reduce((s, r) => s + Math.max(r - threshold, 0), 0);
  const losses = returns.reduce((s, r) => s + Math.max(threshold - r, 0), 0);
  if (losses === 0) return Infinity;
  return gains / losses;
}

function calcInformationRatio(portfolioReturns: number[], benchmarkReturns: number[]): number | null {
  const len = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (len < 2) return null;
  const excessReturns: number[] = [];
  for (let i = 0; i < len; i++) {
    const er = portfolioReturns[i] - benchmarkReturns[i];
    if (Number.isFinite(er)) excessReturns.push(er);
  }
  if (excessReturns.length < 2) return null;
  const meanExcess = excessReturns.reduce((a, b) => a + b, 0) / excessReturns.length;
  const trackingError = calcStdDev(excessReturns);
  if (trackingError === 0) return null;
  return (meanExcess / trackingError) * Math.sqrt(252);
}

function calcRollingSharpe(returns: number[], windowSize: number, rf: number = 0.05): number[] {
  const result: number[] = [];
  for (let i = 0; i <= returns.length - windowSize; i++) {
    const window = returns.slice(i, i + windowSize);
    const valid = window.filter(r => Number.isFinite(r));
    if (valid.length < 2) { result.push(0); continue; }
    const annReturn = valid.reduce((a, b) => a + b, 0) / valid.length * 252;
    const annVol = calcStdDev(valid) * Math.sqrt(252) / 100;
    result.push(annVol > 0 ? (annReturn / 100 - rf) / annVol : 0);
  }
  return result;
}

function calcRollingSortino(returns: number[], windowSize: number, rf: number = 0.05): number[] {
  const result: number[] = [];
  for (let i = 0; i <= returns.length - windowSize; i++) {
    const window = returns.slice(i, i + windowSize);
    const valid = window.filter(r => Number.isFinite(r));
    if (valid.length < 2) { result.push(0); continue; }
    const annReturn = valid.reduce((a, b) => a + b, 0) / valid.length * 252;
    const negs = valid.filter(r => r < 0);
    const downVol = negs.length > 1 ? calcStdDev(negs) * Math.sqrt(252) / 100 : null;
    result.push(downVol !== null && downVol > 0 ? (annReturn / 100 - rf) / downVol : 0);
  }
  return result;
}

function classifyRegime(ihsgPrices: number[], idx: number): "bull" | "bear" {
  const sma20 = idx >= 19
    ? ihsgPrices.slice(idx - 19, idx + 1).reduce((a, b) => a + b, 0) / 20
    : ihsgPrices[idx];
  const sma50 = idx >= 49
    ? ihsgPrices.slice(idx - 49, idx + 1).reduce((a, b) => a + b, 0) / 50
    : sma20;
  return sma20 >= sma50 ? "bull" : "bear";
}

function calcRegimeConditional(
  portfolioReturns: number[],
  ihsgPrices: number[],
): { bullSharpe: number | null; bearSharpe: number | null; bullDays: number; bearDays: number } {
  const rf = 0.05;
  const bullReturns: number[] = [];
  const bearReturns: number[] = [];
  for (let i = 0; i < portfolioReturns.length; i++) {
    const dataIdx = i + 1;
    if (dataIdx >= ihsgPrices.length) break;
    if (!Number.isFinite(portfolioReturns[i])) continue;
    const regime = classifyRegime(ihsgPrices, dataIdx);
    if (regime === "bull") bullReturns.push(portfolioReturns[i]);
    else bearReturns.push(portfolioReturns[i]);
  }
  const calcSharpe = (rets: number[]): number | null => {
    if (rets.length < 2) return null;
    const annRet = rets.reduce((a, b) => a + b, 0) / rets.length * 252;
    const annVol = calcStdDev(rets) * Math.sqrt(252) / 100;
    return annVol > 0 ? (annRet / 100 - rf) / annVol : null;
  };
  return {
    bullSharpe: calcSharpe(bullReturns),
    bearSharpe: calcSharpe(bearReturns),
    bullDays: bullReturns.length,
    bearDays: bearReturns.length,
  };
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
  benchmarkDailyReturns: number[];
  ihsgPrices: number[];
  totalFeesPaid: number;
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
  informationRatio: number | null;
  omegaRatio: number;
  skewness: number;
  kurtosis: number;
  rollingSharpe: number[];
  rollingSortino: number[];
  bullSharpe: number | null;
  bearSharpe: number | null;
  bullDays: number;
  bearDays: number;
  turnoverAdjustedReturnPct: number;
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
    benchmarkDailyReturns,
    ihsgPrices,
    totalFeesPaid,
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

  const informationRatio = calcInformationRatio(validReturns, benchmarkDailyReturns);
  const omegaRatio = calcOmegaRatio(validReturns, rf / 252);
  const skewness = calcSkewness(validReturns);
  const kurtosis = calcKurtosis(validReturns);
  const rollingSharpe = calcRollingSharpe(validReturns, Math.min(252, validReturns.length));
  const rollingSortino = calcRollingSortino(validReturns, Math.min(252, validReturns.length));
  const regime = calcRegimeConditional(validReturns, ihsgPrices);
  const turnoverAdjustedReturnPct = totalReturnPct - (cap > 0 ? (totalFeesPaid / cap) * 100 : 0);

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
    informationRatio,
    omegaRatio,
    skewness,
    kurtosis,
    rollingSharpe,
    rollingSortino,
    bullSharpe: regime.bullSharpe,
    bearSharpe: regime.bearSharpe,
    bullDays: regime.bullDays,
    bearDays: regime.bearDays,
    turnoverAdjustedReturnPct,
  };
}
