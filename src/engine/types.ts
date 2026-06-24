export interface ProfileWeights {
  quality: number;
  growth: number;
  value: number;
  momentum: number;
}

export interface BacktestDayData {
  date: string;
  ihsgPrice: number;
  goldPrice: number;
  stockPrices: Record<string, number>;
  stockVolumes?: Record<string, number>;
  stockRanks: Record<string, number>;
  stockRanksProd?: Record<string, number>;
  stockRanksRes?: Record<string, number>;
  stockNormScores?: Record<string, {
    quality: number;
    growth: number;
    value: number;
    momentum: number;
  }>;
}

export interface BacktestConfig {
  capital: number;
  reserveBufferPct: number;
  topNCount: number;
  universe: string;
  simulationMode: "algo" | "single" | "custom";
  singleTicker: string;
  enableCrashProtection: boolean;
  crashSensitivity: number;
  singleSellTrigger: number;
  singleBuyTrigger: number;
  safeHavenAsset: "emas" | "kas";
  enableCrossover: boolean;
  simStartDate: string;
  simEndDate: string;
  customTickers: string[];
  customUniverse: string[];
  activeProfileId: "prod" | "res";
}

export interface ExecutionFees {
  buyFee: number;
  sellFee: number;
  tax: number;
  slippage: number;
}

export const DEFAULT_FEES: ExecutionFees = {
  buyFee: 0.0015,
  sellFee: 0.0025,
  tax: 0.0010,
  slippage: 0.0025,
};

export interface TradeLog {
  date: string;
  type: "BUY" | "SELL" | "REBALANCE" | "CRASH_TRIGGER" | "CRASH_RECOVERY";
  message: string;
}

export interface ChartPoint {
  date: string;
  "Strategi Rebalancer": number;
  "Benchmark IHSG": number;
  "Benchmark Emas": number;
  ranks: Record<string, number>;
}

export interface BacktestResult {
  finalValue: number;
  ihsgFinalValue: number;
  goldFinalValue: number;
  totalReturnPct: number;
  ihsgReturnPct: number;
  goldReturnPct: number;
  maxDrawdown: number;
  totalTrades: number;
  totalDividends: number;
  cagr: number;
  volatility: number;
  sharpe: number;
  sortino: number;
  calmar: number;
  winRatePct: number;
  turnoverPct: number;
  bench6040FinalVal: number;
  bench6040ReturnPct: number;
  configName: string;
  logs: TradeLog[];
  chartData: ChartPoint[];
}

export interface StrategiesInput {
  dayData: BacktestDayData[];
  config: BacktestConfig;
  profileWeights: ProfileWeights;
  universeTickers: {
    idx80: string[];
    idx30: string[];
    lq45: string[];
  };
  fees?: ExecutionFees;
}
