import { useState, useMemo, useEffect, useRef } from "react";
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { 
  TrendingUp, 
  TrendingDown,
  Award, 
  Briefcase, 
  Plus, 
  Coins, 
  Calendar, 
  ChevronRight, 
  Clock, 
  Trash, 
  ArrowUpRight, 
  Percent, 
  FileSpreadsheet,
  AlertCircle,
  AlertTriangle,
  Download,
  ShieldAlert,
  Wallet
} from "lucide-react";
import { PortfolioItem, StockData } from "../types";
import { STOCKS_DATA } from "../stocksData";
import { IDX80_TICKERS, IDX30_TICKERS, LQ45_TICKERS } from "../constants/idx80";
import { runStrategy } from "../engine";
import { validateBacktestData, validateBacktestResult, type ValidationResult, type ResultValidation } from "../engine/backtestValidation";
import { runBaselineDca, type BaselineResult, type DcaBaseline } from "../engine/dcaBaselines";
import { SearchableSelect } from "./SearchableSelect";
import { RS, MKT } from "../marketData";
import { api } from "../services/api";
import { useEngineConfig } from "../contexts/EngineConfigContext";
import { toast } from "sonner";
import { ConfirmModal } from "./ConfirmModal";
import Card from "./Card";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface SimulationTabProps {
  portfolio: PortfolioItem[];
  onAddTransaction: (ticker: string, shares: number, buyPrice: number) => void;
  onRemoveTransaction: (ticker: string) => void;
  onSellTransaction?: (ticker: string, sharesToSell: number) => void;
  onSelectTicker: (ticker: string) => void;
  getDynamicStock: (ticker: string) => StockData | undefined;
  theme?: "dark" | "light";
  defaultSubTab?: "past" | "algo" | "ledger";
  hideTabs?: boolean;
}

const formatRupiah = (val: number) => {
  return "Rp " + Math.round(val).toLocaleString("id-ID");
};

interface BacktestLog {
  date: string;
  type: "BUY" | "SELL" | "REBALANCE" | "CRASH_TRIGGER" | "RECOVERY" | "RE_ENTRY";
  message: string;
}

interface BacktestDayData {
  date: string;
  ihsgPrice: number;
  goldPrice: number;
  stockPrices: Record<string, number>;
  stockVolumes?: Record<string, number>;
  stockRanks: Record<string, number>;
  stockRanksProd?: Record<string, number>;
  stockRanksRes?: Record<string, number>;
  stockAdjPrices?: Record<string, number>;
  stockNormScores?: Record<string, {
    quality: number;
    growth: number;
    value: number;
    momentum: number;
  }>;
}

const TICKER_COLORS: Record<string, string> = {
  BBCA: "#3b82f6", // Royal Blue
  BBRI: "#00c9a5",
  BMRI: "#6366f1", // Indigo
  TLKM: "#f43f5e", // Rose Red
  ASII: "#94a3b8", // Slate Gray
  ADRO: "#eab308", // Amber/Gold
  PTBA: "#10b981", // Emerald
  ESSA: "#a855f7", // Purple
  GOTO: "#22c55e", // Lime Green
  BBNI: "#06b6d4", // Cyan
  INDF: "#f97316", // Orange
  INTP: "#8b5cf6", // Violet
  ICBP: "#ec4899", // Pink
  KLBF: "#14b8a6", // Teal
  UNTR: "#e11d48", // Dark Rose
  AKRA: "#0ea5e9", // Sky Blue
  PGAS: "#84cc16", // Lime
  SMGR: "#78716c", // Stone
};

// NOTE: warehouseData (src/data/fundamental_idx_all.json, ~42MB) and 
// fundamentalSnapshots are no longer imported here. Dividend data now
// flows through the engine via setDividendCache() if needed.
// Dead code (WHRecord, getPointInTimeFundamentals, getLatestWarehousePeriod,
// calcStdDev) removed — backtest now uses runStrategy() from src/engine/.

function generateClientBacktestData(): BacktestDayData[] {
  const tickers = STOCKS_DATA.map(s => s.ticker).filter(Boolean);
  const startDate = new Date("2021-01-04");
  const endDate = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const data: BacktestDayData[] = [];

  let seed = 42;
  const nextRandom = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const basePrices: Record<string, number> = {};
  const qualityFactors: Record<string, number> = {};
  const growthFactors: Record<string, number> = {};
  const valueFactors: Record<string, number> = {};
  const momentum: Record<string, number> = {};
  const stockFactors: Record<string, { quality: number; growth: number; value: number; momentum: number }> = {};

  tickers.forEach(t => {
    qualityFactors[t] = 0.3 + nextRandom() * 0.6;
    growthFactors[t] = 0.2 + nextRandom() * 0.7;
    valueFactors[t] = 0.1 + nextRandom() * 0.8;
    basePrices[t] = 500 + qualityFactors[t] * 9500;
    momentum[t] = 0;
    stockFactors[t] = { quality: qualityFactors[t], growth: growthFactors[t], value: valueFactors[t], momentum: 0.5 + nextRandom() * 0.4 };
  });

  let ihsg = 500 + nextRandom() * 500;
  let gold = 60000 + nextRandom() * 40000;

  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const stockPrices: Record<string, number> = {};
      const stockRanks: Record<string, number> = {};
      const stockNormScores: Record<string, { quality: number; growth: number; value: number; momentum: number }> = {};

      tickers.forEach(t => {
        const dailyShock = (nextRandom() - 0.5) * 0.035;
        momentum[t] = momentum[t] * 0.8 + dailyShock * 0.2;
        const drift = (qualityFactors[t] - 0.45) * 0.003;
        basePrices[t] = Math.max(10, basePrices[t] * (1 + drift + momentum[t]));
        stockPrices[t] = Math.round(basePrices[t] * 100) / 100;
        const normMomentum = Math.max(0, Math.min(1, (momentum[t] + 0.03) / 0.06));
        stockFactors[t] = {
          quality: qualityFactors[t],
          growth: growthFactors[t] * (1 + dailyShock),
          value: valueFactors[t] * (1 - dailyShock * 0.5),
          momentum: normMomentum,
        };
        stockNormScores[t] = stockFactors[t];
      });

      const scores = tickers.map(t => ({
        ticker: t,
        score: qualityFactors[t] * 0.7 + momentum[t] * 0.3 + nextRandom() * 0.05,
      }));
      scores.sort((a, b) => b.score - a.score);
      scores.forEach((s, i) => { stockRanks[s.ticker] = i + 1; });

      ihsg = Math.max(200, ihsg * (1 + (nextRandom() - 0.48) * 0.014));
      gold = Math.max(50000, gold * (1 + (nextRandom() - 0.49) * 0.054));

      data.push({
        date: dateStr,
        ihsgPrice: Math.round(ihsg * 100) / 100,
        goldPrice: Math.round(gold),
        stockPrices,
        stockRanks,
        stockNormScores,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return data;
}

export function SimulationTab({
  portfolio,
  onAddTransaction,
  onRemoveTransaction,
  onSellTransaction,
  onSelectTicker,
  getDynamicStock,
  theme,
  defaultSubTab = "algo",
  hideTabs = false
}: SimulationTabProps) {
  const visibleStocks = STOCKS_DATA.map(s => getDynamicStock(s.ticker) || s);
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [scoreLookup, setScoreLookup] = useState<{ dates: string[]; byDate: Record<string, any> } | null>(null);

  const isMarketClosedDate = (dateStr: string) => {
    if (!dateStr) return null;
    const day = new Date(dateStr).getDay();
    if (day === 0 || day === 6) return "weekend";
    const exists = historicalData.some(d => d.date === dateStr);
    if (!exists) {
      if (dateStr >= "2021-01-04" && dateStr <= todayWIBStr) {
        return "holiday";
      }
    }
    return null;
  };
  const { engineConfig, todayWIBStr, backtestResult, isBacktesting, triggerRun, setBacktesting, setBacktestResult, backtestConfig, updateBacktestValue, backtestUseLiveStrategy, isDraftEqualToEngine, promoteDraftToEngine } = useEngineConfig();
  const STRATEGY_MERGE_KEYS: Array<keyof typeof engineConfig> = [
    "activeProfileId", "universe", "topNCount", "simulationMode",
    "safeHavenAsset", "crashSensitivity", "enableCrashProtection",
    "customUniverse", "enableAdaptiveWeights", "reserveBufferPct",
    "singleSellTrigger", "singleBuyTrigger", "crossoverMode",
  ];
  const effectiveConfig = useMemo(() => {
    if (!backtestUseLiveStrategy) return backtestConfig;
    const merged = { ...backtestConfig };
    for (const k of STRATEGY_MERGE_KEYS) {
      (merged as any)[k] = (engineConfig as any)[k];
    }
    return merged;
  }, [backtestConfig, engineConfig, backtestUseLiveStrategy]);
  const backtestActiveProfile = useMemo(() => engineConfig.profiles.find(p => p.id === effectiveConfig.activeProfileId) || engineConfig.profiles[0], [engineConfig.profiles, effectiveConfig.activeProfileId]);

  // A2 fix: re-fetch historical data when the active profile changes so the
  // engine runs against the right stockRanksProd/Res dataset. Previously this
  // was hardcoded to configType=prod, which silently fed QM ranks into BG
  // backtests and vice versa.
  // Sesi 13 fix: tambah dependency simStartDate/simEndDate agar data re-fetch
  // saat user ubah date range (sebelumnya data tidak reload saat ganti range)
  useEffect(() => {
    const configType = backtestConfig.activeProfileId === "agresif" || backtestConfig.activeProfileId === "growth-heavy" ? "agresif" : backtestConfig.activeProfileId === "dividen" ? "dividen" : "aman";
    api.get<{ success: boolean; data: any[]; scoreLookup?: { dates: string[]; byDate: Record<string, any> } }>(`/api/backtest-data?configType=${configType}&from=${backtestConfig.simStartDate}&to=${backtestConfig.simEndDate}`)
      .then(res => { 
        if (res.success && Array.isArray(res.data)) {
          setHistoricalData(res.data);
          setScoreLookup(res.scoreLookup || null);
        } else {
          console.warn('[Backtest] API returned invalid data, falling back to synthetic');
          setHistoricalData(generateClientBacktestData());
          setScoreLookup(null);
        }
      })
      .catch((err) => {
        console.warn('[Backtest] API fetch failed, using synthetic data:', err);
        setHistoricalData(generateClientBacktestData());
        setScoreLookup(null);
      });
  }, [backtestConfig.activeProfileId, backtestConfig.simStartDate, backtestConfig.simEndDate]);

  // Today ledger addition state
  const [tradeTicker, setTradeTicker] = useState("BBCA");
  const [tradeShares, setTradeShares] = useState(100);
  const [tradePrice, setTradePrice] = useState(10100);
  const [isAddingPosition, setIsAddingPosition] = useState(false);
  const [sellLotsState, setSellLotsState] = useState<Record<string, number | "">>({});

  // Sub tab navigation state
  const [activeSubTab, setActiveSubTab] = useState<"past" | "algo" | "ledger">(defaultSubTab);

  useEffect(() => {
    setActiveSubTab(defaultSubTab);
  }, [defaultSubTab]);

  const [backtestProgress, setBacktestProgress] = useState(0);
  const [activeRankTickers, setActiveRankTickers] = useState<string[]>(["BBCA", "BMRI", "ADRO", "GOTO", "TLKM"]);
  const [baselineResults, setBaselineResults] = useState<BaselineResult[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [resultValidation, setResultValidation] = useState<ResultValidation | null>(null);
  const [journalFilter, setJournalFilter] = useState<string>("all");

  // D7 — track last-run config so we can show "Config changed" banner
  const lastRunConfigRef = useRef<string>("");
  const configFingerprint = useMemo(() => JSON.stringify({
    profile: effectiveConfig.activeProfileId,
    mode: effectiveConfig.simulationMode,
    universe: effectiveConfig.universe,
    topN: effectiveConfig.topNCount,
    capital: effectiveConfig.algoCapital,
    start: effectiveConfig.simStartDate,
    end: effectiveConfig.simEndDate,
    crash: effectiveConfig.crashSensitivity,
    trigger: effectiveConfig.singleSellTrigger,
    buffer: effectiveConfig.reserveBufferPct,
    custom: effectiveConfig.customUniverse,
  }), [effectiveConfig]);
  const configChanged =
    lastRunConfigRef.current !== "" &&
    lastRunConfigRef.current !== configFingerprint;

  const rankChartData = useMemo(() => {
    if (!backtestResult || !backtestResult.chartData) return [];
    return backtestResult.chartData.map((item: any) => {
      const flatItem: any = {
        date: item.date,
      };
      if (item.ranks) {
        Object.entries(item.ranks || {}).forEach(([ticker, r]) => {
          flatItem[ticker] = r;
        });
      }
      return flatItem;
    });
  }, [backtestResult]);

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
    const parsed = parseInt(backtestConfig.algoCapital.replace(/[^0-9]/g, "")) || 0;
    return parsed > 0 ? parsed : 10000000;
  }, [backtestConfig.algoCapital]);

  const activeStock = useMemo(() => getDynamicStock(backtestConfig.singleTicker) || getDynamicStock("BBCA"), [backtestConfig.singleTicker, getDynamicStock]);

  const simPrices = useMemo(() => {
    if (historicalData.length === 0) {
      return { startPrice: 0, endPrice: 0, years: 0 };
    }
    const cleanTicker = backtestConfig.singleTicker.toUpperCase().replace(".JK", "");
    
    let startIndex = historicalData.findIndex(d => d.date >= backtestConfig.simStartDate);
    if (startIndex === -1) startIndex = 0;
    
    let endIndex = historicalData.findIndex(d => d.date >= backtestConfig.simEndDate);
    if (endIndex === -1) endIndex = historicalData.length - 1;
    if (historicalData[endIndex] && historicalData[endIndex].date > backtestConfig.simEndDate && endIndex > 0) endIndex--;

    const startRaw = historicalData[startIndex] as any;
    const endRaw = historicalData[endIndex] as any;
    
    const sPrice = startRaw?.stockAdjPrices?.[cleanTicker] || startRaw?.stockPrices?.[cleanTicker] || 100;
    const ePrice = endRaw?.stockAdjPrices?.[cleanTicker] || endRaw?.stockPrices?.[cleanTicker] || activeStock.currentPrice;
    
    return {
      startPrice: Math.max(50, Math.round(sPrice)),
      endPrice: Math.round(ePrice),
      years: Math.max(0.1, (Date.parse(endRaw?.date) - Date.parse(startRaw?.date)) / (1000*60*60*24*365.25))
    };
  }, [historicalData, backtestConfig.singleTicker, backtestConfig.simStartDate, backtestConfig.simEndDate, activeStock.currentPrice]);
  
  const startPrice = simPrices.startPrice;

  // Backtest details calculations
  const simReturnDetails = useMemo(() => {
    const totalShares = Math.floor(simCapital / startPrice);
    const totalLots = Math.floor(totalShares / 100);
    const realSharesPurchased = totalLots * 100;
    const actualCost = realSharesPurchased * startPrice;
    const cashResidual = simCapital - actualCost;

    // Simulated dividends accumulated (proportional to years held)
    const annualDividendRate = activeStock.dividendYield || 0;
    const divTaxFactor = 0.90; // 10% dividend tax in Indonesia
    const totalDividends = Math.round(
      realSharesPurchased * (annualDividendRate / 100) * simPrices.years * startPrice * divTaxFactor
    );

    const assetValueNow = realSharesPurchased * simPrices.endPrice;
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
  }, [simCapital, startPrice, simPrices.endPrice, activeStock.dividendYield, simPrices.years]);

  // Interpolate charting points trace for simulation
  const simulatorChartData = useMemo(() => {
    const steps = 6;
    const data = [];
    const ticker = backtestConfig.singleTicker;
    const finalPrice = simPrices.endPrice;

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const variance = 1 + (Math.sin(progress * Math.PI) * 0.10 * (1 - progress));
      const midPrice = startPrice + (finalPrice - startPrice) * progress;
      const stepPrice = Math.max(10, Math.round(midPrice * variance));

      const { realSharesPurchased, cashResidual } = simReturnDetails;
      const stepAssetVal = realSharesPurchased * stepPrice;
      
      const stepDividends = Math.round(simReturnDetails.totalDividends * progress);

      const totalStepVal = stepAssetVal + cashResidual + stepDividends;

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
  }, [backtestConfig.singleTicker, startPrice, activeStock.currentPrice, simCapital, simReturnDetails]);

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

  const handleRunAlgoBacktest = async () => {
    setBacktesting(true);
    setBacktestProgress(10);
    setValidationResult(null);
    setResultValidation(null);

    try {
      const configType = backtestConfig.activeProfileId === "agresif" || backtestConfig.activeProfileId === "growth-heavy" ? "agresif" : backtestConfig.activeProfileId === "dividen" ? "dividen" : "aman";

      setBacktestProgress(25);

      let freshData: any[];
      let freshScoreLookup: { dates: string[]; byDate: Record<string, any> } | null = null;

      try {
        const res = await api.get<{ success: boolean; data: any[]; scoreLookup?: { dates: string[]; byDate: Record<string, any> } }>(
          `/api/backtest-data?configType=${configType}&from=${backtestConfig.simStartDate}&to=${backtestConfig.simEndDate}`
        );
        if (res.success && Array.isArray(res.data)) {
          freshData = res.data;
          freshScoreLookup = res.scoreLookup || null;
        } else {
          freshData = generateClientBacktestData();
          freshScoreLookup = null;
        }
      } catch {
        freshData = generateClientBacktestData();
        freshScoreLookup = null;
      }

      setHistoricalData(freshData);
      setScoreLookup(freshScoreLookup);
      setBacktestProgress(45);

      const topN = parseInt(String(backtestConfig.topNCount)) || 4;
      const validation = validateBacktestData(freshData, backtestConfig.simStartDate, backtestConfig.simEndDate, topN);
      setValidationResult(validation);

      if (validation.status === "invalid") {
        setBacktesting(false);
        setBacktestProgress(0);
        toast.error("Data tidak valid. " + validation.errors[0]);
        return;
      }

      const cap = parseInt(effectiveConfig.algoCapital.replace(/[^0-9]/g, "")) || 100000000;

      await new Promise(r => setTimeout(r, 0));

      const result = runStrategy({
        dayData: freshData,
        config: {
          capital: cap,
          reserveBufferPct: effectiveConfig.reserveBufferPct,
          topNCount: effectiveConfig.topNCount,
          universe: effectiveConfig.universe,
          simulationMode: effectiveConfig.simulationMode,
          singleTicker: effectiveConfig.singleTicker,
          enableCrashProtection: effectiveConfig.enableCrashProtection,
          crashSensitivity: effectiveConfig.crashSensitivity,
          singleSellTrigger: effectiveConfig.singleSellTrigger,
          singleBuyTrigger: effectiveConfig.singleBuyTrigger,
          safeHavenAsset: effectiveConfig.safeHavenAsset,
          crossoverMode: effectiveConfig.crossoverMode,
          simStartDate: effectiveConfig.simStartDate,
          simEndDate: effectiveConfig.simEndDate,
          customUniverse: effectiveConfig.customUniverse || [],
          activeProfileId: effectiveConfig.activeProfileId,
          enableAdaptiveWeights: effectiveConfig.enableAdaptiveWeights,
        },
        profileWeights: {
          quality: backtestActiveProfile?.qualityWeight ?? 0.20,
          growth: backtestActiveProfile?.growthWeight ?? 0.20,
          value: backtestActiveProfile?.valueWeight ?? 0.20,
          momentum: backtestActiveProfile?.momentumWeight ?? 0.20,
          dividend: backtestActiveProfile?.dividendWeight ?? 0.20,
        },
        universeTickers: {
          idx80: IDX80_TICKERS,
          idx30: IDX30_TICKERS,
          lq45: LQ45_TICKERS,
        },
        scoreLookup: freshScoreLookup || undefined,
      });

      setBacktestProgress(85);

      setBacktestResult(result);

      const rv = validateBacktestResult(result, cap);
      setResultValidation(rv);

      if (rv.status === "invalid") {
        toast.error("Hasil backtest tidak valid: " + rv.errors[0]);
      }

      // Adaptive DCA: also run 3 baseline simulations for comparison
      if (backtestConfig.simulationMode === "adaptive_dca") {
        const baselineInputs = {
          dayData: freshData,
          config: {
            capital: cap,
            reserveBufferPct: backtestConfig.reserveBufferPct,
            topNCount: backtestConfig.topNCount,
            universe: backtestConfig.universe,
            safeHavenAsset: backtestConfig.safeHavenAsset,
            enableCrashProtection: false,
            crashSensitivity: backtestConfig.crashSensitivity,
            simStartDate: backtestConfig.simStartDate,
            simEndDate: backtestConfig.simEndDate,
            customUniverse: [],
            enableAdaptiveWeights: false,
          },
          profileWeights: {
            quality: backtestActiveProfile?.qualityWeight ?? 0.20,
            growth: backtestActiveProfile?.growthWeight ?? 0.20,
            value: backtestActiveProfile?.valueWeight ?? 0.20,
            momentum: backtestActiveProfile?.momentumWeight ?? 0.20,
            dividend: backtestActiveProfile?.dividendWeight ?? 0.20,
          },
          universeTickers: {
            idx80: IDX80_TICKERS,
            idx30: IDX30_TICKERS,
            lq45: LQ45_TICKERS,
          },
          scoreLookup: freshScoreLookup || undefined,
        };
        const baselines: BaselineResult[] = [];
        for (const baseline of ["lump_sum", "monthly_dca", "quarterly_dca"] as DcaBaseline[]) {
          try {
            baselines.push(runBaselineDca({ ...baselineInputs, baseline }));
          } catch (e) {
            console.warn(`Baseline ${baseline} failed:`, e);
          }
        }
        setBaselineResults(baselines);
      } else {
        setBaselineResults([]);
      }

      setBacktesting(false);
      setBacktestProgress(100);
      lastRunConfigRef.current = configFingerprint;
      toast.success("Backtest selesai — data fresh dari D1.");
    } catch (err: any) {
      console.error("Backtest failed:", err);
      alert(err.message || "Backtest gagal. Periksa tanggal mulai.");
      setBacktesting(false);
      setBacktestProgress(0);
    }
  };

  // Backtest hanya auto-run sekali saat data pertama kali dimuat (initial load).
  // Setelah itu, user harus klik "Jalankan Backtest" secara eksplisit.
  // Handler sudah fetch fresh data dari D1 setiap kali dijalankan.
  const initialRunRef = useRef(false);
  useEffect(() => {
    if (historicalData.length === 0 || initialRunRef.current) return;
    initialRunRef.current = true;
    handleRunAlgoBacktest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historicalData.length]);

  useEffect(() => {
    const handler = () => {
      if (backtestConfig.simulationMode === "algo" && backtestResult) {
        handleDownloadJournal();
      } else {
        handleDownloadCSV();
      }
    };
    window.addEventListener("download-csv-backtest", handler);
    return () => window.removeEventListener("download-csv-backtest", handler);
  }, [backtestConfig.simulationMode, backtestResult]);

  const handleDownloadCSV = async () => {
    try {
      const rawData = historicalData;
      const stockKeys = ["BBCA", "BBRI", "BMRI", "TLKM", "ASII", "ADRO", "PTBA", "ESSA", "GOTO"];
      const header = ["Tanggal", "Harga_IHSG", "Harga_Emas_Per_Gram", ...stockKeys].join(",");
      const rows = rawData.map((day: any) => {
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
      link.setAttribute("download", `database_backtest_${backtestConfig.simStartDate}_${backtestConfig.simEndDate}_${backtestConfig.activeProfileId.toUpperCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Gagal mengekspor CSV:", err);
    }
  };

  const handleDownloadJournal = () => {
    if (!backtestResult || !backtestResult.logs) return;

    try {
      const header = ["No", "Tanggal", "Tipe", "Keterangan"].join(",");
      const rows = backtestResult.logs.map((log: any, idx: number) => {
        const sanitizedMsg = (log.message || "").replace(/"/g, '""');
        return `${idx + 1},"${log.date}","${log.type}","${sanitizedMsg}"`;
      });

      const csvString = [header, ...rows].join("\n");
      const blob = new Blob([`\uFEFF${csvString}`], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `buku_jurnal_simulasi_${backtestConfig.activeProfileId.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Gagal mendownload buku jurnal:", err);
    }
  };

  const [showDraftModal, setShowDraftModal] = useState(false);
  const draftEqualNow = isDraftEqualToEngine();

  // Sesi 12: listen for sidebar toggle OFF→ON request when draft unsynced
  useEffect(() => {
    const handler = () => setShowDraftModal(true);
    window.addEventListener("backtest:draft-unsynced-toggle", handler);
    return () => window.removeEventListener("backtest:draft-unsynced-toggle", handler);
  }, []);

  return (
    <div className="space-y-6">
      {/* Sesi 12 — Draft unsynced modal (Buang / Promote / Batal) */}
      <ConfirmModal
        open={showDraftModal}
        title="Draft Belum di-Sync"
        message={
          <>
            Anda punya perubahan draft yang berbeda dari Portofolio.
            Mau diapain?
            <div className="mt-2 text-label font-mono text-white/40 italic">
              (lihat perbedaan detail di sidebar Backtest)
            </div>
          </>
        }
        confirmLabel="Promote Dulu"
        cancelLabel="Batal"
        variant="info"
        onConfirm={() => {
          promoteDraftToEngine();
          setShowDraftModal(false);
          toast.success("Settings promoted. Backtest sekarang pakai strategi Portofolio yang baru.");
        }}
        onCancel={() => setShowDraftModal(false)}
      />

      {/* D7 — Config changed banner */}
      {configChanged && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-caption text-amber-200 font-sans leading-snug">
              <strong>Config berubah.</strong> Hasil di bawah belum di-update. Klik Jalankan untuk lihat hasil terbaru.
            </span>
          </div>
          <button
            onClick={() => handleRunAlgoBacktest()}
            disabled={isBacktesting || historicalData.length === 0}
            className="shrink-0 px-3 py-1.5 text-caption font-bold uppercase tracking-widest rounded-lg bg-amber-500 hover:bg-amber-400 text-black disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
          >
            {isBacktesting ? "Berjalan..." : "Jalankan"}
          </button>
        </div>
      )}

      {/* 1. Header Information Panel */}
      <Card variant="elevated" padding="lg" className="relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div>
          <h2 className="text-body font-bold text-white uppercase tracking-widest flex items-center gap-2 font-mono">
             <Award className="w-4 h-4 text-emerald-400" />
             Interactive Trading & Backtest Laboratory
          </h2>
          <p className="text-caption text-zinc-500 mt-2 max-w-2xl leading-relaxed">
            Bandingkan performa investasi harian sejak {backtestConfig.simStartDate} dengan algoritma rebalancing saham & perlindungan crash IHSG otomatis.
          </p>
        </div>
        
        {!hideTabs && (
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 self-start md:self-auto shrink-0 relative z-10 w-full md:w-auto">
            {/* D1 — Run button inside tab */}
            <button
              onClick={() => handleRunAlgoBacktest()}
              disabled={isBacktesting || historicalData.length === 0}
              className="px-4 py-2 text-caption font-bold uppercase tracking-widest rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center justify-center gap-1.5"
            >
              {isBacktesting ? `Berjalan ${backtestProgress}%` : "Jalankan Backtest"}
            </button>
            <div className="flex border-b border-white/[0.04] w-full md:w-auto md:min-w-[200px]">
            <button
              onClick={() => {
                setActiveSubTab("algo");
                if (!backtestResult) {
                  handleRunAlgoBacktest();
                }
              }}
              className={`flex-1 md:flex-none px-3 py-2 text-body font-medium tracking-wide transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSubTab === "algo"
                  ? "text-emerald-500 border-b-2 border-emerald-500"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" /> Strategi
            </button>
            <button
              onClick={() => setActiveSubTab("past")}
              className={`flex-1 md:flex-none px-3 py-2 text-body font-medium tracking-wide transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                activeSubTab === "past"
                  ? "text-emerald-500 border-b-2 border-emerald-500"
                  : "text-white/30 hover:text-white/60"
              }`}
            >
              <Coins className="w-3.5 h-3.5" /> Historis
            </button>
            </div>
          </div>
        )}
      </Card>

      {/* RENDER ACTIVE SUBTAB CONTENT */}
      {activeSubTab === "past" && (
        <Card variant="default" padding="lg" className="space-y-6">
          
          {/* Module Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Coins className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Stockbit-Style Past Investment Simulator</h3>
                <p className="text-body text-white/35 mt-0.5">Andaikata Anda melakukan pembelian saham IDX di masa lalu.</p>
              </div>
            </div>
            <span className="text-label font-mono font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-1 rounded">
              BACKTESTING ENGINE ACTIVE
            </span>
          </div>

          {/* Inputs row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* 1. Stock Selector */}
            <div>
              <label className="text-caption uppercase font-bold text-white/40 block mb-2 font-mono">1. Pilih Saham IDX</label>
              <SearchableSelect
                options={[
                  ...visibleStocks.map(stk => ({ value: stk.ticker, label: `${stk.ticker} - ${stk.name}` })),
                  { value: "ESSA", label: "ESSA - Essa Industries" },
                  { value: "PTBA", label: "PTBA - Bukit Asam" },
                  { value: "BBNI", label: "BBNI - Bank Negara Indo" },
                  { value: "TPIA", label: "TPIA - Chandra Asri" }
                ].filter((opt, index, self) => index === self.findIndex(t => t.value === opt.value))}
                value={backtestConfig.singleTicker}
                onChange={(val) => updateBacktestValue("singleTicker", val)}
                theme="amber"
              />
            </div>

            {/* 2. Timeline selector */}
            <div className="space-y-4">
              <label className="text-caption uppercase font-bold text-white/40 block font-mono">2. Rentang Tanggal Simulasi</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-label uppercase font-bold text-white/30 block mb-1 font-mono">Mulai Dari</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={backtestConfig.simStartDate}
                      min="2021-01-04"
                      max={backtestConfig.simEndDate}
                      onChange={(e) => updateBacktestValue("simStartDate", e.target.value)}
                      className="w-full text-xs p-3 bg-black border border-white/10 focus:border-amber-500 outline-none text-white font-bold rounded-xl font-mono cursor-pointer"
                    />
                    {(() => {
                      const status = isMarketClosedDate(backtestConfig.simStartDate);
                      if (status === "weekend") return <span className="text-label text-amber-400 mt-1 block font-sans">⚠️ Akhir Pekan (Bursa Tutup)</span>;
                      if (status === "holiday") return <span className="text-label text-amber-400 mt-1 block font-sans">⚠️ Hari Libur (Bursa Tutup)</span>;
                      return null;
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-label uppercase font-bold text-white/30 block mb-1 font-mono">Sampai Dengan</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={backtestConfig.simEndDate}
                      min={backtestConfig.simStartDate}
                      max={todayWIBStr}
                      onChange={(e) => updateBacktestValue("simEndDate", e.target.value)}
                      className="w-full text-xs p-3 bg-black border border-white/10 focus:border-amber-500 outline-none text-white font-bold rounded-xl font-mono cursor-pointer"
                    />
                    {(() => {
                      const status = isMarketClosedDate(backtestConfig.simEndDate);
                      if (status === "weekend") return <span className="text-label text-amber-400 mt-1 block font-sans">⚠️ Akhir Pekan (Bursa Tutup)</span>;
                      if (status === "holiday") return <span className="text-label text-amber-400 mt-1 block font-sans">⚠️ Hari Libur (Bursa Tutup)</span>;
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Capital amount */}
            <div>
              <label className="text-caption uppercase font-bold text-white/40 block mb-2 font-mono">3. Modal Pembelian (IDR)</label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={backtestConfig.algoCapital.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                  onChange={(e) => {
                    const numbers = e.target.value.replace(/[^0-9]/g, "");
                    updateBacktestValue("algoCapital", numbers);
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
                      onClick={() => updateBacktestValue("algoCapital", preset)}
                      className={`text-label px-2 py-1 font-bold font-sans rounded-md border transition-all cursor-pointer ${
                        backtestConfig.algoCapital === preset 
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
            
            <Card variant="inset" padding="sm" className="space-y-1">
              <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Harga Jual Masa Lalu</span>
              <span className="text-sm font-bold font-mono text-white block">{formatRupiah(startPrice)}</span>
              <span className="text-label text-[#A0A0A0] block">Per lembar pada {backtestConfig.simStartDate}</span>
            </Card>

            <Card variant="inset" padding="sm" className="space-y-1">
              <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Jumlah Kepemilikan</span>
              <span className="text-sm font-bold font-mono text-white block">
                {simReturnDetails.realSharesPurchased.toLocaleString("id-ID")} Lmbr
              </span>
              <span className="text-label text-green-400 font-semibold block">
                💡 {simReturnDetails.totalLots} Lot (Sisa Kas: {formatRupiah(simReturnDetails.cashResidual)})
              </span>
            </Card>

            <Card variant="inset" padding="sm" className="space-y-1">
              <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Dividen Akumulatif</span>
              <span className="text-sm font-bold font-mono text-[#EAB308] block">
                +{formatRupiah(simReturnDetails.totalDividends)}
              </span>
              <span className="text-label text-white/40 block">Hasil Dividen yield {activeStock.dividendYield}% (Nett)</span>
            </Card>

            <Card variant="signal" signal="warning" padding="sm" className="space-y-1">
              <span className="text-label uppercase font-bold tracking-widest text-amber-400 block">Total Nilai Sekarang</span>
              <span className="text-sm font-black font-mono text-amber-300 block">
                {formatRupiah(simReturnDetails.finalValue)}
              </span>
              <span className="text-label text-white/40 block">Terdiri dari Saham + Dividen + Sisa Kas</span>
            </Card>

          </div>

          {/* Profit ratio highlights banner */}
          <Card variant="default" padding="md" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <span className="text-caption uppercase font-bold text-white/30 block">Pemberitahuan Hasil Simulasi:</span>
              <div className="flex items-center gap-2">
                <span className={`text-base font-black font-mono ${simReturnDetails.absoluteProfitLoss >= 0 ? "text-green-400" : "text-rose-400"}`}>
                  {simReturnDetails.absoluteProfitLoss >= 0 ? "+" : ""}{formatRupiah(simReturnDetails.absoluteProfitLoss)}
                </span>
                <span className={`text-xs font-black font-mono px-2 py-0.5 rounded ${
                  simReturnDetails.absoluteProfitLoss >= 0 ? "bg-green-500/10 text-green-400" : "bg-rose-500/10 text-rose-400"
                }`}>
                  {simReturnDetails.absoluteProfitLoss >= 0 ? "CUAN" : "RUGI"} {simReturnDetails.percentageReturn.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="text-body text-white/50 leading-relaxed font-sans max-w-md sm:text-right">
              Pembelian modal awal <span className="text-white font-semibold">{formatRupiah(simCapital)}</span> pada emiten <span className="text-emerald-400 font-bold">#{backtestConfig.singleTicker}</span> dari <span className="text-white">{backtestConfig.simStartDate}</span> bernilai <span className="text-white font-semibold">{formatRupiah(simReturnDetails.finalValue)}</span> pada <span className="text-white">{backtestConfig.simEndDate}</span>.
            </div>
          </Card>

          {/* Simulator Recharts Trajectory Line plot */}
          <div className="space-y-4">
            <span className="text-caption uppercase font-bold tracking-widest text-[#E0E0E0]/50 block">Grafik Lintasan Simulasi Pertumbuhan Modal (IDR)</span>
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
                  <YAxis stroke={theme === "light" ? "#cbd5e1" : "#333"} tickLine={false} dx={-8} tick={{ fill: theme === "light" ? "#475569" : "#666" }} domain={["auto", "auto"]} tickFormatter={(val) => {
                    const n = Number(val);
                    if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1)}M`;
                    if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(1)}jt`;
                    if (n >= 1e3) return `Rp ${(n / 1e3).toFixed(0)}rb`;
                    return n > 0 ? `Rp ${n.toFixed(0)}` : "Rp 0";
                  }} />
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
                  <Area type="monotone" name={`Investasi #${backtestConfig.singleTicker}`} dataKey="Nilai Portofolio" stroke="#eab308" strokeWidth={2} fillOpacity={1} fill="url(#colorPortfolio)" />
                  <Area type="monotone" name="IHSG Benchmark" dataKey="Tolok Ukur IHSG" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="3 3" fillOpacity={1} fill="url(#colorBenchmark)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </Card>
      )}

      {/* BLOCK EXTRA: DYNAMIC ALGORITHMIC MULTI-ASSET REBALANCING BACKTESTER */}
      {activeSubTab === "algo" && (
        <Card variant="default" padding="lg" className="space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Advanced Real-time Algorithmic Backtester ({backtestConfig.simStartDate} hingga {backtestConfig.simEndDate})</h3>
                <p className="text-body text-white/35 mt-0.5">Simulasikan rotasi harian dengan perlindungan crash IHSG & rebalance otomatis.</p>
              </div>
            </div>
            <span className="text-label font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
              DAILY REBALANCING ENGINE
            </span>
          </div>





          {/* Strategy Profile Card */}
          <Card variant="inset" padding="md" className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <span className="text-caption font-bold uppercase tracking-wider text-emerald-400">Strategy Profile</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-label font-bold text-white block">
                  {backtestActiveProfile?.name ?? (backtestConfig.activeProfileId === "agresif" ? "Agresif" : backtestConfig.activeProfileId === "dividen" ? "Dividen" : backtestConfig.activeProfileId === "growth-heavy" ? "Growth-heavy" : "Aman")}
                </span>
                <span className="text-caption text-white/40 font-mono block mt-0.5">
                  Q: {(backtestActiveProfile?.qualityWeight ?? 0.30).toFixed(2)} | G: {(backtestActiveProfile?.growthWeight ?? 0.45).toFixed(2)} | V: {(backtestActiveProfile?.valueWeight ?? 0.10).toFixed(2)} | M: {(backtestActiveProfile?.momentumWeight ?? 0).toFixed(2)} | D: {(backtestActiveProfile?.dividendWeight ?? 0.15).toFixed(2)}
                </span>
              </div>
              
            </div>
          </Card>

          <div className="space-y-5">
              
              {isBacktesting ? (
                <Card variant="default" className="flex flex-col items-center justify-center py-24 space-y-4">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin absolute" />
                    <Award className="w-6 h-6 text-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-mono text-white tracking-widest uppercase animate-pulse">Running Quant Simulations...</p>
                    <p className="text-caption text-white/30 font-mono">Iterating ticks day-by-day ({backtestConfig.simStartDate} hingga {backtestConfig.simEndDate})</p>
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
                  <span className="text-caption font-mono text-green-400 font-bold">{backtestProgress}% Complete</span>
                </Card>
              ) : backtestResult ? (
                <motion.div 
                  className="space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >

                  {/* Validation status banner */}
                  {validationResult && validationResult.status === "warning" && validationResult.warnings.length > 0 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-caption font-bold text-amber-300 font-sans uppercase tracking-wider">Peringatan Data</span>
                      </div>
                      {validationResult.warnings.map((w, i) => (
                        <p key={i} className="text-[11px] text-amber-200/70 font-sans leading-relaxed">{w}</p>
                      ))}
                    </div>
                  )}

                  {/* Result validation banner — invalid results */}
                  {resultValidation && resultValidation.status === "invalid" && (
                    <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="text-caption font-bold text-rose-300 font-sans uppercase tracking-wider">Hasil Tidak Valid</span>
                        <span className="ml-auto px-2 py-0.5 text-[9px] font-mono font-bold bg-rose-500/20 text-rose-400 rounded border border-rose-500/30">INVALID</span>
                      </div>
                      {resultValidation.errors.map((e, i) => (
                        <p key={i} className="text-[11px] text-rose-200/80 font-sans leading-relaxed">{e}</p>
                      ))}
                      {resultValidation.warnings.length > 0 && (
                        <div className="pt-1 border-t border-rose-500/20 space-y-0.5">
                          {resultValidation.warnings.map((w, i) => (
                            <p key={i} className="text-[10px] text-amber-200/60 font-sans leading-relaxed">⚠ {w}</p>
                          ))}
                        </div>
                      )}
                      <details className="mt-1">
                        <summary className="text-[10px] font-mono text-white/30 cursor-pointer hover:text-white/50">Diagnostics</summary>
                        <div className="mt-1 p-2 bg-black/30 rounded-lg grid grid-cols-2 md:grid-cols-3 gap-1.5 text-[9px] font-mono text-white/40">
                          {Object.entries(resultValidation.diagnostics).map(([k, v]) => (
                            <div key={k}>
                              <span className="text-white/25">{k}: </span>
                              <span className="text-white/60 font-bold">{String(v)}</span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}

                  {/* Result validation banner — warning only */}
                  {resultValidation && resultValidation.status === "warning" && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-caption font-bold text-amber-300 font-sans uppercase tracking-wider">Peringatan Hasil</span>
                        <span className="ml-auto px-2 py-0.5 text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 rounded border border-amber-500/30">WARNING</span>
                      </div>
                      {resultValidation.warnings.map((w, i) => (
                        <p key={i} className="text-[11px] text-amber-200/70 font-sans leading-relaxed">{w}</p>
                      ))}
                    </div>
                  )}

                  {/* Result validation badge — valid */}
                  {resultValidation && resultValidation.status === "valid" && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-[10px] font-mono font-bold text-emerald-400/70 uppercase tracking-wider">Hasil Valid</span>
                    </div>
                  )}

                  {/* Run summary — one-liner with coverage info */}
                  {validationResult && (
                    <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-white/30">
                      <span>{validationResult.coverage.totalTradingDays} hari trading</span>
                      <span className="text-white/10">|</span>
                      <span>{validationResult.coverage.dateRangeStart} → {validationResult.coverage.dateRangeEnd}</span>
                      <span className="text-white/10">|</span>
                      <span>{validationResult.coverage.avgStocksPerDay} saham/hari rata-rata</span>
                      <span className="text-white/10">|</span>
                      <span>TopN={backtestConfig.topNCount} | Buffer={backtestConfig.reserveBufferPct}%</span>
                      <span className="text-white/10">|</span>
                      <span className={backtestResult.totalReturnPct >= 0 ? "text-green-400/60" : "text-rose-400/60"}>
                        Return {backtestResult.totalReturnPct >= 0 ? "+" : ""}{backtestResult.totalReturnPct.toFixed(2)}%
                      </span>
                      <span className={backtestResult.totalReturnPct > backtestResult.ihsgReturnPct ? "text-green-400/70 font-bold" : "text-rose-400/70"}>
                        {backtestResult.totalReturnPct > backtestResult.ihsgReturnPct ? "▲ Outperform IHSG" : "▼ Underperform IHSG"} ({(backtestResult.totalReturnPct - backtestResult.ihsgReturnPct).toFixed(1)}pp)
                      </span>
                      <span className={backtestResult.totalReturnPct > backtestResult.goldReturnPct ? "text-amber-400/70 font-bold" : "text-rose-400/50"}>
                        {backtestResult.totalReturnPct > backtestResult.goldReturnPct ? "▲ Outperform Emas" : "▼ Underperform Emas"} ({(backtestResult.totalReturnPct - backtestResult.goldReturnPct).toFixed(1)}pp)
                      </span>
                      {!validationResult.coverage.hasScores && <span className="text-amber-400/60">⚠ tanpa score</span>}
                    </div>
                  )}

                  {/* Recharts chart — moved to top for visibility */}
                  <div className="space-y-4">
                    <span className="text-caption uppercase font-bold tracking-widest text-[#E0E0E0]/50 block">Grafik Compounding Multi-Asset Backtest (Strategi vs IHSG &amp; Emas)</span>
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
                          <YAxis stroke="#333" tickLine={false} dx={-8} tick={{ fill: "#666" }} domain={[0, 'auto']} tickFormatter={(val) => {
                            const n = Number(val);
                            if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(1)}M`;
                            if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(1)}jt`;
                            if (n >= 1e3) return `Rp ${(n / 1e3).toFixed(0)}rb`;
                            return n > 0 ? `Rp ${n.toFixed(0)}` : "Rp 0";
                          }} />
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
                          <Area type="monotone" name="Benchmark Emas (Hold)" dataKey="Benchmark Emas" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="1 1" fillOpacity={1} fill="url(#colorGoldBench)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Stats Bento Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    <Card variant="inset" padding="sm" className="space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Hasil Akhir Strategi</span>
                      <span className={`text-base font-black font-mono ${backtestResult.totalReturnPct >= 0 ? "text-green-400" : "text-rose-400"} block`}>
                        {formatRupiah(backtestResult.finalValue)}
                      </span>
                      <span className={`text-caption font-bold font-mono px-1.5 py-0.5 rounded inline-block ${backtestResult.totalReturnPct >= 0 ? "text-green-300 bg-green-500/15" : "text-rose-300 bg-rose-500/15"}`}>
                        {backtestResult.totalReturnPct >= 0 ? "+" : ""}{backtestResult.totalReturnPct.toFixed(1)}% Absolut
                      </span>
                    </Card>

                    <Card variant="inset" padding="sm" className="space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Benchmark IHSG</span>
                      <span className="text-sm font-semibold font-mono text-white/70 block">
                        {formatRupiah(backtestResult.ihsgFinalValue)}
                      </span>
                      <span className={`text-caption font-mono ${backtestResult.ihsgReturnPct >= 0 ? "text-green-400" : "text-rose-400"} block`}>
                        {backtestResult.ihsgReturnPct >= 0 ? "+" : ""}{backtestResult.ihsgReturnPct.toFixed(1)}% (Hold)
                      </span>
                    </Card>

                    <Card variant="inset" padding="sm" className="space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Benchmark Emas (Hold)</span>
                      <span className="text-sm font-bold font-mono text-amber-500 block">
                        {formatRupiah(backtestResult.goldFinalValue)}
                      </span>
                      <span className="text-caption font-mono text-[#A0A0A0] block">
                        {backtestResult.goldReturnPct >= 0 ? "+" : ""}{backtestResult.goldReturnPct.toFixed(1)}% — Beli &amp; Simpan Emas
                      </span>
                    </Card>

                    {/* Final state indicator — what is the algo actually holding at the END? */}
                    <div className={`p-4 rounded-xl space-y-1.5 border ${
                      backtestResult.finalInCrashState
                        ? "bg-amber-500/[0.06] border-amber-500/25"
                        : Object.keys(backtestResult.finalPositions || {}).length > 0
                          ? "bg-emerald-500/[0.04] border-emerald-500/20"
                          : "bg-white/[0.02] border-white/10"
                    }`}>
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Status Akhir Backtest</span>
                      {backtestResult.finalInCrashState ? (
                        <>
                          <div className="text-sm font-black font-mono text-amber-400 flex items-center gap-1.5">
                            <ShieldAlert className="w-4 h-4" /> Di Safe Haven
                          </div>
                          <span className="text-caption font-mono text-white/50 block">
                            Crash #{(backtestResult.crashCount ?? 0)} aktif. Saham dilikuidasi, modal di {backtestConfig.safeHavenAsset === "emas" ? "Emas" : "Kas"}.
                          </span>
                        </>
                      ) : Object.keys(backtestResult.finalPositions || {}).length > 0 ? (
                        <>
                          <div className="text-sm font-black font-mono text-emerald-400 flex items-center gap-1.5">
                            <Briefcase className="w-4 h-4" /> Di {Object.keys(backtestResult.finalPositions || {}).length} Saham
                          </div>
                          <span className="text-caption font-mono text-white/50 block">
                            {backtestResult.crashCount
                              ? `Recovered dari ${backtestResult.crashCount} crash. `
                              : "Tidak ada crash trigger. "}
                            Top: {Object.keys(backtestResult.finalPositions).slice(0, 3).join(", ")}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="text-sm font-black font-mono text-white/60 flex items-center gap-1.5">
                            <Wallet className="w-4 h-4" /> 100% Kas
                          </div>
                          <span className="text-caption font-mono text-white/50 block">
                            Modal mengendap. Tidak ada posisi aktif.
                          </span>
                        </>
                      )}
                    </div>

                  </div>

                  {/* Dividen Kumulatif — full-width insight section */}
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="shrink-0">
                        <span className="text-label uppercase font-bold tracking-widest text-green-400/70 block">Dividen Kumulatif (Nett 90%)</span>
                        <span className="text-base font-black font-mono text-green-400 block mt-1">
                          +{formatRupiah(backtestResult.totalDividends)}
                        </span>
                      </div>
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                        <div className="p-2 bg-white/[0.02] rounded-lg">
                          <span className="text-label font-mono text-white/40 block">Trades</span>
                          <span className="text-caption font-bold text-amber-400 font-mono">{backtestResult.totalTrades}</span>
                          <span className="text-[9px] text-white/20 font-mono block">Buy + Sell + Swap</span>
                        </div>
                        <div className="p-2 bg-white/[0.02] rounded-lg">
                          <span className="text-label font-mono text-white/40 block">Avg yield/thn</span>
                          <span className="text-caption font-bold text-green-400/80 font-mono">
                            {(() => {
                              const years = Math.max(1, (new Date(backtestConfig.simEndDate).getTime() - new Date(backtestConfig.simStartDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
                              return backtestResult.finalValue > 0
                                ? (backtestResult.totalDividends / years / backtestResult.finalValue * 100).toFixed(2)
                                : "0.00";
                            })()}%
                          </span>
                        </div>
                        {backtestResult.dividendByTicker && Object.keys(backtestResult.dividendByTicker).length > 0 && (
                          <>
                            {Object.entries(backtestResult.dividendByTicker)
                              .sort((a, b) => (b[1] as number) - (a[1] as number))
                              .slice(0, 2)
                              .map(([ticker, amt]) => (
                                <div key={ticker} className="p-2 bg-white/[0.02] rounded-lg">
                                  <span className="text-label font-mono text-white/40 block">Top: {ticker}</span>
                                  <span className="text-caption font-bold text-green-400/70 font-mono">+{((amt as number) / 1e6).toFixed(1)}M</span>
                                </div>
                              ))}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Advanced Professional Risk/Metrics Scorecard Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <Card variant="inset" padding="sm" className="space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block" title="Compound Annual Growth Rate — rata-rata pertumbuhan tahunan yang dismooth">
                        CAGR (Annualized)
                      </span>
                      <span className={`text-sm font-bold font-mono block ${backtestResult.cagr >= 0 ? "text-green-400" : "text-rose-400"}`}>
                        {backtestResult.cagr.toFixed(2)}%
                        {backtestResult.finalValue === 0 && <span className="text-[9px] text-rose-400/60 ml-1">(Total Loss)</span>}
                      </span>
                      <span className="text-label text-white/40 block">Tingkat Pertumbuhan Tahunan</span>
                    </Card>

                    <Card variant="inset" padding="sm" className="space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block" title="Sharpe = (CAGR - Rf) / Volatilitas. Sortino = (CAGR - Rf) / Downside Vol. Rf=5%">
                        Rasio Sharpe &amp; Sortino
                      </span>
                      <span className={`text-sm font-bold font-mono block ${(backtestResult.sharpe ?? 0) >= 0.5 ? "text-green-400" : (backtestResult.sharpe ?? 0) > 0 ? "text-amber-400" : "text-rose-400"}`}>
                        S: {backtestResult.sharpe !== null ? backtestResult.sharpe.toFixed(2) : "—"} / So: {backtestResult.sortino !== null ? backtestResult.sortino.toFixed(2) : "—"}
                      </span>
                      <span className="text-label text-white/40 block">Risiko Terkoreksi (Rf=5%)</span>
                    </Card>

                    <Card variant="inset" padding="sm" className="space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block" title="Volatilitas = StdDev return tahunan. Calmar = CAGR / MaxDrawdown.">
                        Volatilitas &amp; Calmar
                      </span>
                      <span className="text-sm font-bold font-mono text-amber-400 block">
                        V: {backtestResult.volatility !== null ? backtestResult.volatility.toFixed(1) : "—"}% / C: {backtestResult.calmar.toFixed(2)}
                      </span>
                      <span className="text-label text-white/40 block">Risk-Return Profile</span>
                    </Card>

                    <Card variant="inset" padding="sm" className="space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block" title="Win Rate = % hari dengan return positif. Turnover = total volume transaksi / rata-rata portofolio.">
                        Win Rate &amp; Turnover
                      </span>
                      <span className="text-sm font-bold font-mono text-cyan-400 block">
                        W: {backtestResult.winRatePct.toFixed(1)}% / T: {backtestResult.turnoverPct.toFixed(1)}%
                      </span>
                      <span className="text-label text-white/40 block">Aktivitas Rotasi Portfolio</span>
                    </Card>

                  </div>

                  {/* Advanced Risk Analytics — Row 2 */}
                  <div className="pt-4 border-t border-emerald-500/20">
                    <span className="text-caption uppercase font-bold tracking-widest text-emerald-400/70 block mb-3">Advanced Risk Analytics</span>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

                    <Card variant="inset" padding="sm" className="space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block" title="Information Ratio = (Rp - Rb) / Tracking Error. Semakin tinggi, semakin konsisten mengalahkan benchmark.">
                        Information Ratio
                      </span>
                      <span className="text-sm font-bold font-mono text-cyan-400 block">
                        {backtestResult.informationRatio !== null ? backtestResult.informationRatio.toFixed(3) : "—"}
                      </span>
                      <span className="text-label text-white/40 block">Excess Return / Tracking Error</span>
                    </Card>

                    <Card variant="inset" padding="sm" className="space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block" title="Omega Ratio = Total gains / Total losses relatif threshold. >1 = lebih banyak gain daripada loss.">
                        Omega Ratio
                      </span>
                      <span className="text-sm font-bold font-mono text-cyan-400 block">
                        {isFinite(backtestResult.omegaRatio) ? backtestResult.omegaRatio.toFixed(3) : "∞"}
                      </span>
                      <span className="text-label text-white/40 block">Full Distribution Risk-Adjusted</span>
                    </Card>

                    <Card variant="inset" padding="sm" className="space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block" title="Skewness < 0 = tail kiri lebih panjang (risiko downside). Kurtosis > 0 = fat tails, crash lebih sering dari normal.">
                        Tail Risk
                      </span>
                      <span className="text-sm font-bold font-mono text-orange-400 block">
                        Skew: {backtestResult.skewness.toFixed(2)} / Kurt: {backtestResult.kurtosis.toFixed(2)}
                      </span>
                      <span className="text-label text-white/40 block">Distribusi Return (fat tails)</span>
                    </Card>

                    <Card variant="inset" padding="sm" className="space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block" title="Return total dikurangi total biaya transaksi (fee + pajak + slippage).">
                        Net Return (Fee-Adjusted)
                      </span>
                      <span className={`text-sm font-bold font-mono ${backtestResult.turnoverAdjustedReturnPct >= 0 ? "text-green-400" : "text-rose-400"}`}>
                        {backtestResult.turnoverAdjustedReturnPct >= 0 ? "+" : ""}{backtestResult.turnoverAdjustedReturnPct.toFixed(2)}%
                      </span>
                      <span className="text-label text-white/40 block">Return setelah biaya transaksi</span>
                    </Card>

                  </div>

                  {/* Regime-Conditional Sharpe — only if data available */}
                  {(backtestResult.bullSharpe !== null || backtestResult.bearSharpe !== null) && (
                    <Card variant="inset" padding="sm" className="space-y-2">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Regime-Conditional Sharpe Ratio</span>
                      <div className="flex gap-6 text-sm font-mono">
                        <div>
                          <span className="text-white/40">Bull ({backtestResult.bullDays}d): </span>
                          <span className="text-green-400 font-bold">{backtestResult.bullSharpe !== null ? backtestResult.bullSharpe.toFixed(3) : "—"}</span>
                        </div>
                        <div>
                          <span className="text-white/40">Bear ({backtestResult.bearDays}d): </span>
                          <span className="text-rose-400 font-bold">{backtestResult.bearSharpe !== null ? backtestResult.bearSharpe.toFixed(3) : "—"}</span>
                        </div>
                      </div>
                      <span className="text-label text-white/40 block">Sharpe terpisah berdasarkan tren IHSG (SMA20 vs SMA50)</span>
                    </Card>
                  )}

                  </div>

                  {/* Profit comparison notice card */}
                  <Card variant="inset" padding="md" className="leading-relaxed space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">
                        {backtestResult.totalReturnPct > backtestResult.ihsgReturnPct ? "📈" : backtestResult.totalReturnPct > 0 ? "📊" : "📉"}
                      </span>
                      <div className="text-xs text-white/60">
                        {backtestConfig.simulationMode === "algo" ? (
                          (() => {
                            const cap = parseInt(backtestConfig.algoCapital.replace(/[^0-9]/g, "")) || 100000000;
                            const beatsIHSG = backtestResult.totalReturnPct > backtestResult.ihsgReturnPct;
                            const beatsGold = backtestResult.totalReturnPct > backtestResult.goldReturnPct;
                            const returnLabel = backtestResult.totalReturnPct >= 0 ? `+${backtestResult.totalReturnPct.toFixed(1)}%` : `${backtestResult.totalReturnPct.toFixed(1)}%`;
                            const ihsgLabel = backtestResult.ihsgReturnPct >= 0 ? `+${backtestResult.ihsgReturnPct.toFixed(1)}%` : `${backtestResult.ihsgReturnPct.toFixed(1)}%`;
                            return (
                              <>
                                Strategi rebalancing otomatis dengan profil <strong className="text-emerald-400">{backtestResult.configName}</strong> menghasilkan return <span className={`font-bold ${backtestResult.totalReturnPct >= 0 ? "text-green-400" : "text-rose-400"}`}>{returnLabel}</span> pada periode {backtestConfig.simStartDate} → {backtestConfig.simEndDate}. Modal awal <span className="text-white font-bold">{formatRupiah(cap)}</span> menjadi <span className={`font-extrabold ${backtestResult.totalReturnPct >= 0 ? "text-green-400" : "text-rose-400"}`}>{formatRupiah(backtestResult.finalValue)}</span>.
                                {beatsIHSG
                                  ? <> Melebihi benchmark IHSG (<span className="text-white">{ihsgLabel}</span>).</>
                                  : <> Di bawah benchmark IHSG (<span className="text-rose-300">{ihsgLabel}</span>).</>
                                }
                                {beatsGold ? " Mengungguli benchmark emas (beli & simpan)." : backtestResult.goldReturnPct > backtestResult.ihsgReturnPct ? " Benchmark emas ternyata lebih kuat dari strategi ini." : ""}
                              </>
                            );
                          })()
                        ) : (
                          <>Simulasi Hold &amp; Protect pada saham tunggal <strong className="text-emerald-400">#{backtestConfig.singleTicker}</strong>. Modal awal <span className="text-white font-bold">{formatRupiah(parseInt(backtestConfig.algoCapital.replace(/[^0-9]/g, "")) || 100000000)}</span> pada {backtestConfig.simStartDate} bernilai <span className={`font-extrabold ${backtestResult.totalReturnPct >= 0 ? "text-green-400" : "text-rose-400"}`}>{formatRupiah(backtestResult.finalValue)}</span> pada {backtestConfig.simEndDate}.</>
                        )}
                      </div>
                    </div>
                    {/* Comparative index list */}
                    <div className="pt-2 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-caption text-white/40 font-mono">
                      <div>📊 IHSG Benchmark: <span className="text-white font-bold">{formatRupiah(backtestResult.ihsgFinalValue)}</span> <span className={backtestResult.ihsgReturnPct >= 0 ? "text-green-400" : "text-rose-400"}>{backtestResult.ihsgReturnPct >= 0 ? "+" : ""}{backtestResult.ihsgReturnPct.toFixed(1)}%</span></div>
                      <div>🪙 Benchmark Emas (Hold): <span className="text-white font-bold">{formatRupiah(backtestResult.goldFinalValue)}</span> <span className={backtestResult.goldReturnPct >= 0 ? "text-green-400" : "text-rose-400"}>{backtestResult.goldReturnPct >= 0 ? "+" : ""}{backtestResult.goldReturnPct.toFixed(1)}%</span></div>
                      <div>⚖️ 60/40 Campuran: <span className="text-green-400 font-bold">{formatRupiah(backtestResult.bench6040FinalVal)}</span> <span className={backtestResult.bench6040ReturnPct >= 0 ? "text-green-400" : "text-rose-400"}>{backtestResult.bench6040ReturnPct >= 0 ? "+" : ""}{backtestResult.bench6040ReturnPct.toFixed(1)}%</span></div>
                    </div>
                  </Card>

                  {/* 4-way DCA comparison — only for adaptive_dca mode */}
                  {backtestConfig.simulationMode === "adaptive_dca" && baselineResults.length > 0 && (
                    <Card variant="signal" signal="positive" padding="lg" className="space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-white/[0.05]">
                        <span className="text-lg">⚡</span>
                        <h4 className="text-sm font-black uppercase tracking-widest text-emerald-400 font-mono">
                          Adaptive DCA vs Traditional Strategies
                        </h4>
                        <span className="text-label text-white/40 font-mono ml-auto">
                          {backtestConfig.simStartDate} → {backtestConfig.simEndDate}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* Adaptive DCA (this run) */}
                        <Card variant="signal" signal="positive" padding="sm" className="border-2 space-y-1.5">
                          <span className="text-caption uppercase tracking-widest font-black text-emerald-400 font-mono block">⚡ Adaptive DCA</span>
                          <span className="text-base font-black font-mono text-white block">{formatRupiah(backtestResult.finalValue)}</span>
                          <span className={`text-caption font-bold font-mono ${backtestResult.totalReturnPct >= 0 ? "text-green-400" : "text-rose-400"}`}>
                            {backtestResult.totalReturnPct >= 0 ? "+" : ""}{backtestResult.totalReturnPct.toFixed(1)}%
                          </span>
                          <div className="pt-1 mt-1 border-t border-white/[0.05] space-y-0.5 text-label font-mono text-white/50">
                            <div>CAGR: {backtestResult.cagr.toFixed(1)}%</div>
                            <div>Max DD: -{backtestResult.maxDrawdown.toFixed(1)}%</div>
                            <div className="text-green-400/70">Deployed: {formatRupiah(backtestResult.totalDeployed || 0)}</div>
                            <div className="text-green-400/80">+Dividen: {formatRupiah(backtestResult.totalDividends)}</div>
                          </div>
                        </Card>

                        {/* 3 baselines */}
                        {baselineResults.map((bl) => (
                          <Card key={bl.baseline} variant="inset" padding="sm" className="space-y-1.5">
                            <span className="text-caption uppercase tracking-widest font-black text-white/50 font-mono block">
                              {bl.baseline === "lump_sum" ? "💰" : bl.baseline === "monthly_dca" ? "📅" : "🗓️"} {bl.label}
                            </span>
                            <span className="text-base font-black font-mono text-white/80 block">{formatRupiah(bl.finalValue)}</span>
                            <span className={`text-caption font-bold font-mono ${bl.finalValue >= (parseInt(backtestConfig.algoCapital.replace(/[^0-9]/g, "")) || 100000000) ? "text-green-400" : "text-rose-400"}`}>
                              {bl.finalValue >= (parseInt(backtestConfig.algoCapital.replace(/[^0-9]/g, "")) || 100000000) ? "+" : ""}
                              {(((bl.finalValue / (parseInt(backtestConfig.algoCapital.replace(/[^0-9]/g, "")) || 100000000)) - 1) * 100).toFixed(1)}%
                            </span>
                            <div className="pt-1 mt-1 border-t border-white/[0.05] space-y-0.5 text-label font-mono text-white/50">
                              <div>CAGR: {bl.cagr.toFixed(1)}%</div>
                              <div>Max DD: -{bl.maxDrawdown.toFixed(1)}%</div>
                              <div>Avg Price: {formatRupiah(bl.avgBuyPrice)}</div>
                              <div>Cash Used: {bl.cashUtilization.toFixed(0)}%</div>
                              <div className="text-green-400/70">+Dividen: {formatRupiah(bl.totalDividends)}</div>
                            </div>
                          </Card>
                        ))}
                      </div>

                      {/* Verdict */}
                      {(() => {
                        const cap = parseInt(backtestConfig.algoCapital.replace(/[^0-9]/g, "")) || 100000000;
                        const adaptiveReturn = backtestResult.totalReturnPct;
                        const bestBaseline = baselineResults.reduce((best, b) => {
                          const r = ((b.finalValue / cap) - 1) * 100;
                          return r > best.r ? { name: b.label, r } : best;
                        }, { name: "", r: -Infinity });
                        const beatsBest = adaptiveReturn > bestBaseline.r;
                        return (
                          <div className={`p-3 rounded-lg border ${beatsBest ? "bg-green-500/10 border-green-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
                            <p className="text-xs text-white/80 font-sans leading-relaxed">
                              {beatsBest ? "✅" : "⚠️"} <strong>Adaptive DCA</strong> return <span className="font-mono font-bold text-white">{adaptiveReturn.toFixed(2)}%</span> vs
                              <strong> {bestBaseline.name}</strong> return <span className="font-mono font-bold text-white">{bestBaseline.r.toFixed(2)}%</span>.
                              {beatsBest
                                ? ` Adaptive DCA mengungguli strategi tradisional terbaik sebesar ${(adaptiveReturn - bestBaseline.r).toFixed(2)} poin.`
                                : ` Adaptive DCA underperform sebesar ${(bestBaseline.r - adaptiveReturn).toFixed(2)} poin.`}
                            </p>
                          </div>
                        );
                      })()}
                    </Card>
                  )}

                  {/* Historical Factor Rank Component */}
                  {backtestConfig.simulationMode === "algo" && (
                    <div className="space-y-4 border-t border-white/5 pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-caption uppercase font-bold tracking-widest text-[#E0E0E0]/50 block flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Peringkat Rotasi Historis Saham ({backtestConfig.simStartDate} hingga {backtestConfig.simEndDate})
                          </span>
                          <p className="text-body text-white/40 leading-relaxed mt-1">
                            Fluktuasi peringkat harian emiten berdasarkan bobot faktor kuantitatif untuk strategi aktif: <span className="text-emerald-400 font-bold">{backtestResult.configName}</span>. Peringkat yang lebih rendah (Rank 1) mewakili emiten terkuat untuk dikoleksi.
                          </p>
                        </div>
                      </div>

                      {/* Stock Multi-Toggle Pill Buttons */}
                      <Card variant="inset" padding="sm" className="flex flex-wrap gap-1.5">
                        <span className="text-label uppercase font-bold tracking-wider text-white/30 self-center mr-2">Filter Emiten:</span>
                        {visibleStocks.slice(0, 15).map((stk) => {
                          const ticker = stk.ticker;
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
                              className={`px-2.5 py-1 text-label font-bold rounded-md cursor-pointer transition-all flex items-center gap-1.5 border ${
                                isSelected
                                  ? "bg-white/10 text-white border-white/20"
                                  : "bg-transparent text-white/30 border-white/5 hover:border-white/10 hover:text-white/50"
                              }`}
                            >
                              <span 
                                className="w-2 h-2 rounded-full inline-block" 
                                style={{ backgroundColor: TICKER_COLORS[ticker] || stk.logoColor?.replace("bg-[", "").replace("]", "") || "#10b981" }}
                              />
                              {ticker}
                            </button>
                          );
                        })}
                      </Card>

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
                              domain={[1, visibleStocks.length]} 
                              tickCount={10}
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
                              formatter={(value: any, name: any) => {
                                const stk = visibleStocks.find(s => s.ticker === name);
                                const tColor = TICKER_COLORS[name] || stk?.logoColor?.replace("bg-[", "").replace("]", "") || "#10b981";
                                return [
                                  `Peringkat ${value}`,
                                  <span style={{ color: tColor }}>{name}</span>
                                ];
                              }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            {activeRankTickers.map((ticker) => {
                              const stk = visibleStocks.find(s => s.ticker === ticker);
                              const tColor = TICKER_COLORS[ticker] || stk?.logoColor?.replace("bg-[", "").replace("]", "") || "#10b981";
                              return (
                                <Line
                                  key={ticker}
                                  type="monotone"
                                  dataKey={ticker}
                                  name={ticker}
                                  stroke={tColor}
                                  strokeWidth={2}
                                  dot={false}
                                  activeDot={{ r: 4 }}
                                />
                              );
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Trade Log Console terminal */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                      <span className="text-caption uppercase font-bold tracking-widest text-[#E0E0E0]/50 flex items-center gap-1.5 font-sans">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" /> Buku Jurnal Transaksi Algoritma Harian
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadJournal}
                          className="bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/25 text-emerald-400 text-[9.5px] font-bold uppercase font-sans px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Download className="w-3 h-3" /> Unduh Buku Jurnal (CSV)
                        </button>
                      </div>
                    </div>
                    {/* Journal filter chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {(["all", "BUY", "SELL", "REBALANCE", "CRASH_TRIGGER", "RECOVERY", "RE_ENTRY"] as const).map((filter) => {
                        const isActive = journalFilter === filter;
                        const count = filter === "all"
                          ? backtestResult.logs.length
                          : backtestResult.logs.filter((l: any) => l.type === filter).length;
                        const label = filter === "all" ? "Semua" : filter === "CRASH_TRIGGER" ? "CRASH" : filter;
                        return (
                          <button
                            key={filter}
                            onClick={() => setJournalFilter(filter)}
                            className={`px-2 py-0.5 text-label font-bold font-mono rounded-md border transition-all cursor-pointer ${
                              isActive
                                ? "bg-white/10 text-white border-white/20"
                                : "bg-transparent text-white/30 border-white/5 hover:border-white/10 hover:text-white/50"
                            }`}
                          >
                            {label} <span className="text-white/20">({count})</span>
                          </button>
                        );
                      })}
                    </div>
                    <Card variant="default" padding="md" className="h-64 overflow-y-auto font-mono text-caption space-y-3 leading-relaxed">
                      
                      {backtestResult.logs
                        .filter((log: any) => journalFilter === "all" || log.type === journalFilter)
                        .map((log: any, idx: number) => {
                        const dateStr = log.date && log.date.length >= 10 ? log.date.slice(0, 10) : log.date;
                        const [, typeColor] = {
                          BUY: ["bg-green-500/20 text-green-400 border-green-500/20", "text-green-300"],
                          SELL: ["bg-rose-500/20 text-rose-400 border-rose-500/20", "text-rose-300"],
                          REBALANCE: ["bg-green-500/20 text-green-400 border-green-500/20", "text-green-300"],
                          CRASH_TRIGGER: ["bg-rose-500/25 text-rose-400 border-rose-500/30", "text-rose-300"],
                          RECOVERY: ["bg-emerald-500/20 text-emerald-400 border-emerald-500/20", "text-emerald-300"],
                          RE_ENTRY: ["bg-cyan-500/20 text-cyan-400 border-cyan-500/20", "text-cyan-300"],
                        }[log.type] || ["bg-white/5 text-white/60 border-white/10", "text-white/60"];
                        return (
                          <div key={idx} className="border-b border-white/5 pb-2.5 last:border-0 hover:bg-white/[0.02] -mx-2 px-2 rounded transition-colors">
                            <div className="flex items-start gap-2.5">
                              <span className="text-label text-zinc-600 font-mono shrink-0 mt-0.5 w-6 text-right">{idx + 1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-label font-extrabold uppercase font-sans tracking-wider shrink-0 border ${typeColor}`}>
                                    {log.type === "CRASH_TRIGGER" ? "CRASH" : log.type}
                                  </span>
                                  <span className="text-label text-zinc-500 font-mono">{dateStr}</span>
                                </div>
                                <p className="text-xs leading-relaxed text-zinc-300">{log.message}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    </Card>
                  </div>

                </motion.div>
              ) : (
                <Card variant="default" className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                  <span className="text-2xl">⚡</span>
                  <p className="text-xs text-white/50 font-sans">Belum ada hasil backtest.</p>
                  <p className="text-caption text-white/35 max-w-xs leading-relaxed font-sans">Gunakan tombol "Jalankan Backtest" di header untuk menghitung trajectory rotasi portofolio Anda.</p>
                </Card>
              )}
            </div>




        </Card>
      )}

    </div>
  );
}
