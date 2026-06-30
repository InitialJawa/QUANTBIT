import { useState, useMemo } from "react";
import { RS, MKT } from "../marketData";
import { STOCKS_DATA } from "../stocksData";
import { StockData, PortfolioItem } from "../types";
import { getAuditTrail, isCrisisMode, computeRSI, computeMACD, getIhsgData } from "../marketRegimeEngine";
import { ExplainButton } from "./ExplainButton";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from "lucide-react";
import { MarketOverviewCharts } from "./MarketOverviewCharts";
import { LastUpdatedChip } from "./LastUpdatedChip";
import { useEngineConfig } from "../contexts/EngineConfigContext";

interface MarketTabProps {
  onSelectTicker: (ticker: string) => void;
  onChangeActiveTicker?: (ticker: string) => void;
  activeStock: StockData;
  portfolio: PortfolioItem[];
  onAddTransaction: (ticker: string, shares: number, buyPrice: number) => void;
  onRemoveTransaction: (ticker: string) => void;
  onSellTransaction: (ticker: string, shares: number) => void;
  getDynamicStock: (ticker: string) => StockData | undefined;
  filteredStocks?: (StockData | undefined)[];
}

export function MarketTab({ 
  onSelectTicker, 
  onChangeActiveTicker,
  activeStock,
  portfolio,
  onAddTransaction,
  onRemoveTransaction,
  onSellTransaction,
  getDynamicStock,
  filteredStocks
}: MarketTabProps) {
  const { engineConfig } = useEngineConfig();

  const allVisibleStocks = useMemo(
    () => STOCKS_DATA.map(s => getDynamicStock(s.ticker) || s),
    [getDynamicStock]
  );
  const visibleStocks = useMemo(() => {
    const mode = engineConfig.simulationMode;
    if (mode === "custom" && engineConfig.customUniverse.length > 0) {
      return allVisibleStocks.filter(s => engineConfig.customUniverse.includes(s.ticker));
    }
    return allVisibleStocks;
  }, [allVisibleStocks, engineConfig.simulationMode, engineConfig.customUniverse, engineConfig.singleTicker]);

  const [isBriefExpanded, setIsBriefExpanded] = useState(false);
  const trail = getAuditTrail();
  const [showAuditTrail, setShowAuditTrail] = useState(false);

  let totalCost = 0;
  let totalValueNow = 0;
  portfolio.forEach(item => {
    const liveStock = visibleStocks.find(s => s.ticker === item.ticker);
    const lastPrice = liveStock ? liveStock.currentPrice : item.buyPrice;
    totalCost += item.shares * item.buyPrice;
    totalValueNow += item.shares * lastPrice;
  });
  const myReturnPercent = totalCost > 0 ? ((totalValueNow - totalCost) / totalCost) * 100 : 0;

  const isIHSGInCrisis = isCrisisMode();
  const currentStatus = isIHSGInCrisis ? "RISK OFF" : RS.status;
  const currentAction = isIHSGInCrisis ? "LIQUIDATE / CASH OUT" : RS.action;

  const statusColors: Record<string, string> = {
    SAFE: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    WARNING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    DANGER: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    "RISK ON": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    "RISK OFF": "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };

  const isFilteredByStrategy =
    engineConfig.simulationMode === "custom" && engineConfig.customUniverse.length > 0;

  const ihsgData = useMemo(() => getIhsgData(), []);
  const ihsgCloses = useMemo(() => ihsgData.map(d => d.close), [ihsgData]);
  const rsiIHSG = useMemo(() => computeRSI(ihsgCloses, 14), [ihsgCloses]);
  const macdResult = useMemo(() => computeMACD(ihsgCloses), [ihsgCloses]);

  const breadth = useMemo(() => {
    const advancers = STOCKS_DATA.filter(s => s.change > 0).length;
    const decliners = STOCKS_DATA.filter(s => s.change < 0).length;
    return { advancers, decliners, total: STOCKS_DATA.length };
  }, []);

  return (
    <div className="space-y-4">

      {isFilteredByStrategy && (
        <div className="bg-emerald-500/[0.04] border border-emerald-500/15 rounded-xl px-4 py-2 flex items-center gap-2 text-caption font-mono">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-emerald-400 font-bold">FILTERED BY PORTFOLIO STRATEGY:</span>
          <span className="text-white/80 truncate">Custom Universe ({engineConfig.customUniverse.length})</span>
        </div>
      )}
      {/* Chart utama — IHSG vs Gold vs Portfolio */}
      <MarketOverviewCharts portfolio={portfolio} />

      {/* Teknikal strip — RSI, MACD, SMA, Breadth, Score Gap */}
      <div className="bg-[#050505] border border-white/[0.03] rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-caption">
          <div>
            <span className="text-white/30 text-label uppercase tracking-wider block">RSI(14)</span>
            <span className={`font-mono font-bold ${rsiIHSG !== null ? (rsiIHSG >= 70 ? "text-rose-400" : rsiIHSG <= 30 ? "text-emerald-400" : "text-white/80") : "text-white/30"}`}>
              {rsiIHSG !== null ? rsiIHSG.toFixed(1) : "--"}
            </span>
          </div>
          <div>
            <span className="text-white/30 text-label uppercase tracking-wider block">MACD</span>
            <span className="font-mono font-bold text-white/80">{macdResult !== null ? macdResult.macd.toFixed(1) : "--"}</span>
            {macdResult !== null && (
              <span className={`text-label font-mono ml-1 ${macdResult.histogram >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {macdResult.histogram >= 0 ? "+" : ""}{macdResult.histogram.toFixed(1)}
              </span>
            )}
          </div>
          <div>
            <span className="text-white/30 text-label uppercase tracking-wider block">SMA20</span>
            <span className="font-mono font-bold text-white/80">
              {ihsgCloses.length > 20 ? ihsgCloses.slice(-20).reduce((s, v) => s + v, 0) / 20 : "--"}
            </span>
          </div>
          <div>
            <span className="text-white/30 text-label uppercase tracking-wider block">SMA50</span>
            <span className="font-mono font-bold text-white/80">
              {ihsgCloses.length > 50 ? ihsgCloses.slice(-50).reduce((s, v) => s + v, 0) / 50 : "--"}
            </span>
          </div>
          <div>
            <span className="text-white/30 text-label uppercase tracking-wider block">Breadth</span>
            <span className="font-mono font-bold text-white/80">
              <span className="text-emerald-400">{breadth.advancers}</span>
              <span className="text-white/30"> / </span>
              <span className="text-rose-400">{breadth.decliners}</span>
            </span>
          </div>
          <div>
            <span className="text-white/30 text-label uppercase tracking-wider block">Score Gap</span>
            <span className="font-mono font-bold text-white/80">{RS.radar_context?.score_gap?.toFixed(1) || "--"}</span>
          </div>
        </div>
      </div>

      {/* Status bar — compact 1 row */}
      <div className="bg-[#050505] border border-white/[0.03] rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-caption">
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-label uppercase tracking-wider">Status</span>
              <span className={`text-caption font-bold px-2 py-0.5 rounded-md border ${statusColors[currentStatus] || "text-white bg-white/5 border-white/10"}`}>
                {currentStatus === "SAFE" ? "RISK ON" : currentStatus}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-label uppercase tracking-wider">Deploy</span>
              <span className={`font-mono font-bold ${isIHSGInCrisis ? "text-rose-400" : "text-white/80"}`}>
                {isIHSGInCrisis ? "0%" : `${RS.capital_deployment}%`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-label uppercase tracking-wider">Portfolio</span>
              <span className={`font-mono font-bold ${myReturnPercent >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {portfolio.length === 0 ? "—" : `${myReturnPercent >= 0 ? "+" : ""}${myReturnPercent.toFixed(2)}%`}
              </span>
            </div>
            <div className="w-px h-4 bg-white/[0.06]" />
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-label uppercase tracking-wider">IHSG</span>
              <span className="font-mono font-bold text-white/90">{MKT.ihsg.value.toLocaleString("id-ID")}</span>
              <span className={`font-mono font-bold ${MKT.ihsg.daily >= 0 ? "text-emerald-400/80" : "text-rose-400/80"}`}>
                {MKT.ihsg.daily >= 0 ? "+" : ""}{MKT.ihsg.daily}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-label uppercase tracking-wider">USD/IDR</span>
              <span className="font-mono font-bold text-white/90">Rp {MKT.usdidr.value.toLocaleString("id-ID")}</span>
            </div>
            <div className="ml-auto">
              <span className={`text-caption font-bold tracking-wide ${isIHSGInCrisis ? "text-rose-400" : "text-emerald-400/80"}`}>
                {isIHSGInCrisis ? (
                  <><TrendingDown className="w-3 h-3 inline animate-pulse" /> Jatuh Sistemik</>
                ) : (
                  <><TrendingUp className="w-3 h-3 inline" /> {currentAction === "ACCUMULATE" ? "Akumulasi" : currentAction === "WAIT" ? "Tunggu" : currentAction}</>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Big 4 metrik — compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Kesehatan Pasar", value: RS.market_health, color: "bg-white/40" },
            { label: "Peluang Cuan", value: RS.opportunity, color: "bg-white/40" },
            { label: "Risiko Pasar", value: RS.risk, color: "bg-rose-500/50", textColor: "text-rose-400/80" },
            { label: "Keyakinan", value: RS.confidence, color: "bg-white/40" },
          ].map((m) => (
            <div key={m.label} className="bg-[#050505] border border-white/[0.03] rounded-xl p-3 space-y-1.5">
              <span className="text-label uppercase tracking-wider text-white/30">{m.label}</span>
              <span className={`text-xl font-bold font-mono ${m.textColor || "text-white"} block`}>{m.value}</span>
              <div className="w-full bg-white/[0.05] h-1 rounded-full overflow-hidden">
                <div className={`${m.color} h-full rounded-full`} style={{ width: `${m.value}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* AI Brief — collapsible */}
        <div className="bg-[#050505] border border-white/[0.03] rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-white/40" />
              <span className="text-caption font-bold text-white/60 uppercase tracking-wider">AI Brief</span>
            </div>
            <button
              onClick={() => setIsBriefExpanded(!isBriefExpanded)}
              className="flex items-center gap-1 text-label uppercase tracking-wider font-bold text-white/50 hover:text-white transition-colors cursor-pointer bg-white/[0.02] hover:bg-white/[0.05] px-2.5 py-1 rounded-lg border border-white/[0.05]"
            >
              {isBriefExpanded ? "Tutup" : "Detail"}
              {isBriefExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
          <p className="text-caption text-zinc-400 mt-2 leading-relaxed font-sans">
            {RS.rationale}
          </p>
          <AnimatePresence>
            {isBriefExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-3 text-caption leading-relaxed text-zinc-400">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.03] space-y-1.5">
                      <h4 className="font-bold text-white/60 text-label uppercase tracking-wider">Pendukung Pasar</h4>
                      <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                        <li>Likuiditas domestik terjaga dengan aliran modal asing</li>
                        <li>Valuasi atraktif di beberapa emiten unggulan</li>
                      </ul>
                    </div>
                    <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.03] space-y-1.5">
                      <h4 className="font-bold text-white/60 text-label uppercase tracking-wider">Risiko Pantauan</h4>
                      <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                        <li>Volatilitas nilai tukar rupiah</li>
                        <li>Profit taking jangka pendek</li>
                      </ul>
                    </div>
                  </div>
                  <div className="p-3 bg-[#0a0a0a] border border-white/[0.05] rounded-xl flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white/60 block text-label uppercase tracking-wider">Formulasi</span>
                      <p className="mt-0.5 text-zinc-400">
                        {`Skenario: ${currentAction === "WAIT" ? "WAIT" : currentAction}, alokasi ${RS.capital_deployment}%`}
                      </p>
                    </div>
                  </div>

                  {/* Audit trail toggle */}
                  <button
                    onClick={() => setShowAuditTrail(!showAuditTrail)}
                    className="flex items-center gap-2 text-label uppercase tracking-wider font-bold text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                  >
                    {showAuditTrail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Decision Audit Trail
                  </button>
                  {showAuditTrail && (
                    <div className="grid grid-cols-2 gap-3 text-caption">
                      <div className="space-y-2">
                        <div><span className="text-label uppercase tracking-wider text-white/30 block">Keputusan</span>
                          <span className={`inline-block text-label font-bold px-2 py-0.5 rounded border ${
                            trail.decision === "BUY_STOCKS" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                            trail.decision === "HOLD_GOLD" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                            trail.decision === "HOLD_CASH" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                            "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
                          }`}>{trail.decision === "BUY_STOCKS" ? "BELI SAHAM" : trail.decision === "HOLD_GOLD" ? "PEGANG EMAS" : trail.decision === "HOLD_CASH" ? "PEGANG CASH" : "TUNGGU PEMULIHAN"}</span>
                        </div>
                        <div><span className="text-label uppercase tracking-wider text-white/30 block">Rezim</span>
                          <span className={`inline-block text-label font-bold px-2 py-0.5 rounded border ${
                            trail.regime === "RISK_ON" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                            trail.regime === "RISK_OFF" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                            trail.regime === "GOLD_DEFENSE" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
                            trail.regime === "CASH_DEFENSE" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
                            "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
                          }`}>{trail.regime === "RISK_ON" ? "RISK ON" : trail.regime === "RISK_OFF" ? "RISK OFF" : trail.regime === "GOLD_DEFENSE" ? "GOLD DEFENSE" : trail.regime === "CASH_DEFENSE" ? "CASH DEFENSE" : "RECOVERY WATCH"}</span>
                        </div>
                        <div>
                          <span className="text-label uppercase tracking-wider text-white/30 block">Posisi</span>
                          <span className="text-white font-bold">{trail.position}</span>
                        </div>
                        <div>
                          <span className="text-label uppercase tracking-wider text-white/30 block">IHSG vs MA</span>
                          <div className="flex gap-2">
                            <span className={`text-label font-bold ${trail.ihsgMa20Above ? "text-emerald-400" : "text-rose-400"}`}>MA20: {trail.ihsgMa20Above ? "↑" : "↓"}</span>
                            <span className={`text-label font-bold ${trail.ihsgMa50Above ? "text-emerald-400" : "text-rose-400"}`}>MA50: {trail.ihsgMa50Above ? "↑" : "↓"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div><span className="text-label uppercase tracking-wider text-white/30 block">Breadth ≥60</span>
                          <span className="text-white font-bold">{trail.breadthPercent}</span>
                        </div>
                        <div><span className="text-label uppercase tracking-wider text-white/30 block">Exit Risk</span>
                          <span className="text-white font-bold">{trail.exitRiskPercent}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-label uppercase tracking-wider text-white/30 block">Alasan</span>
                          <p className="text-zinc-400">{trail.reason}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Parameter strip — compact */}
        <div className="flex items-center justify-between px-1">
          <h3 className="text-label uppercase tracking-wider text-white/30 flex items-center gap-1.5">
            Ringkasan Parameter
            <ExplainButton label="IHSG, USD/IDR, Quant Score Gap, Market Breadth" />
          </h3>
          <LastUpdatedChip iso={MKT.market_last_update} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#050505] border border-white/[0.03] rounded-xl p-3 space-y-1">
            <span className="text-label uppercase tracking-wider text-white/30 block">IHSG</span>
            <div className="flex items-baseline gap-2">
              <span className="text-body font-mono font-bold text-white/90">{MKT.ihsg.value.toLocaleString("id-ID")}</span>
              <span className={`text-caption font-bold ${MKT.ihsg.daily >= 0 ? "text-emerald-400/80" : "text-rose-400/80"}`}>
                {MKT.ihsg.daily >= 0 ? "+" : ""}{MKT.ihsg.daily}%
              </span>
            </div>
            <span className="text-label text-white/30">Bulanan: {MKT.ihsg.monthly}%</span>
          </div>
          <div className="bg-[#050505] border border-white/[0.03] rounded-xl p-3 space-y-1">
            <span className="text-label uppercase tracking-wider text-white/30 block">USD/IDR</span>
            <div className="flex items-baseline gap-2">
              <span className="text-body font-mono font-bold text-white/90">Rp {MKT.usdidr.value.toLocaleString("id-ID")}</span>
              <span className={`text-caption font-bold flex items-center gap-0.5 ${MKT.usdidr.daily <= 0 ? "text-emerald-400/80" : "text-rose-400/80"}`}>
                {MKT.usdidr.daily <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {MKT.usdidr.daily <= 0 ? "" : "+"}{MKT.usdidr.daily}%
              </span>
            </div>
            <span className={`text-label font-bold ${MKT.usdidr.daily <= 0 ? "text-emerald-400/60" : "text-rose-400/60"}`}>
              {MKT.usdidr.daily <= 0 ? "IDR MENGUAT" : "IDR MELEMAH"}
            </span>
          </div>
          <div className="bg-[#050505] border border-white/[0.03] rounded-xl p-3 space-y-1">
            <span className="text-label uppercase tracking-wider text-white/30 block">Score Gap</span>
            <span className="text-body font-mono font-bold text-white/90">{RS.radar_context?.score_gap || "40.6"}</span>
            <span className="text-label text-white/30">Spread Top 5 vs Bottom 5</span>
          </div>
          <div className="bg-[#050505] border border-white/[0.03] rounded-xl p-3 space-y-1">
            <span className="text-label uppercase tracking-wider text-white/30 block">Breadth ≥60</span>
            <span className="text-body font-mono font-bold text-white/90">{RS.radar_context?.breadth_above_60}/{RS.radar_context?.idx_universe_size || 80}</span>
            <span className="text-label text-emerald-400/60 font-bold">Broad Support</span>
          </div>
        </div>

    </div>
  );
}
