import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, ChevronDown, ChevronUp, AlertTriangle, TrendingUp, Shield } from "lucide-react";
import { RS } from "../marketData";
import { getAuditTrail, isCrashActive } from "../marketRegimeEngine";
import Card from "./Card";

export interface MarketInsightPanelHandle {
  expandReason: () => void;
}

export const MarketInsightPanel = forwardRef<MarketInsightPanelHandle>(function MarketInsightPanel(_, ref) {
  const [expanded, setExpanded] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const trail = getAuditTrail();
  const isCrisis = isCrashActive();

  useImperativeHandle(ref, () => ({
    expandReason: () => {
      setExpanded(true);
      setShowDetail(true);
    },
  }));

  const decisionLabel = trail.decision === "BUY_STOCKS" ? "BELI SAHAM" :
    trail.decision === "HOLD_GOLD" ? "PEGANG EMAS" :
    trail.decision === "HOLD_CASH" ? "PEGANG CASH" : "TUNGGU";

  const decisionColor = trail.decision === "BUY_STOCKS" ? "text-green-400 bg-green-500/10 border-green-500/20" :
    trail.decision === "HOLD_GOLD" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
    trail.decision === "HOLD_CASH" ? "text-green-400 bg-green-500/10 border-green-500/20" :
    "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";

  const regimeLabel = trail.regime === "RISK_ON" ? "RISK ON" :
    trail.regime === "RISK_OFF" ? "RISK OFF" :
    trail.regime === "GOLD_DEFENSE" ? "GOLD DEFENSE" :
    trail.regime === "CASH_DEFENSE" ? "CASH DEFENSE" : "RECOVERY";

  const regimeColor = trail.regime === "RISK_ON" ? "text-green-400 bg-green-500/10 border-green-500/20" :
    trail.regime === "RISK_OFF" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
    trail.regime === "GOLD_DEFENSE" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
    trail.regime === "CASH_DEFENSE" ? "text-orange-400 bg-orange-500/10 border-orange-500/20" :
    "text-cyan-400 bg-cyan-500/10 border-cyan-500/20";

  // Compact summary factors — derive from RS data
  const supportFactors = [
    RS.radar_context?.breadth_above_60 && RS.radar_context.idx_universe_size
      ? `Breadth ${RS.radar_context.breadth_above_60}/${RS.radar_context.idx_universe_size} emiten di atas MA60`
      : null,
    RS.market_health >= 60 ? `Kesehatan pasar ${RS.market_health}%` : null,
    RS.opportunity >= 60 ? `Peluang ${RS.opportunity}% — valuasi menarik` : null,
  ].filter(Boolean).slice(0, 2);

  const riskFactors = [
    RS.risk >= 50 ? `Risiko ${RS.risk}% — perlu waspada` : null,
    isCrisis ? "Crash protection aktif — IHSG turun signifikan" : null,
    RS.confidence < 50 ? `Keyakinan rendah ${RS.confidence}%` : null,
    !isCrisis && RS.risk < 50 ? "Volatilitas terkendali" : null,
  ].filter(Boolean).slice(0, 2);

  return (
    <Card variant="default" padding="md">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-caption font-bold text-white/60 uppercase tracking-wider">Wawasan AI</span>
        </div>
        <button
          onClick={() => { setExpanded(!expanded); if (!expanded) setShowDetail(false); }}
          className="flex items-center gap-1 text-label uppercase tracking-wider font-bold text-white/50 hover:text-white transition-colors cursor-pointer bg-white/[0.02] hover:bg-white/[0.05] px-2.5 py-1 rounded-lg border border-white/[0.05]"
          aria-expanded={expanded}
        >
          {expanded ? "Tutup" : "Detail"}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Compact default: conclusion + factors */}
      <p className="text-caption text-zinc-400 mt-2 leading-relaxed font-sans">
        {RS.rationale}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
        {supportFactors.length > 0 && (
          <div className="flex items-start gap-2">
            <TrendingUp className="w-3 h-3 text-green-400/60 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {supportFactors.map((f, i) => (
                <p key={i} className="text-[11px] text-green-400/70 font-sans leading-relaxed">{f}</p>
              ))}
            </div>
          </div>
        )}
        {riskFactors.length > 0 && (
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-3 h-3 text-rose-400/60 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {riskFactors.map((f, i) => (
                <p key={i} className="text-[11px] text-rose-400/70 font-sans leading-relaxed">{f}</p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Collapsible detail sections */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-3 text-caption leading-relaxed text-zinc-400">

              {/* Formulasi */}
              <Card variant="inset" padding="sm" className="flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-white/30 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white/60 block text-label uppercase tracking-wider">Formulasi</span>
                  <p className="mt-0.5 text-zinc-400">
                    {`Skenario: ${isCrisis ? "Tahan Kas" : RS.action === "ACCUMULATE" ? "Akumulasi" : RS.action === "WAIT" ? "Tunggu" : RS.action}, alokasi ${isCrisis ? 0 : RS.capital_deployment}%`}
                  </p>
                </div>
              </Card>

              {/* Audit trail toggle */}
              <button
                onClick={() => setShowDetail(!showDetail)}
                className="flex items-center gap-2 text-label uppercase tracking-wider font-bold text-white/40 hover:text-white/70 transition-colors cursor-pointer"
              >
                {showDetail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Jejak Keputusan AI
              </button>

              <AnimatePresence>
                {showDetail && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-caption">
                      <div className="space-y-2">
                        <div>
                          <span className="text-label uppercase tracking-wider text-white/30 block">Keputusan</span>
                          <span className={`inline-block text-label font-bold px-2 py-0.5 rounded border ${decisionColor}`}>{decisionLabel}</span>
                        </div>
                        <div>
                          <span className="text-label uppercase tracking-wider text-white/30 block">Rezim</span>
                          <span className={`inline-block text-label font-bold px-2 py-0.5 rounded border ${regimeColor}`}>{regimeLabel}</span>
                        </div>
                        <div>
                          <span className="text-label uppercase tracking-wider text-white/30 block">Posisi</span>
                          <span className="text-white/80 font-bold text-label">{trail.position}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <span className="text-label uppercase tracking-wider text-white/30 block">IHSG vs MA</span>
                          <div className="flex gap-2">
                            <span className={`text-label font-bold ${trail.ihsgMa20Above ? "text-green-400" : "text-rose-400"}`}>MA20: {trail.ihsgMa20Above ? "↑" : "↓"}</span>
                            <span className={`text-label font-bold ${trail.ihsgMa50Above ? "text-green-400" : "text-rose-400"}`}>MA50: {trail.ihsgMa50Above ? "↑" : "↓"}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-label uppercase tracking-wider text-white/30 block">Breadth</span>
                          <span className="text-white/80 font-bold text-label">{trail.breadthPercent}</span>
                        </div>
                        <div>
                          <span className="text-label uppercase tracking-wider text-white/30 block">Exit Risk</span>
                          <span className="text-white/80 font-bold text-label">{trail.exitRiskPercent}</span>
                        </div>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-label uppercase tracking-wider text-white/30 block">Alasan</span>
                        <p className="text-zinc-400 text-label leading-relaxed">{trail.reason}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
});
