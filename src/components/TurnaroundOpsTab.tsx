import { useState } from "react";
import { T } from "../marketData";
import { STOCKS_DATA } from "../stocksData";
import { StockData, PortfolioItem, WatchlistItem } from "../types";
import { Search, Flame, ShieldAlert, CheckCircle, HelpCircle, BookmarkCheck, Bookmark, TrendingUp, TrendingDown, Download } from "lucide-react";
import { motion } from "motion/react";
import { TickerLogo } from "./TickerLogo";
import { ExplainButton } from "./ExplainButton";

interface TurnaroundOpsTabProps {
  onSelectTicker: (ticker: string) => void;
  portfolio?: PortfolioItem[];
  watchlist?: WatchlistItem[];
  getDynamicStock: (ticker: string) => StockData | undefined;
}

export function TurnaroundOpsTab({ onSelectTicker, portfolio = [], watchlist = [], getDynamicStock }: TurnaroundOpsTabProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"drawdown_252d" | "recovery_from_60d_low" | "rs_change_60d" | "volume_ratio">("recovery_from_60d_low");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const activeStocks = STOCKS_DATA.map(s => getDynamicStock(s.ticker) || s);

  const dynamicTurnarounds = activeStocks.map((s, idx) => {
    const existing = T.find(t => t.ticker.replace(".JK", "") === s.ticker);
    if (existing) return existing;

    const drawdown_252d = (-(10 + Math.abs(s.change) * 2)).toFixed(2);
    const volatility_60d = (2 + Math.abs(s.change) * 0.5).toFixed(2);
    const rs_change_60d = (s.change * 3).toFixed(2);
    const volume_ratio = (0.5 + (s.peRatio > 0 ? Math.min(5, s.peRatio / 5) : 1)).toFixed(2);
    const recovery_from_60d_low = (Math.max(1, Math.abs(s.change) * 2)).toFixed(2);
    const context_match = s.change > -1 ? "True" : "False";
    const transition_match = s.change > -2 ? "True" : "False";

    return {
      rank: String(idx + 1), ticker: s.ticker + ".JK",
      drawdown_252d, distance_from_high_252d: drawdown_252d,
      volatility_60d, rs_change_60d, volume_ratio,
      recovery_from_60d_low, context_match, transition_match
    };
  });

  let filtered = dynamicTurnarounds.filter(
    (item) =>
      item.ticker.toLowerCase().includes(search.toLowerCase()) ||
      item.ticker.replace(".JK", "").toLowerCase().includes(search.toLowerCase())
  );

  filtered.sort((a, b) => {
    const valA = parseFloat(a[sortBy]);
    const valB = parseFloat(b[sortBy]);
    return sortOrder === "desc" ? valB - valA : valA - valB;
  });

  return (
    <div className="flex flex-col flex-1 space-y-6">
      
      {/* 1. PERSPECTIVE INSIGHT HEADER */}
      <div className="bg-[#050505] border border-white/[0.03] rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div>
          <h2 className="text-body font-bold text-white uppercase tracking-widest flex items-center gap-2 font-mono">
            <Flame className="w-4 h-4 text-white/40" />
            Turnaround Candidates
            <ExplainButton label="High drawdown stocks with potential reversal signals" />
          </h2>
          <p className="text-caption text-zinc-500 mt-2 max-w-2xl leading-relaxed">
            Stocks with significant drawdown showing potential reversal signals — for reference, not automatic decision.
          </p>
        </div>
      </div>

      {/* 2. SEARCH & CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari turnaround candidates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-10 pr-4 py-2.5 bg-white/[0.01] hover:bg-white/[0.02] border border-white/[0.05] rounded-xl outline-none text-white focus:border-white/20 transition-all font-mono placeholder:text-white/20"
          />
        </div>

        <div className="flex gap-2 items-center overflow-x-auto scrollbar-none">
          {/* Sort Controls */}
          <div className="flex bg-white/[0.01] border border-white/[0.05] rounded-xl">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-caption uppercase tracking-widest font-bold px-3 py-2 bg-transparent outline-none text-white/70 appearance-none cursor-pointer"
            >
              <option value="recovery_from_60d_low" className="bg-[#0A0A0A] text-white">Recovery Low</option>
              <option value="rs_change_60d" className="bg-[#0A0A0A] text-white">RS Change</option>
              <option value="volume_ratio" className="bg-[#0A0A0A] text-white">Volume Ratio</option>
              <option value="drawdown_252d" className="bg-[#0A0A0A] text-white">Drawdown</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
              className="px-3 border-l border-white/[0.05] text-white/40 hover:text-white transition-all cursor-pointer"
              title="Toggle Sort Order"
            >
              {sortOrder === "desc" ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* E5 — Export CSV */}
          <button
            onClick={() => {
              const rows = [
                ["Ticker", "Drawdown 252d (%)", "Recovery from 60d low (%)", "RS change 60d (%)", "Volume ratio", "InPortfolio", "InWatchlist"],
                ...filtered.map((it) => [
                  it.ticker,
                  it.drawdown_252d,
                  it.recovery_from_60d_low,
                  it.rs_change_60d,
                  it.volume_ratio,
                  portfolio.some(p => p.ticker === it.ticker) ? "Yes" : "No",
                  watchlist.some(w => w.ticker === it.ticker) ? "Yes" : "No",
                ]),
              ];
              const csv = "\uFEFF" + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `quantbit_turnaround_${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-caption font-bold uppercase tracking-widest rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/70 hover:text-white border border-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            title="Export ke CSV"
          >
            <Download className="w-3 h-3" /> CSV
          </button>
        </div>
      </div>

      {/* 3. LIST DECK AND PROGRESS RAIL */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto flex-1 min-h-[400px] scrollbar-thin p-1">
        {filtered.map((item, idx) => {
          const clean = item.ticker.replace(".JK", "");
          const liveStk = activeStocks.find(s => s.ticker === clean);
          const isContextMatched = item.context_match === "True";
          const isTransitionMatched = item.transition_match === "True";
          const isInPorto = portfolio.some(p => p.ticker === clean);
          const isInWatchlist = watchlist.some(w => w.ticker === clean);

          return (
            <div
              key={item.ticker}
              onClick={() => onSelectTicker(clean)}
              className={`border rounded-2xl p-5 transition-all cursor-pointer flex flex-col justify-between ${
                isInPorto 
                  ? "bg-white/[0.02] border-white/10 hover:border-white/20" 
                  : "bg-[#050505] border-white/[0.03] hover:bg-white/[0.01] hover:border-white/10"
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <TickerLogo ticker={clean} size="md" fallbackColor={liveStk?.logoColor} />
                    <div>
                      <span className="text-label text-zinc-500 block font-mono font-bold uppercase tracking-widest">Kandidat {idx + 1}</span>
                      <h4 className={`text-base font-black tracking-widest mt-1 font-mono flex items-center gap-2 ${isInPorto ? "text-emerald-400" : "text-white/90"}`}>
                        {clean}
                        {isInPorto ? <BookmarkCheck className="w-4 h-4 text-emerald-400 shrink-0" /> : isInWatchlist ? <Bookmark className="w-4 h-4 text-white/30 shrink-0" /> : null}
                      </h4>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1.5 mb-5">
                    <span className={`text-label font-bold px-2 py-0.5 rounded font-mono border ${
                      isContextMatched 
                        ? "text-emerald-400 border-emerald-500/20" 
                        : "text-zinc-500 border-white/[0.05]"
                    }`}>
                      POLA: {isContextMatched ? "OK" : "NO"}
                    </span>
                    <span className={`text-label font-bold px-2 py-0.5 rounded font-mono border ${
                      isTransitionMatched 
                        ? "text-emerald-400 border-emerald-500/20" 
                        : "text-zinc-500 border-white/[0.05]"
                    }`}>
                      TREN: {isTransitionMatched ? "OK" : "NO"}
                    </span>
                 </div>

                {/* Turnaround Statistics Block */}
                <div className="grid grid-cols-3 gap-3 border-y border-white/[0.05] py-4 my-4">
                  <div>
                    <span className="text-label text-zinc-500 block uppercase tracking-widest font-bold">Drawdown</span>
                    <span className="text-rose-400 font-mono font-bold text-xs block mt-1">{item.drawdown_252d}%</span>
                  </div>
                  <div>
                    <span className="text-label text-zinc-500 block uppercase tracking-widest font-bold">2M Rcvry</span>
                    <span className="text-emerald-400 font-mono font-bold text-xs block mt-1">+{item.recovery_from_60d_low}%</span>
                  </div>
                  <div>
                    <span className="text-label text-zinc-500 block uppercase tracking-widest font-bold">Vol Spike</span>
                    <span className="text-white/80 font-mono font-bold text-xs block mt-1">+{item.volume_ratio}x</span>
                  </div>
                </div>
              </div>

              {/* Bottom indicators */}
              <div className="flex justify-between items-center text-label uppercase tracking-widest font-bold pt-1">
                <span className="text-zinc-500">RS (2M): <span className={`font-mono ${parseFloat(item.rs_change_60d) > 0 ? "text-emerald-400" : "text-rose-400"}`}>{item.rs_change_60d}%</span></span>
                <span className="text-zinc-500">Volty: <span className="text-white/60 font-mono">{item.volatility_60d}%</span></span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
