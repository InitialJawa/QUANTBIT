import React, { useState } from "react";
import { RS, MKT } from "../marketData";
import { STOCKS_DATA } from "../stocksData";
import { StockData, PortfolioItem, WatchlistItem, DataStatus } from "../types";
import { AIAssistant } from "./AIAssistant";
import { DecisionAuditTrail } from "./DecisionAuditTrail";
import { SearchableSelect } from "./SearchableSelect";
import { TickerLogo } from "./TickerLogo";
import { motion, AnimatePresence } from "motion/react";
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  ChevronUp, 
  Newspaper, 
  ExternalLink, 
  MessageSquare, 
  Send, 
  Check, 
  Sparkles, 
  Globe, 
  BookOpen, 
  Search,
  Eye,
  Trash2
} from "lucide-react";
import { DataBadge } from "./DataBadge";
import { fetchWithStatus } from "../utils/fetchWithStatus";
import { getDataStatus } from "../utils/getDataStatus";

interface MarketTabProps {
  onSelectTicker: (ticker: string) => void;
  onChangeActiveTicker?: (ticker: string) => void;
  activeStock: StockData;
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  onAddTransaction: (ticker: string, shares: number, buyPrice: number) => void;
  onRemoveTransaction: (ticker: string) => void;
  onSellTransaction: (ticker: string, shares: number) => void;
  onToggleWatchlist: (ticker: string) => void;
  getDynamicStock: (ticker: string) => StockData | null;
}

export function MarketTab({ 
  onSelectTicker, 
  onChangeActiveTicker,
  activeStock,
  portfolio,
  watchlist,
  onAddTransaction,
  onRemoveTransaction,
  onSellTransaction,
  onToggleWatchlist,
  getDynamicStock
}: MarketTabProps) {
  const visibleStocks = STOCKS_DATA.map(s => getDynamicStock(s.ticker) || s);
  const [isBriefExpanded, setIsBriefExpanded] = useState(false);
  const [depthTicker, setDepthTicker] = useState<string>(activeStock.ticker);
  const [watchlistTicker, setWatchlistTicker] = useState<string>(activeStock.ticker);

  // State to hold DataStatus per ticker in watchlist
  const [tickerStatus, setTickerStatus] = useState<Record<string, DataStatus>>({});

  // States for live AI summary and rationale syncing
  const [marketSummary, setMarketSummary] = useState<{
    rationale: string;
    bullishFactors: string[];
    bearishFactors: string[];
    scenarioAnalysis?: string;
  } | null>(null);
  const [isFetchingSummary, setIsFetchingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const lastFetchTimeRef = React.useRef<number>(0);

  // Derive dynamic stock prices to trigger updates
  const stocksWithPrices = STOCKS_DATA.map(st => {
    const live = getDynamicStock(st.ticker) || st;
    return {
      ticker: st.ticker,
      currentPrice: live.currentPrice,
      change: live.change
    };
  });

  // Load DataStatus for each watchlist ticker
  React.useEffect(() => {
    let isMounted = true;
    async function loadStatuses() {
      const statuses: Record<string, DataStatus> = {};
      for (const item of watchlist) {
        const status = await getDataStatus(item.ticker);
        statuses[item.ticker] = status;
      }
      if (isMounted) setTickerStatus(statuses);
    }
    loadStatuses();
    return () => { isMounted = false; };
  }, [watchlist]);

  const priceValuesString = stocksWithPrices.map(s => `${s.ticker}:${s.currentPrice}`).join("|") 
    + `|IHSG:${MKT.ihsg.value}|USDIDR:${MKT.usdidr.value}`;

  React.useEffect(() => {
    const now = Date.now();
    // Throttle to minimum 12 seconds to prevent rapid nested triggers while ticks are fast
    if (now - lastFetchTimeRef.current < 12000) {
      return;
    }

    let isMounted = true;
    const fetchMarketSummary = async () => {
      try {
        setIsFetchingSummary(true);
        setSummaryError(null);
        lastFetchTimeRef.current = Date.now();

        const { data: responseData, status: marketStatus } = await fetchWithStatus("/api/gemini/market-summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mkt: MKT,
            rs: RS,
            stocks: STOCKS_DATA.map(st => {
              const live = getDynamicStock(st.ticker) || st;
              return {
                ticker: st.ticker,
                name: st.name,
                currentPrice: live.currentPrice,
                change: live.change,
                sector: st.sector,
              };
            })
          })
        });
        // Use responseData as the original response
        const response = { json: async () => responseData } as any;

        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }

        const data = await response.json();
        if (isMounted) {
          if (data && data.rationale) {
            setMarketSummary(data);
          } else {
            throw new Error("Invalid structure returned");
          }
        }
      } catch (err: any) {
        console.warn("Live daily market summary fetch failed, fallback active:", err);
        if (isMounted) {
          // Provide a graceful static fallback when Gemini rate limits/fails
          setMarketSummary({
             rationale: "IHSG berfluktuasi didorong oleh dinamika makro global dan pergerakan teknis emiten blue-chip.",
             bullishFactors: ["Ekspektasi moderasi suku bunga", "Rotasi masuk ke sektor pertahanan dan perbankan", "Valuasi atraktif di beberapa emiten Top Tier"],
             bearishFactors: ["Volatilitas nilai tukar mata uang", "Realisasi profit taking jangka pendek", "Kelemahan teknikal di atas resisten"],
             scenarioAnalysis: "Skenario defensif: pantau ketat momentum portofolio. Skenario agresif: akumulasi pada saham dengan skor Fundamental (Config F) tinggi jika IHSG membaik."
          });
          setSummaryError("Sistem menggunakan data ringkasan statis (API Limit / Offline)");
        }
      } finally {
        if (isMounted) {
          setIsFetchingSummary(false);
        }
      }
    };

    fetchMarketSummary();

    return () => {
      isMounted = false;
    };
  }, [priceValuesString]);

  // Portfolio performance calculations for My Status comparison
  let totalCost = 0;
  let totalValueNow = 0;
  portfolio.forEach(item => {
    const liveStock = visibleStocks.find(s => s.ticker === item.ticker);
    const lastPrice = liveStock ? liveStock.currentPrice : item.buyPrice;
    totalCost += item.shares * item.buyPrice;
    totalValueNow += item.shares * lastPrice;
  });
  const myReturnPercent = totalCost > 0 ? ((totalValueNow - totalCost) / totalCost) * 100 : 0;

  // Synchronize when active stock changes from elsewhere
  React.useEffect(() => {
    setDepthTicker(activeStock.ticker);
  }, [activeStock.ticker]);

  const currentDepthStock = visibleStocks.find(s => s.ticker === depthTicker) || activeStock;

  // Synthesize a special stock object if watching the whole watchlist
  const isWatchlistAi = depthTicker === "WATCHLIST";
  const aiAssistantStock: StockData = isWatchlistAi
    ? {
        ticker: "WATCHLIST",
        name: "Daftar Pantauan Saham",
        sector: "Multiple",
        subSector: "",
        currentPrice: 0,
        change: 0,
        peRatio: 0,
        pbRatio: 0,
        roe: 0,
        der: 0,
        dividendYield: 0,
        description: watchlist.length > 0
          ? `Kumpulan saham dalam daftar pantau: ${watchlist.map(w => w.ticker).join(", ")}. Analisis tren, risiko, dan korelasi antar saham-saham ini.`
          : "Daftar pantau masih kosong.",
        logoColor: "bg-blue-600",
        marketCap: 0,
        metrics: [],
        dataSources: {
          price: DataStatus.ESTIMATED,
          fundamentals: DataStatus.ESTIMATED,
          charts: DataStatus.ESTIMATED,
          description: DataStatus.CACHED,
        },
        chartDataDaily: [],
        chartDataWeekly: [],
        chartDataMonthly: [],
      }
    : currentDepthStock;

  // Tick size generator for Indonesian stock exchange order book
  const getIdXTickSize = (price: number) => {
    if (price < 200) return 1;
    if (price < 500) return 2;
    if (price < 2000) return 5;
    if (price < 5000) return 10;
    return 25;
  };

  // Deterministic spread estimation (not live order book data)
  // Uses ticker hash to generate a stable pseudo-random seed per stock
  const getSpreadSeed = (ticker: string): number => {
    let seed = 0;
    for (let i = 0; i < ticker.length; i++) {
      seed = ((seed << 5) - seed) + ticker.charCodeAt(i);
      seed = seed & seed;
    }
    return Math.abs(seed) % 10000;
  };

  const generateEstimatedSpread = (price: number, ticker: string) => {
    const tick = getIdXTickSize(price);
    const seed = getSpreadSeed(ticker);
    const bids = [];
    const asks = [];

    for (let i = 1; i <= 5; i++) {
      const bidPrice = price - (i * tick);
      const bidVol = Math.round((12000 - i * 1800) * (0.8 + ((seed * (i + 1)) % 1000) / 2500));
      bids.push({ price: bidPrice, vol: bidVol, count: Math.round(bidVol / 12) });

      const askPrice = price + ((i - 1) * tick);
      const askVol = Math.round((11500 - i * 1500) * (0.8 + ((seed * (i + 5)) % 1000) / 2500));
      asks.push({ price: askPrice, vol: askVol, count: Math.round(askVol / 11) });
    }

    return { bids, asks: asks.reverse() };
  };

  const { bids, asks } = generateEstimatedSpread(currentDepthStock.currentPrice, depthTicker);
  const totalBidVol = bids.reduce((acc, b) => acc + b.vol, 0);
  const totalAskVol = asks.reduce((acc, a) => acc + a.vol, 0);

  // Parsing styling status
  const isIHSGInCrisis = MKT.ihsg.monthly < -10;
  const currentStatus = isIHSGInCrisis ? "RISK OFF" : RS.status;
  const currentAction = isIHSGInCrisis ? "LIQUIDATE / CASH OUT" : RS.action;

  const statusColors: Record<string, string> = {
    SAFE: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    WARNING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    DANGER: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    "RISK ON": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    "RISK OFF": "text-rose-400 bg-rose-500/10 border-rose-500/20",
    NETRAL: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  };

  const statusClass = statusColors[currentStatus] || "text-white bg-white/5 border-white/10";
  const actionClass = isIHSGInCrisis 
    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
    : (RS.action === "ACCUMULATE" || RS.action === "AKUMULASI"
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : RS.action === "WAIT" || RS.action === "TUNGGU"
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : "bg-rose-500/10 text-rose-400 border-rose-500/20");

  return (
    <div className="space-y-8">
      
      {/* 1. HERO REGIME STATUS CARD */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative bg-[#050505] border border-white/[0.03] rounded-2xl p-6 overflow-hidden`}
      >
        <div className={`absolute top-0 right-0 w-48 h-48 ${isIHSGInCrisis ? "bg-rose-500/5 animate-pulse" : "bg-white/[0.02]"} rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none`} />
        
        <div className="flex flex-col md:flex-row flex-wrap justify-between items-start gap-6 pb-6 border-b border-white/[0.05] w-full">
          <div className="flex flex-col sm:flex-row flex-wrap gap-6 w-full xl:w-auto">
            {/* System Status (Status Pasar) */}
            <div>
              <span className="text-caption uppercase font-bold tracking-widest text-[#E0E0E0]/30 block mb-2 font-mono">STATUS PASAR (SISTEM)</span>
              <div className="flex items-center gap-3">
                <span className={`text-sm tracking-widest bg-white/[0.02] text-white/80 font-bold px-3 py-1.5 rounded-lg border border-white/[0.05]`}>
                  {currentStatus === "SAFE" ? "RISK ON" : currentStatus === "RISK OFF" ? "RISK OFF" : currentStatus}
                </span>
                <div>
                  <span className="text-caption text-[#E0E0E0]/60 leading-none block">Sikap Algoritma</span>
                  <span className="text-caption font-semibold text-white/80 mt-1 block font-mono">
                    Alokasi Modal: <span className={isIHSGInCrisis ? "text-rose-400" : "text-white font-bold"}>{isIHSGInCrisis ? "0%" : `${RS.capital_deployment}%`}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* User Portfolio Status (Status Anda / Statusku) */}
            <div className="border-t sm:border-t-0 sm:border-l border-white/[0.05] pt-4 sm:pt-0 sm:pl-6">
              <span className="text-caption uppercase font-bold tracking-widest text-[#E0E0E0]/30 block mb-2 font-mono">STATUS ANDA (PORTOFOLIO)</span>
              <div className="flex items-center gap-3">
                {portfolio.length === 0 ? (
                  <span className="text-caption font-bold px-3 py-1.5 bg-white/5 border border-white/5 text-white/40 tracking-wider rounded-lg font-sans">
                    KOSONG / BELU MADA SAHAM
                  </span>
                ) : (
                  <span className={`text-body font-bold tracking-wider px-3 py-1.5 rounded-lg border font-mono ${
                    myReturnPercent >= 0 
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                      : "text-rose-400 bg-rose-500/10 border-rose-500/20"
                  }`}>
                    {myReturnPercent >= 0 ? "CUAN" : "DROP"} {myReturnPercent >= 0 ? "+" : ""}{myReturnPercent.toFixed(2)}%
                  </span>
                )}
                <div>
                  <span className="text-caption text-[#E0E0E0]/60 leading-none block">Status Kesehatan</span>
                  <span className="text-caption text-zinc-400 mt-1 block font-mono">
                    {portfolio.length} Emiten Aktif
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-row flex-wrap gap-3 w-full xl:w-auto shrink-0 mt-4 xl:mt-0">
            <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl flex-1 lg:w-44">
              <span className="text-label uppercase font-bold tracking-widest text-white/30 block mb-1">Tindakan</span>
              <span className={`inline-block text-body font-bold tracking-wider px-2 py-0.5 rounded-md border ${currentAction === "WAIT" ? "bg-white/[0.05] text-white/80 border-white/5" : actionClass}`}>
                {currentAction === "WAIT" ? "WAIT / TUNGGU" : currentAction}
              </span>
            </div>
            <div className="p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl flex-1 lg:w-44">
              <span className="text-label uppercase font-bold tracking-widest text-white/30 block mb-1">Tren Momentum</span>
              <span className={`text-xs font-bold tracking-wide flex items-center gap-1.5 ${isIHSGInCrisis ? "text-rose-400" : "text-emerald-400/80"}`}>
                {isIHSGInCrisis ? (
                  <>
                    <TrendingDown className="w-3.5 h-3.5 animate-pulse" /> Jatuh Sistemik
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-3.5 h-3.5" /> Menguat
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Hero Grid Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 text-center md:text-left">
          <div className="border-r border-white/[0.05] last:border-0 pr-6">
            <span className="text-caption uppercase font-bold tracking-widest text-[#E0E0E0]/30 block mb-1.5">Kesehatan Pasar</span>
            <span className="text-2xl font-bold font-mono text-white block">{RS.market_health}</span>
            <div className="w-full bg-white/[0.05] h-0.5 rounded-full mt-2.5 overflow-hidden">
              <div className="bg-white/40 h-full" style={{ width: `${RS.market_health}%` }} />
            </div>
          </div>
          <div className="border-r border-white/[0.05] last:border-0 pr-6">
            <span className="text-caption uppercase font-bold tracking-widest text-[#E0E0E0]/30 block mb-1.5">Peluang Cuan</span>
            <span className="text-2xl font-bold font-mono text-white/90 block">{RS.opportunity}</span>
            <div className="w-full bg-white/[0.05] h-0.5 rounded-full mt-2.5 overflow-hidden">
              <div className="bg-white/40 h-full" style={{ width: `${RS.opportunity}%` }} />
            </div>
          </div>
          <div className="border-r border-white/[0.05] last:border-0 pr-6">
            <span className="text-caption uppercase font-bold tracking-widest text-[#E0E0E0]/30 block mb-1.5">Risiko Pasar</span>
            <span className="text-2xl font-bold font-mono text-rose-400/80 block">{RS.risk}</span>
            <div className="w-full bg-white/[0.05] h-0.5 rounded-full mt-2.5 overflow-hidden">
              <div className="bg-rose-500/50 h-full" style={{ width: `${RS.risk}%` }} />
            </div>
          </div>
          <div>
            <span className="text-caption uppercase font-bold tracking-widest text-[#E0E0E0]/30 block mb-1.5">Tingkat Keyakinan</span>
            <span className="text-2xl font-bold font-mono text-white block">{RS.confidence}</span>
            <div className="w-full bg-white/[0.05] h-0.5 rounded-full mt-2.5 overflow-hidden">
              <div className="bg-white/40 h-full" style={{ width: `${RS.confidence}%` }} />
            </div>
          </div>
        </div>

        {/* Daily Summary / Analisa AI Harian */}
        <div className="mt-6 pt-5 border-t border-white/[0.05] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-white/50" />
              <span className="text-body font-bold text-white/70 uppercase tracking-widest font-sans">
                Analisa AI Harian
              </span>
            </div>
            <button
              onClick={() => setIsBriefExpanded(!isBriefExpanded)}
              className="flex items-center gap-1.5 text-caption uppercase tracking-widest font-bold text-white/60 hover:text-white transition-colors cursor-pointer bg-white/[0.02] hover:bg-white/[0.05] px-3 py-1.5 rounded-lg border border-white/[0.05]"
            >
              {isBriefExpanded ? (
                <>
                  Tutup <ChevronUp className="w-3 h-3" />
                </>
              ) : (
                <>
                  Detail <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          </div>

          <div className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-5">
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">
              <strong className="text-white/60 flex items-center justify-between mb-2 font-mono text-caption uppercase tracking-wider w-full" id="jci-rationale-header">
                <span>Rangkuman Sistem:</span>
                {isFetchingSummary && (
                  <span className="text-label animate-pulse text-white/40 lowercase font-sans font-bold tracking-widest bg-white/[0.02] border border-white/5 px-2 py-0.5 rounded">
                    menulis...
                  </span>
                )}
              </strong>
              {marketSummary ? marketSummary.rationale : RS.rationale}
            </p>
            
            <AnimatePresence>
              {isBriefExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 pt-5 border-t border-white/[0.05] space-y-4 text-body leading-relaxed text-zinc-400">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.03] space-y-2">
                        <h4 className="font-bold text-white/70 text-caption uppercase tracking-widest font-mono">Faktor Pendukung Pasar</h4>
                        <ul className="list-disc pl-4 space-y-1.5 mt-2 text-zinc-400">
                          {marketSummary && marketSummary.bullishFactors && marketSummary.bullishFactors.length > 0 ? (
                            marketSummary.bullishFactors.map((f, i) => <li key={i}>{f}</li>)
                          ) : (
                            <>
                              <li>Suku Bunga BI-Rate ditahan di level 6.25% menyokong stabilitas eksternal rupiah.</li>
                              <li>Aliran modal asing (net buy) masuk cukup deras menjaga likuiditas bursa domestik.</li>
                              <li>Gap kualitas antara Top 5 ({RS.radar_context?.top5_avg_score}) dan Bottom 5 ({RS.radar_context?.bot5_avg_score}) berada di level {RS.radar_context?.score_gap} poin.</li>
                            </>
                          )}
                        </ul>
                      </div>
                      <div className="p-4 bg-white/[0.02] rounded-xl border border-white/[0.03] space-y-2">
                        <h4 className="font-bold text-white/70 text-caption uppercase tracking-widest font-mono">Faktor Risiko Pantauan</h4>
                        <ul className="list-disc pl-4 space-y-1.5 mt-2 text-zinc-400">
                          {marketSummary && marketSummary.bearishFactors && marketSummary.bearishFactors.length > 0 ? (
                            marketSummary.bearishFactors.map((f, i) => <li key={i}>{f}</li>)
                          ) : (
                            <>
                              <li>Faktor terlemah saat ini adalah Kualitas ({RS.radar_context?.weakest_factor_score}) yang membatasi luasnya momentum reli sektoral.</li>
                              <li>Sifat sepinya transaksi di beberapa emiten pantauan menyulitkan likuiditas jangka pendek.</li>
                              <li>IHSG masih dalam fase koreksi bulanan yang cukup tebal di kisaran {MKT.ihsg.monthly}%.</li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>

                    <div className="p-4 bg-[#0a0a0a] border border-white/[0.05] rounded-xl flex items-start gap-3">
                      <Sparkles className="w-4 h-4 text-white/40 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-white/80 block text-caption uppercase tracking-widest font-mono">Formulasi Strategi Saham AI</span>
                        <p className="mt-1.5 text-zinc-400 text-xs">
                          {marketSummary && marketSummary.scenarioAnalysis ? (
                            marketSummary.scenarioAnalysis
                          ) : (
                            `Skenario saat ini: **${currentAction === "WAIT" ? "WAIT" : currentAction}** dengan alokasi **${RS.capital_deployment}%**. Skenario defensif: fokus pada emiten KBMI 4. Skenario agresif: akumulasi jika rotasi sektor IHSG mulai merangkak naik.`
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* 1b. DECISION AUDIT TRAIL */}
      <DecisionAuditTrail />

      {/* 2. SNAPSHOT METRICS GRID */}
      <h3 className="text-caption uppercase font-bold tracking-widest text-[#E0E0E0]/30 px-1 pt-2">Ringkasan Parameter Real-Time</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* IHSG */}
        <div className="bg-[#050505] border border-white/[0.03] rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-caption uppercase font-bold tracking-widest text-white/30 block font-mono">IHSG (JCI)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-mono font-bold text-white/90">{MKT.ihsg.value.toLocaleString("id-ID")}</span>
            <span className={`text-caption font-bold ${MKT.ihsg.daily >= 0 ? "text-emerald-400/80" : "text-rose-400/80"}`}>
              {MKT.ihsg.daily >= 0 ? "+" : ""}{MKT.ihsg.daily}%
            </span>
          </div>
          <span className="text-caption text-white/30 font-medium tracking-wide block">Bulanan: <span className="text-rose-400/80 font-bold">{MKT.ihsg.monthly}%</span></span>
        </div>

        {/* Rupiah */}
        <div className="bg-[#050505] border border-white/[0.03] rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-caption uppercase font-bold tracking-widest text-white/30 block font-mono">USD / IDR</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-mono font-bold text-white/90">Rp {MKT.usdidr.value.toLocaleString("id-ID")}</span>
            <span className={`text-caption font-bold flex items-center gap-0.5 ${MKT.usdidr.daily <= 0 ? "text-emerald-400/80" : "text-rose-400/80"}`}>
              {MKT.usdidr.daily <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              {MKT.usdidr.daily <= 0 ? "" : "+"}{MKT.usdidr.daily}%
            </span>
          </div>
          <span className={`text-caption tracking-wide block font-bold ${MKT.usdidr.daily <= 0 ? "text-emerald-400/60" : "text-rose-400/60"}`}>
            {MKT.usdidr.daily <= 0 ? "IDR MENGUAT" : "IDR MELEMAH"}
          </span>
        </div>

        {/* Score Gap */}
        <div className="bg-[#050505] border border-white/[0.03] rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-caption uppercase font-bold tracking-widest text-white/30 block font-mono">Quant Score Gap</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-mono font-bold text-white/90">{RS.radar_context?.score_gap || "40.6"}</span>
            <span className="text-caption font-bold tracking-widest uppercase text-white/20">Spread</span>
          </div>
          <span className="text-caption text-white/30 font-medium tracking-wide block">5D Change: <span className="text-white/50 font-bold uppercase">Stable</span></span>
        </div>

        {/* Breadth */}
        <div className="bg-[#050505] border border-white/[0.03] rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <span className="text-caption uppercase font-bold tracking-widest text-white/30 block font-mono">Breadth &gt;60</span>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-mono font-bold text-white/90">{RS.radar_context?.breadth_above_60}/{RS.radar_context?.watchlist_count || 5}</span>
            <span className="text-caption font-bold tracking-widest uppercase text-white/20">Assets</span>
          </div>
          <span className="text-caption text-emerald-400/60 block font-bold tracking-wide uppercase">Broad Market Support</span>
        </div>

      </div>

      {/* 3. AI ASSISTANT FULL WIDTH */}
      <div className="bg-[#050505] border border-white/[0.03] rounded-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white/40" />
            <h3 className="text-body uppercase font-bold tracking-widest text-white/70 font-mono">
              AI Co-Pilot &mdash; Analisis Saham
            </h3>
          </div>
          <div className="w-full sm:w-auto min-w-[140px]">
            <SearchableSelect
              value={depthTicker}
              options={[
                { value: "WATCHLIST", label: "Daftar Pantau" },
                ...visibleStocks.map(s => ({ value: s.ticker, label: `${s.ticker} - ${s.name}` }))
              ]}
              onChange={(val) => { setDepthTicker(val); }}
            />
          </div>
        </div>
        <div key={aiAssistantStock.ticker} className="bg-black/50" style={{ minHeight: '420px' }}>
          <AIAssistant stock={aiAssistantStock} />
        </div>
      </div>

      {/* PORTFOLIO & WATCHLIST TRACKER TABLE GRID */}
      <div className="mt-8 pt-8 border-t border-white/[0.05] space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/[0.05] pb-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-white/40" />
            <span className="text-body uppercase font-bold tracking-widest text-white/80 block font-mono">Daftar Pantau Eksklusif</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-56">
              <SearchableSelect
                value={watchlistTicker}
                options={visibleStocks.map(s => ({ value: s.ticker, label: `${s.ticker} - ${s.name}`, logoColor: s.logoColor }))}
                onChange={(val) => setWatchlistTicker(val)}
              />
            </div>
            <button
               onClick={() => onToggleWatchlist(watchlistTicker)}
               className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-caption font-bold uppercase tracking-widest transition-colors cursor-pointer shrink-0 border border-white/5"
               disabled={watchlist.some(w => w.ticker === watchlistTicker)}
               title="Tambahkan ke Daftar Pantau"
             >
               Tambah
            </button>
          </div>
        </div>
        
        <div className="bg-[#050505] bg-card-gradient rounded-2xl border border-white/[0.03] p-6 relative overflow-hidden">
          {watchlist.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-3 rounded-2xl bg-white/[0.01] border border-dashed border-white/[0.05]">
              <span className="text-body uppercase tracking-widest font-bold text-white/40">Daftar Kosong</span>
              <p className="text-zinc-600 font-sans text-body max-w-sm">Belum ada perusahaan dalam Daftar Pantau. Gunakan form di atas untuk menambahkannya agar AI memantau pergerakannya.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {watchlist.map((item) => {
                const liveStock = getDynamicStock(item.ticker) || STOCKS_DATA.find((s) => s.ticker === item.ticker);
                if (!liveStock) return null;
                const isPos = liveStock.change >= 0;
                return (
                  <div 
                    key={item.ticker}
                    className="p-5 rounded-2xl border border-white/[0.03] bg-white/[0.01] hover:bg-white/[0.02] transition-colors flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <TickerLogo ticker={liveStock.ticker} size="md" fallbackColor={liveStock.logoColor} />
                      <div>
                        <button 
                          onClick={() => onSelectTicker(liveStock.ticker)}
                          className="flex items-center gap-2 group"
                        >
                          <span className="font-bold font-mono text-white/90 group-hover:text-white">{liveStock.ticker}</span>
                          <DataBadge status={tickerStatus[item.ticker] ?? DataStatus.ESTIMATED} />
                        </button>
                        <span className="text-caption text-zinc-500 block truncate max-w-32 mt-1 font-sans">{liveStock.name}</span>
                      </div>
                    </div>
                    
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <span className="text-xs font-bold text-white/80 block font-mono">
                          {liveStock.currentPrice.toLocaleString()}
                        </span>
                        <span className={`text-caption uppercase font-bold tracking-widest mt-0.5 inline-block ${isPos ? "text-emerald-400/80" : "text-rose-400/80"}`}>
                          {isPos ? "+" : ""}{liveStock.change}%
                        </span>
                      </div>
                      <button
                        onClick={() => onToggleWatchlist(liveStock.ticker)}
                        className="p-1.5 text-white/20 hover:text-white hover:bg-rose-500 border border-transparent hover:border-rose-400 rounded-lg cursor-pointer transition-all focus:outline-none"
                        title="Hapus Dari Daftar Pantau"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
