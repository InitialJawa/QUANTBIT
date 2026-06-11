import React, { useState } from "react";
import { RS, MKT } from "../marketData";
import { STOCKS_DATA } from "../stocksData";
import { StockData, PortfolioItem, WatchlistItem } from "../types";
import { AIAssistant } from "./AIAssistant";
import { PortfolioTracker } from "./PortfolioTracker";
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
  Eye
} from "lucide-react";

interface MarketTabProps {
  onSelectTicker: (ticker: string) => void;
  activeStock: StockData;
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  onAddTransaction: (ticker: string, shares: number, buyPrice: number) => void;
  onRemoveTransaction: (ticker: string) => void;
  onToggleWatchlist: (ticker: string) => void;
  idxUniverse?: "idx30" | "idx80";
}

export function MarketTab({ 
  onSelectTicker, 
  activeStock,
  portfolio,
  watchlist,
  onAddTransaction,
  onRemoveTransaction,
  onToggleWatchlist,
  idxUniverse = "idx80"
}: MarketTabProps) {
  const visibleStocks = idxUniverse === "idx30" ? STOCKS_DATA.slice(0, 30) : STOCKS_DATA;
  const [isBriefExpanded, setIsBriefExpanded] = useState(false);
  const [depthTicker, setDepthTicker] = useState<string>(activeStock.ticker);

  // Portfolio performance calculations for My Status comparison
  let totalCost = 0;
  let totalValueNow = 0;
  portfolio.forEach(item => {
    const liveStock = STOCKS_DATA.find(s => s.ticker === item.ticker);
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
        className={`relative bg-[#0A0A0A] border ${isIHSGInCrisis ? "border-rose-500/20" : "border-white/10"} rounded-2xl p-6 overflow-hidden shadow-xl`}
      >
        <div className={`absolute top-0 right-0 w-64 h-64 ${isIHSGInCrisis ? "bg-rose-500/5 animate-pulse" : "bg-emerald-500/5"} rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none`} />
        
        <div className="flex flex-col xl:flex-row justify-between items-start gap-6 pb-6 border-b border-white/5 w-full">
          <div className="flex flex-col sm:flex-row gap-6 w-full md:w-auto">
            {/* System Status (Status Pasar) */}
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#E0E0E0]/40 block mb-2 font-mono">STATUS PASAR (SYSTEM REGIME)</span>
              <div className="flex items-center gap-3">
                <span className={`text-xl font-black px-4 py-1.5 rounded-xl border ${statusClass}`}>
                  {currentStatus === "SAFE" ? "RISK ON" : currentStatus === "RISK OFF" ? "RISK OFF" : currentStatus}
                </span>
                <div>
                  <span className="text-xs text-[#E0E0E0]/60 leading-none block">System Stance</span>
                  <span className="text-xs font-semibold text-white/80 mt-1 block font-mono">
                    Cdeploy: <span className={isIHSGInCrisis ? "text-rose-455" : "text-emerald-400 font-bold"}>{isIHSGInCrisis ? "0%" : `${RS.capital_deployment}%`}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* User Portfolio Status (Status Anda / Statusku) */}
            <div className="border-t sm:border-t-0 sm:border-l border-white/10 pt-4 sm:pt-0 sm:pl-6">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#E0E0E0]/40 block mb-2 font-mono">STATUS ANDA (PORTFOLIO FEED)</span>
              <div className="flex items-center gap-3">
                {portfolio.length === 0 ? (
                  <span className="text-xs font-bold px-3 py-1.5 bg-white/5 border border-white/10 text-white/40 rounded-xl font-sans">
                    KOSONG / EMPTY
                  </span>
                ) : (
                  <span className={`text-xs font-extrabold px-3 py-1.5 rounded-xl border font-sans ${
                    myReturnPercent >= 0 
                      ? "text-emerald-450 bg-emerald-500/10 border-emerald-500/20 font-bold" 
                      : "text-rose-450 bg-rose-500/10 border-rose-500/20"
                  }`}>
                    {myReturnPercent >= 0 ? "CUAN" : "DROP"} {myReturnPercent >= 0 ? "+" : ""}{myReturnPercent.toFixed(2)}%
                  </span>
                )}
                <div>
                  <span className="text-xs text-[#E0E0E0]/60 leading-none block">Portfolio Health</span>
                  <span className="text-[11px] text-white/85 mt-1 block font-mono">
                    {portfolio.length} Emiten Aktif
                  </span>
                </div>
              </div>
            </div>
          </div>



          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto shrink-0">
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex-1 md:w-44">
              <span className="text-[9px] uppercase font-bold tracking-wider text-white/40 block">Stance Action</span>
              <span className={`inline-block text-xs font-bold mt-2 px-2.5 py-1 rounded-md border ${actionClass}`}>
                {currentAction === "WAIT" ? "WAIT / TUNGGU" : currentAction}
              </span>
            </div>
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl flex-1 md:w-44">
              <span className="text-[9px] uppercase font-bold tracking-wider text-white/40 block">Momentum Trend</span>
              <span className={`text-sm font-bold mt-2 block flex items-center gap-1 ${isIHSGInCrisis ? "text-rose-400" : "text-emerald-400"}`}>
                {isIHSGInCrisis ? (
                  <>
                    <TrendingDown className="w-4 h-4 animate-bounce" /> Systemic Crash
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" /> Improving
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Hero Grid Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 text-center md:text-left">
          <div className="border-r border-white/5 last:border-0 pr-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#E0E0E0]/40 block">Market Health</span>
            <span className="text-4xl font-extrabold font-mono text-white mt-1.5 block">{RS.market_health}</span>
            <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: `${RS.market_health}%` }} />
            </div>
          </div>
          <div className="border-r border-white/5 last:border-0 pr-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#E0E0E0]/40 block">Opportunity</span>
            <span className="text-4xl font-extrabold font-mono text-emerald-400 mt-1.5 block">{RS.opportunity}</span>
            <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-400 h-full" style={{ width: `${RS.opportunity}%` }} />
            </div>
          </div>
          <div className="border-r border-white/5 last:border-0 pr-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#E0E0E0]/40 block">Deployment Risk</span>
            <span className="text-4xl font-extrabold font-mono text-rose-400 mt-1.5 block">{RS.risk}</span>
            <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-rose-500 h-full" style={{ width: `${RS.risk}%` }} />
            </div>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#E0E0E0]/40 block">Confidence</span>
            <span className="text-4xl font-extrabold font-mono text-white mt-1.5 block">{RS.confidence}</span>
            <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-indigo-500 h-full" style={{ width: `${RS.confidence}%` }} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* 2. SNAPSHOT METRICS GRID */}
      <h3 className="text-[10px] uppercase font-bold tracking-widest text-white/40 px-1">Real-Time Market Indicators Snapshot</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* IHSG */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4.5 shadow-sm space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">IHSG (JCI) Price</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-mono font-bold text-white">{MKT.ihsg.value.toLocaleString("id-ID")}</span>
            <span className={`text-xs font-bold ${MKT.ihsg.daily >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {MKT.ihsg.daily >= 0 ? "+" : ""}{MKT.ihsg.daily}%
            </span>
          </div>
          <span className="text-[10px] text-white/40 block">Monthly: <span className="text-rose-400 font-semibold">{MKT.ihsg.monthly}%</span></span>
        </div>

        {/* Rupiah */}
        <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-4.5 shadow-sm space-y-1.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/40 block">USD / IDR exchange</span>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-mono font-bold text-white">Rp {MKT.usdidr.value.toLocaleString("id-ID")}</span>
            <span className="text-xs font-bold text-rose-400">-{MKT.usdidr.daily}%</span>
          </div>
          <span className="text-[10px] text-emerald-400 block font-medium">Rupiah Strengthening</span>
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
                  Real-Time Market Depth (Order Book)
                </h3>
              </div>
              
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <span className="text-[10px] text-white/40 font-mono shrink-0">Pilih Saham:</span>
                <select
                  value={depthTicker}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setDepthTicker(nextVal);
                    onSelectTicker(nextVal); // Also sync parent highlight
                  }}
                  className="bg-black text-[11px] font-mono font-bold text-emerald-400 border border-white/10 px-3 py-1.5 rounded-lg outline-none cursor-pointer focus:border-emerald-500/40 w-full sm:w-40"
                >
                  {visibleStocks.map(stk => (
                    <option key={stk.ticker} value={stk.ticker}>
                      {stk.ticker} - {stk.name}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-white/40 font-mono shrink-0 hidden sm:inline">
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
              Rotation Signals timeline
            </h3>

            <div className="space-y-4 font-mono">
              {RS.volume_details.map((vol, idx) => {
                const isLonjakan = vol.includes("Lonjakan") || vol.includes("Wajar");
                return (
                  <div key={idx} className="flex items-start gap-3.5 pb-3 border-b border-white/5 last:border-0 last:pb-0 text-xs">
                    <div className={`w-2 h-2 rounded-full mt-1.5 ${isLonjakan && vol.includes("Lonjakan") ? "bg-amber-400 animate-ping" : "bg-emerald-500"}`} />
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
                    <button
                      onClick={() => onSelectTicker(vol.split(".JK")[0]?.trim() || "BBCA")}
                      className="text-[10px] font-sans bg-white/5 hover:bg-emerald-500 hover:text-black border border-white/10 px-2 py-0.5 rounded cursor-pointer transition-all self-center text-white/70"
                    >
                      Inspect Ticker
                    </button>
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
            <div className="flex items-center gap-2 px-1">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#E0E0E0]">
                Generative AI Analyst Advisor
              </h3>
            </div>
            <AIAssistant stock={currentDepthStock} />
          </div>

        </div>

      </div>

      {/* PORTFOLIO & WATCHLIST TRACKER TABLE GRID */}
      <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 block font-mono">Live Simulation Portfolio Hub</span>
            <h2 className="text-sm font-black text-white mt-0.5 uppercase tracking-wide">Buku Jurnal &amp; Simulasi Portofolio</h2>
          </div>
          <p className="text-[11px] text-white/35 max-w-md sm:text-right">
            Pantau pergerakan harga riil emiten pilihan Anda terhadap tingkat rating rotasi algoritma kuantitatif secara langsung.
          </p>
        </div>
        <PortfolioTracker
          portfolio={portfolio}
          watchlist={watchlist}
          onAddTransaction={onAddTransaction}
          onRemoveTransaction={onRemoveTransaction}
          onSelectStock={onSelectTicker}
          onToggleWatchlist={onToggleWatchlist}
          idxUniverse={idxUniverse}
        />
      </div>

    </div>
  );
}
