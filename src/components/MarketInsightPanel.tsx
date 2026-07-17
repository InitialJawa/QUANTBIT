import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { RS } from "../marketData";
import { getAuditTrail, isCrashActive } from "../marketRegimeEngine";
import Card from "./Card";

export function MarketInsightPanel() {
  const [expanded, setExpanded] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const trail = getAuditTrail();
  const isCrisis = isCrashActive();

  const decisionLabel = trail.decision === "BUY_STOCKS" ? "BELI SAHAM" :
    trail.decision === "HOLD_GOLD" ? "PEGANG EMAS" :
    trail.decision === "HOLD_CASH" ? "PEGANG CASH" : "TUNGGU PEMULIHAN";

  const decisionColor = trail.decision === "BUY_STOCKS" ? "text-green-400 bg-green-500/10 border-green-500/20" :
    trail.decision === "HOLD_GOLD" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
    trail.decision === "HOLD_CASH" ? "text-green-400 bg-green-500/10 border-green-500/20" :
    "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";

  const regimeLabel = trail.regime === "RISK_ON" ? "RISK ON" :
    trail.regime === "RISK_OFF" ? "RISK OFF" :
    trail.regime === "GOLD_DEFENSE" ? "GOLD DEFENSE" :
    trail.regime === "CASH_DEFENSE" ? "CASH DEFENSE" : "RECOVERY WATCH";

  const regimeColor = trail.regime === "RISK_ON" ? "text-green-400 bg-green-500/10 border-green-500/20" :
    trail.regime === "RISK_OFF" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
    trail.regime === "GOLD_DEFENSE" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
    trail.regime === "CASH_DEFENSE" ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
    "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";

  return (
    <Card variant="default" padding="md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-caption font-bold text-white/60 uppercase tracking-wider">Wawasan AI</span>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-label uppercase tracking-wider font-bold text-white/50 hover:text-white transition-colors cursor-pointer bg-white/[0.02] hover:bg-white/[0.05] px-2.5 py-1 rounded-lg border border-white/[0.05]"
        >
          {expanded ? "Tutup" : "Detail"}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      <p className="text-caption text-zinc-400 mt-2 leading-relaxed font-sans">
        {RS.rationale}
      </p>

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
                    {`Skenario: ${isCrisis ? "Tahan Kas" : RS.action === "ACCUMULATE" ? "Akumulasi" : RS.action === "WAIT" ? "Tunggu" : RS.action}, alokasi ${isCrisis ? 0 : RS.capital_deployment}%`}
                  </p>
                </div>
              </Card>

              {/* Decision Audit Trail */}
              <button
                onClick={() => setShowAuditTrail(!showAuditTrail)}
                className="flex items-center gap-2 text-label uppercase tracking-wider font-bold text-white/40 hover:text-white/70 transition-colors cursor-pointer"
              >
                {showAuditTrail ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Jejak Keputusan AI
              </button>
              {showAuditTrail && (
                <div className="grid grid-cols-2 gap-3 text-caption">
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
                    <div>
                      <span className="text-label uppercase tracking-wider text-white/30 block">Breadth ≥60</span>
                      <span className="text-white font-bold">{trail.breadthPercent}</span>
                    </div>
                    <div>
                      <span className="text-label uppercase tracking-wider text-white/30 block">Exit Risk</span>
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
  );
}
