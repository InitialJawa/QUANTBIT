import React from "react";
import { getAuditTrail } from "../marketRegimeEngine";
import { DataBadge } from "./DataBadge";
import { DataStatus } from "../types";

const regimeColor: Record<string, string> = {
  RISK_ON: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  RISK_OFF: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  GOLD_DEFENSE: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  CASH_DEFENSE: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  RECOVERY_WATCH: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};

const decisionColor: Record<string, string> = {
  BUY_STOCKS: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  HOLD_GOLD: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  HOLD_CASH: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  WAIT_RECOVERY: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
};

export function DecisionAuditTrail() {
  const trail = getAuditTrail();

  return (
    <div className="bg-[#050505] border border-white/[0.03] rounded-2xl p-6 space-y-4">
      <h3 className="text-caption uppercase font-bold tracking-widest text-white/50 flex items-center gap-2 font-mono border-b border-white/[0.05] pb-3">
        Decision Audit Trail
        <DataBadge status={DataStatus.CACHED} />
      </h3>

      <div className="grid grid-cols-2 gap-4 text-body">
        <div className="space-y-3">
          <div>
            <span className="text-label uppercase tracking-widest text-white/30 block mb-1 font-mono">Keputusan Saat Ini</span>
            <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg border ${decisionColor[trail.decision] || "text-white/60 bg-white/5 border-white/10"}`}>
              {trail.decision === "BUY_STOCKS" ? "BELI SAHAM" :
               trail.decision === "HOLD_GOLD" ? "PEGANG EMAS" :
               trail.decision === "HOLD_CASH" ? "PEGANG CASH" :
               "TUNGGU PEMULIHAN"}
            </span>
          </div>
          <div>
            <span className="text-label uppercase tracking-widest text-white/30 block mb-1 font-mono">Rezim Pasar</span>
            <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-lg border ${regimeColor[trail.regime] || "text-white/60 bg-white/5 border-white/10"}`}>
              {trail.regime === "RISK_ON" ? "RISK ON" :
               trail.regime === "RISK_OFF" ? "RISK OFF" :
               trail.regime === "GOLD_DEFENSE" ? "GOLD DEFENSE" :
               trail.regime === "CASH_DEFENSE" ? "CASH DEFENSE" :
               "RECOVERY WATCH"}
            </span>
          </div>
          <div>
            <span className="text-label uppercase tracking-widest text-white/30 block mb-1 font-mono">Posisi</span>
            <span className="text-white font-bold">{trail.position}</span>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <span className="text-label uppercase tracking-widest text-white/30 block mb-1 font-mono">IHSG vs MA</span>
            <div className="flex gap-3">
              <span className={`text-xs font-bold ${trail.ihsgMa20Above ? "text-emerald-400" : "text-rose-400"}`}>
                MA20: {trail.ihsgMa20Above ? "DI ATAS" : "DI BAWAH"}
              </span>
              <span className={`text-xs font-bold ${trail.ihsgMa50Above ? "text-emerald-400" : "text-rose-400"}`}>
                MA50: {trail.ihsgMa50Above ? "DI ATAS" : "DI BAWAH"}
              </span>
            </div>
          </div>
          <div>
            <span className="text-label uppercase tracking-widest text-white/30 block mb-1 font-mono">Breadth (Score &gt;=60)</span>
            <span className="text-white font-bold">{trail.breadthPercent}</span>
          </div>
          <div>
            <span className="text-label uppercase tracking-widest text-white/30 block mb-1 font-mono">Exit Risk</span>
            <span className="text-white font-bold">{trail.exitRiskPercent}</span>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-white/[0.05] space-y-2">
        <div>
          <span className="text-label uppercase tracking-widest text-white/30 block mb-1 font-mono">Alasan</span>
          <p className="text-zinc-400 text-xs leading-relaxed">{trail.reason}</p>
        </div>

        {trail.noBuyReasons.length > 0 && (
          <div>
            <span className="text-label uppercase tracking-widest text-white/30 block mb-1 font-mono">Kenapa Belum Beli Saham?</span>
            <ul className="space-y-1">
              {trail.noBuyReasons.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-500">
                  <span className="text-rose-400/70 mt-0.5 shrink-0">&bull;</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <span className="text-label uppercase tracking-widest text-white/30 block mb-1 font-mono">Syarat Masuk Kembali</span>
          <p className="text-zinc-400 text-xs leading-relaxed">{trail.reentryCondition}</p>
        </div>
      </div>
    </div>
  );
}
