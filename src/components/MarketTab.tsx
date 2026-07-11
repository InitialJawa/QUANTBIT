import { useState, useMemo } from "react";
import { RS, MKT } from "../marketData";
import { STOCKS_DATA } from "../stocksData";
import { StockData, PortfolioItem, WatchlistItem } from "../types";
import { getAuditTrail, isCrashActive, computeRSI, computeMACD, getIhsgData } from "../marketRegimeEngine";
import { ExplainButton } from "./ExplainButton";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Eye,
  Trash2,
  Plus,
} from "lucide-react";
import { MarketOverviewCharts } from "./MarketOverviewCharts";
import { LastUpdatedChip } from "./LastUpdatedChip";
import { useEngineConfig } from "../contexts/EngineConfigContext";
import Card from "./Card";
import { SearchableSelect } from "./SearchableSelect";
import { TickerLogo } from "./TickerLogo";

interface SyncStatus {
  lastSynced: string | null;
  latestDate: string | null;
  stale: boolean;
  syncing: boolean;
}

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
  syncStatus?: SyncStatus;
  triggerSync?: () => void;
  watchlist?: WatchlistItem[];
  onToggleWatchlist?: (ticker: string) => void;
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
  filteredStocks,
  syncStatus,
  triggerSync,
  watchlist = [],
  onToggleWatchlist,
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
  const [watchlistTicker, setWatchlistTicker] = useState(visibleStocks[0]?.ticker || "");

  let totalCost = 0;
  let totalValueNow = 0;
  portfolio.forEach(item => {
    const liveStock = visibleStocks.find(s => s.ticker === item.ticker);
    const lastPrice = liveStock ? liveStock.currentPrice : item.buyPrice;
    totalCost += item.shares * item.buyPrice;
    totalValueNow += item.shares * lastPrice;
  });
  const myReturnPercent = totalCost > 0 ? ((totalValueNow - totalCost) / totalCost) * 100 : 0;

  const isIHSGInCrisis = isCrashActive();
  const currentStatus = isIHSGInCrisis ? "RISK OFF" : RS.status;
  const currentAction = isIHSGInCrisis ? "LIQUIDATE / CASH OUT" : RS.action;

  const statusColors: Record<string, string> = {
    SAFE: "text-green-400 bg-green-500/10 border-green-500/20",
    WARNING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    DANGER: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    "RISK ON": "text-green-400 bg-green-500/10 border-green-500/20",
    "RISK OFF": "text-rose-400 bg-rose-500/10 border-rose-500/20",
  };

  const isFilteredByStrategy =
    engineConfig.simulationMode === "custom" && engineConfig.customUniverse.length > 0;

  const ihsgData = getIhsgData();
  const ihsgCloses = useMemo(() => ihsgData.map(d => d.close), [ihsgData]);
  const rsiIHSG = useMemo(() => computeRSI(ihsgCloses, 14), [ihsgCloses]);
  const macdResult = useMemo(() => computeMACD(ihsgCloses), [ihsgCloses]);

  const breadth = useMemo(() => {
    const advancers = allVisibleStocks.filter(s => s.change > 0).length;
    const decliners = allVisibleStocks.filter(s => s.change < 0).length;
    return { advancers, decliners, total: allVisibleStocks.length };
  }, [allVisibleStocks]);

  return (
    <div className="space-y-4">

      {isFilteredByStrategy && (
        <div className="bg-emerald-500/[0.04] border border-emerald-500/15 rounded-xl px-4 py-2 flex items-center gap-2 text-caption font-mono">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-emerald-400 font-bold">FILTERED BY PORTFOLIO STRATEGY:</span>
          <span className="text-white/80 truncate">Custom Universe ({engineConfig.customUniverse.length})</span>
        </div>
      )}
      {/* Crisis Warning Banner */}
      {isIHSGInCrisis && (
        <div className="bg-[#0A0A0A] border border-rose-500/20 p-4 sm:p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
          <div className="flex items-center gap-2 text-rose-400">
            <TrendingDown className="w-5 h-5 animate-pulse" />
            <h3 className="text-sm uppercase font-extrabold tracking-widest font-sans">
              RISK OFF — Pasar Jatuh Sistemik
            </h3>
          </div>
          <p className="text-xs text-rose-200/70 font-sans max-w-3xl">
            IHSG telah memicu ambang batas crash protection. Sistem
            merekomendasikan likuidasi posisi saham dan rotasi ke safe haven
            (EMAS/GOLD) atau cash defense. Deploy capital diatur ke 0% hingga
            pasar pulih.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-label font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/20">
              STATUS: RISK OFF
            </span>
            <span className="text-label font-mono px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/[0.06]">
              IHSG: {MKT.ihsg.value.toLocaleString("id-ID")} ({MKT.ihsg.daily >= 0 ? "+" : ""}{MKT.ihsg.daily}%)
            </span>
          </div>
        </div>
      )}

      {/* Chart utama — IHSG vs Gold vs Portfolio */}
      <MarketOverviewCharts portfolio={portfolio} />

      {/* Teknikal strip — RSI, MACD, SMA, Breadth, Score Gap */}
      <Card variant="default" padding="sm">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-caption">
          <div>
            <span className="text-white/30 text-label uppercase tracking-wider block">RSI(14)</span>
            <span className={`font-mono font-bold ${rsiIHSG !== null ? (rsiIHSG >= 70 ? "text-rose-400" : rsiIHSG <= 30 ? "text-green-400" : "text-white/80") : "text-white/30"}`}>
              {rsiIHSG !== null ? rsiIHSG.toFixed(1) : "--"}
            </span>
          </div>
          <div>
            <span className="text-white/30 text-label uppercase tracking-wider block">MACD</span>
            <span className="font-mono font-bold text-white/80">{macdResult !== null ? macdResult.macd.toFixed(1) : "--"}</span>
            {macdResult !== null && (
              <span className={`text-label font-mono ml-1 ${macdResult.histogram >= 0 ? "text-green-400" : "text-rose-400"}`}>
                {macdResult.histogram >= 0 ? "+" : ""}{macdResult.histogram.toFixed(1)}
              </span>
            )}
          </div>
          <div>
            <span className="text-white/30 text-label uppercase tracking-wider block">SMA20</span>
            <span className="font-mono font-bold text-white/80">
              {ihsgCloses.length > 20 ? (ihsgCloses.slice(-20).reduce((s, v) => s + v, 0) / 20).toFixed(1) : "--"}
            </span>
          </div>
          <div>
            <span className="text-white/30 text-label uppercase tracking-wider block">SMA50</span>
            <span className="font-mono font-bold text-white/80">
              {ihsgCloses.length > 50 ? (ihsgCloses.slice(-50).reduce((s, v) => s + v, 0) / 50).toFixed(1) : "--"}
            </span>
          </div>
          <div>
            <span className="text-white/30 text-label uppercase tracking-wider block">Breadth</span>
            <span className="font-mono font-bold text-white/80">
              <span className="text-green-400">{breadth.advancers}</span>
              <span className="text-white/30"> / </span>
              <span className="text-rose-400">{breadth.decliners}</span>
            </span>
          </div>
          <div>
            <span className="text-white/30 text-label uppercase tracking-wider block">Score Gap</span>
            <span className="font-mono font-bold text-white/80">{RS.radar_context?.score_gap?.toFixed(1) || "--"}</span>
          </div>
        </div>
      </Card>

      {/* Status bar — compact 1 row */}
      <Card variant="default" padding="md">
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
              <span className={`font-mono font-bold ${myReturnPercent >= 0 ? "text-green-400" : "text-rose-400"}`}>
                {portfolio.length === 0 ? "—" : `${myReturnPercent >= 0 ? "+" : ""}${myReturnPercent.toFixed(2)}%`}
              </span>
            </div>
            <div className="w-px h-4 bg-white/[0.06]" />
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-label uppercase tracking-wider">IHSG</span>
              <span className="font-mono font-bold text-white/90">{MKT.ihsg.value.toLocaleString("id-ID")}</span>
              <span className={`font-mono font-bold ${MKT.ihsg.daily >= 0 ? "text-green-400/80" : "text-rose-400/80"}`}>
                {MKT.ihsg.daily >= 0 ? "+" : ""}{MKT.ihsg.daily}%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-label uppercase tracking-wider">USD/IDR</span>
              <span className="font-mono font-bold text-white/90">Rp {MKT.usdidr.value.toLocaleString("id-ID")}</span>
            </div>
            <div className="ml-auto">
              <span className={`text-caption font-bold tracking-wide ${isIHSGInCrisis ? "text-rose-400" : "text-green-400/80"}`}>
                {isIHSGInCrisis ? (
                  <><TrendingDown className="w-3 h-3 inline animate-pulse" /> Jatuh Sistemik</>
                ) : (
                  <><TrendingUp className="w-3 h-3 inline" /> {currentAction === "ACCUMULATE" ? "Akumulasi" : currentAction === "WAIT" ? "Tunggu" : currentAction}</>
                )}
              </span>
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Kesehatan Pasar", value: RS.market_health, color: "bg-white/40" },
            { label: "Peluang Cuan", value: RS.opportunity, color: "bg-white/40" },
            { label: "Risiko Pasar", value: RS.risk, color: "bg-rose-500/50", textColor: "text-rose-400/80" },
            { label: "Keyakinan", value: RS.confidence, color: "bg-white/40" },
          ].map((m) => (
            <Card key={m.label} variant="inset" padding="sm" className="space-y-1.5">
              <span className="text-label uppercase tracking-wider text-white/30">{m.label}</span>
              <span className={`text-xl font-bold font-mono ${m.textColor || "text-white"} block`}>{m.value}</span>
              <div className="w-full bg-white/[0.05] h-1 rounded-full overflow-hidden">
                <div className={`${m.color} h-full rounded-full`} style={{ width: `${m.value}%` }} />
              </div>
            </Card>
          ))}
        </div>

        {/* AI Brief — collapsible */}
        <Card variant="default" padding="md">
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
                    <Card variant="inset" padding="sm" className="space-y-1.5">
                      <h4 className="font-bold text-white/60 text-label uppercase tracking-wider">Pendukung Pasar</h4>
                      <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                        <li>Likuiditas domestik terjaga dengan aliran modal asing</li>
                        <li>Valuasi atraktif di beberapa emiten unggulan</li>
                      </ul>
                    </Card>
                    <Card variant="inset" padding="sm" className="space-y-1.5">
                      <h4 className="font-bold text-white/60 text-label uppercase tracking-wider">Risiko Pantauan</h4>
                      <ul className="list-disc pl-4 space-y-1 text-zinc-400">
                        <li>Volatilitas nilai tukar rupiah</li>
                        <li>Profit taking jangka pendek</li>
                      </ul>
                    </Card>
                  </div>
                  <Card variant="inset" padding="sm" className="flex items-start gap-3">
                    <Sparkles className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white/60 block text-label uppercase tracking-wider">Formulasi</span>
                      <p className="mt-0.5 text-zinc-400">
                        {`Skenario: ${currentAction === "WAIT" ? "WAIT" : currentAction}, alokasi ${RS.capital_deployment}%`}
                      </p>
                    </div>
                    </Card>
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
                            trail.decision === "BUY_STOCKS" ? "text-green-400 bg-green-500/10 border-green-500/20" :
                            trail.decision === "HOLD_GOLD" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                            trail.decision === "HOLD_CASH" ? "text-green-400 bg-green-500/10 border-green-500/20" :
                            "text-yellow-400 bg-yellow-500/10 border-yellow-500/20"
                          }`}>{trail.decision === "BUY_STOCKS" ? "BELI SAHAM" : trail.decision === "HOLD_GOLD" ? "PEGANG EMAS" : trail.decision === "HOLD_CASH" ? "PEGANG CASH" : "TUNGGU PEMULIHAN"}</span>
                        </div>
                        <div><span className="text-label uppercase tracking-wider text-white/30 block">Rezim</span>
                          <span className={`inline-block text-label font-bold px-2 py-0.5 rounded border ${
                            trail.regime === "RISK_ON" ? "text-green-400 bg-green-500/10 border-green-500/20" :
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
                            <span className={`text-label font-bold ${trail.ihsgMa20Above ? "text-green-400" : "text-rose-400"}`}>MA20: {trail.ihsgMa20Above ? "↑" : "↓"}</span>
                            <span className={`text-label font-bold ${trail.ihsgMa50Above ? "text-green-400" : "text-rose-400"}`}>MA50: {trail.ihsgMa50Above ? "↑" : "↓"}</span>
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
        </Card>

        {/* Parameter strip — compact */}
        <div className="flex items-center justify-between px-1">
          <h3 className="text-label uppercase tracking-wider text-white/30 flex items-center gap-1.5">
            Ringkasan Parameter
            <ExplainButton label="IHSG, USD/IDR, Quant Score Gap, Market Breadth" />
          </h3>
          <div className="flex items-center gap-3">
            <LastUpdatedChip iso={MKT.market_last_update} />
            {syncStatus && (
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${
                  syncStatus.stale ? "bg-amber-400 animate-pulse" : "bg-green-400"
                }`} />
                <span className={`text-label font-mono font-bold ${
                  syncStatus.stale ? "text-amber-400" : "text-green-400"
                }`}>
                  DB: {syncStatus.latestDate || "—"}
                </span>
                {syncStatus.stale && (
                  <button
                    onClick={triggerSync}
                    disabled={syncStatus.syncing}
                    className="text-label font-bold uppercase tracking-wider text-white/50 hover:text-white cursor-pointer disabled:opacity-30"
                  >
                    {syncStatus.syncing ? "..." : "Sync"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card variant="default" padding="sm" className="space-y-1">
            <span className="text-label uppercase tracking-wider text-white/30 block">IHSG</span>
            <div className="flex items-baseline gap-2">
              <span className="text-body font-mono font-bold text-white/90">{MKT.ihsg.value.toLocaleString("id-ID")}</span>
              <span className={`text-caption font-bold ${MKT.ihsg.daily >= 0 ? "text-green-400/80" : "text-rose-400/80"}`}>
                {MKT.ihsg.daily >= 0 ? "+" : ""}{MKT.ihsg.daily}%
              </span>
            </div>
            <span className="text-label text-white/30">Bulanan: {MKT.ihsg.monthly}%</span>
          </Card>
          <Card variant="default" padding="sm" className="space-y-1">
            <span className="text-label uppercase tracking-wider text-white/30 block">USD/IDR</span>
            <div className="flex items-baseline gap-2">
              <span className="text-body font-mono font-bold text-white/90">Rp {MKT.usdidr.value.toLocaleString("id-ID")}</span>
              <span className={`text-caption font-bold flex items-center gap-0.5 ${MKT.usdidr.daily <= 0 ? "text-green-400/80" : "text-rose-400/80"}`}>
                {MKT.usdidr.daily <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {MKT.usdidr.daily <= 0 ? "" : "+"}{MKT.usdidr.daily}%
              </span>
            </div>
            <span className={`text-label font-bold ${MKT.usdidr.daily <= 0 ? "text-green-400/60" : "text-rose-400/60"}`}>
              {MKT.usdidr.daily <= 0 ? "IDR MENGUAT" : "IDR MELEMAH"}
            </span>
          </Card>
          <Card variant="default" padding="sm" className="space-y-1">
            <span className="text-label uppercase tracking-wider text-white/30 block">Score Gap</span>
            <span className="text-body font-mono font-bold text-white/90">{RS.radar_context?.score_gap || "40.6"}</span>
            <span className="text-label text-white/30">Spread Top 5 vs Bottom 5</span>
          </Card>
          <Card variant="default" padding="sm" className="space-y-1">
            <span className="text-label uppercase tracking-wider text-white/30 block">Breadth ≥60</span>
            <span className="text-body font-mono font-bold text-white/90">{RS.radar_context?.breadth_above_60}/{RS.radar_context?.idx_universe_size || 80}</span>
            <span className="text-label text-emerald-400/60 font-bold">Broad Support</span>
          </Card>
        </div>

        {/* Watchlist Strip */}
        <div className="bg-[#0A0A0A] bg-card-gradient-alt rounded-2xl border border-white/10 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <h3 className="text-xs font-semibold text-white/85 uppercase tracking-widest flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              Daftar Pantau
            </h3>
            <div className="flex items-center gap-2 max-w-sm w-full sm:w-auto">
              <SearchableSelect
                value={watchlistTicker}
                options={visibleStocks.map((s) => ({
                  value: s.ticker,
                  label: `${s.ticker} - ${s.name}`,
                  logoColor: s.logoColor,
                }))}
                onChange={(val) => setWatchlistTicker(val)}
              />
              <button
                onClick={() => onToggleWatchlist?.(watchlistTicker)}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer shrink-0"
                disabled={watchlist.some((w) => w.ticker === watchlistTicker)}
              >
                <Plus className="w-3 h-3 inline mr-1" />Tambah
              </button>
            </div>
          </div>

          {watchlist.length === 0 ? (
            <div className="p-8 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/10">
              <p className="text-white/40 text-xs">
                Belum ada perusahaan dalam Daftar Pantau. Gunakan tombol Tambah untuk menambahkan saham ke daftar pantau.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {watchlist.map((item) => {
                const liveStock = visibleStocks.find(
                  (s) => s.ticker === item.ticker,
                );
                if (!liveStock) return null;
                const isPos = liveStock.change >= 0;
                return (
                  <div
                    key={item.ticker}
                    className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-emerald-500/20 hover:shadow-xs transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      <TickerLogo
                        ticker={liveStock.ticker}
                        size="md"
                        fallbackColor={liveStock.logoColor}
                      />
                      <div>
                        <button
                          onClick={() => onSelectTicker(liveStock.ticker)}
                          className="font-bold text-white hover:text-emerald-400 cursor-pointer block text-left"
                        >
                          {liveStock.ticker}
                        </button>
                        <span className="text-caption text-white/40 block truncate max-w-32 mt-0.5">
                          {liveStock.name}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <span className="text-xs font-bold text-white block font-mono">
                          Rp {liveStock.currentPrice.toLocaleString()}
                        </span>
                        <span
                          className={`text-caption font-bold ${isPos ? "text-green-400" : "text-rose-400"}`}
                        >
                          {isPos ? "+" : ""}
                          {liveStock.change}%
                        </span>
                      </div>
                      <button
                        onClick={() => onToggleWatchlist?.(liveStock.ticker)}
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
  );
}
