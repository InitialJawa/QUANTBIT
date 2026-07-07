// ─────────────────────────────────────────────────────────────
// BuyPressureDashboard — visual gauge for Adaptive DCA Engine
//
// Circular SVG ring with BPS score + 5 sub-factor bars +
// action recommendation card. Designed for the Portfolio tab.
// ─────────────────────────────────────────────────────────────
import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Sparkles, ChevronDown, ChevronUp, TrendingUp, AlertTriangle,
  Activity, BarChart3, Layers, TrendingDown, ShieldAlert,
} from "lucide-react";
import { useBuyPressure, type BuyPressureAction, type BuyPressureFactors } from "../engine/buyPressure";

const ACTION_META: Record<BuyPressureAction, { label: string; color: string; bg: string; border: string; ring: string }> = {
  none:       { label: "JANGAN BELI",    color: "text-rose-400",    bg: "bg-rose-500/10",     border: "border-rose-500/30",     ring: "stroke-rose-500" },
  small:      { label: "BELI KECIL",     color: "text-amber-400",   bg: "bg-amber-500/10",    border: "border-amber-500/30",    ring: "stroke-amber-500" },
  normal:     { label: "BELI NORMAL",    color: "text-emerald-400", bg: "bg-emerald-500/10",  border: "border-emerald-500/30",  ring: "stroke-emerald-500" },
  aggressive: { label: "BELI AGRESIF",   color: "text-emerald-300", bg: "bg-emerald-500/20",  border: "border-emerald-400/40",  ring: "stroke-emerald-400" },
  deploy:     { label: "DEPLOY SEMUA",   color: "text-emerald-300", bg: "bg-emerald-500/20",  border: "border-emerald-400/40",  ring: "stroke-emerald-400" },
};

const FACTOR_META: Array<{
  key: keyof BuyPressureFactors;
  label: string;
  weight: number;
  icon: typeof Activity;
  description: string;
}> = [
  { key: "valuation", label: "Valuasi",  weight: 30, icon: Layers,        description: "Saham relatif murah (avg inverse-PE/PB)" },
  { key: "momentum",  label: "Momentum",  weight: 25, icon: TrendingDown,  description: "Tekanan jual sedang berlangsung" },
  { key: "breadth",   label: "Breadth",   weight: 15, icon: BarChart3,     description: "Sedikit saham sehat = pasar lemah" },
  { key: "drawdown",  label: "Drawdown",  weight: 20, icon: TrendingDown,  description: "Jarak dari puncak 60 hari" },
  { key: "fear",      label: "Fear",      weight: 10, icon: ShieldAlert,   description: "Indeks risiko regime pasar" },
];

function CircularGauge({ score, valid, ringColor }: { score: number; valid: boolean; ringColor: string }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, score));
  const dashOffset = circumference * (1 - safeScore / 100);

  return (
    <svg viewBox="0 0 160 160" className="w-40 h-40">
      <circle cx="80" cy="80" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-white/[0.06]" />
      <motion.circle
        cx="80" cy="80" r={radius}
        fill="none"
        className={ringColor}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: dashOffset }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
      />
      <text
        x="80" y="78"
        textAnchor="middle"
        className={`text-3xl font-black font-mono ${valid ? "text-white" : "text-white/30"}`}
        fill="currentColor"
      >
        {valid ? score : "—"}
      </text>
      <text
        x="80" y="98"
        textAnchor="middle"
        className="text-label uppercase tracking-widest text-white/40 font-bold font-mono"
        fill="currentColor"
      >
        /100
      </text>
    </svg>
  );
}

type FactorBarProps = {
  label: string; value: number; weight: number; icon: typeof Activity; description: string;
};

const FactorBar: React.FC<FactorBarProps> = ({ label, value, weight, icon: Icon, description }) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-caption">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3 text-white/40" />
          <span className="text-white/70 font-medium">{label}</span>
          <span className="text-white/20 font-mono text-label">({weight}%)</span>
        </div>
        <span className="text-white font-mono font-bold text-caption">{value.toFixed(0)}</span>
      </div>
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500/70 via-emerald-500 to-emerald-400"
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <p className="text-label text-white/30 leading-snug font-sans">{description}</p>
    </div>
  );
};

export function BuyPressureDashboard() {
  const bps = useBuyPressure();
  const [isWhyOpen, setIsWhyOpen] = useState(false);
  const meta = ACTION_META[bps.action];

  return (
    <div className={`relative bg-[#050505] border ${meta.border} rounded-2xl overflow-hidden shadow-sm`}>
      {/* Crisis overlay */}
      {!bps.valid && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
          <div className="text-center space-y-2 px-6">
            <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto animate-pulse" />
            <h3 className="text-base font-black uppercase tracking-widest text-rose-400 font-mono">CASH DEFENSE</h3>
            <p className="text-caption text-white/60 max-w-sm font-sans">{bps.reason}</p>
          </div>
        </div>
      )}

      <div className="p-5 sm:p-6 flex flex-col md:flex-row gap-6">
        {/* Left: Gauge + Status */}
        <div className="flex flex-col items-center gap-3 md:border-r md:border-white/[0.05] md:pr-6 shrink-0">
          <CircularGauge score={bps.score} valid={bps.valid} ringColor={meta.ring} />
          <div className="text-center space-y-1.5">
            <span className="text-caption uppercase tracking-widest text-white/30 font-bold font-mono block">
              Buy Pressure Score
            </span>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg ${meta.bg} ${meta.border} border`}>
              <Sparkles className={`w-3 h-3 ${meta.color}`} />
              <span className={`text-caption font-black uppercase tracking-widest font-mono ${meta.color}`}>
                {meta.label}
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Factor bars + reason */}
        <div className="flex-1 space-y-4 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-widest font-sans">
                Adaptive DCA Recommendation
              </h3>
              <p className="text-caption text-white/40 font-sans mt-0.5">
                Data-driven position sizing. Membeli berdasarkan peluang, bukan kalender.
              </p>
            </div>
            <button
              onClick={() => setIsWhyOpen(!isWhyOpen)}
              className="flex items-center gap-1 text-caption uppercase tracking-widest font-bold text-white/50 hover:text-white transition-colors cursor-pointer bg-white/[0.02] hover:bg-white/[0.05] px-2.5 py-1 rounded-lg border border-white/[0.05] shrink-0"
            >
              {isWhyOpen ? <>Tutup <ChevronUp className="w-3 h-3" /></> : <>Kenapa? <ChevronDown className="w-3 h-3" /></>}
            </button>
          </div>

          <motion.div
            initial={false}
            animate={{ height: isWhyOpen ? "auto" : 0, opacity: isWhyOpen ? 1 : 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 pb-1">
              {FACTOR_META.map((f, i) => (
                <FactorBar
                  key={i}
                  label={f.label}
                  value={bps.factors[f.key]}
                  weight={f.weight}
                  icon={f.icon}
                  description={f.description}
                />
              ))}
            </div>
          </motion.div>

          <p className="text-xs text-white/60 leading-relaxed font-sans border-t border-white/[0.05] pt-3">
            {bps.reason}
          </p>
        </div>

        {/* Right: Deploy/Cash stats */}
        <div className="md:border-l md:border-white/[0.05] md:pl-6 flex md:flex-col gap-3 shrink-0 md:w-44">
          <div className="flex-1 p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl">
            <span className="text-label uppercase font-bold tracking-widest text-white/30 block font-mono mb-1">Deploy</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-mono font-black ${meta.color}`}>{bps.deployPct}</span>
              <span className="text-caption text-white/30 font-mono">% kas</span>
            </div>
            <div className="h-0.5 bg-white/[0.05] rounded-full mt-2 overflow-hidden">
              <motion.div
                className={`h-full ${meta.ring.replace("stroke-", "bg-")}`}
                initial={{ width: 0 }}
                animate={{ width: `${bps.deployPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          <div className="flex-1 p-3 bg-white/[0.01] border border-white/[0.03] rounded-xl">
            <span className="text-label uppercase font-bold tracking-widest text-white/30 block font-mono mb-1">Simpan Kas</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-mono font-black text-white/70">{bps.cashPct}</span>
              <span className="text-caption text-white/30 font-mono">% kas</span>
            </div>
            <div className="h-0.5 bg-white/[0.05] rounded-full mt-2 overflow-hidden">
              <motion.div
                className="h-full bg-white/40"
                initial={{ width: 0 }}
                animate={{ width: `${bps.cashPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
