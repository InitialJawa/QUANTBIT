import React, { useState, FormEvent, useEffect } from "react";
import { StockData, PortfolioItem, WatchlistItem } from "../types";
import { STOCKS_DATA } from "../stocksData";
import { SearchableSelect } from "./SearchableSelect";
import { TickerLogo } from "./TickerLogo";
import { EX, getProcessedLeaders, MKT } from "../marketData";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Briefcase, 
  Eye, 
  Wallet, 
  FileSpreadsheet, 
  ArrowRight,
  ArrowRightLeft,
  Sparkles,
  ShoppingBag,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Settings,
  ShieldAlert,
  HelpCircle,
  Download
} from "lucide-react";
import { motion } from "motion/react";

interface PortfolioTrackerProps {
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  onAddTransaction: (ticker: string, shares: number, buyPrice: number) => void;
  onRemoveTransaction: (ticker: string) => void;
  onSellTransaction: (ticker: string, shares: number) => void;
  onSelectStock: (ticker: string) => void;
  onToggleWatchlist: (ticker: string) => void;
  getDynamicStock: (ticker: string) => StockData | null;
  activeConfig: "prod" | "res";
  cash: number;
  setCash: React.Dispatch<React.SetStateAction<number>>;
  tradeLogs: any[];
  setTradeLogs: React.Dispatch<React.SetStateAction<any[]>>;
}

export function PortfolioTracker({ 
  portfolio, 
  watchlist, 
  onAddTransaction, 
  onRemoveTransaction,
  onSellTransaction,
  onSelectStock, 
  onToggleWatchlist,
  getDynamicStock,
  activeConfig,
  cash,
  setCash,
  tradeLogs,
  setTradeLogs
}: PortfolioTrackerProps) {
  const visibleStocks = STOCKS_DATA.map(s => getDynamicStock(s.ticker) || s);
  const [selectedTicker, setSelectedTicker] = useState(visibleStocks[0].ticker);
  const [sharesStr, setSharesStr] = useState("1000");
  const [customPriceStr, setCustomPriceStr] = useState("");
  const [sellInputs, setSellInputs] = useState<Record<string, string>>({});
  const [watchlistTicker, setWatchlistTicker] = useState(visibleStocks[0]?.ticker || "");
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [editCashStr, setEditCashStr] = useState("");
  const [isSettingsLocked, setIsSettingsLocked] = useState(true);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Persistent Engine Config
  const [engineConfig, setEngineConfig] = useState(() => {
    let parsed = {};
    try {
      const saved = localStorage.getItem("idx_engine_config");
      if (saved) {
        parsed = JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to parse engine config from localStorage:", e);
    }
    return {
      activeConfig: activeConfig || "prod",
      safeHavenAsset: "emas",
      topNCount: 5,
      qualityWeight: 0.25,
      growthWeight: 0.10,
      valueWeight: 0.30,
      momentumWeight: 0.35,
      enableCrashProtection: true,
      crashSensitivity: 10,
      enableCrossover: true,
      reserveBufferPct: 10,
      simulationMode: "algo",
      singleTicker: "BBCA",
      singleSellTrigger: 8,
      singleBuyTrigger: 5,
      ...parsed
    };
  });

  // Sync back helper updates parents as well
  const saveStateToBackend = (updatedCash: number, updatedConfig: any, updatedLogs: any) => {
    setCash(updatedCash);
    setTradeLogs(updatedLogs);
    setEngineConfig(updatedConfig);

    localStorage.setItem("idx_cash", String(updatedCash));
    localStorage.setItem("idx_engine_config", JSON.stringify(updatedConfig));
    localStorage.setItem("idx_trade_logs", JSON.stringify(updatedLogs));

    fetch("/api/engine/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        portfolio,
        watchlist,
        cash: updatedCash,
        config: updatedConfig,
        tradeLogs: updatedLogs
      })
    }).catch((err) => console.warn("Failed to persist to standard full-stack server:", err));
  };

  const calculateTradeDetails = (type: string, ticker: string, shares: number, price: number) => {
    if (type === "DEPOSIT" || type === "WITHDRAWAL") {
      return { gross: shares, slippage: 0, fee: 0, tax: 0, net: shares };
    }
    const gross = shares * price;
    if (ticker === "EMAS" || ticker === "GOLD") {
      const slippage = gross * 0.02; // Standard 2% physical split
      const fee = 0;
      const tax = 0;
      const net = type.startsWith("BUY") ? gross + slippage : gross - slippage;
      return { gross, slippage, fee, tax, net };
    }
    
    const SLIPPAGE_RATE = 0.0005; // 0.05% spread / slippage
    const BUY_FEE_RATE = 0.0015; // 0.15% brokerage admin fee
    const SELL_FEE_RATE = 0.0025; // 0.25% brokerage admin fee
    const TAX_RATE = 0.0010; // 0.10% transaction tax (Sales tax)

    if (type.startsWith("BUY")) {
      const priceWithSlippage = price * (1 + SLIPPAGE_RATE);
      const slippage = price * SLIPPAGE_RATE * shares;
      const fee = priceWithSlippage * BUY_FEE_RATE * shares;
      const tax = 0;
      const net = (priceWithSlippage * shares) + fee;
      return { gross, slippage, fee, tax, net };
    } else {
      const priceWithSlippage = price * (1 - SLIPPAGE_RATE);
      const slippage = price * SLIPPAGE_RATE * shares;
      const fee = priceWithSlippage * SELL_FEE_RATE * shares;
      const tax = priceWithSlippage * TAX_RATE * shares;
      const net = (priceWithSlippage * shares) - fee - tax;
      return { gross, slippage, fee, tax, net };
    }
  };

  const updateConfigValue = (key: string, value: any) => {
    const nextConfig = { ...engineConfig, [key]: value };
    if (key === "activeConfig") {
      if (value === "prod") {
        nextConfig.qualityWeight = 0.25;
        nextConfig.growthWeight = 0.10;
        nextConfig.valueWeight = 0.30;
        nextConfig.momentumWeight = 0.35;
      } else if (value === "res") {
        nextConfig.qualityWeight = 0.25;
        nextConfig.growthWeight = 0.30;
        nextConfig.valueWeight = 0.10;
        nextConfig.momentumWeight = 0.35;
      }
    }
    setEngineConfig(nextConfig);
    saveStateToBackend(cash, nextConfig, tradeLogs);
  };

  const isIHSGInCrisis = engineConfig.enableCrashProtection !== false && MKT.ihsg.monthly <= -(engineConfig.crashSensitivity ?? 10);

  const currentSelectedStock = visibleStocks.find(s => s.ticker === selectedTicker) || visibleStocks[0];

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    const sharesNum = parseInt(sharesStr);
    const priceNum = customPriceStr ? parseFloat(customPriceStr) : currentSelectedStock.currentPrice;

    if (isNaN(sharesNum) || sharesNum <= 0) return;

    const details = calculateTradeDetails("BUY", selectedTicker, sharesNum, priceNum);
    if (details.net > cash) {
      setNotification({
        message: `Saldo Kas tidak mencukupi! Diperlukan Rp ${Math.round(details.net).toLocaleString()} (Termasuk Admin Fee 0.15% & Spread 0.05%), Saldo Kas: Rp ${cash.toLocaleString()}`,
        type: "error"
      });
      return;
    }

    onAddTransaction(selectedTicker, sharesNum, priceNum);
    const nextCash = cash - details.net;
    setCash(nextCash);
    
    const logId = "log-" + Date.now();
    const nextLogs = [{
      id: logId,
      type: "BUY",
      ticker: selectedTicker,
      shares: sharesNum,
      price: priceNum,
      timestamp: new Date().toISOString()
    }, ...tradeLogs];
    setTradeLogs(nextLogs);
    saveStateToBackend(nextCash, engineConfig, nextLogs);
    
    setSharesStr("1000");
    setCustomPriceStr("");
    setNotification({
      message: `Berhasil membeli ${sharesNum.toLocaleString()} lembar saham #${selectedTicker} senilai Rp ${Math.round(details.net).toLocaleString()}.`,
      type: "success"
    });
  };

  // Calculations
  let totalInvestment = 0;
  let totalCurrentValue = 0;

  // Sync market rank with Leaders tab actively based on exact active config weights
  const processedLeaders = getProcessedLeaders(visibleStocks, engineConfig.activeConfig);

  const getStockRankAndScore = (ticker: string) => {
    const leaderIdx = processedLeaders.findIndex(r => r.ticker.replace(".JK", "").toUpperCase() === ticker.toUpperCase());
    const rank = leaderIdx !== -1 ? leaderIdx + 1 : 99;
    const score = leaderIdx !== -1 ? processedLeaders[leaderIdx].score.toFixed(1) : "50.0";
    return { rank, score };
  };

  const enrichedPortfolio = portfolio.map((item) => {
    const liveStock = visibleStocks.find(s => s.ticker === item.ticker);
    const currentPrice = liveStock ? liveStock.currentPrice : item.buyPrice;
    
    const originalCost = item.shares * item.buyPrice;
    const valueNow = item.shares * currentPrice;
    const profitOrLoss = valueNow - originalCost;
    const percentChange = (profitOrLoss / originalCost) * 100;

    totalInvestment += originalCost;
    totalCurrentValue += valueNow;

    const rankInfo = getStockRankAndScore(item.ticker);

    return {
      ...item,
      companyName: liveStock ? liveStock.name : item.ticker,
      logoColor: liveStock ? liveStock.logoColor : "bg-gray-400",
      currentPrice,
      originalCost,
      valueNow,
      profitOrLoss,
      percentChange,
      rank: rankInfo.rank,
      score: rankInfo.score
    };
  });

  const totalReturn = totalCurrentValue - totalInvestment;
  const totalReturnPercent = totalInvestment > 0 ? (totalReturn / totalInvestment) * 100 : 0;

  // Pie chart calculation
  const sectorAllocation = enrichedPortfolio.reduce((acc, item) => {
    const liveStock = visibleStocks.find(s => s.ticker === item.ticker);
    const sector = liveStock ? liveStock.sector : 'Lainnya';
    acc[sector] = (acc[sector] || 0) + item.valueNow;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(sectorAllocation)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444', '#14B8A6', '#6366F1'];

  const portfolioWarnings = enrichedPortfolio.filter(item => {
    const liveStock = visibleStocks.find(s => s.ticker === item.ticker);
    const drop = liveStock ? liveStock.change : 0;
    const exData = EX.find(e => e.ticker.split('.')[0] === item.ticker);
    const isExitStatic = exData && (exData.exit_state === "EXIT" || exData.exit_state === "EXIT RISK");
    const isExitLive = drop <= -0.5;
    const outOfTop5 = item.rank > engineConfig.topNCount;
    return isExitStatic || isExitLive || (engineConfig.enableCrossover !== false && outOfTop5);
  });

  // Automated Rebalancing Alerts Generator
  const topNTargetStocks = processedLeaders.slice(0, engineConfig.topNCount);
  
  const activeAlerts = (() => {
    const list: {
      id: string;
      type: "BUY" | "SELL" | "EXIT_SIGNAL";
      ticker: string;
      name: string;
      price: number;
      shares: number;
      reason: string;
      badge: string;
    }[] = [];

    if (isIHSGInCrisis) {
      // 1. In crisis, recommend liquidating all stocks to Safe Haven asset
      portfolio.forEach(item => {
        const stock = visibleStocks.find(s => s.ticker === item.ticker);
        const price = stock ? stock.currentPrice : item.buyPrice;
        list.push({
          id: `crisis-sell-${item.ticker}`,
          type: "SELL",
          ticker: item.ticker,
          name: stock ? stock.name : item.ticker,
          price,
          shares: item.shares,
          reason: `Fase Krisis Hack/Crash Aktif (Drawdown IHSG ${MKT.ihsg.monthly.toFixed(1)}%). Segera lakukan proteksi kapital.`,
          badge: "LIQUIDATE / CASH OUT"
        });
      });

      if (engineConfig.safeHavenAsset === "emas" && cash > 10000) {
        list.push({
          id: "crisis-buy-gold",
          type: "BUY",
          ticker: "EMAS",
          name: "Logam Mulia (Safe Haven)",
          price: MKT.gold.value,
          shares: Math.floor(cash / MKT.gold.value),
          reason: `Alokasikan sisa tunai Rp ${cash.toLocaleString()} ke Safe Haven Emas untuk perlindungan nilai 10 tahun kedepan.`,
          badge: "SAFE-HAVEN PROTECT"
        });
      }
    } else if (engineConfig.simulationMode === "single") {
      // 2. Single Stock mode normal regime checks
      const targetTicker = engineConfig.singleTicker || "BBCA";
      const stock = visibleStocks.find(s => s.ticker === targetTicker);
      const targetOwned = portfolio.find(p => p.ticker === targetTicker);

      // Recommend liquidating non-target stocks
      portfolio.forEach(item => {
        if (item.ticker !== targetTicker) {
          const itemStock = visibleStocks.find(s => s.ticker === item.ticker);
          const price = itemStock ? itemStock.currentPrice : item.buyPrice;
          list.push({
            id: `sell-non-target-${item.ticker}`,
            type: "SELL",
            ticker: item.ticker,
            name: itemStock ? itemStock.name : item.ticker,
            price,
            shares: item.shares,
            reason: `Kebijakan Single Stock: Emiten non-target #${item.ticker} perlu dilikuidasi untuk memusatkan kapital pada saham tunggal #${targetTicker}.`,
            badge: "LILKUIDASI ASET"
          });
        }
      });

      if (targetOwned && stock) {
        const buyPrice = targetOwned.buyPrice;
        const currentPrice = stock.currentPrice;
        const pctDiff = ((currentPrice - buyPrice) / buyPrice) * 100;
        const isCrashProtectionEnabled = engineConfig.enableCrashProtection !== false;

        if (isCrashProtectionEnabled && pctDiff <= -engineConfig.singleSellTrigger) {
          list.push({
            id: `crisis-sell-single-${targetTicker}`,
            type: "SELL",
            ticker: targetTicker,
            name: stock.name,
            price: currentPrice,
            shares: targetOwned.shares,
            reason: `Proteksi Kerugian Aktif: Saham tunggal #${targetTicker} anjlok ${pctDiff.toFixed(1)}% di bawah harga rata-rata beli (Batas toleransi: -${engineConfig.singleSellTrigger}%). Amankan posisi ke ${engineConfig.safeHavenAsset === "emas" ? "Emas Fisik (LM)" : "Kas Tunai"} segera.`,
            badge: "RISK OFF SELL"
          });

          if (engineConfig.safeHavenAsset === "emas" && cash > 10000) {
            list.push({
              id: "single-buy-gold",
              type: "BUY",
              ticker: "EMAS",
              name: "Logam Mulia (Safe Haven)",
              price: MKT.gold.value,
              shares: Math.floor(cash / MKT.gold.value),
              reason: `Alokasikan sisa tunai Rp ${cash.toLocaleString()} ke Safe Haven Emas untuk perlindungan nilai selama risk-off.`,
              badge: "SAFE-HAVEN PROTECT"
            });
          }
        }
      } else if (!targetOwned && stock) {
        // Recommend buying single target stock
        const totalPortfolioVal = cash + totalCurrentValue;
        const bufferPct = engineConfig.reserveBufferPct ?? 10;
        const bufferCash = totalPortfolioVal * (bufferPct / 100);
        const maxInvestableCash = Math.max(0, cash - bufferCash);

        const countShares = Math.floor(maxInvestableCash / stock.currentPrice);
        const lots = Math.floor(countShares / 100);
        const finalShares = lots * 100;

        if (finalShares > 0) {
          list.push({
            id: `buy-single-${targetTicker}`,
            type: "BUY",
            ticker: targetTicker,
            name: stock.name,
            price: stock.currentPrice,
            shares: finalShares,
            reason: `Membangun Posisi Saham Tunggal: Alokasikan saldo IDR ekuitas bersih (dengan buffer ${bufferPct}%) ke emiten tunggal pilihan #${targetTicker}.`,
            badge: "INSTRUKSI BELI"
          });
        }
      }
    } else {
      // 3. Normal regime: check exits first
      portfolio.forEach(item => {
        const cleanT = item.ticker.toUpperCase().replace(".JK", "");
        const inTargets = topNTargetStocks.some(t => t.ticker.replace(".JK", "").toUpperCase() === cleanT);
        const exData = EX.find(e => e.ticker.replace(".JK", "").toUpperCase() === cleanT);
        const isExitStatic = exData && (exData.exit_state === "EXIT" || exData.exit_state === "EXIT RISK");
        
        const stock = visibleStocks.find(s => s.ticker === item.ticker);
        const price = stock ? stock.currentPrice : item.buyPrice;

        if (isExitStatic) {
          list.push({
            id: `sell-exit-${item.ticker}`,
            type: "EXIT_SIGNAL",
            ticker: item.ticker,
            name: stock ? stock.name : item.ticker,
            price,
            shares: item.shares,
            reason: `Memicu kriteria Exit Ops (${exData.exit_state === "EXIT" ? "Sinyal Jual Kuat" : "Risiko Tinggi Penurunan"}).`,
            badge: "EXIT REBALANCING"
          });
        } else if (!inTargets && engineConfig.enableCrossover !== false) {
          const rankInfo = getStockRankAndScore(item.ticker);
          list.push({
            id: `sell-rank-${item.ticker}`,
            type: "SELL",
            ticker: item.ticker,
            name: stock ? stock.name : item.ticker,
            price,
            shares: item.shares,
            reason: `Kebijakan Rotasi: Peringkat turun ke #${rankInfo.rank} (Batas Target: Top ${engineConfig.topNCount}).`,
            badge: "ROTASI OUT"
          });
        }
      });

      // Check buys from target leaders
      topNTargetStocks.forEach(target => {
        const cleanT = target.ticker.replace(".JK", "").toUpperCase();
        const alreadyOwned = portfolio.some(p => p.ticker.toUpperCase().replace(".JK", "") === cleanT);
        
        if (!alreadyOwned) {
          const stock = visibleStocks.find(s => s.ticker === target.ticker || s.ticker + ".JK" === target.ticker || s.ticker === cleanT);
          if (stock) {
            // Allocate spending respecting the cash buffer
            const totalPortfolioVal = cash + totalCurrentValue;
            const bufferPct = engineConfig.reserveBufferPct ?? 10;
            const bufferCash = totalPortfolioVal * (bufferPct / 100);
            const maxInvestableCash = Math.max(0, cash - bufferCash);

            const targetBudget = totalPortfolioVal / engineConfig.topNCount;
            const spend = Math.min(maxInvestableCash, targetBudget);
            const countShares = Math.floor(spend / stock.currentPrice);
            const lots = Math.floor(countShares / 100);
            const finalShares = lots * 100;

            if (finalShares > 0) {
              list.push({
                id: `buy-lead-${stock.ticker}`,
                type: "BUY",
                ticker: stock.ticker,
                name: stock.name,
                price: stock.currentPrice,
                shares: finalShares,
                reason: `Berada di peringkat premium #${target.rank} dalam Model ${engineConfig.activeConfig === "prod" ? "Config F" : "Config B"}.`,
                badge: "INSTRUKSI BELI"
              });
            }
          }
        }
      });
    }

    return list;
  })();

  return (
    <div id="portfolio-container" className="space-y-6">

      {/* Portfolio Tracker Content Layout */}

      {portfolioWarnings.length > 0 && (
        <div className="bg-[#0A0A0A] border border-rose-500/20 p-4 sm:p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <h3 className="text-sm uppercase font-extrabold tracking-widest font-sans">
              Peringatan Portofolio: Sinyal Keluar / Turun Peringkat
            </h3>
          </div>
          <p className="text-xs text-rose-200/70 font-sans max-w-3xl">
            Sistem mendeteksi satu atau lebih saham dalam portofolio Anda telah memicu sinyal jual atau tidak lagi berada dalam posisi unggulan (Top 5). Pertimbangkan untuk mengamankan keuntungan atau membatasi kerugian.
          </p>
          <div className="space-y-2 mt-2">
            {portfolioWarnings.map(item => {
              const liveStock = visibleStocks.find(s => s.ticker === item.ticker);
              const drop = liveStock ? liveStock.change : 0;
              const exData = EX.find(e => e.ticker.split('.')[0] === item.ticker);
              const isExitStatic = exData && exData.exit_state === "EXIT";
              const isExitRiskStatic = exData && exData.exit_state === "EXIT RISK";
              
              let reason = "";
              if (drop <= -2.2) reason = "Masuk zona EXIT secara LIVE (Penurunan Harian > -2.2%)";
              else if (drop <= -0.5) reason = "Dalam zona EXIT RISK secara LIVE (Penurunan Harian > -0.5%)";
              else if (isExitStatic) reason = "Masuk zona EXIT Historis (Sinyal Jual Terkonfirmasi)";
              else if (isExitRiskStatic) reason = "Dalam zona EXIT RISK Historis (Risiko Tinggi Penurunan)";
              else if (item.rank > 5) reason = `Terlempar dari Top 5 (Peringkat Saat Ini: ${item.rank})`;

              return (
                <div key={item.ticker} className="flex items-center gap-2.5 p-2 bg-rose-500/5 rounded-lg border border-rose-500/10">
                  <div className="px-2.5 py-1 bg-black/60 text-white font-mono font-bold text-[10px] rounded border border-rose-500/20">
                    {item.ticker}
                  </div>
                  <span className="text-xs text-rose-300 font-semibold">{reason}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Top Summary Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Kas */}
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-5 flex items-center justify-between shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="flex-1 mr-2">
            <span className="text-[9px] uppercase font-bold text-white/45 tracking-widest block">
              Saldo Kas (Uang Tunai)
            </span>
            {isEditingCash ? (
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-xs text-white/40 font-mono">Rp</span>
                <input
                  type="number"
                  value={editCashStr}
                  onChange={(e) => setEditCashStr(e.target.value)}
                  placeholder="Cth: Rp 5.000.000"
                  className="w-full text-xs px-2 py-1 rounded border border-white/10 outline-none focus:ring-1 focus:ring-blue-500 bg-[#121212] text-white font-mono"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    const typedAmt = parseInt(editCashStr);
                    if (!isNaN(typedAmt) && typedAmt >= 0) {
                      setCash(typedAmt);
                      saveStateToBackend(typedAmt, engineConfig, tradeLogs);
                      setIsEditingCash(false);
                    }
                  }}
                  className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-black font-extrabold text-[9px] rounded uppercase cursor-pointer transition-all shrink-0"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingCash(false)}
                  className="px-1.5 py-1 bg-white/5 hover:bg-white/10 text-white font-bold text-[9px] rounded uppercase cursor-pointer transition-all border border-white/10 shrink-0"
                >
                  Batal
                </button>
              </div>
            ) : (
              <div>
                <h4 className="text-xl font-bold text-[#E0E0E0] font-mono mt-1.5 flex items-baseline gap-1">
                  <span className="text-xs text-white/40">Rp</span>
                  {cash.toLocaleString("id-ID")}
                </h4>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[8px] font-semibold font-mono text-white/30">Ready to Deploy</span>
                  <button
                    onClick={() => {
                      setEditCashStr(String(cash));
                      setIsEditingCash(true);
                    }}
                    className="text-[8px] font-extrabold text-blue-450 text-blue-400 hover:text-blue-300 hover:underline cursor-pointer uppercase transition-all"
                  >
                    [ Ubah Saldo ]
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Modal */}
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-white/10" />
          <div>
            <span className="text-[9px] uppercase font-bold text-white/45 tracking-widest block">
              Modal Investasi Saham
            </span>
            <h4 id="portfolio-total-cost" className="text-xl font-bold text-white font-mono mt-1.5 flex items-baseline gap-1">
              <span className="text-xs text-white/40">Rp</span>
              {totalInvestment.toLocaleString("id-ID")}
            </h4>
            <span className="text-[8px] font-bold font-mono text-white/30 block mt-1">Cost-Basis Value</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Nilai Saat Ini */}
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/30" />
          <div>
            <span className="text-[9px] uppercase font-bold text-white/45 tracking-widest block">
              Nilai Saham Saat Ini
            </span>
            <h4 id="portfolio-current-value" className="text-xl font-bold text-emerald-400 font-mono mt-1.5 flex items-baseline gap-1">
              <span className="text-xs text-white/40">Rp</span>
              {totalCurrentValue.toLocaleString("id-ID")}
            </h4>
            <span className="text-[8px] font-bold font-mono text-emerald-500/40 block mt-1">Market Live Pricing</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Total Return */}
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" style={{ backgroundColor: totalReturn >= 0 ? "rgb(16, 185, 129)" : "rgb(239, 68, 68)" }} />
          <div>
            <span className="text-[9px] uppercase font-bold text-white/45 tracking-widest block">
              Total Keuntungan
            </span>
            <h4 id="portfolio-total-return" className={`text-xl font-bold font-mono mt-1.5 flex items-center gap-1.5 ${
              totalReturn >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              Rp {totalReturn.toLocaleString("id-ID")}
              <span className="text-xs font-semibold">
                ({totalReturn >= 0 ? "+" : ""}{totalReturnPercent.toFixed(2)}%)
              </span>
            </h4>
            <span className="text-[8px] font-bold font-mono text-white/30 block mt-1">P&amp;L Gain/Loss</span>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            totalReturn >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          }`}>
             {totalReturn >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active Holdings List Table */}
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-6 shadow-sm lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white/85 uppercase tracking-widest flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Portofolio Saham Aktif
            </h3>
            <span className="text-xs font-medium text-white/40">
              {portfolio.length} Saham Terpantau
            </span>
          </div>

          {enrichedPortfolio.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/10">
              <p className="text-white/40 text-xs font-sans">Belum ada saham di portofolio Anda. Gunakan Sinyal Rekomendasi Mesin di sebelah kanan untuk menyelaraskan aset.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-max">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-bold text-white/40 uppercase tracking-widest whitespace-nowrap">
                    <th className="pb-2 pr-3">Saham</th>
                    <th className="pb-2 px-3 text-center">Peringkat</th>
                    <th className="pb-2 px-3 text-right">Jumlah (Lembar)</th>
                    <th className="pb-2 px-3 text-right">Harga Beli / Saat Ini</th>
                    <th className="pb-2 pl-3 text-right">Nilai (Rp) / Keuntungan</th>
                    <th className="pb-2 w-[110px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px]">
                  {enrichedPortfolio.map((item, index) => {
                    const isPos = item.profitOrLoss >= 0;
                    return (
                      <tr key={index} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <TickerLogo ticker={item.ticker} size="sm" fallbackColor={item.logoColor} />
                            <div>
                              <button 
                                onClick={() => onSelectStock(item.ticker)}
                                className="font-bold text-white hover:text-emerald-400 block text-left font-sans cursor-pointer hover:underline text-xs"
                              >
                                {item.ticker}
                              </button>
                              <span className="text-[9px] text-white/40 block truncate max-w-40 font-sans">
                                {item.companyName}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold font-mono ${
                            item.rank <= engineConfig.topNCount ? "bg-emerald-500/10 text-emerald-400" :
                            item.rank <= 15 ? "bg-blue-500/10 text-blue-400" :
                            item.rank >= 40 ? "bg-rose-500/10 text-rose-400" : "bg-white/5 text-white/60"
                          }`}>
                            Peringkat {item.rank}
                          </span>
                          <span className="text-[8px] text-white/30 block mt-0.5 font-mono">Skor {item.score}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-white font-mono text-[11px]">
                          {item.shares.toLocaleString()} {item.ticker === "EMAS" || item.ticker === "GOLD" ? "gr" : "lbr"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-mono text-[9px] text-white/40">
                            Beli: Rp {item.buyPrice.toLocaleString()}
                          </div>
                          <div className="font-mono text-[11px] text-white mt-0.5 font-bold">
                            Live: Rp {item.currentPrice.toLocaleString()}
                          </div>
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <div className="font-bold text-white text-[11px] font-mono">
                            Rp {item.valueNow.toLocaleString()}
                          </div>
                          <div className={`text-[9.5px] font-bold mt-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded ${
                            isPos ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          }`}>
                            {isPos ? "+" : ""}
                            {item.profitOrLoss.toLocaleString()} ({isPos ? "+" : ""}{item.percentChange.toFixed(1)}%)
                          </div>
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2 sm:gap-1.5 opacity-100 transition-opacity">
                            <div className="flex items-center bg-black/40 border border-white/10 rounded overflow-hidden">
                              <input
                                type="number"
                                min="1"
                                max={item.shares}
                                value={sellInputs[item.ticker] || ""}
                                onChange={(e) => setSellInputs(prev => ({...prev, [item.ticker]: e.target.value}))}
                                placeholder="Lembar"
                                className="w-16 sm:w-16 bg-transparent text-white text-[9px] px-2 py-1 outline-none text-right font-mono"
                              />
                              <button
                                onClick={() => {
                                  const toSell = parseInt(sellInputs[item.ticker] || "0");
                                  if (toSell > 0 && toSell <= item.shares) {
                                    // Calculate cash recovery with detailed commission subtraction
                                    const details = calculateTradeDetails("SELL", item.ticker, toSell, item.currentPrice);
                                    onSellTransaction(item.ticker, toSell);
                                    const nextCash = cash + details.net;
                                    setCash(nextCash);
                                    const logId = "log-" + Date.now();
                                    const nextLogs = [{
                                      id: logId,
                                      type: "SELL",
                                      ticker: item.ticker,
                                      shares: toSell,
                                      price: item.currentPrice,
                                      timestamp: new Date().toISOString()
                                    }, ...tradeLogs];
                                    setTradeLogs(nextLogs);
                                    saveStateToBackend(nextCash, engineConfig, nextLogs);
                                    setSellInputs(prev => ({ ...prev, [item.ticker]: "" }));
                                  }
                                }}
                                className="px-2 py-1 text-[9px] font-bold uppercase text-white bg-rose-500 hover:bg-rose-600 cursor-pointer transition-colors"
                                title="Jual"
                              >
                                Jual
                              </button>
                            </div>
                            <button
                              onClick={() => {
                                // Full liquidate with commission fee and tax
                                const details = calculateTradeDetails("SELL", item.ticker, item.shares, item.currentPrice);
                                onRemoveTransaction(item.ticker);
                                const nextCash = cash + details.net;
                                setCash(nextCash);
                                const logId = "log-" + Date.now();
                                const nextLogs = [{
                                  id: logId,
                                  type: "SELL",
                                  ticker: item.ticker,
                                  shares: item.shares,
                                  price: item.currentPrice,
                                  timestamp: new Date().toISOString()
                                }, ...tradeLogs];
                                setTradeLogs(nextLogs);
                                saveStateToBackend(nextCash, engineConfig, nextLogs);
                              }}
                              className="p-1.5 text-white/60 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-400 rounded bg-white/5 cursor-pointer border border-white/10 transition-all flex items-center justify-center"
                              title="Likuidasi Penuh"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* TRANSAKSI MANDIRI (PILIHAN SAHAM INDIVIDUAL) */}
          <div className="bg-[#0A0A0A] p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <h4 className="text-xs font-bold text-white/85 uppercase tracking-widest flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
                Tambah Posisi Manual (Pilihan Saham Individual)
              </h4>
              <span className="text-[7.5px] font-mono px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/15 text-blue-400 rounded uppercase">
                Custom Trade
              </span>
            </div>
            
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              {/* Dropdown Saham Individual */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[9px] uppercase font-bold text-white/45 tracking-widest block font-sans">Sandi Saham (Ticker)</label>
                <SearchableSelect
                  value={selectedTicker}
                  options={visibleStocks.map((s) => ({ value: s.ticker, label: `${s.ticker} (${s.name})`, logoColor: s.logoColor }))}
                  onChange={(val) => setSelectedTicker(val)}
                />
              </div>

              {/* Volume Lembar (Shares) */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase font-bold text-white/45 tracking-widest block font-sans">Jumlah Lembar (Multiple 100)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={sharesStr}
                    onChange={(e) => setSharesStr(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-white/10 outline-none focus:ring-1 focus:ring-blue-500 bg-[#121212] text-white"
                  />
                  <span className="absolute right-3 top-2 text-[9px] font-mono text-white/40">
                    ({Math.round((parseInt(sharesStr) || 0) / 100)} Lot)
                  </span>
                </div>
              </div>

              {/* Execution Price or Live Price */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] uppercase font-bold text-white/45 tracking-widest block font-sans">Harga Eksekusi (Rp)</label>
                  <button
                    type="button"
                    onClick={() => setCustomPriceStr("")}
                    className="text-[7.5px] text-blue-400 uppercase font-black hover:underline tracking-wider cursor-pointer"
                  >
                    Pakai Live (Rp {currentSelectedStock.currentPrice.toLocaleString()})
                  </button>
                </div>
                <input
                  type="number"
                  placeholder={`Live: Rp ${currentSelectedStock.currentPrice.toLocaleString()}`}
                  value={customPriceStr}
                  onChange={(e) => setCustomPriceStr(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-white/10 outline-none focus:ring-1 focus:ring-blue-500 bg-[#121212] text-white"
                />
              </div>

              {/* Submit Button */}
              <div className="md:col-span-4 flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-[10px] px-6 py-2 rounded-lg uppercase tracking-wider cursor-pointer transition-all duration-150 flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10 h-[34px]"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" /> Eksekusi Beli Saham Individual
                </button>
              </div>
            </form>
            <p className="text-[8px] text-white/30 leading-normal">
              * Catatan: Saldo kas Anda akan didebet secara otomatis beserta biaya transaksi 0.15% dan estimasi spread 0.05% saat menambahkan transaksi manual.
            </p>
          </div>
        </div>

        {/* INTEGRATED PERSISTENT QUANT ENGINE COGNITIVE CONSOLE */}
        <div className="lg:col-span-4 space-y-6">
          
          <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-white/5">
              <h3 className="text-xs font-semibold text-white/85 uppercase tracking-widest flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-blue-400" />
                Mesin Kuantitatif Terpadu
              </h3>
              <button
                type="button"
                onClick={() => setIsSettingsLocked(!isSettingsLocked)}
                className={`text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 border ${
                  isSettingsLocked 
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20" 
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                }`}
              >
                {isSettingsLocked ? "🔒 Terkunci (Ubah)" : "🔓 Terbuka (Kunci)"}
              </button>
            </div>

            {/* Mode Rebalancing Selector */}
            <div className={`space-y-2 ${isSettingsLocked ? "opacity-60" : ""}`}>
              <span className="text-[9px] uppercase font-bold text-white/40 block tracking-widest">
                Mode Simulasi / Mesin
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSettingsLocked}
                  onClick={() => updateConfigValue("simulationMode", "algo")}
                  className={`py-2 px-3 rounded-lg text-[9.5px] font-bold uppercase transition-all tracking-wider cursor-pointer border flex flex-col items-center justify-center text-center ${
                    engineConfig.simulationMode !== "single"
                      ? "bg-[#2563EB]/10 border-[#2563EB]/30 text-blue-400 font-extrabold"
                      : "bg-[#121212] border-white/5 text-white/40 hover:text-white"
                  } disabled:cursor-not-allowed`}
                >
                  <span>Algo Rebalancer</span>
                  <span className="text-[7px] font-medium text-white/30 lowercase mt-0.5">Rotasi Multisektor</span>
                </button>
                <button
                  type="button"
                  disabled={isSettingsLocked}
                  onClick={() => updateConfigValue("simulationMode", "single")}
                  className={`py-2 px-3 rounded-lg text-[9.5px] font-bold uppercase transition-all tracking-wider cursor-pointer border flex flex-col items-center justify-center text-center ${
                    engineConfig.simulationMode === "single"
                      ? "bg-[#2563EB]/10 border-[#2563EB]/30 text-blue-400 font-extrabold"
                      : "bg-[#121212] border-white/5 text-white/40 hover:text-white"
                  } disabled:cursor-not-allowed`}
                >
                  <span>Single Stock</span>
                  <span className="text-[7px] font-medium text-white/30 lowercase mt-0.5">Fokus Emiten Tunggal</span>
                </button>
              </div>
            </div>

            {engineConfig.simulationMode === "single" ? (
              <>
                {/* Pilih Saham */}
                <div className={`space-y-1.5 ${isSettingsLocked ? "opacity-60" : ""}`}>
                  <span className="text-[9px] uppercase font-bold text-white/40 block tracking-widest">Pilih Saham (Single Stock)</span>
                  <SearchableSelect
                    value={engineConfig.singleTicker || "BBCA"}
                    options={visibleStocks.map((s) => ({ value: s.ticker, label: `${s.ticker} (${s.name})`, logoColor: s.logoColor }))}
                    onChange={(val) => updateConfigValue("singleTicker", val)}
                  />
                </div>

                {/* Sell Trigger */}
                <div className={`space-y-1.5 ${isSettingsLocked ? "opacity-60" : ""}`}>
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="uppercase font-bold text-white/40 tracking-widest">Jual Jika Turun (-8% default)</span>
                    <span className="font-mono font-bold text-rose-450 text-rose-400">-{engineConfig.singleSellTrigger ?? 8}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    step="1"
                    disabled={isSettingsLocked}
                    value={engineConfig.singleSellTrigger ?? 8}
                    onChange={(e) => updateConfigValue("singleSellTrigger", Number(e.target.value))}
                    className="w-full h-1 bg-[#1A1A1A] rounded-lg appearance-none cursor-pointer accent-rose-500 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Buy Trigger */}
                <div className={`space-y-1.5 ${isSettingsLocked ? "opacity-60" : ""}`}>
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="uppercase font-bold text-white/40 tracking-widest">Beli Kembali Jika Naik (+5% default)</span>
                    <span className="font-mono font-bold text-emerald-450 text-emerald-400">+{engineConfig.singleBuyTrigger ?? 5}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    step="1"
                    disabled={isSettingsLocked}
                    value={engineConfig.singleBuyTrigger ?? 5}
                    onChange={(e) => updateConfigValue("singleBuyTrigger", Number(e.target.value))}
                    className="w-full h-1 bg-[#1A1A1A] rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:cursor-not-allowed"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Presets Row */}
                <div className={`space-y-2 ${isSettingsLocked ? "opacity-60" : ""}`}>
                  <span className="text-[9px] uppercase font-bold text-white/40 block tracking-widest">
                    Strategi Penyaringan Model
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isSettingsLocked}
                      onClick={() => updateConfigValue("activeConfig", "prod")}
                      className={`py-2 px-3 rounded-lg text-[9.5px] font-bold uppercase transition-all tracking-wider cursor-pointer border flex flex-col items-center justify-center text-center ${
                        engineConfig.activeConfig === "prod"
                          ? "bg-[#2563EB]/10 border-[#2563EB]/30 text-blue-400"
                          : "bg-[#121212] border-white/5 text-white/40 hover:text-white"
                      } disabled:cursor-not-allowed`}
                    >
                      <span>Config F</span>
                      <span className="text-[7px] font-medium text-white/30 lowercase mt-0.5">Capital Protection</span>
                    </button>
                    <button
                      type="button"
                      disabled={isSettingsLocked}
                      onClick={() => updateConfigValue("activeConfig", "res")}
                      className={`py-2 px-3 rounded-lg text-[9.5px] font-bold uppercase transition-all tracking-wider cursor-pointer border flex flex-col items-center justify-center text-center ${
                        engineConfig.activeConfig === "res"
                          ? "bg-[#2563EB]/10 border-[#2563EB]/30 text-blue-400"
                          : "bg-[#121212] border-white/5 text-white/40 hover:text-white"
                      } disabled:cursor-not-allowed`}
                    >
                      <span>Config B</span>
                      <span className="text-[7px] font-medium text-white/30 lowercase mt-0.5">Alpha Recovery</span>
                    </button>
                  </div>
                </div>

                {/* Selection Limits Slider */}
                <div className={`space-y-1.5 ${isSettingsLocked ? "opacity-60" : ""}`}>
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="uppercase font-bold text-white/40 tracking-widest">Target Diversifikasi (Top N)</span>
                    <span className="font-mono font-black text-blue-400">Top {engineConfig.topNCount} Saham</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="7"
                    step="1"
                    disabled={isSettingsLocked}
                    value={engineConfig.topNCount}
                    onChange={(e) => updateConfigValue("topNCount", parseInt(e.target.value))}
                    className="w-full h-1 bg-[#1A1A1A] rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Rebalancing/Rotasi Rule (crossover rule) Toggle */}
                <div className={`space-y-1.5 ${isSettingsLocked ? "opacity-60" : ""}`}>
                  <span className="text-[9px] uppercase font-bold text-white/40 block tracking-widest">Rotasi Saham Jelek</span>
                  <div className="flex gap-1 bg-black/40 border border-white/5 p-0.5 rounded-lg font-mono">
                    <button
                      type="button"
                      disabled={isSettingsLocked}
                      onClick={() => updateConfigValue("enableCrossover", true)}
                      className={`flex-1 py-1 text-[8px] uppercase font-bold rounded transition-all cursor-pointer ${
                        engineConfig.enableCrossover !== false ? "bg-emerald-500/10 text-emerald-400" : "text-white/40 hover:text-white"
                      } disabled:cursor-not-allowed`}
                    >
                      Rank &lt; {engineConfig.topNCount + 2} Aktif
                    </button>
                    <button
                      type="button"
                      disabled={isSettingsLocked}
                      onClick={() => updateConfigValue("enableCrossover", false)}
                      className={`flex-1 py-1 text-[8px] uppercase font-bold rounded transition-all cursor-pointer ${
                        engineConfig.enableCrossover === false ? "bg-red-500/10 text-red-400" : "text-white/40 hover:text-white"
                      } disabled:cursor-not-allowed`}
                    >
                      Tanpa Rebalance
                    </button>
                  </div>
                </div>

                {/* Inline Weights Sliders */}
                <div className={`space-y-2 pt-1.5 border-t border-white/5 ${isSettingsLocked ? "opacity-60" : ""}`}>
                  <span className="text-[8px] uppercase tracking-wider font-bold text-white/35 block">Fine-Tune Metrik Bobot (Total: 100%)</span>
                  
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {/* Quality Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-mono text-white/45">
                        <span>Quality (Q)</span>
                        <span className="text-white/80">{Math.round(engineConfig.qualityWeight * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        disabled={isSettingsLocked}
                        value={engineConfig.qualityWeight}
                        onChange={(e) => updateConfigValue("qualityWeight", parseFloat(e.target.value))}
                        className="w-full h-0.5 bg-[#1F1F1F] rounded-lg appearance-none cursor-pointer accent-gray-400 disabled:cursor-not-allowed"
                      />
                    </div>
                    {/* Growth Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-mono text-white/45">
                        <span>Growth (G)</span>
                        <span className="text-white/80">{Math.round(engineConfig.growthWeight * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        disabled={isSettingsLocked}
                        value={engineConfig.growthWeight}
                        onChange={(e) => updateConfigValue("growthWeight", parseFloat(e.target.value))}
                        className="w-full h-0.5 bg-[#1F1F1F] rounded-lg appearance-none cursor-pointer accent-gray-400 disabled:cursor-not-allowed"
                      />
                    </div>
                    {/* Value Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-mono text-white/45">
                        <span>Value (V)</span>
                        <span className="text-white/80">{Math.round(engineConfig.valueWeight * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        disabled={isSettingsLocked}
                        value={engineConfig.valueWeight}
                        onChange={(e) => updateConfigValue("valueWeight", parseFloat(e.target.value))}
                        className="w-full h-0.5 bg-[#1F1F1F] rounded-lg appearance-none cursor-pointer accent-gray-400 disabled:cursor-not-allowed"
                      />
                    </div>
                    {/* Momentum Slider */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[8px] font-mono text-white/45">
                        <span>Momentum (M)</span>
                        <span className="text-white/80">{Math.round(engineConfig.momentumWeight * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        disabled={isSettingsLocked}
                        value={engineConfig.momentumWeight}
                        onChange={(e) => updateConfigValue("momentumWeight", parseFloat(e.target.value))}
                        className="w-full h-0.5 bg-[#1F1F1F] rounded-lg appearance-none cursor-pointer accent-gray-400 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Safeguard Preference */}
            <div className={`space-y-1.5 ${isSettingsLocked ? "opacity-60" : ""}`}>
              <div className="flex justify-between items-center">
                <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest flex items-center gap-1">
                  Safeguard Krisis Makro
                  <HelpCircle className="w-3 h-3 text-white/30" title="Aset perlindungan saat IHSG berada dalam krisis parah" />
                </span>
                <span className="text-[9px] font-mono font-bold text-[#F59E0B]">
                  {engineConfig.safeHavenAsset === "emas" ? "Emas Fisik (LM)" : "Kas Tunai"}
                </span>
              </div>
              <div className="flex items-center bg-black/40 border border-white/5 p-1 rounded-lg">
                <button
                  type="button"
                  disabled={isSettingsLocked}
                  onClick={() => updateConfigValue("safeHavenAsset", "emas")}
                  className={`flex-1 py-1 text-[9px] uppercase font-bold rounded transition-all cursor-pointer ${
                    engineConfig.safeHavenAsset === "emas" ? "bg-[#F59E0B]/20 text-[#F59E0B]" : "text-white/40 hover:text-white"
                  } disabled:cursor-not-allowed`}
                >
                  Amankan ke Emas
                </button>
                <button
                  type="button"
                  disabled={isSettingsLocked}
                  onClick={() => updateConfigValue("safeHavenAsset", "kas")}
                  className={`flex-1 py-1 text-[9px] uppercase font-bold rounded transition-all cursor-pointer ${
                    engineConfig.safeHavenAsset === "kas" ? "bg-white/10 text-[#F59E0B]" : "text-white/40 hover:text-white"
                  } disabled:cursor-not-allowed`}
                >
                  Tahan Kas Tunai
                </button>
              </div>
            </div>

            {/* Antisipasi IHSG Crash */}
            <div className={`space-y-1.5 ${isSettingsLocked ? "opacity-60" : ""}`}>
              <span className="text-[9px] uppercase font-bold text-white/40 block tracking-widest">Antisipasi IHSG Crash</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={isSettingsLocked}
                  onClick={() => updateConfigValue("enableCrashProtection", engineConfig.enableCrashProtection === false ? true : false)}
                  className={`px-2 py-1.5 text-[8.5px] uppercase font-bold rounded cursor-pointer border transition-all ${
                    engineConfig.enableCrashProtection !== false 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-extrabold" 
                      : "bg-white/5 border-white/10 text-white/30"
                  } disabled:cursor-not-allowed`}
                >
                  {engineConfig.enableCrashProtection !== false ? "PROTEKSI NYALA" : "OFF"}
                </button>
                <select
                  value={engineConfig.crashSensitivity ?? 10}
                  onChange={(e) => updateConfigValue("crashSensitivity", Number(e.target.value))}
                  disabled={isSettingsLocked || engineConfig.enableCrashProtection === false}
                  className="flex-1 text-[9.5px] p-1 bg-[#121212] border border-white/10 text-white font-bold rounded cursor-pointer disabled:opacity-45 outline-none font-mono"
                >
                  <option value="3">Sensitif (Turun 3% dlm 5 hari)</option>
                  <option value="5">Normal (Turun 5% dlm 5 hari)</option>
                  <option value="8">Moderat (Turun 8% dlm 5 hari)</option>
                  <option value="10">Konservatif (Turun 10% dlm 5 hari)</option>
                </select>
              </div>
            </div>

            {/* Slider for Reserve Buffer (Kas Buffer) */}
            <div className={`space-y-1.5 ${isSettingsLocked ? "opacity-60" : ""}`}>
              <div className="flex justify-between items-center text-[9px]">
                <span className="uppercase font-bold text-white/40 tracking-widest font-sans">Kas Buffer (Sisa Saldo)</span>
                <span className="font-mono font-bold text-emerald-400">{(engineConfig.reserveBufferPct ?? 10)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="5"
                disabled={isSettingsLocked}
                value={engineConfig.reserveBufferPct ?? 10}
                onChange={(e) => updateConfigValue("reserveBufferPct", Number(e.target.value))}
                className="w-full h-1 bg-[#1A1A1A] rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:cursor-not-allowed"
              />
              <span className="text-[7.5px] text-white/30 block leading-tight">Kas cadangan darurat yang tidak dibenamkan saham dlm otomatis rebalance.</span>
            </div>

            {/* Quick reset cash balance simulation */}
            <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[9px] text-white/40">
              <span>Capital Balance Sim</span>
              <button
                onClick={() => {
                  const resetAmt = 100000000;
                  setCash(resetAmt);
                  saveStateToBackend(resetAmt, engineConfig, tradeLogs);
                }}
                className="flex items-center gap-1 hover:text-white font-bold transition-colors cursor-pointer"
                title="Reset Cash to Rp 100m"
              >
                <RotateCcw className="w-2.5 h-2.5" /> Reset Rp 100jt
              </button>
            </div>
          </div>

          {/* DYNAMIC PENDING REBALANCING SIGNAL ALERTS (Direct Transaction Instruction) */}
          <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-semibold text-white/85 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              Sinyal Transaksi &amp; Rebalancing
            </h3>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
              {activeAlerts.length === 0 ? (
                <div className="p-4 text-center rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] text-emerald-300 font-extrabold uppercase tracking-wide">Aset Portofolio Ideal</span>
                  <p className="text-[9.5px] text-white/40 leading-relaxed max-w-xs">
                    Seluruh kepemilikan saham Anda saat ini telah selaras 100% dengan peringkat Model Kuantitatif yang berjalan.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activeAlerts.map((alertItem, idx) => {
                    const isBuy = alertItem.type === "BUY";
                    return (
                      <div
                        key={alertItem.id}
                        className={`p-3 rounded-xl border relative flex flex-col justify-between gap-3 text-left transition-all ${
                          isBuy
                            ? "bg-emerald-500/[0.03] border-emerald-500/20"
                            : "bg-rose-500/[0.03] border-rose-500/20"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className={`text-[8px] font-black font-mono tracking-wider px-1.5 py-0.5 rounded uppercase ${
                              isBuy ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" : "bg-rose-500/10 text-rose-450 text-rose-400 border border-rose-500/25"
                            }`}>
                              {alertItem.badge}
                            </span>
                            <h4 className="text-[11.5px] font-black text-white mt-1.5 flex items-baseline gap-1.5">
                              {alertItem.ticker}
                              <span className="text-[9.5px] font-medium text-white/40 truncate block max-w-[140px]">{alertItem.name}</span>
                            </h4>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-[8px] text-white/30 block font-bold uppercase">Harga Live</span>
                            <span className="text-[11px] font-bold text-white">Rp {alertItem.price.toLocaleString()}</span>
                          </div>
                        </div>

                        <p className="text-[10px] text-white/50 leading-relaxed font-medium">
                          {alertItem.reason}
                        </p>

                        <div className="flex border-t border-white/5 pt-2.5 mt-0.5 items-center justify-between gap-4">
                          <div className="font-mono">
                            <span className="text-[7.5px] text-white/30 block uppercase font-bold">Usulan Volume</span>
                            <span className="text-[11px] font-black text-[#A5F3FC]">
                              {alertItem.shares.toLocaleString()} {alertItem.ticker === "EMAS" || alertItem.ticker === "GOLD" ? "Gram" : "Lembar"}
                              {!(alertItem.ticker === "EMAS" || alertItem.ticker === "GOLD") && (
                                <span className="text-[9px] text-white/40 font-semibold lowercase"> ({Math.round(alertItem.shares / 100)} Lot)</span>
                              )}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              if (isBuy) {
                                // Manual transaction confirm: Buy Action
                                if (alertItem.ticker === "EMAS") {
                                  // buy physical gold simulation
                                  const details = calculateTradeDetails("BUY", "EMAS", alertItem.shares, alertItem.price);
                                  if (details.net > cash) {
                                    setNotification({
                                      message: "Saldo Kas tidak cukup untuk membeli Emas!",
                                      type: "error"
                                    });
                                    return;
                                  }
                                  const nextCash = cash - details.net;
                                  setCash(nextCash);
                                  const logId = "log-" + Date.now();
                                  const nextLogs = [{
                                    id: logId,
                                    type: "BUY_GOLD",
                                    ticker: "EMAS",
                                    shares: alertItem.shares,
                                    price: alertItem.price,
                                    timestamp: new Date().toISOString()
                                  }, ...tradeLogs];
                                  setTradeLogs(nextLogs);
                                  saveStateToBackend(nextCash, engineConfig, nextLogs);
                                  setNotification({
                                    message: `Berhasil mengalokasikan Rp ${Math.round(details.net).toLocaleString()} ke Safe Haven Emas (${alertItem.shares} gram).`,
                                    type: "success"
                                  });
                                } else {
                                  // standard Buy stock rebalance
                                  const details = calculateTradeDetails("BUY", alertItem.ticker, alertItem.shares, alertItem.price);
                                  if (details.net > cash) {
                                    setNotification({
                                      message: "Saldo Kas Tunai Anda tidak mencukupi untuk membeli minimum Lot bagi ticker " + alertItem.ticker + ". Diperlukan Rp " + Math.round(details.net).toLocaleString(),
                                      type: "error"
                                    });
                                    return;
                                  }
                                  onAddTransaction(alertItem.ticker, alertItem.shares, alertItem.price);
                                  setNotification({
                                    message: `Berhasil membeli ${alertItem.shares.toLocaleString()} lembar saham #${alertItem.ticker} senilai Rp ${Math.round(calculateTradeDetails("BUY", alertItem.ticker, alertItem.shares, alertItem.price).net).toLocaleString()}.`,
                                    type: "success"
                                  });
                                  const nextCash = cash - details.net;
                                  setCash(nextCash);
                                  const logId = "log-" + Date.now();
                                  const nextLogs = [{
                                    id: logId,
                                    type: "BUY",
                                    ticker: alertItem.ticker,
                                    shares: alertItem.shares,
                                    price: alertItem.price,
                                    timestamp: new Date().toISOString()
                                  }, ...tradeLogs];
                                  setTradeLogs(nextLogs);
                                  saveStateToBackend(nextCash, engineConfig, nextLogs);
                                }
                              } else {
                                // Manual transaction confirm: Jual Action
                                const details = calculateTradeDetails("SELL", alertItem.ticker, alertItem.shares, alertItem.price);
                                onSellTransaction(alertItem.ticker, alertItem.shares);
                                setNotification({
                                  message: `Berhasil melikuidasi / menjual ${alertItem.shares.toLocaleString()} lembar saham #${alertItem.ticker} senilai Rp ${Math.round(calculateTradeDetails("SELL", alertItem.ticker, alertItem.shares, alertItem.price).net).toLocaleString()}.`,
                                  type: "success"
                                });
                                const nextCash = cash + details.net;
                                setCash(nextCash);
                                const logId = "log-" + Date.now();
                                const nextLogs = [{
                                  id: logId,
                                  type: "SELL",
                                  ticker: alertItem.ticker,
                                  shares: alertItem.shares,
                                  price: alertItem.price,
                                  timestamp: new Date().toISOString()
                                }, ...tradeLogs];
                                setTradeLogs(nextLogs);
                                saveStateToBackend(nextCash, engineConfig, nextLogs);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wide cursor-pointer transition-all hover:scale-[1.03] ${
                              isBuy
                                ? "bg-emerald-500 hover:bg-emerald-600 text-black shadow-sm"
                                : "bg-rose-500 hover:bg-rose-600 text-white shadow-sm"
                            }`}
                          >
                            Konfirmasi {isBuy ? "Beli" : "Jual"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* HISTORICAL TRADE LOG DATABASE */}
          <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-5 shadow-sm space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-white/5">
              <span className="text-xs font-semibold text-white/85 uppercase tracking-widest block font-sans">
                Log Transaksi Mesin
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    let csvContent = "\ufeff"; // BOM for Excel UTF-8 support
                    csvContent += "ID,Tanggal,Tipe,Sandi Saham (Ticker),Jumlah Lembar (Shares),Harga Eksekusi (Rp),Nilai Kotor (Gross Rp),Slippage/Spread (Rp),Komisi Broker (Rp),Pajak Transaksi (Rp),Nilai Bersih (Net Cash Rp)\n";
                    
                    tradeLogs.forEach(log => {
                      const typeLabel = log.type === "BUY" ? "BELI" : log.type === "BUY_GOLD" ? "BELI EMAS" : log.type === "SELL" ? "JUAL" : "JUAL EMAS";
                      const dt = calculateTradeDetails(log.type, log.ticker, log.shares, log.price);
                      const dateFormatted = new Date(log.timestamp).toLocaleDateString("id-ID") + " " + new Date(log.timestamp).toLocaleTimeString("id-ID");
                      csvContent += `"${log.id}","${dateFormatted}","${typeLabel}","${log.ticker}",${log.shares},${log.price},${dt.gross.toFixed(0)},${dt.slippage.toFixed(0)},${dt.fee.toFixed(0)},${dt.tax.toFixed(0)},${dt.net.toFixed(0)}\n`;
                    });
                    
                    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute("download", `laporan_transaksi_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  disabled={tradeLogs.length === 0}
                  className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-400 hover:text-emerald-300 disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer flex items-center gap-1 border border-emerald-500/20 bg-emerald-500/5 px-2 py-0.5 rounded font-sans"
                  title="Unduh Laporan CSV"
                >
                  <Download className="w-2.5 h-2.5" /> Unduh (CSV)
                </button>
                <button
                  onClick={() => {
                    if (confirm("Ingin menghapus riwayat laporan transaksi?")) {
                      setTradeLogs([]);
                      saveStateToBackend(cash, engineConfig, []);
                    }
                  }}
                  className="text-[8px] uppercase tracking-wider font-bold text-rose-500 hover:text-rose-455 transition-colors cursor-pointer"
                >
                  Clear History
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
              {tradeLogs.length === 0 ? (
                <div className="p-4 text-center text-[9px] text-[#E0E0E0]/30 font-mono">
                  Belum ada log transaksi teraudit.
                </div>
              ) : (
                <div className="space-y-2">
                  {tradeLogs.map((log) => {
                    const isB = log.type.includes("BUY") || log.type === "DEPOSIT";
                    const formatedDate = new Date(log.timestamp).toLocaleTimeString("id", { hour: '2-digit', minute: '2-digit' });
                    const dt = calculateTradeDetails(log.type, log.ticker, log.shares, log.price);
                    
                    let typeLabel = isB ? "BELI" : "JUAL";
                    let badgeColor = isB ? "bg-emerald-400 shadow-sm shadow-emerald-400" : "bg-rose-400";
                    let textColor = isB ? "text-emerald-400" : "text-rose-400";
                    
                    if (log.type === "DEPOSIT") {
                      typeLabel = "DEPOSIT KAS";
                      badgeColor = "bg-blue-400 shadow-sm shadow-blue-400";
                      textColor = "text-blue-400";
                    } else if (log.type === "WITHDRAWAL") {
                      typeLabel = "TARIK DANA";
                      badgeColor = "bg-rose-500 shadow-sm shadow-rose-500";
                      textColor = "text-rose-500";
                    } else if (log.type === "BUY_GOLD") {
                      typeLabel = "BELI EMAS";
                      badgeColor = "bg-amber-400 shadow-sm shadow-amber-400";
                      textColor = "text-amber-400";
                    } else if (log.type === "SELL_GOLD") {
                      typeLabel = "JUAL EMAS";
                      badgeColor = "bg-yellow-500 shadow-sm shadow-yellow-500";
                      textColor = "text-yellow-500";
                    }
                    
                    return (
                      <div key={log.id} className="p-2.5 bg-black/40 border border-white/5 rounded-lg text-[10px] font-mono space-y-1.5 transition-all hover:bg-black/60">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${badgeColor}`} />
                            <div>
                              <span className="font-bold text-white text-[10.5px]">#{log.ticker}</span>
                              <span className="text-white/30 text-[7.5px] block leading-normal">
                                {new Date(log.timestamp).toLocaleDateString("id-ID")} {formatedDate} &bull; {log.shares.toLocaleString("id-ID")} {log.ticker === "EMAS" || log.ticker === "GOLD" ? "gram" : log.ticker === "KAS" ? "Rupiah" : "lbr"}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`${textColor} font-bold text-[9px]`}>{typeLabel}</span>
                            <span className="text-white/40 text-[7.5px] block font-semibold leading-none mt-0.5">
                              {log.ticker === "KAS" ? "Kas Tunai" : `@ Rp ${log.price.toLocaleString("id-ID")}`}
                            </span>
                          </div>
                        </div>
                        
                        {/* Transaction detailed breakdown */}
                        <div className="grid grid-cols-4 gap-2 text-[8px] text-white/35 border-t border-white/5 pt-1.5 leading-tight">
                          <div>
                            <span className="block font-bold">Gross</span>
                            <span className="text-white/70 font-bold">Rp {Math.round(dt.gross).toLocaleString("id-ID")}</span>
                          </div>
                          <div>
                            <span className="block font-bold">Admin {log.ticker === "EMAS" || log.ticker === "KAS" ? "0%" : (isB ? "0.15%" : "0.25%")}</span>
                            <span className="text-white/70">Rp {Math.round(dt.fee).toLocaleString("id-ID")}</span>
                          </div>
                          <div>
                            <span className="block font-bold">Spread {log.ticker === "EMAS" ? "2.0%" : log.ticker === "KAS" ? "0%" : "0.05%"}</span>
                            <span className="text-white/70 font-semibold">Rp {Math.round(dt.slippage).toLocaleString("id-ID")}</span>
                          </div>
                          <div className="text-right font-sans">
                            <span className={`block font-bold ${textColor}`}>Net Value</span>
                            <span className={`${textColor} font-extrabold text-[9px]`}>Rp {Math.round(dt.net).toLocaleString("id-ID")}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Moved Sector Allocation Card */}
          <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-4 flex flex-col shadow-sm">
            <span className="text-[9px] uppercase font-bold text-white/45 tracking-widest block mb-2.5">
              Alokasi Sektor Portofolio
            </span>
            <div className="flex-1 min-h-[140px] w-full relative">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#121212', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: number) => `Rp ${value.toLocaleString("id-ID")}`}
                    />
                    <Pie
                      data={pieData}
                      innerRadius={30}
                      outerRadius={55}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] text-white/30 font-sans">Belum ada data</span>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Watchlist Strip */}
      <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-xs font-semibold text-white/85 uppercase tracking-widest flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-450 text-emerald-400" />
            Daftar Pantau
          </h3>
          <div className="flex items-center gap-2 max-w-sm w-full sm:w-auto">
            <SearchableSelect
              value={watchlistTicker}
              options={visibleStocks.map((s) => ({ value: s.ticker, label: `${s.ticker} - ${s.name}`, logoColor: s.logoColor }))}
              onChange={(val) => setWatchlistTicker(val)}
            />
            <button
              onClick={() => onToggleWatchlist(watchlistTicker)}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer shrink-0"
              disabled={watchlist.some(w => w.ticker === watchlistTicker)}
            >
              Tambah
            </button>
          </div>
        </div>

        {watchlist.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/10">
            <p className="text-white/40 text-xs">Belum ada perusahaan dalam Daftar Pantau. Klik ikon mata pada saham untuk menambahkannya.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist.map((item) => {
              const liveStock = visibleStocks.find(s => s.ticker === item.ticker);
              if (!liveStock) return null;
              const isPos = liveStock.change >= 0;
              return (
                <div 
                  key={item.ticker}
                  className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-emerald-500/20 hover:shadow-xs transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <TickerLogo ticker={liveStock.ticker} size="md" fallbackColor={liveStock.logoColor} />
                    <div>
                      <button 
                        onClick={() => onSelectStock(liveStock.ticker)}
                        className="font-bold text-white hover:text-emerald-400 cursor-pointer block text-left"
                      >
                        {liveStock.ticker}
                      </button>
                      <span className="text-[10px] text-white/40 block truncate max-w-32 mt-0.5">{liveStock.name}</span>
                    </div>
                  </div>
                  
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="text-xs font-bold text-white block font-mono">
                        Rp {liveStock.currentPrice.toLocaleString()}
                      </span>
                      <span className={`text-[10px] font-bold ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                        {isPos ? "+" : ""}{liveStock.change}%
                      </span>
                    </div>
                    <button
                      onClick={() => onToggleWatchlist(liveStock.ticker)}
                      className="p-1 text-white/30 hover:text-rose-400 rounded cursor-pointer transition-colors"
                      title="Hapus Dari Daftar Pantau"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Custom Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#0d0d0d]/95 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex gap-3 items-start transition-all duration-300">
          <div className="mt-0.5 flex-shrink-0">
            {notification.type === "success" && (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
            {notification.type === "error" && (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            )}
            {notification.type === "info" && (
              <HelpCircle className="w-5 h-5 text-blue-400" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <h5 className="text-[11px] font-extrabold uppercase tracking-widest text-white">
              {notification.type === "success" ? "Transaksi Berhasil" : notification.type === "error" ? "Peringatan Transaksi" : "Informasi"}
            </h5>
            <p className="text-[10.5px] text-white/70 font-semibold leading-relaxed">
              {notification.message}
            </p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-white/40 hover:text-white transition-colors cursor-pointer text-xs font-bold leading-none p-1"
          >
            &times;
          </button>
        </div>
      )}

    </div>
  );
}
