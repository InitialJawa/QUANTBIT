import { useState, useEffect } from "react";
import { LeadersTab } from "./LeadersTab";
import { CW_MAP, CW_AMAN } from "../marketData";
import { useEngineConfig } from "../contexts/EngineConfigContext";
import Card from "./Card";
import type { StockData, PortfolioItem, WatchlistItem } from "../types";

interface AnalyticsTabProps {
  onSelectTicker: (ticker: string) => void;
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  getDynamicStock: (ticker: string) => StockData | undefined;
  isIHSGInCrisis: boolean;
}

const PROFILES = [
  { id: "aman", label: "Aman" },
  { id: "agresif", label: "Agresif" },
  { id: "dividen", label: "Dividen" },
  { id: "growth-heavy", label: "Growth-heavy" },
];

const STORAGE_KEY = "qa_analytics_profile";

export function AnalyticsTab({ onSelectTicker, portfolio, watchlist, getDynamicStock, isIHSGInCrisis: _isIHSGInCrisis }: AnalyticsTabProps) {
  const [profileId, setProfileId] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "aman";
  });
  const { backtestResult, backtestConfig } = useEngineConfig();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, profileId);
  }, [profileId]);

  const weights = CW_MAP[profileId] || CW_AMAN;
  const r = backtestResult;

  return (
    <div className="flex-1 flex flex-col gap-4">
      {r && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400/70">Performance Dashboard</span>
            <span className="text-[10px] text-white/30 font-mono">{backtestConfig.simStartDate} → {backtestConfig.simEndDate}</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card variant="inset" padding="sm" className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 block">Total Return</span>
              <span className={`text-sm font-black font-mono block ${r.totalReturnPct >= 0 ? "text-green-400" : "text-rose-400"}`}>
                {r.totalReturnPct >= 0 ? "+" : ""}{r.totalReturnPct.toFixed(1)}%
              </span>
              <span className="text-[10px] text-white/40 block">IHSG: {r.ihsgReturnPct >= 0 ? "+" : ""}{r.ihsgReturnPct.toFixed(1)}%</span>
            </Card>

            <Card variant="inset" padding="sm" className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 block">CAGR</span>
              <span className="text-sm font-black font-mono text-white block">{r.cagr.toFixed(2)}%</span>
              <span className="text-[10px] text-white/40 block">Tingkat Pertumbuhan Tahunan</span>
            </Card>

            <Card variant="inset" padding="sm" className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 block">Sharpe / Sortino</span>
              <span className="text-sm font-bold font-mono text-green-400 block">
                {r.sharpe !== null ? r.sharpe.toFixed(2) : "—"} / {r.sortino !== null ? r.sortino.toFixed(2) : "—"}
              </span>
              <span className="text-[10px] text-white/40 block">Rf=5%</span>
            </Card>

            <Card variant="inset" padding="sm" className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 block">Max Drawdown</span>
              <span className="text-sm font-black font-mono text-rose-400 block">-{r.maxDrawdown.toFixed(1)}%</span>
              <span className="text-[10px] text-white/40 block">Vol: {r.volatility !== null ? r.volatility.toFixed(1) : "—"}%</span>
            </Card>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card variant="inset" padding="sm" className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 block">Information Ratio</span>
              <span className="text-sm font-bold font-mono text-cyan-400 block">
                {r.informationRatio !== null ? r.informationRatio.toFixed(3) : "—"}
              </span>
              <span className="text-[10px] text-white/40 block">Excess / Tracking Error</span>
            </Card>

            <Card variant="inset" padding="sm" className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 block">Omega Ratio</span>
              <span className="text-sm font-bold font-mono text-cyan-400 block">
                {isFinite(r.omegaRatio) ? r.omegaRatio.toFixed(3) : "∞"}
              </span>
              <span className="text-[10px] text-white/40 block">Risk-Adjusted Distribution</span>
            </Card>

            <Card variant="inset" padding="sm" className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 block">Tail Risk</span>
              <span className="text-sm font-bold font-mono text-orange-400 block">
                Sk: {r.skewness.toFixed(2)} / Ku: {r.kurtosis.toFixed(2)}
              </span>
              <span className="text-[10px] text-white/40 block">Distribusi Return</span>
            </Card>

            <Card variant="inset" padding="sm" className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 block">Regime Sharpe</span>
              <span className="text-sm font-bold font-mono text-emerald-400 block">
                Bull: {r.bullSharpe !== null ? r.bullSharpe.toFixed(2) : "—"} / Bear: {r.bearSharpe !== null ? r.bearSharpe.toFixed(2) : "—"}
              </span>
              <span className="text-[10px] text-white/40 block">{r.bullDays}d bull / {r.bearDays}d bear</span>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Card variant="inset" padding="sm" className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 block">Win Rate &amp; Turnover</span>
              <span className="text-sm font-bold font-mono text-amber-400 block">
                W: {r.winRatePct.toFixed(1)}% / T: {r.turnoverPct.toFixed(1)}%
              </span>
            </Card>
            <Card variant="inset" padding="sm" className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/30 block">Net Return (Fee-Adjusted)</span>
              <span className={`text-sm font-bold font-mono block ${r.turnoverAdjustedReturnPct >= 0 ? "text-green-400" : "text-rose-400"}`}>
                {r.turnoverAdjustedReturnPct >= 0 ? "+" : ""}{r.turnoverAdjustedReturnPct.toFixed(1)}%
              </span>
            </Card>
          </div>
        </div>
      )}

      {!r && (
        <div className="flex items-center justify-center py-6 text-center">
          <div>
            <span className="text-xs text-white/30 block">Belum ada data backtest</span>
            <span className="text-[10px] text-white/20 block mt-1">Jalankan backtest di tab Backtest untuk melihat ringkasan performa</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {PROFILES.map((p) => (
          <button
            key={p.id}
            onClick={() => setProfileId(p.id)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
              profileId === p.id
                ? "bg-white/10 text-white border border-white/20"
                : "bg-white/[0.02] text-white/50 border border-white/[0.05] hover:border-white/20"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex-1">
        <LeadersTab
          activeConfig={profileId}
          activeProfile={weights}
          onSelectTicker={onSelectTicker}
          portfolio={portfolio}
          watchlist={watchlist}
          getDynamicStock={getDynamicStock}
        />
      </div>
    </div>
  );
}
