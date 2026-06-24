export { runStrategy } from "./core";
export { computeDayRankings, pickTopTickersByRank, getCleanTickerList } from "./ranker";
export { detectCrashAlgo, detectCrashSingle, detectRecoveryAlgo, detectRecoverySingle } from "./crashDetector";
export {
  computeInitialAllocation,
  liquidateHoldings,
  computeGoldPurchase,
  computeGoldSale,
  computeRebalanceSwap,
  computeBuyAmount,
  computeSellProceeds,
} from "./allocator";
export { computeMetrics, calcStdDev } from "./metrics";
export type {
  ProfileWeights,
  BacktestDayData,
  BacktestConfig,
  ExecutionFees,
  TradeLog,
  ChartPoint,
  BacktestResult,
  StrategiesInput,
} from "./types";
export { DEFAULT_FEES } from "./types";
