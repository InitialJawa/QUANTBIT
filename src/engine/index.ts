export { runStrategy, evaluateStrategy, shouldTriggerExit, getActiveUniverse } from "./core";
export type { StrategyEvaluation } from "./core";
export { computeDayRankings, pickTopTickersByRank, getCleanTickerList } from "./ranker";
export { detectCrashAlgo, detectRecoveryAlgo } from "./crashDetector";
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
export {
  rule_tickerOutOfTopN,
  rule_crashProtectionTriggered,
  rule_customUniverseBreach,
} from "./notificationRules";
export type { RuleContext, RuleResult } from "./notificationRules";
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
