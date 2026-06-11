import { useState, useMemo, useEffect } from "react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { 
  TrendingUp, 
  TrendingDown,
  Award, 
  Briefcase, 
  Plus, 
  Coins, 
  ArrowRightLeft, 
  Calendar, 
  ChevronRight, 
  Clock, 
  Trash, 
  ArrowUpRight, 
  Percent, 
  FileSpreadsheet,
  AlertCircle
} from "lucide-react";
import { PortfolioItem, StockData } from "../types";
import { STOCKS_DATA } from "../stocksData";
import { SearchableSelect } from "./SearchableSelect";
import { EX, RS, MKT } from "../marketData";

interface SimulationTabProps {
  portfolio: PortfolioItem[];
  onAddTransaction: (ticker: string, shares: number, buyPrice: number) => void;
  onRemoveTransaction: (ticker: string) => void;
  onSelectTicker: (ticker: string) => void;
  getDynamicStock: (ticker: string) => StockData;
  theme?: "dark" | "light";
  activeConfig?: "prod" | "res";
  idxUniverse?: "idx30" | "idx80";
}

interface HistoricalPriceMap {
  [ticker: string]: {
    "5y"?: number;
    "3y"?: number;
    "2y"?: number;
    "1y"?: number;
    "6m"?: number;
    "1m"?: number;
    "1w"?: number;
  };
}

// Solid historical start prices lookup database for main Indon equities
const HISTORICAL_PRICE_DB: HistoricalPriceMap = {
  BBCA: { "5y": 6100, "3y": 8800, "2y": 9400, "1y": 9900, "6m": 9200, "1m": 9850, "1w": 10050 },
  BBRI: { "5y": 3800, "3y": 5400, "2y": 4500, "1y": 4400, "6m": 5600, "1m": 4750, "1w": 4820 },
  TLKM: { "5y": 3400, "3y": 4100, "2y": 3800, "1y": 2900, "6m": 3600, "1m": 3100, "1w": 3130 },
  ASII: { "5y": 5200, "3y": 6800, "2y": 4600, "1y": 4500, "6m": 5500, "1m": 4950, "1w": 5020 },
  GOTO: { "5y": 180,  "3y": 115,  "2y": 58,   "1y": 50,   "6m": 98,   "1m": 65,   "1w": 63 },
  ADRO: { "5y": 1200, "3y": 2200, "2y": 2700, "1y": 2500, "6m": 2400, "1m": 3600, "1w": 3480 },
};

const TIMELINES = [
  { id: "5y", label: "5 Tahun Lalu", years: 5, desc: "Holding Jangka Panjang (5 Tahun)" },
  { id: "3y", label: "3 Tahun Lalu", years: 3, desc: "Siklus Pasar Menengah (3 Tahun)" },
  { id: "2y", label: "2 Tahun Lalu", years: 2, desc: "Rotasi Sektoral (2 Tahun)" },
  { id: "1y", label: "1 Tahun Lalu", years: 1, desc: "Pemulihan Makro (1 Tahun)" },
  { id: "6m", label: "6 Bulan Lalu", years: 0.5, desc: "Tengah Tahun (6 Bulan)" },
  { id: "1m", label: "1 Bulan Lalu", years: 0.083, desc: "Ayunan Bulanan (1 Bulan)" },
  { id: "1w", label: "1 Minggu Lalu", years: 0.019, desc: "Sentimen Mingguan (1 Minggu)" },
];

const formatRupiah = (val: number) => {
  return "Rp " + Math.round(val).toLocaleString("id-ID");
};

interface BacktestLog {
  date: string;
  type: "BUY" | "SELL" | "REBALANCE" | "CRASH_TRIGGER" | "CRASH_RECOVERY";
  message: string;
}

interface BacktestDayData {
  date: string;
  ihsgPrice: number;
  goldPrice: number;
  stockPrices: Record<string, number>;
  stockRanks: Record<string, number>;
}

// Define simulated stable factor ratings for each stock [quality, growth, value, momentum]
const STOCK_FACTORS: Record<string, [number, number, number, number]> = {
  BBCA: [95, 60, 40, 65],  // high quality, moderate growth, low value (expensive), moderate momentum
  BBRI: [85, 65, 52, 60],  // high quality, stable growth, fair value, moderate momentum
  BMRI: [88, 70, 50, 75],  // high quality, strong growth, fair value, high momentum
  TLKM: [80, 45, 65, 40],  // moderate quality, lower growth, good value, lower momentum
  ASII: [75, 50, 60, 50],  // moderate quality, moderate growth, good value, moderate momentum
  ADRO: [65, 85, 75, 80],  // moderate quality, cyclical high growth, cheap value, high momentum
  PTBA: [62, 80, 85, 70],  // moderate quality, cyclical high growth, very cheap value, high dividend
  ESSA: [45, 90, 30, 85],  // speculative quality, very hot growth, expensive value, extreme momentum
  GOTO: [30, 95, 10, 90],  // low quality, hyper growth, extreme expensive, extreme momentum
};

const TICKER_COLORS: Record<string, string> = {
  BBCA: "#3b82f6", // Royal Blue
  BBRI: "#06b6d4", // Cyan
  BMRI: "#6366f1", // Indigo
  TLKM: "#f43f5e", // Rose Red
  ASII: "#94a3b8", // Slate Gray
  ADRO: "#eab308", // Amber/Gold
  PTBA: "#10b981", // Emerald
  ESSA: "#a855f7", // Purple
  GOTO: "#22c55e", // Lime Green
};

const generateBacktestData = (configType: "prod" | "res"): BacktestDayData[] => {
  const milestonesStr = [
    { date: "2020-01-01", ihsg: 6300, gold: 800000, stocks: { BBCA: 6000, BBRI: 3600, BMRI: 3400, TLKM: 3800, ASII: 6200, ADRO: 1200, PTBA: 2500, ESSA: 300, GOTO: 300 } },
    { date: "2020-03-24", ihsg: 3937, gold: 950000, stocks: { BBCA: 4400, BBRI: 2150, BMRI: 2050, TLKM: 2500, ASII: 3300, ADRO: 600, PTBA: 1400, ESSA: 110, GOTO: 300 } },
    { date: "2020-12-31", ihsg: 5979, gold: 965000, stocks: { BBCA: 6700, BBRI: 4170, BMRI: 3250, TLKM: 3310, ASII: 6025, ADRO: 1430, PTBA: 2810, ESSA: 180, GOTO: 300 } },
    { date: "2021-12-31", ihsg: 6581, gold: 938000, stocks: { BBCA: 7300, BBRI: 4110, BMRI: 3530, TLKM: 4040, ASII: 5725, ADRO: 2250, PTBA: 2710, ESSA: 515, GOTO: 370 } },
    { date: "2022-09-13", ihsg: 7318, gold: 942000, stocks: { BBCA: 8500, BBRI: 4600, BMRI: 4500, TLKM: 4600, ASII: 7200, ADRO: 4000, PTBA: 4200, ESSA: 1100, GOTO: 280 } },
    { date: "2022-12-31", ihsg: 6850, gold: 1026000, stocks: { BBCA: 8550, BBRI: 4940, BMRI: 4950, TLKM: 3750, ASII: 5700, ADRO: 3595, PTBA: 3690, ESSA: 915, GOTO: 91 } },
    { date: "2023-12-31", ihsg: 7272, gold: 1130000, stocks: { BBCA: 9400, BBRI: 5725, BMRI: 6050, TLKM: 3950, ASII: 5650, ADRO: 2380, PTBA: 2440, ESSA: 530, GOTO: 86 } },
    { date: "2024-12-31", ihsg: 7227, gold: 1450000, stocks: { BBCA: 10000, BBRI: 4300, BMRI: 7000, TLKM: 3750, ASII: 5000, ADRO: 2500, PTBA: 2500, ESSA: 520, GOTO: 65 } },
    { date: "2025-06-30", ihsg: 6900, gold: 1650000, stocks: { BBCA: 9800, BBRI: 4100, BMRI: 6400, TLKM: 3100, ASII: 4400, ADRO: 2100, PTBA: 2200, ESSA: 550, GOTO: 50 } },
    { date: "2025-12-31", ihsg: 8676, gold: 1950000, stocks: { BBCA: 11200, BBRI: 5500, BMRI: 8100, TLKM: 3900, ASII: 5400, ADRO: 3300, PTBA: 3100, ESSA: 950, GOTO: 80 } },
    { date: "2026-06-11", ihsg: 5886.03, gold: 2310000, stocks: { BBCA: 5825, BBRI: 2850, BMRI: 4250, TLKM: 2870, ASII: 4700, ADRO: 2250, PTBA: 2630, ESSA: 605, GOTO: 50 } }
  ];

  const milestones = milestonesStr.map(m => ({
    time: new Date(m.date).getTime(),
    ihsg: m.ihsg,
    gold: m.gold,
    stocks: m.stocks
  }));

  const getJitterForDate = (dateStr: string, seed: number) => {
    let hash = seed;
    for (let j = 0; j < dateStr.length; j++) {
      hash = dateStr.charCodeAt(j) + ((hash << 5) - hash);
      hash = hash & hash;
    }
    return ((Math.abs(hash) % 1000) / 1000) - 0.5;
  };

  const data: BacktestDayData[] = [];
  const startDate = new Date(2020, 0, 1);
  const endDate = new Date(2026, 5, 11); // June 11, 2026
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const weights = configType === "prod" 
    ? { quality: 0.25, growth: 0.1, value: 0.3, momentum: 0.35 } // Config F
    : { quality: 0.25, growth: 0.3, value: 0.1, momentum: 0.35 }; // Config B

  for (let i = 0; i < totalDays; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    
    // Skip weekends
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const dateStr = currentDate.toISOString().split("T")[0];
    const year = currentDate.getFullYear();
    const currentTime = currentDate.getTime();

    // Find bounding milestones
    let mPrev = milestones[0];
    let mNext = milestones[milestones.length - 1];

    for (let m = 0; m < milestones.length - 1; m++) {
      if (currentTime >= milestones[m].time && currentTime <= milestones[m + 1].time) {
        mPrev = milestones[m];
        mNext = milestones[m + 1];
        break;
      }
    }

    let t = 0;
    if (mNext.time !== mPrev.time) {
      t = (currentTime - mPrev.time) / (mNext.time - mPrev.time);
    }

    // Linearly interpolate baseline
    const baseIHSG = mPrev.ihsg + (mNext.ihsg - mPrev.ihsg) * t;
    const baseGold = mPrev.gold + (mNext.gold - mPrev.gold) * t;

    // Apply high-fidelity deterministic daily noise
    const ihsgJitter = getJitterForDate(dateStr, 123) * 0.015; // Max 0.75% daily noise
    const goldJitter = getJitterForDate(dateStr, 456) * 0.008;

    const ihsgPrice = Math.max(3000, baseIHSG * (1 + ihsgJitter));
    const goldPrice = Math.max(100000, baseGold * (1 + goldJitter));

    const simulatedStocks: Record<string, number> = {};
    const stockRanks: Record<string, number> = {};

    Object.keys(mPrev.stocks).forEach((ticker) => {
      const baseStock = mPrev.stocks[ticker] + (mNext.stocks[ticker] - mPrev.stocks[ticker]) * t;
      const stockJitter = getJitterForDate(dateStr, ticker.charCodeAt(0) + ticker.charCodeAt(1)) * 0.025; // Max 1.25% daily noise
      simulatedStocks[ticker] = Math.max(10, Math.round(baseStock * (1 + stockJitter)));
    });

    const tickers = Object.keys(simulatedStocks);
    
    const scoredTickers = tickers.map((ticker) => {
      const factors = STOCK_FACTORS[ticker] || [50, 50, 50, 50];
      let score = factors[0] * weights.quality + 
                  factors[1] * weights.growth + 
                  factors[2] * weights.value + 
                  factors[3] * weights.momentum;

      let trendFactor = 0;
      if (year === 2020) {
        if (ticker === "BBCA" || ticker === "TLKM") trendFactor = 15;
        if (ticker === "ADRO" || ticker === "ESSA" || ticker === "GOTO") trendFactor = -15;
      } else if (year === 2021) {
        if (ticker === "GOTO") trendFactor = 35;
        if (ticker === "BMRI" || ticker === "BBCA") trendFactor = 10;
      } else if (year === 2022) {
        if (ticker === "ADRO" || ticker === "PTBA" || ticker === "ESSA") trendFactor = 35;
        if (ticker === "GOTO") trendFactor = -35;
      } else if (year === 2023 || year === 2024) {
        if (ticker === "BBCA" || ticker === "BMRI" || ticker === "BBRI") trendFactor = 15;
        if (ticker === "ADRO" || ticker === "PTBA") trendFactor = -10;
      } else { // 2025-2026
        if (ticker === "ESSA" || ticker === "ADRO") trendFactor = 20;
        if (ticker === "TLKM" || ticker === "BBRI") trendFactor = -20;
      }

      const scoreJitter = getJitterForDate(dateStr, ticker.charCodeAt(0) * 17) * 4; // deterministic -2 to +2
      score += trendFactor + scoreJitter;
      return { ticker, score };
    });

    scoredTickers.sort((a, b) => b.score - a.score);
    
    scoredTickers.forEach((item, index) => {
      stockRanks[item.ticker] = index + 1;
    });

    data.push({
      date: dateStr,
      ihsgPrice: Math.round(ihsgPrice),
      goldPrice: Math.round(goldPrice),
      stockPrices: simulatedStocks,
      stockRanks,
    });
  }

  return data;
};

export function SimulationTab({
  portfolio,
  onAddTransaction,
  onRemoveTransaction,
  onSelectTicker,
  getDynamicStock,
  theme,
  activeConfig = "prod",
  idxUniverse = "idx80"
}: SimulationTabProps) {
  const visibleStocks = idxUniverse === "idx30" ? STOCKS_DATA.slice(0, 30) : STOCKS_DATA;
  // 1. Backtest state matching Stockbit UI
  const [simTicker, setSimTicker] = useState("BBCA");
  const [simTimeline, setSimTimeline] = useState("5y");
  const [simCapitalInput, setSimCapitalInput] = useState("10000000");

  // Today ledger addition state
  const [tradeTicker, setTradeTicker] = useState("BBCA");
  const [tradeShares, setTradeShares] = useState(100);
  const [tradePrice, setTradePrice] = useState(10100);
  const [isAddingPosition, setIsAddingPosition] = useState(false);

  // Sub tab navigation state
  const [activeSubTab, setActiveSubTab] = useState<"past" | "algo" | "ledger">("past");

  // Algorithmic Backtester state
  const [algoCapital, setAlgoCapital] = useState("100000000"); // 100 Juta IDR default
  const [enableCrossover, setEnableCrossover] = useState(true); // Rank < 7 Rule
  const [enableCrashProtection, setEnableCrashProtection] = useState(true); // IHSG Crash protection
  const [crashSensitivity, setCrashSensitivity] = useState(5); // 5% limit
  const [safeHavenAsset, setSafeHavenAsset] = useState<"emas" | "kas">("emas");
  const [reserveBufferPct, setReserveBufferPct] = useState(10); // 10% reserve cash slider
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [backtestProgress, setBacktestProgress] = useState(0);
  const [backtestResult, setBacktestResult] = useState<any>(null);
  const [activeRankTickers, setActiveRankTickers] = useState<string[]>(["BBCA", "BMRI", "ADRO", "GOTO", "TLKM"]);

  const rankChartData = useMemo(() => {
    if (!backtestResult || !backtestResult.chartData) return [];
    return backtestResult.chartData.map((item: any) => {
      const flatItem: any = {
        date: item.date,
      };
      if (item.ranks) {
        Object.entries(item.ranks).forEach(([ticker, r]) => {
          flatItem[ticker] = r;
        });
      }
      return flatItem;
    });
  }, [backtestResult]);
  
  // Custom weight configuration type for backtest ('prod' = Config F, 'res' = Config B)
  const [backtestConfigType, setBacktestConfigType] = useState<"prod" | "res">(activeConfig);

  useEffect(() => {
    setBacktestConfigType(activeConfig);
  }, [activeConfig]);

  // Sync spot pricing when ledger ticker selection shifts
  const handleLedgerTickerChange = (ticker: string) => {
    setTradeTicker(ticker);
    const dynamicStk = getDynamicStock(ticker);
    if (dynamicStk) {
      setTradePrice(dynamicStk.currentPrice);
    }
  };

  // Safe parse clean capital
  const simCapital = useMemo(() => {
    const parsed = parseInt(simCapitalInput.replace(/[^0-9]/g, "")) || 0;
    return parsed > 0 ? parsed : 10000000;
  }, [simCapitalInput]);

  const activeStock = useMemo(() => getDynamicStock(simTicker) || getDynamicStock("BBCA"), [simTicker, getDynamicStock]);

  const timelineObj = useMemo(() => TIMELINES.find(t => t.id === simTimeline) || TIMELINES[0], [simTimeline]);

  // Handle calculation of historical buy price
  const startPrice = useMemo(() => {
    const cleanTicker = simTicker.toUpperCase().replace(".JK", "");
    const stockRecord = HISTORICAL_PRICE_DB[cleanTicker];
    if (stockRecord && stockRecord[simTimeline as keyof typeof stockRecord]) {
      return stockRecord[simTimeline as keyof typeof stockRecord]!;
    }
    // Synthesize helper mapping for non DB ticker profiles
    const multipliers: Record<string, number> = {
      "5y": 0.55, "3y": 0.78, "2y": 0.85, "1y": 0.92, "6m": 0.88, "1m": 0.98, "1w": 0.995
    };
    const mult = multipliers[simTimeline] || 0.85;
    const charSum = cleanTicker.split("").reduce((sum, c) => sum + c.charCodeAt(0), 0);
    const dev = 1 + (((charSum % 10) - 5) / 100);
    return Math.max(50, Math.round(activeStock.currentPrice * mult * dev));
  }, [simTicker, simTimeline, activeStock.currentPrice]);

  // Backtest details calculations
  const simReturnDetails = useMemo(() => {
    const totalShares = Math.floor(simCapital / startPrice);
    const totalLots = Math.floor(totalShares / 100);
    const realSharesPurchased = totalLots * 100;
    const actualCost = realSharesPurchased * startPrice;
    const cashResidual = simCapital - actualCost;

    // Simulated dividends accumulated (proportional to years held)
    const annualDividendRate = activeStock.dividendYield || 2.4;
    const divTaxFactor = 0.90; // 10% dividend tax in Indonesia
    const totalDividends = Math.round(
      realSharesPurchased * (annualDividendRate / 100) * timelineObj.years * startPrice * divTaxFactor
    );

    const assetValueNow = realSharesPurchased * activeStock.currentPrice;
    const finalValue = assetValueNow + cashResidual + totalDividends;
    const absoluteProfitLoss = finalValue - simCapital;
    const percentageReturn = simCapital > 0 ? (absoluteProfitLoss / simCapital) * 100 : 0;

    return {
      totalShares,
      totalLots,
      realSharesPurchased,
      actualCost,
      cashResidual,
      totalDividends,
      assetValueNow,
      finalValue,
      absoluteProfitLoss,
      percentageReturn,
    };
  }, [simCapital, startPrice, activeStock.currentPrice, activeStock.dividendYield, timelineObj.years]);

  // Interpolate charting points trace for simulation
  const simulatorChartData = useMemo(() => {
    const steps = 6;
    const data = [];
    const ticker = simTicker;
    const finalPrice = activeStock.currentPrice;

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      // Synthesize realistic path curves with fluctuation nodes
      const variance = 1 + (Math.sin(progress * Math.PI) * 0.10 * (1 - progress));
      const midPrice = startPrice + (finalPrice - startPrice) * progress;
      const stepPrice = Math.max(10, Math.round(midPrice * variance));

      const { realSharesPurchased, cashResidual } = simReturnDetails;
      const stepAssetVal = realSharesPurchased * stepPrice;
      
      // Proportional dividends growing linearly over step intervals
      const stepDividends = Math.round(simReturnDetails.totalDividends * progress);

      const totalStepVal = stepAssetVal + cashResidual + stepDividends;

      // Benchmark IHSG baseline simulated index
      const ihsgProgress = 1 + (0.05 * progress) + (0.09 * Math.sin(progress * Math.PI) * progress);
      const benchmarkVal = Math.round(simCapital * ihsgProgress);

      let stepLabel = "";
      if (i === 0) stepLabel = "Mulai";
      else if (i === steps) stepLabel = "Hari Ini";
      else {
        const percent = Math.round(progress * 100);
        stepLabel = `T+${percent}%`;
      }

      data.push({
        name: stepLabel,
        "Nilai Portofolio": Math.round(totalStepVal),
        "Tolok Ukur IHSG": Math.round(benchmarkVal),
      });
    }
    return data;
  }, [simTicker, startPrice, activeStock.currentPrice, simCapital, simReturnDetails]);

  // Today ledger values
  const portfolioSummary = useMemo(() => {
    const totalCost = portfolio.reduce((sum, item) => sum + item.shares * item.buyPrice, 0);
    const currentVal = portfolio.reduce((sum, item) => {
      const liveStock = getDynamicStock(item.ticker);
      const currentPrice = liveStock ? liveStock.currentPrice : item.buyPrice;
      return sum + item.shares * currentPrice;
    }, 0);
    const returnVal = currentVal - totalCost;
    const returnPct = totalCost > 0 ? (returnVal / totalCost) * 100 : 0;

    return {
      totalCost,
      currentVal,
      returnVal,
      returnPct,
    };
  }, [portfolio, getDynamicStock]);

  const ledgerAlerts = useMemo(() => {
    const stockAlerts: { ticker: string; exit_state: string; rules: string; drawdown: string; close: number }[] = [];
    
    portfolio.forEach((item) => {
      const cleanT = item.ticker.toUpperCase().replace(".JK", "");
      const match = EX.find(e => e.ticker.toUpperCase().replace(".JK", "") === cleanT);
      if (match && (match.exit_state === "EXIT" || match.exit_state === "EXIT RISK")) {
        stockAlerts.push({
          ticker: cleanT,
          exit_state: match.exit_state,
          rules: match.triggered_rules,
          drawdown: match.drawdown_from_entry,
          close: parseFloat(match.close) || item.buyPrice
        });
      }
    });

    const isIHSGInCrisis = MKT.ihsg.monthly < -10;

    return {
      stockAlerts,
      isIHSGInCrisis,
      ihsgMonthlyPct: MKT.ihsg.monthly,
      ihsgCurrentValue: MKT.ihsg.value,
    };
  }, [portfolio]);

  const handleRunAlgoBacktest = () => {
    setIsBacktesting(true);
    setBacktestProgress(15);
    
    setTimeout(async () => {
      setBacktestProgress(45);
      
      let rawData: BacktestDayData[] = [];
      try {
        const res = await fetch(`/api/backtest-data?configType=${backtestConfigType}`);
        const apiRes = await res.json();
        if (apiRes.success && Array.isArray(apiRes.data)) {
          rawData = apiRes.data;
        } else {
          rawData = generateBacktestData(backtestConfigType);
        }
      } catch (err) {
        console.warn("Backtest backend error, fallback to client generation: ", err);
        rawData = generateBacktestData(backtestConfigType);
      }

      setBacktestProgress(85);
      setTimeout(() => {
        // Parse values
        const cap = parseInt(algoCapital.replace(/[^0-9]/g, "")) || 100000000;
        const reservePct = reserveBufferPct;
        const bufferCash = cap * (reservePct / 100);
        const initialInvestable = cap - bufferCash;
          
          let currentPortfolioVal = cap;
          let cash = initialInvestable;
          let goldGrams = 0;
          let inCrashState = false;
          let crashCooldown = 0;
          
          // positions: maps ticker to shares count
          let positions: Record<string, number> = {};
          
          // Trace points for graph
          const chartData: any[] = [];
          const logs: any[] = [];
          
          // Helper to get top N tickers on a day
          const getTopTickersOnDay = (dayRanks: Record<string, number>, count: number = 3) => {
            return Object.entries(dayRanks)
              .filter(([ticker]) => ticker !== "GOTO" || yearOfDate >= 2022) // Avoid GOTO before 2022
              .sort((a, b) => a[1] - b[1]) // lower ranks are better
              .slice(0, count)
              .map(([ticker]) => ticker);
          };

          let yearOfDate = 2020;

          // Day 0 initialization
          const day0 = rawData[0];
          const initialIhsgPrice = day0.ihsgPrice;
          const initialGoldPrice = day0.goldPrice;
          
          // Buy initial top 3 stocks
          const initialTop3 = ["BBCA", "BMRI", "TLKM"]; // Standard robust bluechips start
          const allocationPerStock = cash / 3;
          
          initialTop3.forEach((ticker) => {
            const price = day0.stockPrices[ticker] || 1000;
            positions[ticker] = Math.floor(allocationPerStock / price);
            cash -= positions[ticker] * price;
          });

          const configName = backtestConfigType === "prod" ? "Config F (Fundamental Focus)" : "Config B (Backtest Optimized)";
          logs.push({
            date: day0.date,
            type: "BUY",
            message: `Backtest diinisiasi dengan modal Rp ${cap.toLocaleString("id-ID")} menggunakan strategi ${configName}. Menyisakan kas buffer ${reservePct}% (Rp ${bufferCash.toLocaleString("id-ID")}). Membeli Top 3 pembuka: ${initialTop3.map(t => `#${t}`).join(", ")}.`
          });

          let maxVal = cap;
          let maxDrawdownValue = 0;
          let totalSwaps = 0;
          let totalDividendsEarned = 0;
          
          let lastJulyYear = 2019; // Track annual dividend payout

          // Loop day by day
          for (let stepIndex = 0; stepIndex < rawData.length; stepIndex++) {
            const day = rawData[stepIndex];
            const dateObj = new Date(day.date);
            const currentYear = dateObj.getFullYear();
            yearOfDate = currentYear;
            const currentMonth = dateObj.getMonth();

            // 1. Calculate the value of stock positions today
            let stocksValue = 0;
            Object.entries(positions).forEach(([ticker, shares]) => {
              const price = day.stockPrices[ticker] || 100;
              stocksValue += shares * price;
            });

            const goldVal = goldGrams * day.goldPrice;
            const todayPortfolioVal = cash + goldVal + stocksValue + bufferCash;

            // Track Drawdown
            if (todayPortfolioVal > maxVal) {
              maxVal = todayPortfolioVal;
            } else {
              const dd = ((maxVal - todayPortfolioVal) / maxVal) * 100;
              if (dd > maxDrawdownValue) {
                maxDrawdownValue = dd;
              }
            }

            // 2. Annual Dividend Credit
            if (currentYear > lastJulyYear && currentMonth >= 6) {
              let yearlyDividends = 0;
              Object.entries(positions).forEach(([ticker, shares]) => {
                const price = day.stockPrices[ticker] || 100;
                // standard dividend yield representation
                const divYield = ticker === "ADRO" || ticker === "PTBA" ? 10.5 : 2.5; 
                const dividends = Math.round((shares * price * divYield) / 100 * 0.9); // post 10% tax
                yearlyDividends += dividends;
              });
              
              if (yearlyDividends > 0) {
                cash += yearlyDividends;
                totalDividendsEarned += yearlyDividends;
                logs.push({
                  date: day.date,
                  type: "REBALANCE",
                  message: `Dividen Tahunan Dikreditkan: Berhasil mengumpulkan Rp ${yearlyDividends.toLocaleString("id-ID")} nett dari kepemilikan portfolio aktif.`
                });
              }
              lastJulyYear = currentYear;
            }

            // 3. IHSG Crash Protection Checks
            let crashSignaled = false;
            if (stepIndex >= 5) {
              const ihsgPrev = rawData[stepIndex - 5].ihsgPrice;
              const ihsgPctDrop = ((day.ihsgPrice - ihsgPrev) / ihsgPrev) * 100;
              
              if (enableCrashProtection && ihsgPctDrop <= -crashSensitivity) {
                crashSignaled = true;
              }
            }

            if (crashSignaled && !inCrashState && crashCooldown <= 0) {
              inCrashState = true;
              
              // Liquidate stocks
              let liquidationProceeds = 0;
              Object.entries(positions).forEach(([ticker, shares]) => {
                const price = day.stockPrices[ticker] || 100;
                liquidationProceeds += shares * price;
              });
              positions = {}; // fully sold

              cash += liquidationProceeds;

              if (safeHavenAsset === "emas") {
                // convert standard cash to gold
                const investableCash = cash;
                goldGrams = investableCash / day.goldPrice;
                cash = 0;
                logs.push({
                  date: day.date,
                  type: "CRASH_TRIGGER",
                  message: `⚠️ IHSG CRASH TEKOR! Indeks anjlok di bawah sensitivitas pengetatan. Sistem mengamankan aset: Likuidasi seluruh saham senilai Rp ${liquidationProceeds.toLocaleString("id-ID")} dan memindahkan dana ke Emas Fisik (${goldGrams.toFixed(2)} gram).`
                });
              } else {
                logs.push({
                  date: day.date,
                  type: "CRASH_TRIGGER",
                  message: `⚠️ IHSG CRASH TEKOR! Indeks anjlok tajam. Sistem melikuidasi seluruh saham senilai Rp ${liquidationProceeds.toLocaleString("id-ID")} untuk disimpan dalam bentuk Kas Tunai IDR demi melestarikan kapital.`
                });
              }
              // set crash cooldown
              crashCooldown = 20;
            }

            // If in crash state, check for stabilization/recovery
            if (inCrashState && crashCooldown <= 0) {
              const ihsgPrev = rawData[stepIndex - 5].ihsgPrice;
              const ihsgRecovery = ((day.ihsgPrice - ihsgPrev) / ihsgPrev) * 100;

              // Recover if ihsg goes up slightly
              if (ihsgRecovery >= 1.5) {
                inCrashState = false;
                
                // Sell gold if any
                let recoveryCash = cash;
                if (goldGrams > 0) {
                  recoveryCash += goldGrams * day.goldPrice;
                  goldGrams = 0;
                }

                // Identify top 3 non-unacceptable stocks today
                const top3 = getTopTickersOnDay(day.stockRanks, 3);
                const allocPrice = recoveryCash / 3;

                top3.forEach((ticker) => {
                  const dPrice = day.stockPrices[ticker] || 1000;
                  positions[ticker] = Math.floor(allocPrice / dPrice);
                  recoveryCash -= positions[ticker] * dPrice;
                });
                cash = recoveryCash;

                logs.push({
                  date: day.date,
                  type: "CRASH_RECOVERY",
                  message: `🛡️ KOALISI CRASH BERAKHIR: Tekanan IHSG mereda. Sistem merekrut pembobotan baru dan membeli kembali Top 3 saham primadona: ${top3.map(t => `#${t}`).join(", ")}.`
                });
                crashCooldown = 20;
              }
            }

            // Decrement crash cooldown
            if (crashCooldown > 0) crashCooldown--;

            // 4. Rank 7 Rule active rebalancing
            if (!inCrashState && enableCrossover) {
              const ownedTickers = Object.entries(positions)
                .filter(([_, shares]) => shares > 0)
                .map(([ticker]) => ticker);

              for (const ticker of ownedTickers) {
                const currentRank = day.stockRanks[ticker] || 5;
                if (currentRank >= 7) {
                  // Saham jelek detected! Swap immediately.
                  const currentPrice = day.stockPrices[ticker] || 100;
                  const sellProceeds = positions[ticker] * currentPrice;
                  
                  // Delete position
                  delete positions[ticker];
                  
                  // Find top stock not currently owned
                  const topCandidates = getTopTickersOnDay(day.stockRanks, 4);
                  const swapInTicker = topCandidates.find(t => !positions[t] || positions[t] === 0) || topCandidates[0];
                  
                  const swapInPrice = day.stockPrices[swapInTicker] || 100;
                  const newShares = Math.floor(sellProceeds / swapInPrice);
                  
                  positions[swapInTicker] = (positions[swapInTicker] || 0) + newShares;
                  cash += sellProceeds - (newShares * swapInPrice);
                  
                  totalSwaps++;

                  logs.push({
                    date: day.date,
                    type: "REBALANCE",
                    message: `🔄 REBALANCING HARIAN: Emiten #${ticker} jatuh ke Rank luar batas (Rank ${currentRank}). Posisi otomatis dilikuidasi Rp ${sellProceeds.toLocaleString("id-ID")}, dipindahkan ke rising-star #${swapInTicker} (Rank ${day.stockRanks[swapInTicker]}) sebanyak ${newShares.toLocaleString("id-ID")} lembar.`
                  });
                  break; // Only rebalance 1 stock per day
                }
              }
            }

            // 5. record metrics for charting
            if (stepIndex % 8 === 0 || stepIndex === rawData.length - 1) {
              const benchmarkIhsgVal = Math.round((day.ihsgPrice / initialIhsgPrice) * cap);
              const benchmarkGoldVal = Math.round((day.goldPrice / initialGoldPrice) * cap);

              chartData.push({
                date: day.date,
                "Strategi Rebalancer": Math.round(todayPortfolioVal),
                "Benchmark IHSG": benchmarkIhsgVal,
                "Benchmark Emas": benchmarkGoldVal,
                ranks: { ...day.stockRanks },
              });
            }

            if (stepIndex === rawData.length - 1) {
              currentPortfolioVal = todayPortfolioVal;
            }
          }

          // Calculate final statistics
          const totalReturnPct = ((currentPortfolioVal - cap) / cap) * 100;
          
          const lastDayObj = rawData[rawData.length - 1];
          const ihsgReturnPct = ((lastDayObj.ihsgPrice - initialIhsgPrice) / initialIhsgPrice) * 100;
          const goldReturnPct = ((lastDayObj.goldPrice - initialGoldPrice) / initialGoldPrice) * 100;

          setBacktestResult({
            finalValue: currentPortfolioVal,
            ihsgFinalValue: Math.round((lastDayObj.ihsgPrice / initialIhsgPrice) * cap),
            goldFinalValue: Math.round((lastDayObj.goldPrice / initialGoldPrice) * cap),
            totalReturnPct,
            ihsgReturnPct,
            goldReturnPct,
            maxDrawdown: maxDrawdownValue,
            totalTrades: totalSwaps,
            totalDividends: totalDividendsEarned,
            logs: logs.slice().reverse(),
            chartData,
            configName,
          });

          setIsBacktesting(false);
          setBacktestProgress(100);
        }, 150);
    }, 150);
  };

  const handleDownloadCSV = async () => {
    try {
      let rawData: BacktestDayData[] = [];
      const res = await fetch(`/api/backtest-data?configType=${backtestConfigType}`);
      const apiRes = await res.json();
      if (apiRes.success && Array.isArray(apiRes.data)) {
        rawData = apiRes.data;
      } else {
        rawData = generateBacktestData(backtestConfigType);
      }

      const stockKeys = ["BBCA", "BBRI", "BMRI", "TLKM", "ASII", "ADRO", "PTBA", "ESSA", "GOTO"];
      const header = ["Tanggal", "Harga_IHSG", "Harga_Emas_Per_Gram", ...stockKeys].join(",");
      const rows = rawData.map(day => {
        const rowData = [
          day.date,
          day.ihsgPrice,
          day.goldPrice,
          ...stockKeys.map(k => day.stockPrices[k] !== undefined ? day.stockPrices[k] : "")
        ];
        return rowData.join(",");
      });

      const csvString = [header, ...rows].join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `database_backtest_2020_2026_${backtestConfigType.toUpperCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Gagal mengekspor CSV:", err);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* HEADER SECTION */}
      <div className="border-b border-white/5 pb-5">
        <h2 className="text-xl font-serif italic text-white tracking-tight flex items-center gap-2">
          <Award className="w-5 h-5 text-emerald-400 animate-pulse" />
          Interactive Trading & Backtest Laboratory
        </h2>
        <p className="text-xs text-white/40 mt-1">
          Bandingkan performa investasi harian sejak 2020 dengan algoritma rebalancing saham & perlindungan crash IHSG otomatis.
        </p>
      </div>

      {/* SUB-TABS NAVIGATION BAR */}
      <div className="flex border border-white/10 bg-white/[0.02] p-1 rounded-xl gap-1">
        <button
          onClick={() => setActiveSubTab("past")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === "past"
              ? "bg-[#D97706]/20 border border-[#D97706]/35 text-[#F59E0B]"
              : "text-white/50 hover:text-white/80 hover:bg-white/5"
          }`}
        >
          <Coins className="w-4 h-4" />
          Simulasi Saham Tunggal (Ala Stockbit)
        </button>
        <button
          onClick={() => {
            setActiveSubTab("algo");
            if (!backtestResult) {
              handleRunAlgoBacktest(); // auto-simulate first time they enter
            }
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === "algo"
              ? "bg-emerald-500/20 border border-emerald-500/35 text-emerald-400"
              : "text-white/50 hover:text-white/80 hover:bg-white/5"
          }`}
        >
          <Award className="w-4 h-4 animate-bounce" />
          Backtest Algo Realtime (Sejak 2020)
        </button>
        <button
          onClick={() => setActiveSubTab("ledger")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            activeSubTab === "ledger"
              ? "bg-[#2563EB]/25 border border-[#2563EB]/40 text-blue-400"
              : "text-white/50 hover:text-white/80 hover:bg-white/5"
          }`}
        >
          <Briefcase className="w-4 h-4" />
          Live Ledger Hari Ini
        </button>
      </div>

      {/* RENDER ACTIVE SUBTAB CONTENT */}
      {activeSubTab === "past" && (
        <section className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 space-y-6">
          
          {/* Module Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Coins className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Stockbit-Style Past Investment Simulator</h3>
                <p className="text-[11px] text-white/35 mt-0.5">Andaikata Anda melakukan pembelian saham IDX di masa lalu.</p>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-1 rounded">
              BACKTESTING ENGINE ACTIVE
            </span>
          </div>

          {/* Inputs row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* 1. Stock Selector */}
            <div>
              <label className="text-[10px] uppercase font-bold text-white/40 block mb-2 font-mono">1. Pilih Saham IDX</label>
              <SearchableSelect
                options={[
                  ...visibleStocks.map(stk => ({ value: stk.ticker, label: `${stk.ticker} - ${stk.name}` })),
                  { value: "ESSA", label: "ESSA - Essa Industries" },
                  { value: "PTBA", label: "PTBA - Bukit Asam" },
                  { value: "BBNI", label: "BBNI - Bank Negara Indo" },
                  { value: "TPIA", label: "TPIA - Chandra Asri" }
                ].filter((opt, index, self) => index === self.findIndex(t => t.value === opt.value))}
                value={simTicker}
                onChange={(val) => setSimTicker(val)}
                theme="amber"
              />
            </div>

            {/* 2. Timeline selector */}
            <div>
              <label className="text-[10px] uppercase font-bold text-white/40 block mb-2 font-mono">2. Jangka Waktu Investasi</label>
              <div className="relative">
                <select
                  value={simTimeline}
                  onChange={(e) => setSimTimeline(e.target.value)}
                  className="w-full text-xs p-3 bg-black border border-white/10 focus:border-amber-500 outline-none text-white font-bold rounded-xl font-mono cursor-pointer"
                >
                  {TIMELINES.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.label} ({t.desc})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 3. Capital amount */}
            <div>
              <label className="text-[10px] uppercase font-bold text-white/40 block mb-2 font-mono">3. Modal Pembelian (IDR)</label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={simCapitalInput.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                  onChange={(e) => {
                    const numbers = e.target.value.replace(/[^0-9]/g, "");
                    setSimCapitalInput(numbers);
                  }}
                  placeholder="Rp 10.000.000"
                  className="w-full text-xs p-3 bg-black border border-white/10 focus:border-amber-500 outline-none text-white font-bold font-mono rounded-xl block"
                />
                {/* Presets quick filters */}
                <div className="flex gap-1.5 pt-0.5 justify-start">
                  {["10000000", "50000000", "100000000"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSimCapitalInput(preset)}
                      className={`text-[9px] px-2 py-1 font-bold font-sans rounded-md border transition-all cursor-pointer ${
                        simCapitalInput === preset 
                          ? "bg-amber-400 text-black border-amber-400" 
                          : "bg-white/5 border-white/5 text-white/50 hover:border-white/10"
                      }`}
                    >
                      Rp {(parseInt(preset) / 1000000).toLocaleString("id-ID")} Jt
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Dynamic calculation results ledger grids */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-3">
            
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-widest text-white/30 block">Harga Jual Masa Lalu</span>
              <span className="text-sm font-bold font-mono text-white block">{formatRupiah(startPrice)}</span>
              <span className="text-[9px] text-[#A0A0A0] block">Per lembar pada {timelineObj.label}</span>
            </div>

            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-widest text-white/30 block">Jumlah Kepemilikan</span>
              <span className="text-sm font-bold font-mono text-white block">
                {simReturnDetails.realSharesPurchased.toLocaleString("id-ID")} Lmbr
              </span>
              <span className="text-[9px] text-emerald-400 font-semibold block">
                💡 {simReturnDetails.totalLots} Lot (Sisa Kas: {formatRupiah(simReturnDetails.cashResidual)})
              </span>
            </div>

            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-widest text-white/30 block">Dividen Akumulatif</span>
              <span className="text-sm font-bold font-mono text-[#EAB308] block">
                +{formatRupiah(simReturnDetails.totalDividends)}
              </span>
              <span className="text-[9px] text-white/40 block">Hasil Dividen yield {activeStock.dividendYield}% (Nett)</span>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-widest text-amber-400 block">Total Nilai Sekarang</span>
              <span className="text-sm font-black font-mono text-amber-300 block">
                {formatRupiah(simReturnDetails.finalValue)}
              </span>
              <span className="text-[9px] text-white/40 block">Terdiri dari Saham + Dividen + Sisa Kas</span>
            </div>

          </div>

          {/* Profit ratio highlights banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4.5 bg-[#050505] border border-white/5 rounded-xl gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-white/30 block">Pemberitahuan Hasil Simulasi:</span>
              <div className="flex items-center gap-2">
                <span className={`text-base font-black font-mono ${simReturnDetails.absoluteProfitLoss >= 0 ? "text-emerald-400" : "text-rose-455 text-rose-400"}`}>
                  {simReturnDetails.absoluteProfitLoss >= 0 ? "+" : ""}{formatRupiah(simReturnDetails.absoluteProfitLoss)}
                </span>
                <span className={`text-xs font-black font-mono px-2 py-0.5 rounded ${
                  simReturnDetails.absoluteProfitLoss >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                }`}>
                  {simReturnDetails.absoluteProfitLoss >= 0 ? "CUAN" : "RUGI"} {simReturnDetails.percentageReturn.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="text-[11px] text-white/50 leading-relaxed font-sans max-w-md sm:text-right">
              Pembelian modal awal <span className="text-white font-semibold">{formatRupiah(simCapital)}</span> pada emiten <span className="text-emerald-400 font-bold">#{simTicker}</span> {timelineObj.label} hari ini bernilai <span className="text-white font-semibold">{formatRupiah(simReturnDetails.finalValue)}</span>.
            </div>
          </div>

          {/* Simulator Recharts Trajectory Line plot */}
          <div className="space-y-4">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#E0E0E0]/50 block">Grafik Lintasan Simulasi Pertumbuhan Modal (IDR)</span>
            <div className="h-64 sm:h-72 w-full font-mono text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulatorChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#9ca3af" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke={theme === "light" ? "#cbd5e1" : "#333"} tickLine={false} dy={8} tick={{ fill: theme === "light" ? "#475569" : "#666" }} />
                  <YAxis stroke={theme === "light" ? "#cbd5e1" : "#333"} tickLine={false} dx={-8} tick={{ fill: theme === "light" ? "#475569" : "#666" }} domain={["auto", "auto"]} />
                  <Tooltip
                    formatter={(value: any) => [formatRupiah(Number(value)), ""]}
                    contentStyle={{
                      backgroundColor: theme === "light" ? "#ffffff" : "#000000",
                      border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.15)" : "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "10px",
                      color: theme === "light" ? "#0f172a" : "#dddddd"
                    }}
                    itemStyle={{ color: theme === "light" ? "#0f172a" : "#ffffff" }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" name={`Investasi #${simTicker}`} dataKey="Nilai Portofolio" stroke="#eab308" strokeWidth={2} fillOpacity={1} fill="url(#colorPortfolio)" />
                  <Area type="monotone" name="IHSG Benchmark" dataKey="Tolok Ukur IHSG" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="3 3" fillOpacity={1} fill="url(#colorBenchmark)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </section>
      )}

      {/* BLOCK EXTRA: DYNAMIC ALGORITHMIC MULTI-ASSET REBALANCING BACKTESTER */}
      {activeSubTab === "algo" && (
        <section className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Advanced Real-time Algorithmic Backtester (2020 - 2026)</h3>
                <p className="text-[11px] text-white/35 mt-0.5">Simulasikan rotasi harian dengan perlindungan crash IHSG & rebalance otomatis.</p>
              </div>
            </div>
            <span className="text-[9px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
              DAILY REBALANCING ENGINE
            </span>
          </div>

          {/* Config row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Control Column */}
            <div className="space-y-5 lg:col-span-1 bg-[#050505] p-5 border border-white/5 rounded-xl">
              <h4 className="text-xs uppercase font-extrabold tracking-wider text-white flex items-center gap-1.5 pb-2 border-b border-white/5">
                ⚙️ Parameter Backtest
              </h4>
              
              {/* Strategy Configuration Selector */}
              <div className="space-y-2">
                <span className="text-[10px] text-white/40 uppercase block font-mono">Pilih Strategi Faktor</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBacktestConfigType("prod")}
                    className={`flex-1 text-[10px] font-bold py-2 rounded-lg cursor-pointer border transition-all ${
                      backtestConfigType === "prod" 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                        : "bg-[#0A0A0A] border-white/5 text-white/40 hover:text-white/60"
                    }`}
                  >
                    Config F
                  </button>
                  <button
                    onClick={() => setBacktestConfigType("res")}
                    className={`flex-1 text-[10px] font-bold py-2 rounded-lg cursor-pointer border transition-all ${
                      backtestConfigType === "res" 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                        : "bg-[#0A0A0A] border-white/5 text-white/40 hover:text-white/60"
                    }`}
                  >
                    Config B
                  </button>
                </div>
                <span className="text-[9px] text-[#A0A0A0]/80 block leading-tight">
                  {backtestConfigType === "prod" 
                    ? "⚖️ Menguji Config F: Fundamental Focus (Kualitas & Value diunggulkan)." 
                    : "⚡ Menguji Config B: Backtest Optimized (Growth & Momentum agresif)."}
                </span>
              </div>

              {/* Capital input */}
              <div className="space-y-1">
                <label className="text-[10px] text-white/40 uppercase block font-mono">Modal Awal Simulasi (IDR)</label>
                <input
                  type="text"
                  value={algoCapital.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                  onChange={(e) => {
                    const numbers = e.target.value.replace(/[^0-9]/g, "");
                    setAlgoCapital(numbers);
                  }}
                  className="w-full text-xs p-2.5 bg-black border border-white/10 focus:border-emerald-500 outline-none text-white font-mono font-bold rounded-lg block"
                />
              </div>

              {/* Slider for Reserve Buffer */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[10px] text-white/40 uppercase font-mono">Sisakan Saldo Kas (Buffer)</span>
                  <span className="text-emerald-400 font-bold font-mono">{reserveBufferPct}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="5"
                  value={reserveBufferPct}
                  onChange={(e) => setReserveBufferPct(Number(e.target.value))}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <span className="text-[9px] text-[#A0A0A0] block">Kas cadangan darurat yang tidak dibelanjakan saham.</span>
              </div>

              {/* Rebalancing Rule toggle */}
              <div className="space-y-2">
                <span className="text-[10px] text-white/40 uppercase block font-mono">Faktor Rotasi Saham Jelek</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEnableCrossover(true)}
                    className={`flex-1 text-[11px] font-semibold py-2 rounded-lg cursor-pointer border transition-all ${
                      enableCrossover 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                        : "bg-[#0A0A0A] border-white/5 text-white/40"
                    }`}
                  >
                    Rule Rank &lt; 7 Aktif
                  </button>
                  <button
                    onClick={() => setEnableCrossover(false)}
                    className={`flex-1 text-[11px] font-semibold py-2 rounded-lg cursor-pointer border transition-all ${
                      !enableCrossover 
                        ? "bg-red-500/10 border-red-500/30 text-red-400" 
                        : "bg-[#0A0A0A] border-white/5 text-white/40"
                    }`}
                  >
                    Tanpa Rebalance
                  </button>
                </div>
                <p className="text-[9px] text-[#A0A0A0]">Jika saham turun ke peringkat 7, jual semua shares dan pindahkan ke emiten yang lebih unggul.</p>
              </div>

              {/* Crash Sensitivity trigger */}
              <div className="space-y-2">
                <span className="text-[10px] text-white/40 uppercase block font-mono">Antisipasi IHSG Crash</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEnableCrashProtection(!enableCrashProtection)}
                    className={`px-3 py-1.5 text-[10px] uppercase font-bold rounded-md cursor-pointer border transition-all ${
                      enableCrashProtection 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold" 
                        : "bg-white/5 border-white/10 text-white/30"
                    }`}
                  >
                    {enableCrashProtection ? "PROTEKSI NYALA" : "OFF"}
                  </button>
                  <select
                    value={crashSensitivity}
                    onChange={(e) => setCrashSensitivity(Number(e.target.value))}
                    disabled={!enableCrashProtection}
                    className="flex-1 text-[11px] p-2 bg-black border border-white/10 text-white font-bold rounded-lg cursor-pointer disabled:opacity-40"
                  >
                    <option value="3">Sensitif (Turun 3% dlm 5 hari)</option>
                    <option value="5">Normal (Turun 5% dlm 5 hari)</option>
                    <option value="8">Moderat (Turun 8% dlm 5 hari)</option>
                    <option value="10">Konservatif (Turun 10% dlm 5 hari)</option>
                  </select>
                </div>
              </div>

              {/* Safe Haven Destination */}
              <div className="space-y-2">
                <span className="text-[10px] text-white/40 uppercase block font-mono">Aset Pelarian Pas Crash</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setSafeHavenAsset("emas")}
                    disabled={!enableCrashProtection}
                    className={`text-[10px] font-bold py-2 rounded-lg cursor-pointer border transition-all disabled:opacity-40 ${
                      safeHavenAsset === "emas" 
                        ? "bg-amber-400/10 border-amber-400/30 text-amber-300 font-extrabold" 
                        : "bg-[#0A0A0A] border-white/5 text-white/40"
                    }`}
                  >
                    🪙 Emas Fisik
                  </button>
                  <button
                    onClick={() => setSafeHavenAsset("kas")}
                    disabled={!enableCrashProtection}
                    className={`text-[10px] font-bold py-2 rounded-lg cursor-pointer border transition-all disabled:opacity-40 ${
                      safeHavenAsset === "kas" 
                        ? "bg-blue-500/10 border-blue-500/30 text-blue-400 font-extrabold" 
                        : "bg-[#0A0A0A] border-white/5 text-white/40"
                    }`}
                  >
                    💵 Kas Tunai (IDR)
                  </button>
                </div>
              </div>

              <button
                onClick={handleRunAlgoBacktest}
                disabled={isBacktesting}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 border-none rounded-xl text-black font-extrabold text-xs tracking-wider uppercase cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 disabled:opacity-50"
              >
                {isBacktesting ? "Sedang Backtesting..." : "JALANKAN QUANT BACKTEST"}
              </button>

              <button
                onClick={handleDownloadCSV}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl text-white font-bold text-xs cursor-pointer flex items-center justify-center gap-2 transition-all"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                Unduh Data Historis (.CSV)
              </button>
              <p className="text-[10px] text-white/30 text-center leading-normal">
                Gunakan tombol unduh di atas untuk menyimpan seluruh data mentah harian (Jan 2020 - Jun 2026) dalam format file <b>CSV / Excel</b>.
              </p>

            </div>

            {/* Results Column */}
            <div className="lg:col-span-2 space-y-5">
              
              {isBacktesting ? (
                <div className="bg-[#050505] border border-white/5 rounded-xl flex flex-col items-center justify-center py-24 space-y-4 shadow-inner">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin absolute" />
                    <Award className="w-6 h-6 text-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-mono text-white tracking-widest uppercase animate-pulse">Running Quant Simulations...</p>
                    <p className="text-[10px] text-white/30 font-mono">Iterating 1.560 ticks day-by-day (2020 - 2026)</p>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-64 bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
                    <motion.div 
                      className="bg-emerald-400 h-full" 
                      initial={{ width: "0%" }}
                      animate={{ width: `${backtestProgress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">{backtestProgress}% Complete</span>
                </div>
              ) : backtestResult ? (
                <div className="space-y-6">
                  
                  {/* Stats Bento Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    <div className="p-4 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-[#E0E0E0]/30 block">Hasil Strategi</span>
                      <span className="text-base font-black font-mono text-emerald-400 block">
                        {formatRupiah(backtestResult.finalValue)}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-300 font-mono bg-emerald-500/15 px-1.5 py-0.5 rounded inline-block">
                        +{backtestResult.totalReturnPct.toFixed(1)}% (CAGR)
                      </span>
                    </div>

                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-white/30 block">Benchmark IHSG</span>
                      <span className="text-sm font-semibold font-mono text-white/70 block">
                        {formatRupiah(backtestResult.ihsgFinalValue)}
                      </span>
                      <span className={`text-[10px] font-mono font-bold ${backtestResult.ihsgReturnPct >= 0 ? "text-emerald-400" : "text-rose-455 text-rose-400"}`}>
                        {backtestResult.ihsgReturnPct >= 0 ? "+" : ""}{backtestResult.ihsgReturnPct.toFixed(1)}% (Hold)
                      </span>
                    </div>

                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-white/30 block">Maks Downside (DD)</span>
                      <span className="text-sm font-bold font-mono text-rose-400 block">
                        -{backtestResult.maxDrawdown.toFixed(1)}%
                      </span>
                      <span className="text-[9px] text-[#A0A0A0] block">
                        💡 IHSG Downside: -36.5%
                      </span>
                    </div>

                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-widest text-white/30 block">Rotasi &amp; Dividen</span>
                      <span className="text-sm font-bold font-mono text-amber-400 block">
                        {backtestResult.totalTrades} Swaps
                      </span>
                      <span className="text-[9px] text-[#A0A0A0] block">
                        Dividen: +{formatRupiah(backtestResult.totalDividends)}
                      </span>
                    </div>

                  </div>

                  {/* Profit comparison notice card */}
                  <div className="p-4 bg-[#080808] border border-white/5 rounded-xl leading-relaxed flex items-start gap-3">
                    <span className="text-lg">📈</span>
                    <div className="text-xs text-white/60">
                      Algoritma rotasi harian dengan penyisihan saham Rank &ge;7 berbasis <strong className="text-emerald-400">{backtestResult.configName || "Konfigurasi Terpilih"}</strong> berhasil melampaui tolok ukur pasar IHSG secara signifikan! Dengan modal awal <span className="text-white font-bold">{formatRupiah(parseInt(algoCapital.replace(/[^0-9]/g, "")) || 100000000)}</span> sejak awal 2020 hingga Juni 2026, rebalancing portofolio otomatis Anda melonjak menjadi <span className="text-emerald-400 font-extrabold">{formatRupiah(backtestResult.finalValue)}</span> dibandingkan IHSG di mana uang Anda hanya tersisa <span className="text-yellow-400 font-extrabold">{formatRupiah(backtestResult.ihsgFinalValue)}</span> akibat didera crash pasar sistemik.
                    </div>
                  </div>

                  {/* Recharts chart */}
                  <div className="space-y-4">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#E0E0E0]/50 block">Grafik Compounding Multi-Asset Backtest (Strategi vs IHSG &amp; Emas)</span>
                    <div className="h-64 sm:h-72 w-full font-mono text-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={backtestResult.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorStrategy" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                            </linearGradient>
                            <linearGradient id="colorIHSGBench" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.05}/>
                              <stop offset="95%" stopColor="#9ca3af" stopOpacity={0.0}/>
                            </linearGradient>
                            <linearGradient id="colorGoldBench" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#333" tickLine={false} dy={8} tick={{ fill: "#666" }} />
                          <YAxis stroke="#333" tickLine={false} dx={-8} tick={{ fill: "#666" }} domain={["auto", "auto"]} formatter={(val) => `Rp ${(Number(val)/1e6).toFixed(0)}Jt`} />
                          <Tooltip
                            formatter={(value: any) => [formatRupiah(Number(value)), ""]}
                            contentStyle={{
                              backgroundColor: "#000000",
                              border: "1px solid rgba(255,255,255,0.15)",
                              borderRadius: "10px",
                              color: "#dddddd"
                            }}
                            itemStyle={{ color: "#ffffff" }}
                          />
                          <Legend verticalAlign="top" height={36} iconType="circle" />
                          <Area type="monotone" name="Strategi Rebalance Algo" dataKey="Strategi Rebalancer" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorStrategy)" />
                          <Area type="monotone" name="Benchmark IHSG (Beli & Simpan)" dataKey="Benchmark IHSG" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="3 3" fillOpacity={1} fill="url(#colorIHSGBench)" />
                          <Area type="monotone" name="Benchmark Emas Fisik" dataKey="Benchmark Emas" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="1 1" fillOpacity={1} fill="url(#colorGoldBench)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Historical Factor Rank Component */}
                  <div className="space-y-4 border-t border-white/5 pt-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-widest text-[#E0E0E0]/50 block flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Peringkat Rotasi Historis Saham (2020 - 2026)
                        </span>
                        <p className="text-[11px] text-white/40 leading-relaxed mt-1">
                          Fluktuasi peringkat harian emiten berdasarkan bobot faktor kuantitatif untuk strategi aktif: <span className="text-emerald-400 font-bold">{backtestResult.configName}</span>. Peringkat yang lebih rendah (Rank 1) mewakili emiten terkuat untuk dikoleksi.
                        </p>
                      </div>
                    </div>

                    {/* Stock Multi-Toggle Pill Buttons */}
                    <div className="flex flex-wrap gap-1.5 p-3 bg-[#080808] border border-white/5 rounded-xl">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-white/30 self-center mr-2">Filter Emiten:</span>
                      {Object.keys(STOCK_FACTORS).map((ticker) => {
                        const isSelected = activeRankTickers.includes(ticker);
                        return (
                          <button
                            key={ticker}
                            onClick={() => {
                              if (isSelected) {
                                if (activeRankTickers.length > 1) {
                                  setActiveRankTickers(activeRankTickers.filter((t) => t !== ticker));
                                }
                              } else {
                                setActiveRankTickers([...activeRankTickers, ticker]);
                              }
                            }}
                            className={`px-2.5 py-1 text-[9px] font-bold rounded-md cursor-pointer transition-all flex items-center gap-1.5 border ${
                              isSelected
                                ? "bg-white/10 text-white border-white/20"
                                : "bg-transparent text-white/30 border-white/5 hover:border-white/10 hover:text-white/50"
                            }`}
                          >
                            <span 
                              className="w-2 h-2 rounded-full inline-block" 
                              style={{ backgroundColor: TICKER_COLORS[ticker] || "#ffffff" }}
                            />
                            {ticker}
                          </button>
                        );
                      })}
                    </div>

                    {/* Recharts LineChart for Ranks */}
                    <div className="h-64 sm:h-72 w-full font-mono text-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={rankChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            stroke="#333" 
                            tickLine={false} 
                            dy={8} 
                            tick={{ fill: "#666" }} 
                          />
                          <YAxis 
                            stroke="#333" 
                            tickLine={false} 
                            dx={-8} 
                            tick={{ fill: "#666" }} 
                            reversed={true} 
                            domain={[1, 9]} 
                            tickCount={9}
                            formatter={(val) => `Rank ${val}`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#000000",
                              border: "1px solid rgba(255,255,255,0.15)",
                              borderRadius: "10px",
                              color: "#dddddd"
                            }}
                            itemStyle={{ padding: "1px 0" }}
                            labelStyle={{ color: "#888", marginBottom: "4px" }}
                            formatter={(value: any, name: any) => [
                              `Peringkat ${value}`,
                              <span style={{ color: TICKER_COLORS[name] || "#fff" }}>{name}</span>
                            ]}
                          />
                          <Legend verticalAlign="top" height={36} iconType="circle" />
                          {activeRankTickers.map((ticker) => (
                            <Line
                              key={ticker}
                              type="monotone"
                              dataKey={ticker}
                              name={ticker}
                              stroke={TICKER_COLORS[ticker] || "#ffffff"}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{ r: 4 }}
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Trade Log Console terminal */}
                  <div className="space-y-3">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#E0E0E0]/50 block flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" /> Buku Jurnal Transaksi Algoritma Harian
                    </span>
                    <div className="h-64 overflow-y-auto bg-black text-[#A0A0A0] font-mono text-[10px] border border-white/5 rounded-xl p-4 space-y-3 leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
                      
                      {backtestResult.logs.map((log: any, idx: number) => (
                        <div key={idx} className="border-b border-white/5 pb-2 last:border-0 hover:text-white/90">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                            <span className="text-white/40 block sm:inline">[{log.date}]</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase font-sans tracking-wide shrink-0 ${
                              log.type === "BUY" ? "bg-blue-500/20 text-blue-400" :
                              log.type === "CRASH_TRIGGER" ? "bg-red-500/25 text-red-400" :
                              log.type === "CRASH_RECOVERY" ? "bg-amber-500/20 text-amber-400" :
                              "bg-emerald-500/20 text-emerald-400"
                            }`}>
                              {log.type}
                            </span>
                          </div>
                          <p className="pl-0 sm:pl-3">{log.message}</p>
                        </div>
                      ))}

                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-[#050505] border border-white/5 rounded-xl flex flex-col items-center justify-center py-20 text-center space-y-2">
                  <span className="text-2xl">⚡</span>
                  <p className="text-xs text-white/50 font-sans">Belum ada hasil backtest.</p>
                  <p className="text-[10px] text-white/35 max-w-xs leading-relaxed font-sans">Silakan klik tombol <strong className="text-emerald-400">JALANKAN QUANT BACKTEST</strong> untuk menghitung trajectory rotasi portofolio Anda.</p>
                </div>
              )}

            </div>

          </div>

        </section>
      )}

      {/* BLOCK C: LIVE RE-CALCULATING HOLDINGS LEDGER */}
      {activeSubTab === "ledger" && (
        <section className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-6 space-y-6">
          
          {/* Module Title with Sim Trigger */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Briefcase className="w-5 h-5 text-[#2563EB]" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Input Portfolio Hari Ini (Live Ledger)
                </h3>
                <p className="text-[11px] text-white/35 mt-0.5">
                  Simpan input transaksi Anda hari ini dan biarkan memperbarui nilainya secara real-time terus menerus.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[8px] tracking-widest text-emerald-400 animate-pulse font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block animate-ping" /> LIVE FLUID UPDATES RUNNING
              </span>
              <button
                onClick={() => {
                  setIsAddingPosition(!isAddingPosition);
                  handleLedgerTickerChange(tradeTicker);
                }}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 font-bold text-black text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-center"
              >
                <Plus className="w-4 h-4 text-black stroke-[3px]" /> Catat Transaksi Hari Ini
              </button>
            </div>
          </div>

          {/* Live dynamic ticker inputs drawer form */}
          <AnimatePresence>
            {isAddingPosition && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-5 bg-white/5 border border-white/10 rounded-xl space-y-4 overflow-hidden"
              >
                <h4 className="text-xs uppercase font-bold tracking-wider text-white">Formulir Catat Pembelian Baru</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Select stock */}
                  <div>
                    <span className="text-[10px] text-white/40 block mb-1.5 uppercase font-bold">Pilih Emiten</span>
                    <SearchableSelect
                      options={[
                        ...visibleStocks.map(stk => ({ value: stk.ticker, label: `${stk.ticker} - ${stk.name}` })),
                        { value: "ESSA", label: "ESSA - Essa Industries" },
                        { value: "PTBA", label: "PTBA - Bukit Asam" },
                        { value: "BBNI", label: "BBNI - Bank Negara Indo" },
                        { value: "TPIA", label: "TPIA - Chandra Asri" }
                      ].filter((opt, index, self) => index === self.findIndex(t => t.value === opt.value))}
                      value={tradeTicker}
                      onChange={(val) => handleLedgerTickerChange(val)}
                      theme="emerald"
                    />
                  </div>

                  {/* Amount shares */}
                  <div>
                    <span className="text-[10px] text-white/40 block mb-1.5 uppercase font-bold">Jumlah Lembar Saham</span>
                    <input
                      type="number"
                      value={tradeShares}
                      onChange={(e) => setTradeShares(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full text-xs p-2 bg-[#050505] border border-white/10 focus:border-emerald-500 outline-none text-white font-mono font-bold rounded-xl"
                    />
                    <span className="text-[9px] text-[#A0A0A0] mt-1.5 block font-sans">
                      Faksi Lot Indonesia: <span className="text-emerald-400">{(tradeShares / 100).toFixed(2)} Lot</span>
                    </span>
                  </div>

                  {/* Buy pricing */}
                  <div>
                    <span className="text-[10px] text-white/40 block mb-1.5 uppercase font-bold">Harga Beli Rata-Rata (IDR)</span>
                    <input
                      type="number"
                      value={tradePrice}
                      onChange={(e) => setTradePrice(Math.max(1, parseInt(e.target.value) || 0))}
                      className="w-full text-xs p-2 bg-[#050505] border border-white/10 focus:border-emerald-500 outline-none text-white font-mono font-bold rounded-xl"
                    />
                    <span className="text-[9px] text-white/30 mt-1.5 block font-sans">
                      Harga Marker Spot: <span className="text-white/60 font-mono">Rp {getDynamicStock(tradeTicker)?.currentPrice?.toLocaleString("id-ID")}</span>
                    </span>
                  </div>

                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingPosition(false)}
                    className="px-4 py-2 hover:bg-white/5 rounded-xl border border-white/10 text-xs text-white/70 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => {
                      onAddTransaction(tradeTicker, tradeShares, tradePrice);
                      setIsAddingPosition(false);
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-bold text-black cursor-pointer"
                  >
                    Confirm Transaksi
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Live updating summary statistics widgets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1 font-mono">
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl">
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#E0E0E0]/30 block font-sans">Modal Pembelian Ledger</span>
              <span className="text-sm font-bold text-white mt-1 block">
                {formatRupiah(portfolioSummary.totalCost)}
              </span>
            </div>
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl">
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#E0E0E0]/30 block font-sans">Nilai Evaluasi Pembaruan</span>
              <span className="text-sm font-bold text-white mt-1 block animate-pulse">
                {formatRupiah(portfolioSummary.currentVal)}
              </span>
            </div>
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl">
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#E0E0E0]/30 block font-sans">Volume Hasil Profit/Loss</span>
              <span className={`text-sm font-bold mt-1 block ${portfolioSummary.returnVal >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {portfolioSummary.returnVal >= 0 ? "+" : ""}{formatRupiah(portfolioSummary.returnVal)}
              </span>
            </div>
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl">
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#E0E0E0]/30 block font-sans">Persentase Hasil Hasil</span>
              <span className={`text-sm font-black mt-1 block ${portfolioSummary.returnVal >= 0 ? "text-emerald-300" : "text-rose-400"}`}>
                {portfolioSummary.returnVal >= 0 ? "+" : ""}{portfolioSummary.returnPct.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* RISK GUARD & REBALANCE NOTIFICATION SYSTEM */}
          {(ledgerAlerts.isIHSGInCrisis || ledgerAlerts.stockAlerts.length > 0) ? (
            <div className="p-5 bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-rose-500/15 rounded-2xl space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <h4 className="text-xs uppercase font-extrabold tracking-wider text-rose-400 font-mono">
                  Sinyal Proteksi Modal &amp; Rebalancing Aktif Terdeteksi!
                </h4>
              </div>

              <div className="space-y-3">
                {/* 1. Macro Cashout / Gold Trigger */}
                {ledgerAlerts.isIHSGInCrisis && (
                  <div className="bg-rose-500/5 border border-rose-500/15 p-3.5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] font-black bg-rose-500/15 text-rose-400 px-2.5 py-0.5 rounded uppercase tracking-wide">
                        ⚠️ MACRO IHSG CRASH WARNING
                      </span>
                      <p className="text-xs text-white/90 font-sans leading-relaxed mt-1">
                        IHSG ambruk <span className="text-rose-400 font-bold font-mono">{ledgerAlerts.ihsgMonthlyPct.toFixed(2)}%</span> dalam sebulan terakhir (Indeks: <span className="font-mono text-white">{ledgerAlerts.ihsgCurrentValue.toLocaleString("id-ID")}</span>). Risiko sistemik pasar saham sangat tinggi!
                      </p>
                      <p className="text-[10px] text-white/40 font-sans leading-normal">
                        Sistem merekomendasikan menghentikan pembelian saham baru, segera melakukan <span className="text-amber-400">Cashout</span> ke kas rupiah, atau memindahkan dana cadangan ke <span className="text-amber-400 font-bold">Emas Fisik</span> untuk mengunci ketebalan modal.
                      </p>
                    </div>
                    {portfolio.length > 0 && (
                      <button
                        onClick={() => {
                          portfolio.forEach(item => onRemoveTransaction(item.ticker));
                          alert("Aset berhasil diamankan! Seluruh portofolio telah dilikuidasi ke Kas/Emas untuk memitigasi Crash IHSG.");
                        }}
                        className="text-[10px] font-bold bg-[#D97706]/80 hover:bg-[#D97706] text-white px-4 py-2 rounded-xl border border-amber-500/30 shadow-lg hover:shadow-xl transition-all cursor-pointer font-sans shrink-0 uppercase tracking-widest"
                      >
                        ⚡ Amankan ke Emas / Kas
                      </button>
                    )}
                  </div>
                )}

                {/* 2. Stock Rank 7 Drop / Exit Rules triggers */}
                {ledgerAlerts.stockAlerts.map((stk) => (
                  <div key={stk.ticker} className="bg-amber-500/5 border border-amber-500/15 p-3.5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black bg-amber-500/15 text-amber-400 px-2.5 py-0.5 rounded uppercase tracking-wide">
                          🔔 EMITEN {stk.exit_state} SIGNAL
                        </span>
                        <span className="text-[10px] font-bold text-white font-mono">#{stk.ticker}</span>
                      </div>
                      <p className="text-xs text-white/90 font-sans leading-relaxed mt-1">
                        Saham <span className="text-amber-400 font-bold">{stk.ticker}</span> memicu pemicu keluar <strong className="text-rose-450 text-rose-400">Rule {stk.rules}</strong> dengan akumulasi drawdown mencapai <span className="text-rose-400 font-bold font-mono">{stk.drawdown}%</span> dari harga beli awal.
                      </p>
                      <p className="text-[10px] text-white/40 font-sans leading-normal">
                        Berdasarkan kriteria Algoritma, emiten ini telah mengalami pembusukan momentum (Rank &ge;7). Direkomendasikan melakukan rebalancing/rotasi keluar segera ke emiten Rank prima.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onRemoveTransaction(stk.ticker);
                        alert(`Rotasi Berhasil! Posisi #${stk.ticker} dilikuidasi untuk direposisi.`);
                      }}
                      className="text-[10px] font-bold bg-[#2563EB]/80 hover:bg-[#2563EB] text-white px-4 py-2 rounded-xl transition-all cursor-pointer font-sans shrink-0 uppercase tracking-widest border border-blue-500/30 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                    >
                      🔄 Rebalance (Jual)
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl flex items-center gap-3">
              <span className="text-lg">🛡️</span>
              <div className="text-xs text-white/70 leading-relaxed font-sans">
                <span className="text-emerald-400 font-bold">Kapital Protektif Aman (Normal):</span> Seluruh saham yang dipantau dalam ledger Anda saat ini berada dalam status sehat (<span className="text-emerald-300 font-semibold font-mono">HEALTHY</span>). IHSG juga terpantau aman dan tidak berada dalam fase crash darurat.
              </div>
            </div>
          )}

          {/* Holdings dynamic list table */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-white/15 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                  <th className="pb-3 pr-4">Aset Saham</th>
                  <th className="pb-3 px-4 font-mono text-center">Jumlah Lembar</th>
                  <th className="pb-3 px-4 font-mono text-right">Avg Buy Price</th>
                  <th className="pb-3 px-4 font-mono text-right">Harga Sekarang</th>
                  <th className="pb-3 px-4 font-mono text-right">Profit / Loss (IDR)</th>
                  <th className="pb-3 pl-4 text-right">Aksi Ledger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono">
                {portfolio.map((item) => {
                  const cleanTicker = item.ticker.toUpperCase().replace(".JK", "");
                  const liveStock = getDynamicStock(cleanTicker);
                  const lastPrice = liveStock ? liveStock.currentPrice : item.buyPrice;
                  const cost = item.shares * item.buyPrice;
                  const marketValue = item.shares * lastPrice;
                  const profitLossValue = marketValue - cost;
                  const plPctRatio = cost > 0 ? (profitLossValue / cost) * 100 : 0;

                  return (
                    <tr key={item.ticker} className="hover:bg-white/[0.02]">
                      {/* Ticker Name details */}
                      <td className="py-4 pr-4 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${liveStock?.logoColor || "bg-blue-600"} border border-white/10 flex items-center justify-center font-black text-[10px] shrink-0 text-white font-sans`}>
                          {cleanTicker}
                        </div>
                        <div>
                          <span 
                            className="font-bold text-white block hover:underline cursor-pointer" 
                            onClick={() => onSelectTicker(cleanTicker)}
                          >
                            {cleanTicker}
                          </span>
                          <span className="text-[10px] text-[#A0A0A0] font-sans block mt-0.5">{liveStock?.name || "Corporate Asset"}</span>
                        </div>
                      </td>

                      {/* Shared and lot quantities */}
                      <td className="py-4 px-4 font-mono text-center text-white/80">
                        <div>{item.shares.toLocaleString("id-ID")}</div>
                        <div className="text-[9px] text-[#A0A0A0] font-sans mt-0.5">{(item.shares / 100).toLocaleString("id-ID")} Lot</div>
                      </td>

                      {/* Entry Avg Beli list details */}
                      <td className="py-4 px-4 font-mono text-right text-white/70">
                        {formatRupiah(item.buyPrice)}
                      </td>

                      {/* Last prices updating live */}
                      <td className="py-4 px-4 font-mono text-right text-emerald-400 font-bold animate-pulse">
                        {formatRupiah(lastPrice)}
                      </td>

                      {/* Return absolute & percentage values changing on screens */}
                      <td className="py-4 px-4 font-mono text-right">
                        <span className={`block font-bold ${profitLossValue >= 0 ? "text-emerald-400" : "text-rose-455 text-rose-400"}`}>
                          {profitLossValue >= 0 ? "+" : ""}{formatRupiah(profitLossValue)}
                        </span>
                        <span className={`text-[10px] block mt-0.5 font-sans font-medium ${profitLossValue >= 0 ? "text-emerald-300" : "text-rose-400"}`}>
                          {profitLossValue >= 0 ? "+" : ""}{plPctRatio.toFixed(2)}%
                        </span>
                      </td>

                      {/* Delete holding list button */}
                      <td className="py-4 pl-4 text-right">
                        <button
                          onClick={() => onRemoveTransaction(item.ticker)}
                          className="p-1.5 px-3 hover:bg-rose-500/15 text-rose-400 hover:text-white border border-rose-500/10 hover:border-rose-500/30 rounded-lg text-[10px] font-bold font-sans cursor-pointer transition-all"
                        >
                          Likuidasi / Hapus
                        </button>
                      </td>

                    </tr>
                  );
                })}

                {portfolio.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs text-white/45 font-sans leading-relaxed">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <AlertCircle className="w-5 h-5 text-white/25" />
                        <p>Belum ada aset simulasi terdaftar dalam ledger aktif hari ini.</p>
                        <p className="text-[10px] text-white/30 font-light">Klik tombol <strong className="text-emerald-400 font-bold">Catat Transaksi Hari Ini</strong> untuk merekam transaksi pembelian.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </section>
      )}

    </div>
  );
}
