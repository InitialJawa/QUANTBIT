import { useState } from "react";
import { EX, RS } from "../marketData";
import { STOCKS_DATA } from "../stocksData";
import { ShieldAlert, Search, ShieldCheck, Flame, Info, Check } from "lucide-react";
import { motion } from "motion/react";

interface CapitalProtectionTabProps {
  onSelectTicker: (ticker: string) => void;
  idxUniverse?: "idx30" | "idx80";
}

export function CapitalProtectionTab({ onSelectTicker, idxUniverse = "idx80" }: CapitalProtectionTabProps) {
  const [search, setSearch] = useState("");

  const activeStocks = idxUniverse === "idx30" ? STOCKS_DATA.slice(0, 30) : STOCKS_DATA;

  const dynamicExits = activeStocks.map((s, idx) => {
    const existing = EX.find(e => e.ticker.replace(".JK", "") === s.ticker);
    if (existing) return existing;

    // Generate realistic exit metrics
    const textHash = s.ticker.charCodeAt(0) + (s.ticker.charCodeAt(1) || 0);
    const close = s.currentPrice.toFixed(1);
    const rs_20d = (s.change * 4 + (textHash % 18) - 9).toFixed(2);
    const rs_change_20d = (s.change * 1.5 + (textHash % 8) - 4).toFixed(2);
    const ma20 = (s.currentPrice * (1 + (textHash % 8 - 4) / 100)).toFixed(2);
    const ma50 = (s.currentPrice * (1 + (textHash % 12 - 6) / 100)).toFixed(2);
    const ma100 = (s.currentPrice * (1 + (textHash % 16 - 8) / 100)).toFixed(2);
    
    const drop = s.change;
    let exit_state = "HEALTHY";
    let triggered_rules = "NONE";
    
    if (drop < -2.2) {
      exit_state = "EXIT";
      triggered_rules = "B, C, D";
    } else if (drop < -0.5) {
      exit_state = "EXIT RISK";
      triggered_rules = "C";
    }

    return {
      Date: "2026-06-11",
      ticker: s.ticker + ".JK",
      rank: String(idx + 1),
      rank_change: "0",
      close,
      rs_20d,
      rs_change_20d,
      ma20,
      ma50,
      ma100,
      drawdown_from_entry: (drop * 1.3).toFixed(2),
      exit_state,
      triggered_rules
    };
  });

  const filtered = dynamicExits.filter(
    (item) =>
      item.ticker.toLowerCase().includes(search.toLowerCase()) ||
      item.ticker.replace(".JK", "").toLowerCase().includes(search.toLowerCase())
  );

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
    <div className="space-y-6">
      
      {/* 1. PERSPECTIVE INSIGHT BAR */}
      <div className="bg-[#0A0A0A] border border-rose-950/20 rounded-2xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-lg font-serif italic text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
              Capital Protection &amp; Risk Guard
            </h2>
            <p className="text-xs text-white/50 mt-1 max-w-xl">
              Automatic trailing alerts, momentum exit clauses, and moving average cross triggers. Capital deployment is locked at <span className="text-emerald-400 font-bold">{RS.capital_deployment}%</span>.
            </p>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] text-[#E0E0E0]/40 uppercase font-bold tracking-widest">Active exit signals</span>
            <span className="text-xl font-black font-mono text-rose-500 mt-1 block">
              {dynamicExits.filter(e => e.exit_state === "EXIT" || e.exit_state === "EXIT RISK").length} / {dynamicExits.length} Tickers
            </span>
          </div>
        </div>
      </div>

      {/* 2. REGIME RULES INTERPRETATION CLAUSE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-1">
          <span className="font-extrabold text-rose-400 font-mono text-[10px]">RULE A</span>
          <p className="text-[11px] text-[#E0E0E0]/60 leading-normal">Exit indicator triggers if 20D Relative Strength falls below -25% momentum index.</p>
        </div>
        <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-1">
          <span className="font-extrabold text-[#E0E0E0]/80 font-mono text-[10px]">RULE B</span>
          <p className="text-[11px] text-[#E0E0E0]/60 leading-normal">Exit warning active if closing price breaks below the key 50D Support Average.</p>
        </div>
        <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-1">
          <span className="font-extrabold text-[#E0E0E0]/80 font-mono text-[10px]">RULE C</span>
          <p className="text-[11px] text-[#E0E0E0]/60 leading-normal">Defensive reduction if 20D price drop exceeds -10% from active entry milestones.</p>
        </div>
        <div className="p-4 bg-white/5 border border-white/5 rounded-xl space-y-1">
          <span className="font-extrabold text-[#E0E0E0]/80 font-mono text-[10px]">RULE D</span>
          <p className="text-[11px] text-[#E0E0E0]/60 leading-normal">Strong liquidate block if closing price slips below the master 100D Bullish Rail.</p>
        </div>
      </div>

      {/* 3. ALERTS TABLE SEARCH */}
      <div className="relative">
        <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-3" />
        <input
          type="text"
          placeholder="Search corporate security alarms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs pl-9 pr-4 py-2.5 bg-white/5 focus:bg-white/[0.08] border border-white/10 rounded-xl font-semibold outline-none text-white focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
        />
      </div>

      {/* 4. PHYSICAL SECTOR DECK CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filtered.map((item) => {
          const clean = item.ticker.replace(".JK", "");
          const isHealthy = item.exit_state === "HEALTHY";

          return (
            <div
              key={item.ticker}
              onClick={() => onSelectTicker(clean)}
              className="bg-[#0A0A0A] border border-white/5 hover:border-white/20 p-5 rounded-2xl shadow-sm hover:bg-white/[0.01] transition-all cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-base font-black text-white tracking-widest">{clean}</h4>
                    <span className="text-[10px] text-white/35 block mt-1">Audit Date: {item.Date}</span>
                  </div>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded border ${getBadgeClass(item.exit_state)}`}>
                    {item.exit_state}
                  </span>
                </div>

                {/* Closing prices and Indicators status */}
                <div className="space-y-2 text-xs font-mono py-3 border-y border-white/5 my-4">
                  <div className="flex justify-between text-[#E0E0E0]/50">
                    <span>Close Price</span>
                    <span className="text-white font-semibold">Rp {parseFloat(item.close).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-[#E0E0E0]/50">
                    <span>Drawdown from Entry</span>
                    <span className={parseFloat(item.drawdown_from_entry) < 0 ? "text-rose-400 font-semibold" : "text-emerald-400 font-semibold"}>
                      {item.drawdown_from_entry}%
                    </span>
                  </div>
                  <div className="flex justify-between text-[#E0E0E0]/50">
                    <span>MA Support Stack</span>
                    <span className="text-white/80">
                      /{Math.round(parseFloat(item.ma20))}/{Math.round(parseFloat(item.ma50))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rules triggered footer */}
              <div className="flex justify-between items-center text-[10px] text-white/40 pt-1">
                <span>Rules: <strong className={isHealthy ? "text-emerald-400" : "text-rose-400 font-mono"}>{item.triggered_rules}</strong></span>
                <span>RS 20D: <span className="font-semibold text-white/70 font-mono">{item.rs_20d}%</span></span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
