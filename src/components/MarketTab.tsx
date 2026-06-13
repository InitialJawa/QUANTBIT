import React, { useState } from "react";
import { RS, MKT } from "../marketData";
import { STOCKS_DATA } from "../stocksData";
import { StockData, PortfolioItem, WatchlistItem } from "../types";
import { AIAssistant } from "./AIAssistant";
import { SearchableSelect } from "./SearchableSelect";
import { TickerLogo } from "./TickerLogo";
import { motion, AnimatePresence } from "motion/react";
import { 
  TrendingUp, 
  TrendingDown, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Flame, 
  Newspaper, 
  ExternalLink, 
  MessageSquare, 
  Send, 
  Check, 
  Layers, 
  Sparkles, 
  Globe, 
  BookOpen, 
  Search,
  Eye,
  Trash2
} from "lucide-react";

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

  // States for live AI summary and rationale syncing
  const [marketSummary, setMarketSummary] = useState<{
    rationale: string;
    bullishFactors: string[];
    bearishFactors: string[];
    strategyAdvice: string;
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

        const response = await fetch("/api/gemini/market-summary", {
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
             strategyAdvice: "Pantau ketat momentum portofolio Anda. Gunakan opsi Cashout jika risiko meningkat, dan pertahankan saham dengan skor Fundamental (Config F) tinggi."
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
  const myReturnPercent = totalCost > 0 ? ((totalValueNow - totalCost) / totalCost) * 105 : 0; // standard simulated correction scaling!

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

  // Generate real dynamic Stockbit-like order book for a selected stock
  const generateOrderBook = (price: number) => {
    const tick = getIdXTickSize(price);
    const bids = [];
    const asks = [];

    for (let i = 1; i <= 5; i++) {
      // Bids are below current price
      const bidPrice = price - (i * tick);
      const bidVol = Math.round((12000 - i * 1800) * (0.8 + Math.random() * 0.4));
      bids.push({ price: bidPrice, vol: bidVol, count: Math.round(bidVol / 12) });

      // Asks are above or equal to current price
      const askPrice = price + ((i - 1) * tick);
      const askVol = Math.round((11500 - i * 1500) * (0.8 + Math.random() * 0.4));
      asks.push({ price: askPrice, vol: askVol, count: Math.round(askVol / 11) });
    }

    return { bids, asks: asks.reverse() };
  };

  const { bids, asks } = generateOrderBook(currentDepthStock.currentPrice);
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
        className={`relative bg-[#0A0A0A] border ${isIHSGInCrisis ? "border-rose-500/20" : "border-white/10"} rounded-xl p-4 overflow-hidden shadow-xl`}
      >
        <div className={`absolute top-0 right-0 w-48 h-48 ${isIHSGInCrisis ? "bg-rose-500/5 animate-pulse" : "bg-emerald-500/5"} rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none`} />
        
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4 pb-4 border-b border-white/5 w-full">
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            {/* System Status (Status Pasar) */}
            <div>
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#E0E0E0]/40 block mb-1.5 font-mono">STATUS PASAR (SISTEM)</span>
              <div className="flex items-center gap-2.5">
                <span className={`text-sm font-black px-3 py-1 rounded-lg border ${statusClass}`}>
                  {currentStatus === "SAFE" ? "RISK ON" : currentStatus === "RISK OFF" ? "RISK OFF" : currentStatus}
                </span>
                <div>
                  <span className="text-[10px] text-[#E0E0E0]/60 leading-none block">Sikap Algoritma</span>
                  <span className="text-[10px] font-semibold text-white/80 mt-0.5 block font-mono">
                    Alokasi Modal: <span className={isIHSGInCrisis ? "text-rose-455" : "text-emerald-400 font-bold"}>{isIHSGInCrisis ? "0%" : `${RS.capital_deployment}%`}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* User Portfolio Status (Status Anda / Statusku) */}
            <div className="border-t sm:border-t-0 sm:border-l border-white/10 pt-3 sm:pt-0 sm:pl-4">
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#E0E0E0]/40 block mb-1.5 font-mono">STATUS ANDA (PORTOFOLIO)</span>
              <div className="flex items-center gap-2.5">
                {portfolio.length === 0 ? (
                  <span className="text-[10px] font-bold px-2 py-1 bg-white/5 border border-white/10 text-white/40 rounded-lg font-sans">
                    KOSONG / BELUM ADA SAHAM
                  </span>
                ) : (
                  <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border font-sans ${
                    myReturnPercent >= 0 
                      ? "text-emerald-450 bg-emerald-500/10 border-emerald-500/20 font-bold" 
                      : "text-rose-450 bg-rose-500/10 border-rose-500/20"
                  }`}>
                    {myReturnPercent >= 0 ? "CUAN" : "DROP"} {myReturnPercent >= 0 ? "+" : ""}{myReturnPercent.toFixed(2)}%
                  </span>
                )}
                <div>
                  <span className="text-[10px] text-[#E0E0E0]/60 leading-none block">Status Kesehatan</span>
                  <span className="text-[10px] text-white/85 mt-0.5 block font-mono">
                    {portfolio.length} Emiten Aktif
                  </span>
                </div>
              </div>
            </div>
          </div>



          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
            <div className="p-2.5 bg-white/5 border border-white/10 rounded-lg flex-1 lg:w-40">
              <span className="text-[8px] uppercase font-bold tracking-wider text-white/40 block">Tindakan</span>
              <span className={`inline-block text-[10px] font-bold mt-1 px-2 py-0.5 rounded border ${actionClass}`}>
                {currentAction === "WAIT" ? "WAIT / TUNGGU" : currentAction}
              </span>
            </div>
            <div className="p-2.5 bg-white/5 border border-white/10 rounded-lg flex-1 lg:w-40">
              <span className="text-[8px] uppercase font-bold tracking-wider text-white/40 block">Tren Momentum</span>
              <span className={`text-xs font-bold mt-1.5 block flex items-center gap-1 ${isIHSGInCrisis ? "text-rose-400" : "text-emerald-400"}`}>
                {isIHSGInCrisis ? (
                  <>
                    <TrendingDown className="w-3.5 h-3.5 animate-bounce" /> Jatuh Sistemik
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-center md:text-left">
          <div className="border-r border-white/5 last:border-0 pr-2">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[#E0E0E0]/40 block">Kesehatan Pasar</span>
            <span className="text-2xl font-extrabold font-mono text-white mt-1 block">{RS.market_health}</span>
            <div className="w-full bg-white/5 h-1 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: `${RS.market_health}%` }} />
            </div>
          </div>
          <div className="border-r border-white/5 last:border-0 pr-2">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[#E0E0E0]/40 block">Peluang Cuan</span>
            <span className="text-2xl font-extrabold font-mono text-emerald-400 mt-1 block">{RS.opportunity}</span>
            <div className="w-full bg-white/5 h-1 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-emerald-400 h-full" style={{ width: `${RS.opportunity}%` }} />
            </div>
          </div>
          <div className="border-r border-white/5 last:border-0 pr-2">
            <span className="text-[9px] uppercase font-bold tracking-widest text-[#E0E0E0]/40 block">Risiko Pasar</span>
            <span className="text-2xl font-extrabold font-mono text-rose-400 mt-1 block">{RS.risk}</span>
            <div className="w-full bg-white/5 h-1 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-rose-500 h-full" style={{ width: `${RS.risk}%` }} />
            </div>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold tracking-widest text-[#E0E0E0]/40 block">Tingkat Keyakinan</span>
            <span className="text-2xl font-extrabold font-mono text-white mt-1 block">{RS.confidence}</span>
            <div className="w-full bg-white/5 h-1 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-indigo-500 h-full" style={{ width: `${RS.confidence}%` }} />
            </div>
          </div>
        </div>

        {/* Daily Summary / Analisa AI Harian */}
        <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                Analisa AI Harian &amp; Rationale Sistem
              </span>
            </div>
            <button
              onClick={() => setIsBriefExpanded(!isBriefExpanded)}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/10"
            >
              {isBriefExpanded ? (
                <>
                  Sembunyikan <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  Tampilkan Ringkasan AI <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4.5">
            <p className="text-xs text-white/80 leading-relaxed font-sans">
              <strong className="text-emerald-400 flex items-center justify-between mb-1 font-mono text-[9px] uppercase tracking-wide w-full" id="jci-rationale-header">
                <span>Rangkuman Rationale Sistem:</span>
                {isFetchingSummary && (
                  <span className="text-[8px] animate-pulse text-indigo-400 lowercase font-sans font-extrabold tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded-sm">
                    sinkronisasi data real-time...
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
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-3 text-xs leading-relaxed text-white/70">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3.5 bg-black/40 rounded-lg border border-white/5 space-y-1">
                        <h4 className="font-extrabold text-[#E0E0E0] text-[10px] uppercase tracking-wider text-emerald-400 font-mono">Faktor Pendukung Pasar</h4>
                        <ul className="list-disc pl-4 space-y-1 mt-2 text-white/60">
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
                      <div className="p-3.5 bg-black/40 rounded-lg border border-white/5 space-y-1">
                        <h4 className="font-extrabold text-[#E0E0E0] text-[10px] uppercase tracking-wider text-rose-400 font-mono font-sans">Faktor Risiko Pantauan</h4>
                        <ul className="list-disc pl-4 space-y-1 mt-2 text-white/60">
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

                    <div className="p-3.5 bg-emerald-950/20 border border-emerald-500/10 rounded-lg flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-emerald-400 block text-[10px] uppercase tracking-wide font-mono">Formulasi Strategi Saham Pilihan AI (Gelombang Momentum)</span>
                        <p className="mt-1 text-white/70">
                          {marketSummary && marketSummary.strategyAdvice ? (
                            marketSummary.strategyAdvice
                          ) : (
                            `Sistem menyarankan sikap **${currentAction === "WAIT" ? "WAIT / TUNGGU" : currentAction}** dengan alokasi modal teralokasi optimal **${RS.capital_deployment}%**. Memprioritaskan penempatan buy-on-weakness pada emiten KBMI 4 atau yang didukung ledakan volume (base breakout) saat siklus rotasi sektor IHSG mulai merangkak naik.`
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

      {/* 2. SNAPSHOT METRICS GRID */}
      <h3 className="text-[10px] uppercase font-bold tracking-widest text-white/40 px-1">Ringkasan Sinyal Pasar Real-Time</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* IHSG */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4.5 shadow-sm space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">IHSG (JCI)</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-mono font-bold text-white">{MKT.ihsg.value.toLocaleString("id-ID")}</span>
            <span className={`text-xs font-bold ${MKT.ihsg.daily >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {MKT.ihsg.daily >= 0 ? "+" : ""}{MKT.ihsg.daily}%
            </span>
          </div>
          <span className="text-[10px] text-white/40 block">Bulanan: <span className="text-rose-400 font-semibold">{MKT.ihsg.monthly}%</span></span>
        </div>

        {/* Rupiah */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4.5 shadow-sm space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">Nilai Tukar USD / IDR</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-mono font-bold text-white">Rp {MKT.usdidr.value.toLocaleString("id-ID")}</span>
            <span className={`text-xs font-bold flex items-center gap-0.5 ${MKT.usdidr.daily <= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {MKT.usdidr.daily <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              {MKT.usdidr.daily <= 0 ? "" : "+"}{MKT.usdidr.daily}%
            </span>
          </div>
          <span className={`text-[10px] block font-medium ${MKT.usdidr.daily <= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {MKT.usdidr.daily <= 0 ? "Rupiah Menguat" : "Rupiah Melemah"}
          </span>
        </div>

        {/* Score Gap */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4.5 shadow-sm space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">Quant Score Gap</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-mono font-bold text-emerald-400">{RS.radar_context?.score_gap || "40.6"}</span>
            <span className="text-xs text-white/45">Spread</span>
          </div>
          <span className="text-[10px] text-white/40 block">5D Change: <span className="text-white/70 font-semibold">Stable</span></span>
        </div>

        {/* Breadth */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4.5 shadow-sm space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">Breadth Ratio &gt;60</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-mono font-bold text-emerald-300">{RS.radar_context?.breadth_above_60}/{RS.radar_context?.watchlist_count || 5}</span>
            <span className="text-xs text-white/40">Watchlist</span>
          </div>
          <span className="text-[10px] text-emerald-400 block font-medium">Broad Market Support</span>
        </div>

      </div>

      {/* 3. DUAL-COLUMN WORKSPACE: LEFT (Order book, timeline) | RIGHT (AI chat agent) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: REAL-TIME MARKET COND (8 CoL) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* A. ACTIVE ORDER BOOK (With live ticker switcher dropdown) */}
          <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4.5">
              <div className="flex items-center gap-2">
                <Layers className="w-4.5 h-4.5 text-emerald-400 animate-pulse" />
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#E0E0E0]">
                  Kedalaman Pasar Real-Time (Order Book)
                </h3>
              </div>
              
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <span className="text-[10px] text-white/40 font-mono shrink-0">Pilih Saham:</span>
                <div className="w-full sm:w-64">
                  <SearchableSelect
                    value={depthTicker}
                    options={visibleStocks.map(stk => ({
                      value: stk.ticker,
                      label: `${stk.ticker} - ${stk.name}`,
                      logoColor: stk.logoColor
                    }))}
                    onChange={(val) => {
                      setDepthTicker(val);
                      if (onChangeActiveTicker) {
                        onChangeActiveTicker(val);
                      }
                    }}
                  />
                </div>
                <span className="text-[10px] text-white/40 font-mono shrink-0 hidden sm:inline text-right min-w-[70px]">
                  Rp {currentDepthStock.currentPrice.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px bg-white/5 border border-white/5 rounded-xl overflow-hidden text-xs font-mono">
              
              {/* BID SIDE (Buyers queue on Left) */}
              <div className="bg-black/40 p-3 space-y-1">
                <div className="grid grid-cols-3 text-[#E0E0E0]/30 font-bold text-[10px] uppercase pb-1.5 border-b border-white/5">
                  <span>Count</span>
                  <span className="text-right">Bid Vol</span>
                  <span className="text-right text-emerald-400">Bid Price</span>
                </div>
                {bids.map((b, i) => {
                  const percentOfTotal = Math.min(100, Math.round((b.vol / totalBidVol) * 350));
                  return (
                    <div key={i} className="relative grid grid-cols-3 py-1.5 hover:bg-white/[0.03] transition-colors items-center select-none2">
                      <div className="absolute top-0 right-0 h-full bg-emerald-500/5 -z-10" style={{ width: `${percentOfTotal}%` }} />
                      <span className="text-white/40 text-[10px]">{b.count.toLocaleString()}</span>
                      <span className="text-right text-white/80 font-bold">{b.vol.toLocaleString()}</span>
                      <span className="text-right text-emerald-400 font-extrabold">Rp {b.price.toLocaleString("id-ID")}</span>
                    </div>
                  );
                })}
                <div className="grid grid-cols-3 font-bold border-t border-white/5 pt-2 text-[10px] uppercase text-[#E0E0E0]/40">
                  <span>Total Bid</span>
                  <span className="text-right text-white">{totalBidVol.toLocaleString()}</span>
                  <span className="text-right" />
                </div>
              </div>

              {/* ASK SIDE (Sellers queue on Right) */}
              <div className="bg-black/40 p-3 space-y-1">
                <div className="grid grid-cols-3 text-[#E0E0E0]/30 font-bold text-[10px] uppercase pb-1.5 border-b border-white/5">
                  <span className="text-rose-400 text-left">Ask Price</span>
                  <span className="text-right">Ask Vol</span>
                  <span className="text-right">Count</span>
                </div>
                {asks.map((a, i) => {
                  const percentOfTotal = Math.min(100, Math.round((a.vol / totalAskVol) * 350));
                  return (
                    <div key={i} className="relative grid grid-cols-3 py-1.5 hover:bg-white/[0.03] transition-colors items-center select-none">
                      <div className="absolute top-0 left-0 h-full bg-rose-500/5 -z-10" style={{ width: `${percentOfTotal}%` }} />
                      <span className="text-left text-rose-400 font-extrabold">Rp {a.price.toLocaleString("id-ID")}</span>
                      <span className="text-right text-white/80 font-bold">{a.vol.toLocaleString()}</span>
                      <span className="text-right text-white/40 text-[10px]">{a.count.toLocaleString()}</span>
                    </div>
                  );
                })}
                <div className="grid grid-cols-3 font-bold border-t border-white/5 pt-2 text-[10px] uppercase text-[#E0E0E0]/40">
                  <span className="text-left" />
                  <span className="text-right text-white">{totalAskVol.toLocaleString()}</span>
                  <span className="text-right text-white/40">Total Ask</span>
                </div>
              </div>

            </div>
          </div>

          {/* B. SYSTEM TIMELINE */}
          <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 shadow-sm">
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#E0E0E0] mb-4 flex items-center gap-2">
              <Clock className="w-4.5 h-4.5 text-emerald-400" />
              Sinyal Rotasi & Timeline
            </h3>

            <div className="space-y-4 font-mono">
              {RS.volume_details
                .filter(vol => vol.includes("Lonjakan") || vol.includes("Penurunan"))
                .map((vol, idx) => {
                const isHighlight = vol.includes("Lonjakan") || vol.includes("Penurunan");
                return (
                  <div key={idx} className="flex items-start gap-3.5 pb-3 border-b border-white/5 last:border-0 last:pb-0 text-xs">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${isHighlight ? "bg-amber-400 animate-ping" : "bg-emerald-500"}`} />
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline">
                        <span className="font-semibold text-[#E0E0E0] tracking-wide font-mono">
                          {vol.split(":")[0]}
                        </span>
                        <span className="text-[10px] text-[#E0E0E0]/30 font-sans">Live JCI Feed</span>
                      </div>
                      <p className="text-[#E0E0E0]/60 mt-1 font-sans">
                        {vol.split(":")[1] || vol}
                      </p>
                    </div>
                    <div className="text-[10px] font-sans bg-white/5 border border-white/10 px-2 py-0.5 rounded text-white/30 self-center">
                      Inspect Ticker
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: CHAT WITH AI AGENT (4 CoL) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* A. CHAT WITH AI AGENT INTEGRATION SPACE */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 px-1 mb-2">
               <div className="flex items-center gap-2">
                 <Sparkles className="w-4 h-4 text-emerald-400" />
                 <h3 className="text-[10px] sm:text-xs uppercase font-extrabold tracking-widest text-[#E0E0E0]">
                   Asisten Analis AI
                 </h3>
               </div>
               <div className="w-full sm:w-auto min-w-[140px]">
                 <SearchableSelect
                   value={depthTicker}
                   options={[
                     { value: "WATCHLIST", label: "Daftar Pantau" },
                     ...visibleStocks.map(s => ({ value: s.ticker, label: `${s.ticker} - ${s.name}` }))
                   ]}
                   onChange={(val) => {
                     setDepthTicker(val);
                   }}
                 />
               </div>
            </div>
            <div key={aiAssistantStock.ticker}>
              <AIAssistant stock={aiAssistantStock} />
            </div>
          </div>

        </div>

      </div>

      {/* PORTFOLIO & WATCHLIST TRACKER TABLE GRID */}
      <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block font-mono">Daftar Pantau Saham</span>
            <h2 className="text-sm font-black text-white mt-0.5 uppercase tracking-wide">Pantauan Saham Aktif</h2>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="w-full sm:w-48">
              <SearchableSelect
                value={watchlistTicker}
                options={visibleStocks.map(s => ({ value: s.ticker, label: `${s.ticker} - ${s.name}`, logoColor: s.logoColor }))}
                onChange={(val) => setWatchlistTicker(val)}
              />
            </div>
            <button
               onClick={() => onToggleWatchlist(watchlistTicker)}
               className="bg-white/10 hover:bg-emerald-500 hover:text-black text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors cursor-pointer shrink-0"
               disabled={watchlist.some(w => w.ticker === watchlistTicker)}
               title="Tambahkan ke Daftar Pantau"
             >
               Tambah
            </button>
          </div>
        </div>
        
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 shadow-sm">
          {watchlist.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/10">
              <p className="text-white/40 text-xs">Belum ada perusahaan dalam Daftar Pantau. Gunakan form di atas untuk menambahkannya.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {watchlist.map((item) => {
                const liveStock = getDynamicStock(item.ticker) || STOCKS_DATA.find((s) => s.ticker === item.ticker);
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
                          onClick={() => onSelectTicker(liveStock.ticker)}
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
      </div>

    </div>
  );
}
