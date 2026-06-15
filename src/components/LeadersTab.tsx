import { useState } from "react";
import { L, CW_F, CW_B, EX, getProcessedLeaders } from "../marketData";
import { STOCKS_DATA } from "../stocksData";
import { StockData, PortfolioItem, WatchlistItem } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Search, Sliders, Play, TrendingUp, TrendingDown, LayoutGrid, Table, RefreshCw, BookmarkCheck, Bookmark, Filter } from "lucide-react";
import { TickerLogo } from "./TickerLogo";
import { IDX80_TICKERS, IDX30_TICKERS } from "../../idx80";

// Rotation tracking database helper to identify market shifts & top/bottom entries
export function getRotationData(ticker: string, dynamicChange?: number) {
  const clean = ticker.replace(".JK", "");
  const data: Record<string, { topHits: number; dropHits: number; path: string; label: string; trend: "up" | "down" | "stable" }> = {
    ADRO: { topHits: 28, dropHits: 2, path: "↗▲↗", label: "Konsisten Peak", trend: "up" },
    ESSA: { topHits: 22, dropHits: 3, path: "↗▲▲", label: "Rotasi Kuat", trend: "up" },
    PTBA: { topHits: 19, dropHits: 5, path: "↗▼↗", label: "Ayunan Tinggi", trend: "up" },
    MAPI: { topHits: 14, dropHits: 6, path: "▲↗▲", label: "Breakout", trend: "up" },
    BMRI: { topHits: 12, dropHits: 8, path: "→▼↗", label: "Pemulihan", trend: "stable" },
    CPIN: { topHits: 10, dropHits: 7, path: "▼↗→", label: "Defensif", trend: "stable" },
    PGAS: { topHits: 9, dropHits: 11, path: "▼→↗", label: "Spekulatif", trend: "up" },
    ANTM: { topHits: 8, dropHits: 12, path: "→▼→", label: "Konsolidasi", trend: "stable" },
    AKRA: { topHits: 6, dropHits: 10, path: "↗▼▼", label: "Saturasi", trend: "down" },
    BBRI: { topHits: 15, dropHits: 14, path: "↗▼↗", label: "Bluechip", trend: "stable" },
    BRPT: { topHits: 11, dropHits: 16, path: "▼▼↗", label: "Spekulatif", trend: "up" },
    BBNI: { topHits: 5, dropHits: 15, path: "▼▼→", label: "Tekanan", trend: "down" },
    INDF: { topHits: 4, dropHits: 12, path: "→▼▼", label: "Jenuh", trend: "down" },
    EXCL: { topHits: 7, dropHits: 9, path: "↗→↗", label: "Rebound", trend: "up" },
    INTP: { topHits: 3, dropHits: 18, path: "▼→▼", label: "Lemah", trend: "down" },
    MDKA: { topHits: 6, dropHits: 17, path: "▼▼↗", label: "Uji Support", trend: "stable" },
    ITMG: { topHits: 13, dropHits: 11, path: "▼↗▼", label: "Siklus Div", trend: "down" },
    ASII: { topHits: 2, dropHits: 22, path: "▼▼→", label: "Akumulasi", trend: "stable" },
    BBCA: { topHits: 16, dropHits: 3, path: "→→↗", label: "Jangkar IHSG", trend: "stable" },
    TLKM: { topHits: 5, dropHits: 25, path: "▼▼→", label: "Transisi", trend: "down" },
    SMGR: { topHits: 1, dropHits: 28, path: "▼▼▼", label: "Downtrend", trend: "down" },
    MIKA: { topHits: 8, dropHits: 15, path: "→↗▼", label: "Konsolidasi", trend: "stable" },
    UNTR: { topHits: 3, dropHits: 24, path: "▼▼▼", label: "Tertekan", trend: "down" },
    ICBP: { topHits: 7, dropHits: 18, path: "▼→▼", label: "Lesu", trend: "down" },
    SIDO: { topHits: 2, dropHits: 26, path: "▼▼→", label: "Saturasi", trend: "down" },
    GOTO: { topHits: 1, dropHits: 42, path: "▼→▼", label: "Transisi", trend: "down" },
    KLBF: { topHits: 0, dropHits: 35, path: "▼▼▼", label: "Distribusi", trend: "down" },
    TPIA: { topHits: 12, dropHits: 29, path: "▼↗▼", label: "Volatil", trend: "stable" },
  };

  if (data[clean]) {
    return data[clean];
  }

  // Cari dan ekstrak data fundamental jika ada
  const stk = STOCKS_DATA.find(s => s.ticker === clean);
  const change = dynamicChange !== undefined ? dynamicChange : (stk ? stk.change : 0);
  
  // Kombinasi data riil dan faktor deterministik untuk rotasi yang realistis
  const tHash = clean.charCodeAt(0) * 11 + (clean.charCodeAt(1) || 0) * 7;
  const isUp = change > 0 || (change === 0 && tHash % 2 === 0);
  
  // Top hits & drop hits disesuaikan dengan profil pertumbuhan emiten
  const topHits = Math.max(1, Math.floor((change + 5) * 2) + (tHash % 15));
  const dropHits = Math.max(1, Math.floor((5 - change) * 2) + ((tHash * 2) % 12));
  
  const path = isUp ? (change > 1 ? "↗▲↗" : "▲↗▲") : (change < -1 ? "▼▼▼" : "→▼→");
  const label = isUp ? (change > 2 ? "Momentum" : "Akumulasi") : (change < -2 ? "Distribusi" : "Konsolidasi");
  const trend = isUp ? "up" : (change < -1 ? "down" : "stable") as "up" | "down" | "stable";

  return { topHits, dropHits, path, label, trend };
}

export function getRotationColor(label: string, trend: string) {
  const lbl = label.toLowerCase();
  if (lbl.includes("akumulasi") || lbl.includes("peak") || lbl.includes("breakout") || lbl.includes("momentum") || lbl.includes("rebound") || lbl.includes("pemulihan")) {
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  }
  if (lbl.includes("jenuh") || lbl.includes("downtrend") || lbl.includes("lesu") || lbl.includes("tertekan") || lbl.includes("distribusi") || lbl.includes("lemah")) {
    return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  }
  if (lbl.includes("spekulatif") || lbl.includes("transisi") || lbl.includes("volatil") || lbl.includes("risiko") || lbl.includes("siklus")) {
    return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  }
  if (lbl.includes("konsolidasi") || lbl.includes("support") || lbl.includes("defensif") || lbl.includes("jangkar") || lbl.includes("bluechip") || lbl.includes("ayunan")) {
    return "bg-blue-500/10 text-blue-400 border-blue-500/20";
  }
  if (trend === "up") return "bg-white/[0.05] text-white border-white/10";
  if (trend === "down") return "bg-rose-500/5 text-rose-400 border-rose-500/10";
  return "bg-white/[0.01] text-white/40 border-white/[0.03]";
}

interface LeadersTabProps {
  activeConfig: "prod" | "res";
  onSelectTicker: (ticker: string) => void;
  portfolio?: PortfolioItem[];
  watchlist?: WatchlistItem[];
  getDynamicStock: (ticker: string) => StockData | null;
}

export function LeadersTab({ activeConfig, onSelectTicker, portfolio = [], watchlist = [], getDynamicStock }: LeadersTabProps) {
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [search, setSearch] = useState("");
  const [indexFilter, setIndexFilter] = useState<"ALL" | "IDX80" | "IDX30">("ALL");
  const [sortBy, setSortBy] = useState<"score" | "quality" | "growth" | "value" | "momentum">("score");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const activeStocksList = STOCKS_DATA.map(s => getDynamicStock(s.ticker) || s);
  const processedLeaders = getProcessedLeaders(activeStocksList, activeConfig);
  const weights = activeConfig === "prod" ? CW_F : CW_B;

  let filteredLeaders = processedLeaders.filter((item) => {
    const rawTicker = item.ticker.replace(".JK", "").toUpperCase();
    const matchesSearch = item.ticker.toLowerCase().includes(search.toLowerCase()) || rawTicker.toLowerCase().includes(search.toLowerCase());
    
    let matchesIndex = true;
    if (indexFilter === "IDX80") {
      matchesIndex = IDX80_TICKERS.includes(item.ticker) || IDX80_TICKERS.includes(rawTicker + ".JK");
    } else if (indexFilter === "IDX30") {
      matchesIndex = IDX30_TICKERS.includes(item.ticker) || IDX30_TICKERS.includes(rawTicker + ".JK");
    }

    return matchesSearch && matchesIndex;
  });

  filteredLeaders.sort((a, b) => {
    let valA = 0;
    let valB = 0;
    if (sortBy === "score") {
      valA = a.score;
      valB = b.score;
    } else {
      valA = parseFloat(a[sortBy]);
      valB = parseFloat(b[sortBy]);
    }
    return sortOrder === "desc" ? valB - valA : valA - valB;
  });

  const top5 = filteredLeaders.slice(0, 5);
  const avgTop5Score = top5.reduce((sum, item) => sum + item.score, 0) / (top5.length || 1);

  return (
    <div className="flex flex-col flex-1 space-y-4 md:space-y-6">
      
      {/* 1. COMPACT PERSPECTIVE OVERVIEW CARD */}
      <div className="bg-[#050505] border border-white/[0.03] rounded-xl md:rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2 font-mono">
              <Sliders className="w-4 h-4 text-white/40" />
              {activeConfig === "prod" ? "Strategi Fundamental" : "Strategi Teknis Kuat"}
            </h2>
            <p className="text-[9px] text-zinc-500 mt-2 uppercase tracking-widest font-bold">
              Kualitas: <span className="text-white/80">{(weights.quality * 100)}%</span> • Growth: <span className="text-white/80">{(weights.growth * 100)}%</span> • Value: <span className="text-white/80">{(weights.value * 100)}%</span> • Momentum: <span className="text-white/80">{(weights.momentum * 100)}%</span>
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0 mt-2 sm:mt-0">
            <span className="text-[9px] text-[#E0E0E0]/30 uppercase block font-bold tracking-widest">Rata-rata 5 Teratas</span>
            <span className="text-2xl font-black font-mono text-white block mt-1">{avgTop5Score.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {/* 2. FILTERS AND TOGGLES */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        
        {/* Search bar input */}
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari emiten ticker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-4 py-2 bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.05] rounded-xl outline-none text-white focus:border-white/20 transition-all font-mono placeholder:text-white/20"
          />
        </div>

        <div className="flex gap-2 items-center overflow-x-auto scrollbar-none">
          {/* Index Filter */}
          <div className="flex bg-white/[0.01] border border-white/[0.05] rounded-xl relative">
            <Filter className="w-3 h-3 text-white/40 absolute left-2.5 top-2.5 pointer-events-none" />
            <select
              value={indexFilter}
              onChange={(e) => setIndexFilter(e.target.value as any)}
              className="pl-7 pr-3 py-2 text-[10px] uppercase tracking-widest font-bold bg-transparent outline-none text-emerald-400 appearance-none cursor-pointer"
            >
              <option value="ALL" className="bg-[#0A0A0A] text-white">Semua Saham</option>
              <option value="IDX80" className="bg-[#0A0A0A] text-white">IDX80</option>
              <option value="IDX30" className="bg-[#0A0A0A] text-white">IDX30</option>
            </select>
          </div>

          {/* Sort Controls */}
          <div className="flex bg-white/[0.01] border border-white/[0.05] rounded-xl">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-[10px] uppercase tracking-widest font-bold px-3 py-2 bg-transparent outline-none text-white/70 appearance-none cursor-pointer"
            >
              <option value="score" className="bg-[#0A0A0A] text-white">Total Score</option>
              <option value="quality" className="bg-[#0A0A0A] text-white">Quality</option>
              <option value="growth" className="bg-[#0A0A0A] text-white">Growth</option>
              <option value="value" className="bg-[#0A0A0A] text-white">Value</option>
              <option value="momentum" className="bg-[#0A0A0A] text-white">Momentum</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
              className="px-3 border-l border-white/[0.05] text-white/40 hover:text-white transition-all cursor-pointer"
              title="Toggle Sort Order"
            >
              {sortOrder === "desc" ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* View Mode Switches */}
          <div className="inline-flex rounded-xl bg-white/[0.01] p-0.5 border border-white/[0.05] shrink-0">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer flex items-center gap-1.5 transition-all ${
                viewMode === "table" ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white"
              }`}
            >
              <Table className="w-3 h-3" /> Matrix
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer flex items-center gap-1.5 transition-all ${
                viewMode === "cards" ? "bg-white/10 text-white shadow-sm" : "text-white/40 hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3 h-3" /> Cards
            </button>
          </div>
        </div>

      </div>

      {/* 3. CORE LEADERS LIST CONTAINER */}
      <AnimatePresence mode="wait">
        {viewMode === "table" ? (
          
          /* VIEW A: FACTOR MATRIX TABLE */
          <motion.div
            key="table-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-[#050505] border border-white/[0.03] rounded-2xl overflow-hidden shadow-sm flex flex-col flex-1"
          >
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-[400px] text-xs scrollbar-thin">
              <table className="w-full text-left border-collapse relative">
                <thead className="sticky top-0 bg-[#050505] z-10">
                  <tr className="border-b border-white/[0.05] text-[9px] font-bold text-white/30 uppercase tracking-widest">
                    <th className="py-4 px-3 md:px-5 font-sans">Rank</th>
                    <th className="py-4 px-3 font-sans">Emiten Saham</th>
                    <th className="py-4 px-3 text-center hidden md:table-cell font-sans">Quality</th>
                    <th className="py-4 px-3 text-center hidden md:table-cell font-sans">Growth</th>
                    <th className="py-4 px-3 text-center hidden md:table-cell font-sans">Value</th>
                    <th className="py-4 px-3 text-center hidden md:table-cell font-sans">Moment</th>
                    <th className="py-4 px-3 text-left font-sans">Rotasi Sektor</th>
                    <th className="py-4 px-3 md:px-5 text-right font-black font-sans text-white/40">Total Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {filteredLeaders.map((item, idx) => {
                    const clean = item.ticker.replace(".JK", "");
                    const liveStk = activeStocksList.find(s => s.ticker === clean);
                    const rot = getRotationData(item.ticker, liveStk?.change);
                    const isInPorto = portfolio.some(p => p.ticker === clean);
                    const isInWatchlist = watchlist.some(w => w.ticker === clean);
                    return (
                      <tr 
                        key={item.ticker} 
                        className={`transition-colors cursor-pointer group ${isInPorto ? "bg-white/[0.02] hover:bg-white/[0.04]" : "hover:bg-white/[0.02]"}`}
                        onClick={() => onSelectTicker(clean)}
                      >
                        <td className="py-3 px-3 md:px-5 font-bold text-white/30 font-mono text-[10px]">
                          #{processedLeaders.findIndex(p => p.ticker === item.ticker) + 1}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <TickerLogo ticker={clean} size="sm" fallbackColor={liveStk?.logoColor} />
                            <div>
                               <div className="flex items-center gap-1.5">
                                 <span className={`font-black tracking-wide font-mono ${isInPorto ? "text-emerald-400" : "text-white/90 group-hover:text-white"}`}>
                                   {clean}
                                 </span>
                                 {isInPorto ? <BookmarkCheck className="w-3 h-3 text-emerald-400" /> : isInWatchlist ? <Bookmark className="w-3 h-3 text-white/30" /> : null}
                               </div>
                               <div className="flex items-center gap-1.5 mt-1">
                                 {item.rankChange > 0 && (
                                   <span className="text-[8px] font-bold text-emerald-400 border border-emerald-500/20 px-1 py-0.5 rounded flex items-center gap-0.5 font-mono">
                                     <TrendingUp className="w-2 h-2" /> +{item.rankChange}
                                   </span>
                                 )}
                                 {item.rankChange < 0 && (
                                   <span className="text-[8px] font-bold text-rose-400 border border-rose-500/20 px-1 py-0.5 rounded flex items-center gap-0.5 font-mono">
                                     <TrendingDown className="w-2 h-2" /> {item.rankChange}
                                   </span>
                                 )}
                                 {(() => {
                                   const matchEX = EX.find(e => e.ticker.toUpperCase().replace(".JK", "") === clean);
                                   if (matchEX?.exit_state === "EXIT") {
                                      return (
                                        <span className="text-[8px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest font-sans">
                                          EXIT
                                        </span>
                                      );
                                   }
                                   if (matchEX?.exit_state === "EXIT RISK") {
                                      return (
                                        <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest font-sans">
                                          RISK
                                        </span>
                                      );
                                   }
                                   return null;
                                 })()}
                               </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center text-white/50 font-mono text-xs hidden md:table-cell">{item.quality}</td>
                        <td className="py-3 px-3 text-center text-white/50 font-mono text-xs hidden md:table-cell">{item.growth}</td>
                        <td className="py-3 px-3 text-center text-white/50 font-mono text-xs hidden md:table-cell">{item.value}</td>
                        <td className="py-3 px-3 text-center text-white/50 font-mono text-xs hidden md:table-cell">{item.momentum}</td>
                        
                        {/* ROTATION STATS MATRIX COLUMN */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col items-start gap-1">
                            <span className={`text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest flex items-center gap-1 border ${getRotationColor(rot.label, rot.trend)}`}>
                              <span className="font-mono text-xs tracking-tight leading-none">{rot.path}</span>
                              <span>{rot.label}</span>
                            </span>
                            <span className="text-[9px] text-zinc-500 font-mono font-medium">
                              T: {rot.topHits} | B: {rot.dropHits}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-3 md:px-5 text-right font-bold text-white/90 font-mono text-sm group-hover:text-white">
                          {item.score.toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          
          /* VIEW B: CARDS DECK VIEW */
          <motion.div
            key="cards-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto flex-1 min-h-[400px] scrollbar-thin p-1"
          >
            {filteredLeaders.map((item, idx) => {
              const clean = item.ticker.replace(".JK", "");
              const liveStk = activeStocksList.find(s => s.ticker === clean);
              const rot = getRotationData(item.ticker, liveStk?.change);
              const isInPorto = portfolio.some(p => p.ticker === clean);
              const isInWatchlist = watchlist.some(w => w.ticker === clean);
              return (
                <div
                  key={item.ticker}
                  onClick={() => onSelectTicker(clean)}
                  className={`p-5 rounded-2xl transition-all cursor-pointer border ${
                    isInPorto
                      ? "bg-white/[0.02] border-white/10 hover:border-white/20"
                      : "bg-[#050505] border-white/[0.03] hover:bg-white/[0.01] hover:border-white/10"
                  }`}
                >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <TickerLogo ticker={clean} size="md" fallbackColor={liveStk?.logoColor} />
                        <div>
                          <span className="text-[9px] text-zinc-500 block font-mono font-bold uppercase tracking-widest">Rank {processedLeaders.findIndex(p => p.ticker === item.ticker) + 1}</span>
                          <h4 className={`text-base font-black tracking-widest mt-1 font-mono flex flex-wrap items-center gap-2 ${isInPorto ? "text-emerald-400" : "text-white/90"}`}>
                            {clean}
                            {isInPorto ? <BookmarkCheck className="w-4 h-4 text-emerald-400" /> : isInWatchlist ? <Bookmark className="w-4 h-4 text-white/30" /> : null}
                          </h4>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-zinc-500 block font-mono font-bold uppercase tracking-widest">Score</span>
                        <span className="text-lg font-bold text-white font-mono leading-none block">{item.score.toFixed(1)}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 mb-4">
                        {item.rankChange !== 0 && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border border-transparent font-bold font-mono ${item.rankChange > 0 ? "text-emerald-400 border-emerald-500/20" : "text-rose-400 border-rose-500/20"}`}>
                            {item.rankChange > 0 ? "+" : ""}{item.rankChange} Rnk
                          </span>
                        )}
                        {(() => {
                           const matchEX = EX.find(e => e.ticker.toUpperCase().replace(".JK", "") === clean);
                           if (matchEX?.exit_state === "EXIT") {
                             return (
                               <span className="text-[9px] font-black text-rose-400 border border-rose-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest font-sans">
                                 EXIT
                               </span>
                             );
                           }
                           if (matchEX?.exit_state === "EXIT RISK") {
                             return (
                               <span className="text-[9px] font-bold text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase tracking-widest font-sans">
                                 RISK
                               </span>
                             );
                           }
                           return null;
                        })()}
                    </div>

                  {/* Visual Progress Rails */}
                  <div className="space-y-2.5 text-[10px] font-sans">
                    <div>
                      <div className="flex justify-between text-white/40 mb-1 font-bold tracking-wide uppercase text-[9px]">
                        <span>Quality</span>
                        <span className="font-mono text-zinc-500">{item.quality}</span>
                      </div>
                      <div className="w-full bg-white/[0.05] h-1 rounded-full overflow-hidden">
                        <div className="bg-white/40 h-full" style={{ width: `${item.quality}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-white/40 mb-1 font-bold tracking-wide uppercase text-[9px]">
                        <span>Growth</span>
                        <span className="font-mono text-zinc-500">{item.growth}</span>
                      </div>
                      <div className="w-full bg-white/[0.05] h-1 rounded-full overflow-hidden">
                        <div className="bg-white/40 h-full" style={{ width: `${item.growth}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-white/40 mb-1 font-bold tracking-wide uppercase text-[9px]">
                        <span>Value</span>
                        <span className="font-mono text-zinc-500">{item.value}</span>
                      </div>
                      <div className="w-full bg-white/[0.05] h-1 rounded-full overflow-hidden">
                        <div className="bg-white/40 h-full" style={{ width: `${item.value}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-white/40 mb-1 font-bold tracking-wide uppercase text-[9px]">
                        <span>Momentum</span>
                        <span className="font-mono text-zinc-500">{item.momentum}</span>
                      </div>
                      <div className="w-full bg-white/[0.05] h-1 rounded-full overflow-hidden">
                        <div className="bg-white/40 h-full" style={{ width: `${item.momentum}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* ROTATION STATS HIGHLIGHT */}
                  <div className="mt-5 pt-4 border-t border-white/[0.05] flex items-center justify-between gap-2">
                    <div className="flex flex-col">
                      <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Rotasi Pasar</span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-mono font-bold text-white/80">{rot.path}</span>
                        <span className="text-[10px] text-white/60 font-medium">{rot.label}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Posisi</span>
                      <span className="text-[9px] text-zinc-400 font-mono block mt-1">
                        T: <strong className="text-white/60">{rot.topHits}</strong> B: <strong className="text-white/60">{rot.dropHits}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
