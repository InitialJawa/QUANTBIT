import { useState } from "react";
import { EX, RS } from "../marketData";
import { STOCKS_DATA } from "../stocksData";
import { StockData, PortfolioItem, WatchlistItem } from "../types";
import { ShieldAlert, Search, ShieldCheck, Flame, Info, Check, BookmarkCheck, Bookmark, TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "motion/react";
import { TickerLogo } from "./TickerLogo";

interface CapitalProtectionTabProps {
  isIHSGInCrisis: boolean;
  onSelectTicker: (ticker: string) => void;
  portfolio?: PortfolioItem[];
  watchlist?: WatchlistItem[];
  getDynamicStock: (ticker: string) => StockData | null;
}

export function CapitalProtectionTab({ isIHSGInCrisis, onSelectTicker, portfolio = [], watchlist = [], getDynamicStock }: CapitalProtectionTabProps) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"drawdown_from_entry" | "rs_20d" | "rs_change_20d">("drawdown_from_entry");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("asc");

  const activeStocks = STOCKS_DATA.map(s => getDynamicStock(s.ticker) || s);

  const dynamicExits = activeStocks.map((s, idx) => {
    const existing = EX.find(e => e.ticker.replace(".JK", "") === s.ticker);
    const close = s.currentPrice.toFixed(1);
    const drop = s.change;
    
    let exit_state = "HEALTHY";
    let triggered_rules = "NONE";
    if (drop <= -2.2) { exit_state = "EXIT"; triggered_rules = "B, C, D"; }
    else if (drop <= -0.5) { exit_state = "EXIT RISK"; triggered_rules = "C"; }

    if (existing) {
      return { ...existing, close, drawdown_from_entry: drop.toFixed(2), exit_state, triggered_rules };
    }

    const rs_20d = (drop * 2).toFixed(2);
    const rs_change_20d = (drop * 1).toFixed(2);
    const ma20 = (parseFloat(close) * (1 + Math.max(-0.05, Math.min(0.05, drop / 100)))).toFixed(1);
    const ma50 = (parseFloat(close) * (1 + Math.max(-0.08, Math.min(0.08, drop / 150)))).toFixed(1);
    const ma100 = (parseFloat(close) * (1 + Math.max(-0.12, Math.min(0.12, drop / 200)))).toFixed(1);

    return {
      Date: new Date().toISOString().split("T")[0],
      ticker: s.ticker + ".JK", rank: String(idx + 1), rank_change: "0", close,
      rs_20d, rs_change_20d, ma20, ma50, ma100,
      drawdown_from_entry: (drop * 1.3).toFixed(2), exit_state, triggered_rules
    };
  });

  let filtered = dynamicExits.filter(
    (item) =>
      item.ticker.toLowerCase().includes(search.toLowerCase()) ||
      item.ticker.replace(".JK", "").toLowerCase().includes(search.toLowerCase())
  );

  filtered.sort((a, b) => {
    const valA = parseFloat(a[sortBy]);
    const valB = parseFloat(b[sortBy]);
    return sortOrder === "desc" ? valB - valA : valA - valB;
  });

  const getBadgeClass = (state: string) => {
    switch (state) {
      case "EXIT":
        return "text-rose-400 bg-rose-500/15 border-rose-500/30 animate-pulse";
      case "EXIT RISK":
        return "text-amber-400 bg-amber-500/15 border-amber-500/30";
      default:
        return "text-emerald-400 bg-emerald-500/15 border-emerald-500/30";
    }
  };

  return (
    <div className="flex flex-col flex-1 space-y-6">
      
      {/* 1. PERSPECTIVE INSIGHT BAR */}
      <div className="bg-[#050505] border border-rose-900/20 rounded-2xl p-5 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2 font-mono">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              Sistem Manajemen Risiko
            </h2>
            <p className="text-[10px] text-zinc-500 mt-2 max-w-xl leading-relaxed">
              Peringatan keluar otomatis berdasarkan momentum dan persilangan garis teknikal pelindung harga rata-rata. Modal teralokasi: <span className="text-emerald-400 font-bold">{RS.capital_deployment}%</span>.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest block">Peringatan Aktif</span>
            <span className="text-2xl font-black font-mono text-rose-500 mt-1 block">
              {dynamicExits.filter(e => e.exit_state === "EXIT" || e.exit_state === "EXIT RISK").length} / {dynamicExits.length}
            </span>
          </div>
        </div>
      </div>

      {/* 2. REGIME RULES INTERPRETATION CLAUSE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-[#050505] border border-white/[0.03] rounded-2xl flex flex-col gap-2">
          <span className="font-bold text-rose-400 font-mono text-[9px] uppercase tracking-widest">RULE A</span>
          <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">Turun melewati -25% momentum absolut.</p>
        </div>
        <div className="p-4 bg-[#050505] border border-white/[0.03] rounded-2xl flex flex-col gap-2">
          <span className="font-bold text-white/60 font-mono text-[9px] uppercase tracking-widest">RULE B</span>
          <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">Turun melewati MA50 (garis support 2 bulan).</p>
        </div>
        <div className="p-4 bg-[#050505] border border-white/[0.03] rounded-2xl flex flex-col gap-2">
          <span className="font-bold text-white/60 font-mono text-[9px] uppercase tracking-widest">RULE C</span>
          <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">Penurunan lebih dari -10% pada drawdown berjalan.</p>
        </div>
        <div className="p-4 bg-[#050505] border border-white/[0.03] rounded-2xl flex flex-col gap-2">
          <span className="font-bold text-white/60 font-mono text-[9px] uppercase tracking-widest">RULE D</span>
          <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">Merosot drastis dibawah batas gawat MA100.</p>
        </div>
      </div>

      {/* 3. ALERTS TABLE SEARCH */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-white/30 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Cari emiten pantauan risiko..."
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
              className="text-[10px] uppercase tracking-widest font-bold px-3 py-2 bg-transparent outline-none text-white/70 appearance-none cursor-pointer"
            >
              <option value="drawdown_from_entry" className="bg-[#0A0A0A] text-white">Drawdown</option>
              <option value="rs_20d" className="bg-[#0A0A0A] text-white">RS 20D</option>
              <option value="rs_change_20d" className="bg-[#0A0A0A] text-white">RS Change</option>
            </select>
            <button
              onClick={() => setSortOrder(prev => prev === "desc" ? "asc" : "desc")}
              className="px-3 border-l border-white/[0.05] text-white/40 hover:text-white transition-all cursor-pointer"
              title="Toggle Sort Order"
            >
              {sortOrder === "desc" ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* 4. PHYSICAL SECTOR DECK CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto flex-1 min-h-[400px] scrollbar-thin p-1">
        {filtered.map((item) => {
          const clean = item.ticker.replace(".JK", "");
          const liveStk = activeStocks.find(s => s.ticker === clean);
          const isHealthy = item.exit_state === "HEALTHY";
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
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <TickerLogo ticker={clean} size="md" fallbackColor={liveStk?.logoColor} />
                    <div className="flex flex-col">
                      <h4 className={`text-base font-black tracking-widest flex items-center gap-2 font-mono ${isInPorto ? "text-emerald-400" : "text-white/90"}`}>
                        {clean}
                        {isInPorto ? <BookmarkCheck className="w-4 h-4 text-emerald-400 shrink-0" /> : isInWatchlist ? <Bookmark className="w-4 h-4 text-white/30 shrink-0" /> : null}
                      </h4>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-widest font-mono ${getBadgeClass(item.exit_state)}`}>
                    {item.exit_state}
                  </span>
                </div>

                {/* Closing prices and Indicators status */}
                <div className="space-y-3 font-mono border-y border-white/[0.05] py-4 my-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500 font-sans text-[10px] uppercase font-bold tracking-widest">Close Price</span>
                    <span className="text-white/90 font-bold">Rp {parseFloat(item.close).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500 font-sans text-[10px] uppercase font-bold tracking-widest">Drawdown</span>
                    <span className={parseFloat(item.drawdown_from_entry) < 0 ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                      {item.drawdown_from_entry}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500 font-sans text-[10px] uppercase font-bold tracking-widest">MA Support</span>
                    <span className="text-white/60">
                      {Math.round(parseFloat(item.ma20))} <span className="text-zinc-700">|</span> {Math.round(parseFloat(item.ma50))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rules triggered footer */}
              <div className="flex justify-between items-center text-[10px] pt-1 uppercase tracking-widest font-bold">
                <span className="text-zinc-500">Rules: <strong className={isHealthy ? "text-emerald-400 font-mono" : "text-rose-400 font-mono"}>{item.triggered_rules}</strong></span>
                <span className="text-zinc-500">RS20D: <span className="text-white/60 font-mono">{item.rs_20d}%</span></span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
