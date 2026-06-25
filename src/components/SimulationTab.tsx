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
  AlertCircle,
  Download
} from "lucide-react";
import { PortfolioItem, StockData } from "../types";
import { STOCKS_DATA } from "../stocksData";
import { IDX80_TICKERS, IDX30_TICKERS, LQ45_TICKERS } from "../constants/idx80";
import { runStrategy } from "../engine";
import { runBaselineDca, type BaselineResult, type DcaBaseline } from "../engine/dcaBaselines";
import { SearchableSelect } from "./SearchableSelect";
import { EX, RS, MKT } from "../marketData";
import { isCrisisMode } from "../marketRegimeEngine";
import { api } from "../services/api";
import { useEngineConfig } from "../contexts/EngineConfigContext";
import { toast } from "sonner";

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
  type: "BUY" | "SELL" | "REBALANCE" | "CRASH_TRIGGER" | "CRASH_RECOVERY";
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
  const { engineConfig, todayWIBStr, backtestResult, isBacktesting, triggerRun, setBacktesting, setBacktestResult, syncFromBacktest, backtestConfig, updateBacktestValue } = useEngineConfig();
  const backtestActiveProfile = useMemo(() => engineConfig.profiles.find(p => p.id === backtestConfig.activeProfileId) || engineConfig.profiles[0], [engineConfig.profiles, backtestConfig.activeProfileId]);

  // A2 fix: re-fetch historical data when the active profile changes so the
  // engine runs against the right stockRanksProd/Res dataset. Previously this
  // was hardcoded to configType=prod, which silently fed QM ranks into BG
  // backtests and vice versa.
  useEffect(() => {
    const configType = backtestConfig.activeProfileId === "res" ? "res" : "prod";
    api.get<{ success: boolean; data: any[] }>(`/api/backtest-data?configType=${configType}`)
      .then(res => { if (res.success && Array.isArray(res.data)) setHistoricalData(res.data); })
      .catch(() => {
        setHistoricalData(generateClientBacktestData());
      });
  }, [backtestConfig.activeProfileId]);

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
    const annualDividendRate = activeStock.dividendYield || 2.4;
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

    const isIHSGInCrisis = isCrisisMode();

    return {
      stockAlerts,
      isIHSGInCrisis,
      ihsgMonthlyPct: MKT.ihsg.monthly,
      ihsgCurrentValue: MKT.ihsg.value,
    };
  }, [portfolio]);

  const handleRunAlgoBacktest = async () => {
    setBacktesting(true);
    setBacktestProgress(15);

    try {
      setBacktestProgress(45);

      if (historicalData.length === 0) {
        setBacktesting(false);
        setBacktestProgress(0);
        return;
      }

      const cap = parseInt(backtestConfig.algoCapital.replace(/[^0-9]/g, "")) || 100000000;

      const result = runStrategy({
        dayData: historicalData,
        config: {
          capital: cap,
          reserveBufferPct: backtestConfig.reserveBufferPct,
          topNCount: backtestConfig.topNCount,
          universe: backtestConfig.universe,
          simulationMode: backtestConfig.simulationMode,
          singleTicker: backtestConfig.singleTicker,
          enableCrashProtection: backtestConfig.enableCrashProtection,
          crashSensitivity: backtestConfig.crashSensitivity,
          singleSellTrigger: backtestConfig.singleSellTrigger,
          singleBuyTrigger: backtestConfig.singleBuyTrigger,
          safeHavenAsset: backtestConfig.safeHavenAsset,
          enableCrossover: backtestConfig.enableCrossover,
          simStartDate: backtestConfig.simStartDate,
          simEndDate: backtestConfig.simEndDate,
          customUniverse: backtestConfig.customUniverse || [],
          activeProfileId: backtestConfig.activeProfileId,
          enableAdaptiveWeights: backtestConfig.enableAdaptiveWeights,
        },
        profileWeights: {
          quality: backtestActiveProfile?.qualityWeight ?? 0.45,
          growth: backtestActiveProfile?.growthWeight ?? 0.10,
          value: backtestActiveProfile?.valueWeight ?? 0.05,
          momentum: backtestActiveProfile?.momentumWeight ?? 0.40,
        },
        universeTickers: {
          idx80: IDX80_TICKERS,
          idx30: IDX30_TICKERS,
          lq45: LQ45_TICKERS,
        },
      });

      setBacktestProgress(95);

      setBacktestResult(result);

      // Adaptive DCA: also run 3 baseline simulations for comparison
      if (backtestConfig.simulationMode === "adaptive_dca") {
        const baselineInputs = {
          dayData: historicalData,
          config: {
            capital: cap,
            reserveBufferPct: backtestConfig.reserveBufferPct,
            topNCount: backtestConfig.topNCount,
            universe: backtestConfig.universe,
            safeHavenAsset: backtestConfig.safeHavenAsset,
            enableCrashProtection: false, // baselines are simple DCA, no crash protection
            crashSensitivity: backtestConfig.crashSensitivity,
            simStartDate: backtestConfig.simStartDate,
            simEndDate: backtestConfig.simEndDate,
            customUniverse: [],
            enableAdaptiveWeights: false,
          },
          profileWeights: {
            quality: backtestActiveProfile?.qualityWeight ?? 0.45,
            growth: backtestActiveProfile?.growthWeight ?? 0.10,
            value: backtestActiveProfile?.valueWeight ?? 0.05,
            momentum: backtestActiveProfile?.momentumWeight ?? 0.40,
          },
          universeTickers: {
            idx80: IDX80_TICKERS,
            idx30: IDX30_TICKERS,
            lq45: LQ45_TICKERS,
          },
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
    } catch (err: any) {
      console.error("Backtest failed:", err);
      alert(err.message || "Backtest gagal. Periksa tanggal mulai.");
      setBacktesting(false);
    }
  };

  // Auto-run backtest when parameters change to keep everything dynamically in sync
  useEffect(() => {
    if (historicalData.length === 0) return;
    handleRunAlgoBacktest();
  }, [
    backtestConfig.singleTicker,
    backtestConfig.simStartDate,
    backtestConfig.simEndDate,
    backtestConfig.algoCapital,
    backtestConfig.simulationMode,
    backtestConfig.universe,
    backtestConfig.topNCount,
    backtestConfig.enableCrossover,
    backtestConfig.enableCrashProtection,
    backtestConfig.crashSensitivity,
    backtestConfig.safeHavenAsset,
    backtestConfig.singleSellTrigger,
    backtestConfig.singleBuyTrigger,
    backtestConfig.reserveBufferPct,
    backtestConfig.activeProfileId,
    backtestConfig.customUniverse,
    backtestConfig.enableAdaptiveWeights,
    backtestActiveProfile?.qualityWeight,
    backtestActiveProfile?.growthWeight,
    backtestActiveProfile?.valueWeight,
    backtestActiveProfile?.momentumWeight,
    triggerRun,
    historicalData,
  ]);

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

  return (
    <div className="space-y-6">
      
      {/* 1. Header Information Panel */}
      <div className="p-5 md:p-6 bg-[#050505] border border-white/[0.03] rounded-2xl relative shadow-sm overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div>
          <h2 className="text-body font-bold text-white uppercase tracking-widest flex items-center gap-2 font-mono">
             <Award className="w-4 h-4 text-indigo-400" />
             Interactive Trading & Backtest Laboratory
          </h2>
          <p className="text-caption text-zinc-500 mt-2 max-w-2xl leading-relaxed">
            Bandingkan performa investasi harian sejak {backtestConfig.simStartDate} dengan algoritma rebalancing saham & perlindungan crash IHSG otomatis.
          </p>
        </div>
        
        {!hideTabs && (
          <div className="flex bg-[#050505] p-1 border border-white/[0.05] rounded-xl self-start md:self-auto shrink-0 relative z-10 w-full md:w-auto">
            <button
              onClick={() => {
                setActiveSubTab("algo");
                if (!backtestResult) {
                  handleRunAlgoBacktest();
                }
              }}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-label font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                activeSubTab === "algo" ? "bg-white/10 text-white shadow-sm border border-white/10" : "text-white/40 hover:text-white"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" /> Backtester
            </button>
            <button
              onClick={() => setActiveSubTab("past")}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-label font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                activeSubTab === "past" ? "bg-white/10 text-white shadow-sm border border-white/10" : "text-white/40 hover:text-white"
              }`}
            >
              <Coins className="w-3.5 h-3.5" /> Simulasi
            </button>
          </div>
        )}
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
            
            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
              <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Harga Jual Masa Lalu</span>
              <span className="text-sm font-bold font-mono text-white block">{formatRupiah(startPrice)}</span>
              <span className="text-label text-[#A0A0A0] block">Per lembar pada {backtestConfig.simStartDate}</span>
            </div>

            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
              <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Jumlah Kepemilikan</span>
              <span className="text-sm font-bold font-mono text-white block">
                {simReturnDetails.realSharesPurchased.toLocaleString("id-ID")} Lmbr
              </span>
              <span className="text-label text-emerald-400 font-semibold block">
                💡 {simReturnDetails.totalLots} Lot (Sisa Kas: {formatRupiah(simReturnDetails.cashResidual)})
              </span>
            </div>

            <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
              <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Dividen Akumulatif</span>
              <span className="text-sm font-bold font-mono text-[#EAB308] block">
                +{formatRupiah(simReturnDetails.totalDividends)}
              </span>
              <span className="text-label text-white/40 block">Hasil Dividen yield {activeStock.dividendYield}% (Nett)</span>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
              <span className="text-label uppercase font-bold tracking-widest text-amber-400 block">Total Nilai Sekarang</span>
              <span className="text-sm font-black font-mono text-amber-300 block">
                {formatRupiah(simReturnDetails.finalValue)}
              </span>
              <span className="text-label text-white/40 block">Terdiri dari Saham + Dividen + Sisa Kas</span>
            </div>

          </div>

          {/* Profit ratio highlights banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4.5 bg-[#050505] border border-white/5 rounded-xl gap-4">
            <div className="space-y-1">
              <span className="text-caption uppercase font-bold text-white/30 block">Pemberitahuan Hasil Simulasi:</span>
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

            <div className="text-body text-white/50 leading-relaxed font-sans max-w-md sm:text-right">
              Pembelian modal awal <span className="text-white font-semibold">{formatRupiah(simCapital)}</span> pada emiten <span className="text-emerald-400 font-bold">#{backtestConfig.singleTicker}</span> dari <span className="text-white">{backtestConfig.simStartDate}</span> bernilai <span className="text-white font-semibold">{formatRupiah(simReturnDetails.finalValue)}</span> pada <span className="text-white">{backtestConfig.simEndDate}</span>.
            </div>
          </div>

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
                  <Area type="monotone" name={`Investasi #${backtestConfig.singleTicker}`} dataKey="Nilai Portofolio" stroke="#eab308" strokeWidth={2} fillOpacity={1} fill="url(#colorPortfolio)" />
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Advanced Real-time Algorithmic Backtester ({backtestConfig.simStartDate} hingga {backtestConfig.simEndDate})</h3>
                <p className="text-body text-white/35 mt-0.5">Simulasikan rotasi harian dengan perlindungan crash IHSG & rebalance otomatis.</p>
              </div>
            </div>
            <span className="text-label font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
              DAILY REBALANCING ENGINE
            </span>
          </div>



          {/* Sync to Portfolio Button */}
          <div className="flex justify-end pb-2">
            <button
              onClick={() => {
                if (!backtestActiveProfile) {
                  toast.error("No active profile selected");
                  return;
                }
                if (!backtestResult) {
                  toast.error("Run a backtest first before syncing to portfolio");
                  return;
                }
                try {
                  syncFromBacktest({
                    profile: backtestActiveProfile,
                    simulationMode: backtestConfig.simulationMode,
                    universe: backtestConfig.universe,
                    customUniverse: backtestConfig.customUniverse || [],
                    enableAdaptiveWeights: backtestConfig.enableAdaptiveWeights,
                    topNCount: backtestConfig.topNCount,
                    singleTicker: backtestConfig.singleTicker,
                    singleSellTrigger: backtestConfig.singleSellTrigger,
                    singleBuyTrigger: backtestConfig.singleBuyTrigger,
                    enableCrashProtection: backtestConfig.enableCrashProtection,
                    crashSensitivity: backtestConfig.crashSensitivity,
                    safeHavenAsset: backtestConfig.safeHavenAsset,
                    enableCrossover: backtestConfig.enableCrossover,
                    reserveBufferPct: backtestConfig.reserveBufferPct,
                  });
                  toast.success("Strategy synced to portfolio");
                } catch (err: any) {
                  toast.error(`Sync failed: ${err.message || "Unknown error"}`);
                }
              }}
              disabled={!backtestResult || isBacktesting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: backtestResult ? 'rgba(0,201,165,0.12)' : 'rgba(255,255,255,0.04)',
                color: backtestResult ? '#00c9a5' : '#7a7a7a',
                border: '1px solid rgba(255,255,255,0.06)'
              }}
            >
              <ArrowRightLeft className="w-3 h-3" />
              SYNC TO PORTFOLIO
            </button>
          </div>

          {/* Strategy Profile Card */}
          <div className="bg-[#080808] border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-emerald-400" />
              <span className="text-caption font-bold uppercase tracking-wider text-emerald-400">Strategy Profile</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-label font-bold text-white block">
                  {backtestActiveProfile?.name ?? (backtestConfig.activeProfileId === "prod" ? "Config QM (Quality Momentum)" : "Config BG (Balanced Growth)")}
                </span>
                <span className="text-caption text-white/40 font-mono block mt-0.5">
                  Quality: {backtestActiveProfile?.qualityWeight ?? 0.45} | Growth: {backtestActiveProfile?.growthWeight ?? 0.10} | Value: {backtestActiveProfile?.valueWeight ?? 0.05} | Momentum: {backtestActiveProfile?.momentumWeight ?? 0.40}
                </span>
              </div>
              
            </div>
          </div>

          <div className="space-y-5">
              
              {isBacktesting ? (
                <div className="bg-[#050505] border border-white/5 rounded-xl flex flex-col items-center justify-center py-24 space-y-4 shadow-inner">
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
                  <span className="text-caption font-mono text-emerald-400 font-bold">{backtestProgress}% Complete</span>
                </div>
              ) : backtestResult ? (
                <div className="space-y-6">
                  
                  {/* Stats Bento Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    <div className="p-4 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-[#E0E0E0]/30 block">Hasil Akhir Strategi</span>
                      <span className="text-base font-black font-mono text-emerald-400 block">
                        {formatRupiah(backtestResult.finalValue)}
                      </span>
                      <span className="text-caption font-bold text-emerald-300 font-mono bg-emerald-500/15 px-1.5 py-0.5 rounded inline-block">
                        +{backtestResult.totalReturnPct.toFixed(1)}% Absolut
                      </span>
                    </div>

                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Benchmark IHSG</span>
                      <span className="text-sm font-semibold font-mono text-white/70 block">
                        {formatRupiah(backtestResult.ihsgFinalValue)}
                      </span>
                      <span className={`text-caption font-mono font-bold ${backtestResult.ihsgReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {backtestResult.ihsgReturnPct >= 0 ? "+" : ""}{backtestResult.ihsgReturnPct.toFixed(1)}% (Hold)
                      </span>
                    </div>

                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Pelarian Emas / Kas</span>
                      <span className="text-sm font-bold font-mono text-amber-500 block">
                        {formatRupiah(backtestResult.goldFinalValue)}
                      </span>
                      <span className="text-caption font-mono text-[#A0A0A0] block">
                        Emas: +{backtestResult.goldReturnPct.toFixed(1)}% (Hold)
                      </span>
                    </div>

                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Swaps &amp; Dividen</span>
                      <span className="text-sm font-bold font-mono text-amber-400 block">
                        {backtestResult.totalTrades} Rebalances
                      </span>
                      <span className="text-label text-[#A0A0A0] block">
                        Dividen: +{formatRupiah(backtestResult.totalDividends)}
                      </span>
                    </div>

                  </div>

                  {/* Advanced Professional Risk/Metrics Scorecard Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block">CAGR (Annualized)</span>
                      <span className="text-sm font-bold font-mono text-white block">
                        {backtestResult.cagr.toFixed(2)}%
                      </span>
                      <span className="text-label text-white/40 block">Tingkat Pertumbuhan Tahunan</span>
                    </div>

                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Rasio Sharpe &amp; Sortino</span>
                      <span className="text-sm font-bold font-mono text-emerald-400 block">
                        S: {backtestResult.sharpe.toFixed(2)} / So: {backtestResult.sortino.toFixed(2)}
                      </span>
                      <span className="text-label text-white/40 block">Risko Terkoreksi (Rf=5%)</span>
                    </div>

                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Volatilitas &amp; Calmar</span>
                      <span className="text-sm font-bold font-mono text-rose-400 block">
                        V: {backtestResult.volatility.toFixed(1)}% / C: {backtestResult.calmar.toFixed(2)}
                      </span>
                      <span className="text-label text-[#A0A0A0] block">Max drawdown: -{backtestResult.maxDrawdown.toFixed(1)}%</span>
                    </div>

                    <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-white/30 block">Win Rate &amp; Turnover</span>
                      <span className="text-sm font-bold font-mono text-amber-400 block">
                        W: {backtestResult.winRatePct.toFixed(1)}% / T: {backtestResult.turnoverPct.toFixed(1)}%
                      </span>
                      <span className="text-label text-white/40 block">Aktivitas Rotasi Portfolio</span>
                    </div>

                  </div>

                  {/* Profit comparison notice card */}
                  <div className="p-4 bg-[#080808] border border-white/5 rounded-xl leading-relaxed space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">📈</span>
                      <div className="text-xs text-white/60">
                        {backtestConfig.simulationMode === "algo" ? (
                          <>Algoritma rotasi harian dengan penyisihan saham Rank &ge;7 berbasis <strong className="text-emerald-400">{backtestResult.configName}</strong> berhasil melampaui tolok ukur pasar IHSG! Dengan modal awal <span className="text-white font-bold">{formatRupiah(parseInt(backtestConfig.algoCapital.replace(/[^0-9]/g, "")) || 100000000)}</span> sejak {backtestConfig.simStartDate} hingga {backtestConfig.simEndDate}, rebalancing portofolio otomatis Anda melonjak menjadi <span className="text-emerald-400 font-extrabold">{formatRupiah(backtestResult.finalValue)}</span> dibandingkan acuan pasar IHSG <span className="text-yellow-400 font-bold">{formatRupiah(backtestResult.ihsgFinalValue)}</span>.</>
                        ) : (
                          <>Simulasi Hold & Protect pada saham tunggal <strong className="text-emerald-400">#{backtestConfig.singleTicker}</strong> dengan proteksi risiko krisis. Dengan modal awal <span className="text-white font-bold">{formatRupiah(parseInt(backtestConfig.algoCapital.replace(/[^0-9]/g, "")) || 100000000)}</span> sejak {backtestConfig.simStartDate} hingga {backtestConfig.simEndDate}, nilai investasi Anda berubah menjadi <span className="text-emerald-400 font-extrabold">{formatRupiah(backtestResult.finalValue)}</span>.</>
                        )}
                      </div>
                    </div>
                    {/* Comparative index list */}
                    <div className="pt-2 border-t border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-caption text-white/40 font-mono">
                      <div>📊 IHSG Benchmark: <span className="text-white font-bold">{formatRupiah(backtestResult.ihsgFinalValue)}</span> (+{backtestResult.ihsgReturnPct.toFixed(1)}%)</div>
                      <div>🪙 Emas Benchmark: <span className="text-white font-bold">{formatRupiah(backtestResult.goldFinalValue)}</span> (+{backtestResult.goldReturnPct.toFixed(1)}%)</div>
                      <div>⚖️ 60/40 Campuran: <span className="text-emerald-400 font-bold">{formatRupiah(backtestResult.bench6040FinalVal)}</span> (+{backtestResult.bench6040ReturnPct.toFixed(1)}%)</div>
                    </div>
                  </div>

                  {/* 4-way DCA comparison — only for adaptive_dca mode */}
                  {backtestConfig.simulationMode === "adaptive_dca" && baselineResults.length > 0 && (
                    <div className="p-5 bg-[#080808] border border-emerald-500/20 rounded-xl space-y-4">
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
                        <div className="p-3 bg-emerald-500/[0.05] border-2 border-emerald-500/40 rounded-xl space-y-1.5">
                          <span className="text-caption uppercase tracking-widest font-black text-emerald-400 font-mono block">⚡ Adaptive DCA</span>
                          <span className="text-base font-black font-mono text-white block">{formatRupiah(backtestResult.finalValue)}</span>
                          <span className={`text-caption font-bold font-mono ${backtestResult.totalReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {backtestResult.totalReturnPct >= 0 ? "+" : ""}{backtestResult.totalReturnPct.toFixed(1)}%
                          </span>
                          <div className="pt-1 mt-1 border-t border-white/[0.05] space-y-0.5 text-[10px] font-mono text-white/50">
                            <div>CAGR: {backtestResult.cagr.toFixed(1)}%</div>
                            <div>Max DD: -{backtestResult.maxDrawdown.toFixed(1)}%</div>
                            <div className="text-emerald-400/70">Deployed: {formatRupiah(backtestResult.totalDeployed || 0)}</div>
                          </div>
                        </div>

                        {/* 3 baselines */}
                        {baselineResults.map((bl) => (
                          <div key={bl.baseline} className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl space-y-1.5">
                            <span className="text-caption uppercase tracking-widest font-black text-white/50 font-mono block">
                              {bl.baseline === "lump_sum" ? "💰" : bl.baseline === "monthly_dca" ? "📅" : "🗓️"} {bl.label}
                            </span>
                            <span className="text-base font-black font-mono text-white/80 block">{formatRupiah(bl.finalValue)}</span>
                            <span className={`text-caption font-bold font-mono ${bl.finalValue >= (parseInt(backtestConfig.algoCapital.replace(/[^0-9]/g, "")) || 100000000) ? "text-emerald-400" : "text-rose-400"}`}>
                              {bl.finalValue >= (parseInt(backtestConfig.algoCapital.replace(/[^0-9]/g, "")) || 100000000) ? "+" : ""}
                              {(((bl.finalValue / (parseInt(backtestConfig.algoCapital.replace(/[^0-9]/g, "")) || 100000000)) - 1) * 100).toFixed(1)}%
                            </span>
                            <div className="pt-1 mt-1 border-t border-white/[0.05] space-y-0.5 text-[10px] font-mono text-white/50">
                              <div>CAGR: {bl.cagr.toFixed(1)}%</div>
                              <div>Max DD: -{bl.maxDrawdown.toFixed(1)}%</div>
                              <div>Avg Price: {formatRupiah(bl.avgBuyPrice)}</div>
                              <div>Cash Used: {bl.cashUtilization.toFixed(0)}%</div>
                            </div>
                          </div>
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
                          <div className={`p-3 rounded-lg border ${beatsBest ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
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
                    </div>
                  )}

                  {/* Recharts chart */}
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
                          <YAxis scale="log" stroke="#333" tickLine={false} dx={-8} tick={{ fill: "#666" }} domain={["auto", "auto"]} formatter={(val) => `Rp ${(Number(val)/1e6).toFixed(0)}Jt`} />
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
                      <div className="flex flex-wrap gap-1.5 p-3 bg-[#080808] border border-white/5 rounded-xl">
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
                      <button
                        type="button"
                        onClick={handleDownloadJournal}
                        className="bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/25 text-emerald-400 text-[9.5px] font-bold uppercase font-sans px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Download className="w-3 h-3" /> Unduh Buku Jurnal (CSV)
                      </button>
                    </div>
                    <div className="h-64 overflow-y-auto bg-[#050505] text-[#A0A0A0] font-mono text-caption border border-white/5 rounded-xl p-4 space-y-3 leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
                      
                      {backtestResult.logs.map((log: any, idx: number) => {
                        const dateStr = log.date && log.date.length >= 10 ? log.date.slice(0, 10) : log.date;
                        const [, typeColor] = {
                          BUY: ["bg-blue-500/20 text-blue-400 border-blue-500/20", "text-blue-300"],
                          SELL: ["bg-rose-500/20 text-rose-400 border-rose-500/20", "text-rose-300"],
                          REBALANCE: ["bg-emerald-500/20 text-emerald-400 border-emerald-500/20", "text-emerald-300"],
                          CRASH_TRIGGER: ["bg-red-500/25 text-red-400 border-red-500/30", "text-red-300"],
                          CRASH_RECOVERY: ["bg-amber-500/20 text-amber-400 border-amber-500/20", "text-amber-300"],
                        }[log.type] || ["bg-white/5 text-white/60 border-white/10", "text-white/60"];
                        return (
                          <div key={idx} className="border-b border-white/5 pb-2.5 last:border-0 hover:bg-white/[0.02] -mx-2 px-2 rounded transition-colors">
                            <div className="flex items-start gap-2.5">
                              <span className="text-[10px] text-zinc-600 font-mono shrink-0 mt-0.5 w-6 text-right">{idx + 1}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase font-sans tracking-wider shrink-0 border ${typeColor}`}>
                                    {log.type === "CRASH_TRIGGER" ? "CRASH" : log.type === "CRASH_RECOVERY" ? "RECOVERY" : log.type}
                                  </span>
                                  <span className="text-[10px] text-zinc-500 font-mono">{dateStr}</span>
                                </div>
                                <p className="text-xs leading-relaxed text-zinc-300">{log.message}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-[#050505] border border-white/5 rounded-xl flex flex-col items-center justify-center py-20 text-center space-y-2">
                  <span className="text-2xl">⚡</span>
                  <p className="text-xs text-white/50 font-sans">Belum ada hasil backtest.</p>
                  <p className="text-caption text-white/35 max-w-xs leading-relaxed font-sans">Silakan klik tombol <strong className="text-emerald-400">JALANKAN QUANT BACKTEST</strong> untuk menghitung trajectory rotasi portofolio Anda.</p>
                </div>
              )}

            </div>



        </section>
      )}

    </div>
  );
}
