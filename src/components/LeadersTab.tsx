import { useState } from "react";
import { L, CW_F, CW_B, RK, EX } from "../marketData";
import { STOCKS_DATA } from "../stocksData";
import { motion, AnimatePresence } from "motion/react";
import { Search, Sliders, Play, TrendingUp, TrendingDown, LayoutGrid, Table, RefreshCw } from "lucide-react";

// Rotation tracking database helper to identify market shifts & top/bottom entries
export function getRotationData(ticker: string) {
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

  return data[clean] || { topHits: 4, dropHits: 10, path: "→▼→", label: "Sideway", trend: "stable" as const };
}

interface LeadersTabProps {
  activeConfig: "prod" | "res";
  onSelectTicker: (ticker: string) => void;
  idxUniverse?: "idx30" | "idx80";
}

export function LeadersTab({ activeConfig, onSelectTicker, idxUniverse = "idx80" }: LeadersTabProps) {
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");
  const [search, setSearch] = useState("");

  const weights = activeConfig === "prod" ? CW_F : CW_B;

  // Dynamically generate leader stocks based on selected universe
  const activeStocksList = idxUniverse === "idx30" ? STOCKS_DATA.slice(0, 30) : STOCKS_DATA;

  const dynamicL = activeStocksList.map((s, idx) => {
    // Check if we can find a matching hardcoded leader from L to keep original high-fidelity values
    const existing = L.find(l => l.ticker.replace(".JK", "") === s.ticker);
    if (existing) return existing;

    // Otherwise, generate realistic high-fidelity metrics deterministically
    const qVal = Math.round(Math.min(99, Math.max(10, s.roe * 3.5 + (100 - s.der * 40))));
    const gVal = Math.round(Math.min(99, Math.max(10, 50 + s.change * 8)));
    const vVal = Math.round(Math.min(99, Math.max(10, 100 - s.peRatio * 1.5 - s.pbRatio * 4.5)));
    const mVal = Math.round(Math.min(99, Math.max(10, 50 + s.change * 11.5)));
    
    return {
      rank: String(idx + 1),
      ticker: s.ticker + ".JK",
      quality: String(qVal),
      growth: String(gVal),
      value: String(vVal),
      momentum: String(mVal),
      final_score: "50.0"
    };
  });

  // Compute final score dynamically based on factors and active configs weights
  const computeScore = (stock: typeof L[0]) => {
    const qVal = parseFloat(stock.quality) || 0;
    const gVal = parseFloat(stock.growth) || 0;
    const vVal = parseFloat(stock.value) || 0;
    const mVal = parseFloat(stock.momentum) || 0;
    return qVal * weights.quality + gVal * weights.growth + vVal * weights.value + mVal * weights.momentum;
  };

  const processedLeaders = dynamicL.map((stock) => {
    const calculatedScore = computeScore(stock);
    const rkVal = RK[stock.ticker] || RK[stock.ticker + ".JK"] || 0;
    return {
      ...stock,
      score: parseFloat(calculatedScore.toFixed(2)),
      rankChange: rkVal,
    };
  }).sort((a, b) => b.score - a.score);

  const filteredLeaders = processedLeaders.filter(
    (item) =>
      item.ticker.toLowerCase().includes(search.toLowerCase()) ||
      item.ticker.replace(".JK", "").toLowerCase().includes(search.toLowerCase())
  );

  const top5 = filteredLeaders.slice(0, 5);
  const avgTop5Score = top5.reduce((sum, item) => sum + item.score, 0) / (top5.length || 1);

  return (
    <div className="space-y-4 md:space-y-6">
      
      {/* 1. COMPACT PERSPECTIVE OVERVIEW CARD */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-xl md:rounded-2xl p-3.5 md:p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h2 className="text-sm md:text-lg font-serif italic text-white tracking-tight flex items-center gap-1.5 md:gap-2">
              <Sliders className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
              {activeConfig === "prod" ? "Config F: Fundamental Focus Leaders" : "Config B: Backtest Optimized Leaders"}
            </h2>
            <p className="text-[9.5px] sm:text-xs text-white/50 mt-1">
              Active Weights: Qd: <span className="text-white font-semibold">{(weights.quality * 100)}%</span> • Gw: <span className="text-white font-semibold">{(weights.growth * 100)}%</span> • Vl: <span className="text-white font-semibold">{(weights.value * 100)}%</span> • Mm: <span className="text-white font-semibold">{(weights.momentum * 100)}%</span>
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0 mt-1 sm:mt-0">
            <span className="text-[8px] sm:text-[10px] text-white/40 uppercase block font-bold tracking-widest">Top 5 average score</span>
            <span className="text-base md:text-xl font-black font-mono text-emerald-400 block mt-0.5">{avgTop5Score.toFixed(1)}</span>
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
            placeholder="Search leaders ticker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-[11px] pl-8.5 pr-3.5 py-2 bg-white/5 focus:bg-white/[0.08] border border-white/10 rounded-xl font-semibold outline-none text-white focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
          />
        </div>

        {/* View Mode Switches */}
        <div className="inline-flex rounded-lg bg-white/5 p-0.5 border border-white/10 self-start">
          <button
            onClick={() => setViewMode("table")}
            className={`px-2.5 py-1.5 rounded-md text-[10.5px] font-semibold cursor-pointer flex items-center gap-1 transition-all ${
              viewMode === "table" ? "bg-emerald-500 text-black font-bold" : "text-white/50 hover:text-white"
            }`}
          >
            <Table className="w-3 h-3" /> Matrix Tab
          </button>
          <button
            onClick={() => setViewMode("cards")}
            className={`px-2.5 py-1.5 rounded-md text-[10.5px] font-semibold cursor-pointer flex items-center gap-1 transition-all ${
              viewMode === "cards" ? "bg-emerald-500 text-black font-bold" : "text-white/50 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3 h-3" /> Cards View
          </button>
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
            className="bg-[#0A0A0A] border border-white/5 rounded-xl md:rounded-2xl overflow-hidden shadow-md"
          >
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-[9px] md:text-[10px] font-bold text-[#E0E0E0]/40 uppercase tracking-widest bg-white/[0.01]">
                    <th className="py-2.5 md:py-4 px-3 md:px-5">Rank</th>
                    <th className="py-2.5 md:py-4 px-2">Ticker / Sinyal</th>
                    <th className="py-2.5 md:py-4 px-3 text-center hidden md:table-cell">Quality</th>
                    <th className="py-2.5 md:py-4 px-3 text-center hidden md:table-cell">Growth</th>
                    <th className="py-2.5 md:py-4 px-3 text-center hidden md:table-cell">Value</th>
                    <th className="py-2.5 md:py-4 px-3 text-center hidden md:table-cell">Momentum</th>
                    <th className="py-2.5 md:py-4 px-3 text-left">Rotasi Pasar</th>
                    <th className="py-2.5 md:py-4 px-3 md:px-5 text-right font-black">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px] md:text-xs font-mono font-medium">
                  {filteredLeaders.map((item, idx) => {
                    const clean = item.ticker.replace(".JK", "");
                    const rot = getRotationData(item.ticker);
                    return (
                      <tr 
                        key={item.ticker} 
                        className="hover:bg-white/[0.03] active:bg-white/[0.05] transition-all cursor-pointer"
                        onClick={() => onSelectTicker(clean)}
                      >
                        <td className="py-2 px-3 md:px-5 font-bold text-white/50">
                          #{idx + 1}
                        </td>
                        <td className="py-2 px-2 font-black text-white text-xs md:text-sm tracking-wide">
                          <div className="flex items-center min-w-[130px] md:min-w-[160px] justify-between gap-1">
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="inline-block w-9 font-black text-white">{clean}</span>
                              <span className="inline-flex w-11 shrink-0">
                                {item.rankChange > 0 && (
                                  <span className="text-[8px] font-bold text-emerald-450 text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded flex items-center gap-0.5 font-mono">
                                    <TrendingUp className="w-2 h-2" /> +{item.rankChange}
                                  </span>
                                )}
                                {item.rankChange < 0 && (
                                  <span className="text-[8px] font-bold text-rose-500 text-rose-400 bg-rose-500/10 px-1 py-0.5 rounded flex items-center gap-0.5 font-mono">
                                    <TrendingDown className="w-2 h-2" /> {item.rankChange}
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="w-[60px] shrink-0 flex justify-end">
                              {(() => {
                                const matchEX = EX.find(e => e.ticker.toUpperCase().replace(".JK", "") === clean);
                                if (matchEX?.exit_state === "EXIT") {
                                  return (
                                    <span className="text-[8px] font-black text-white bg-rose-600 px-1.5 py-0.5 rounded animate-pulse shadow-sm uppercase tracking-wider font-sans text-center block w-full leading-normal">
                                      🔴 EXIT
                                    </span>
                                  );
                                }
                                if (matchEX?.exit_state === "EXIT RISK") {
                                  return (
                                    <span className="text-[8px] font-bold text-amber-450 text-amber-400 bg-amber-500/15 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-sans text-center block w-full leading-normal">
                                      ⚠️ RISK
                                    </span>
                                  );
                                }
                                return (
                                  <span className="text-[8px] text-white/5 font-bold tracking-widest font-mono text-center block w-full leading-normal">
                                    —
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-center text-white/85 hidden md:table-cell">{item.quality}</td>
                        <td className="py-2 px-3 text-center text-white/85 hidden md:table-cell">{item.growth}</td>
                        <td className="py-2 px-3 text-center text-white/85 hidden md:table-cell">{item.value}</td>
                        <td className="py-2 px-3 text-center text-white/85 hidden md:table-cell">{item.momentum}</td>
                        
                        {/* ROTATION STATS MATRIX COLUMN */}
                        <td className="py-2 px-3">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                            <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider flex items-center gap-1 ${
                              rot.trend === "up" 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                                : rot.trend === "down" 
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                                : "bg-white/5 text-white/60 border border-white/5"
                            }`}>
                              <span className="font-mono text-[10px] tracking-tight leading-none">{rot.path}</span>
                              <span className="hidden xs:inline">{rot.label}</span>
                            </span>
                            <span className="text-[8px] md:text-[9.5px] text-white/40 block leading-none">
                              Top: <strong className="text-white/80">{rot.topHits}x</strong> • Turun: <strong className="text-white/80">{rot.dropHits}x</strong>
                            </span>
                          </div>
                        </td>

                        <td className="py-2 px-3 md:px-5 text-right font-black text-emerald-400 font-sans text-xs md:text-sm">
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
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4"
          >
            {filteredLeaders.map((item, idx) => {
              const clean = item.ticker.replace(".JK", "");
              const rot = getRotationData(item.ticker);
              return (
                <div
                  key={item.ticker}
                  onClick={() => onSelectTicker(clean)}
                  className="bg-[#0A0A0A] border border-white/5 hover:border-white/20 p-3.5 rounded-xl transition-all hover:bg-white/[0.01] cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-2.5">
                    <div>
                      <span className="text-[9px] text-[#E0E0E0]/40 block leading-none font-semibold">Rank #{idx + 1}</span>
                      <h4 className="text-sm font-black text-white tracking-wide mt-1 flex flex-wrap items-center gap-1.5 leading-none">
                        <span>{clean}</span>
                        {item.rankChange !== 0 && (
                          <span className={`text-[8px] px-1 py-0.5 rounded font-mono ${item.rankChange > 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-450 text-rose-400 bg-rose-500/10"}`}>
                            {item.rankChange > 0 ? "+" : ""}{item.rankChange}
                          </span>
                        )}
                        {(() => {
                          const matchEX = EX.find(e => e.ticker.toUpperCase().replace(".JK", "") === clean);
                          if (matchEX?.exit_state === "EXIT") {
                            return (
                              <span className="text-[8px] font-black text-white bg-rose-600 px-1.5 py-0.5 rounded animate-pulse shadow-sm uppercase tracking-wider font-sans">
                                EXIT
                              </span>
                            );
                          }
                          if (matchEX?.exit_state === "EXIT RISK") {
                            return (
                              <span className="text-[8px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider font-sans">
                                RISK
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-[#E0E0E0]/40 block leading-none font-semibold">Score</span>
                      <span className="text-xs font-bold text-emerald-400 font-mono mt-1 block leading-none">{item.score.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Visual Progress Rails */}
                  <div className="space-y-1.5 text-[9px] sm:text-[10px]">
                    <div>
                      <div className="flex justify-between text-[#E0E0E0]/50 mb-0.5 leading-none">
                        <span>Quality</span>
                        <span className="font-mono text-[8.5px]">{item.quality}</span>
                      </div>
                      <div className="w-full bg-white/5 h-[3px] rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${item.quality}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[#E0E0E0]/50 mb-0.5 leading-none">
                        <span>Growth</span>
                        <span className="font-mono text-[8.5px]">{item.growth}</span>
                      </div>
                      <div className="w-full bg-white/5 h-[3px] rounded-full overflow-hidden">
                        <div className="bg-emerald-400 h-full" style={{ width: `${item.growth}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[#E0E0E0]/50 mb-0.5 leading-none">
                        <span>Value Margin</span>
                        <span className="font-mono text-[8.5px]">{item.value}</span>
                      </div>
                      <div className="w-full bg-white/5 h-[3px] rounded-full overflow-hidden">
                        <div className="bg-teal-500 h-full" style={{ width: `${item.value}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-[#E0E0E0]/50 mb-0.5 leading-none">
                        <span>Momentum Strength</span>
                        <span className="font-mono text-[8.5px]">{item.momentum}</span>
                      </div>
                      <div className="w-full bg-white/5 h-[3px] rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full" style={{ width: `${item.momentum}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* ROTATION STATS HIGHLIGHT */}
                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between gap-1.5">
                    <div className="flex flex-col">
                      <span className="text-[7.5px] text-white/30 uppercase tracking-widest font-bold">Rotasi Pasar</span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9.5px] font-mono font-bold text-emerald-400 leading-none">{rot.path}</span>
                        <span className="text-[8.5px] text-[#E0E0E0]/60 font-semibold leading-none">{rot.label}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[7.5px] text-white/30 uppercase tracking-widest font-bold leading-none">Movement</span>
                      <span className="text-[8px] text-white/50 font-mono block mt-0.5 leading-none">
                        Top: <strong className="text-emerald-400">{rot.topHits}x</strong> • Drop: <strong className="text-rose-455 text-rose-400">{rot.dropHits}x</strong>
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
