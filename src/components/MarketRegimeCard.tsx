import { motion } from "motion/react";
import { TrendingDown, TrendingUp, Shield, Banknote, Gem, AlertTriangle, ChevronRight, Zap, ArrowRight } from "lucide-react";
import { RS, MKT } from "../marketData";
import { isCrashActive } from "../marketRegimeEngine";
import Card from "./Card";

interface MarketRegimeCardProps {
  myReturnPercent: number;
  portfolioCount: number;
  onNavigate?: (tab: string, context?: string) => void;
  onOpenInsight?: () => void;
}

const regimeConfig: Record<string, {
  label: string;
  desc: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  accentBg: string;
}> = {
  RISK_ON: {
    label: "RISK ON",
    desc: "Pasar dalam fase akumulasi. Deploy capital aktif.",
    borderColor: "border-green-500/25",
    bgColor: "bg-green-500/[0.06]",
    textColor: "text-green-400",
    accentBg: "bg-green-500",
  },
  RISK_OFF: {
    label: "RISK OFF",
    desc: "Pasar defensif. Tahan kas atau alokasikan ke safe haven.",
    borderColor: "border-rose-500/25",
    bgColor: "bg-rose-500/[0.06]",
    textColor: "text-rose-400",
    accentBg: "bg-rose-500",
  },
  GOLD_DEFENSE: {
    label: "GOLD DEFENSE",
    desc: "Rotasi ke emas direkomendasikan. Kurangi eksposur saham.",
    borderColor: "border-amber-500/25",
    bgColor: "bg-amber-500/[0.06]",
    textColor: "text-amber-400",
    accentBg: "bg-amber-500",
  },
  CASH_DEFENSE: {
    label: "CASH DEFENSE",
    desc: "Perlindungan kas aktif. Deploy capital minimum.",
    borderColor: "border-orange-500/25",
    bgColor: "bg-orange-500/[0.06]",
    textColor: "text-orange-400",
    accentBg: "bg-orange-500",
  },
  RECOVERY_WATCH: {
    label: "RECOVERY WATCH",
    desc: "Pemantauan pemulihan aktif. Siap akumulasi bertahap.",
    borderColor: "border-cyan-500/25",
    bgColor: "bg-cyan-500/[0.06]",
    textColor: "text-cyan-400",
    accentBg: "bg-cyan-500",
  },
};

const SAFE_CONFIG = {
  label: "RISK ON",
  desc: "Pasar kondisi normal. Deploy capital aktif.",
  borderColor: "border-green-500/25",
  bgColor: "bg-green-500/[0.06]",
  textColor: "text-green-400",
  accentBg: "bg-green-500",
};

function getRegimeKey(): string {
  const isCrisis = isCrashActive();
  if (isCrisis) return "RISK_OFF";
  if (RS.status === "SAFE") return "RISK_ON";
  if (RS.status === "WARNING") return "GOLD_DEFENSE";
  return "CASH_DEFENSE";
}

interface ActionCard {
  label: string;
  icon: typeof Shield;
  desc: string;
  targetTab: string;
  targetContext?: string;
  targetInsight?: boolean;
  disabled?: boolean;
  disabledReason?: string;
}

const actionLinks: Record<string, ActionCard[]> = {
  RISK_OFF: [
    { label: "Lihat Alasan Risk Off", icon: AlertTriangle, desc: "Detail komponen penilaian", targetTab: "", targetInsight: true },
    { label: "Simulasikan Rotasi ke Emas", icon: Gem, desc: "Alokasi ke safe haven", targetTab: "backtest", targetContext: "safe-haven" },
    { label: "Cek Portofolio Terdampak", icon: TrendingDown, desc: "Analisis posisi saat ini", targetTab: "portfolio" },
    { label: "Buka Saham Defensif", icon: Shield, desc: "Saham defensif unggulan", targetTab: "analytics", targetContext: "defensive" },
  ],
  GOLD_DEFENSE: [
    { label: "Simulasikan Rotasi ke Emas", icon: Gem, desc: "Alokasi ke safe haven", targetTab: "backtest", targetContext: "safe-haven" },
    { label: "Cek Portofolio Terdampak", icon: TrendingDown, desc: "Posisi saham", targetTab: "portfolio" },
  ],
  CASH_DEFENSE: [
    { label: "Lihat Kondisi Pasar", icon: AlertTriangle, desc: "Evaluasi pasar", targetTab: "", targetInsight: true },
    { label: "Cek Portofolio", icon: Banknote, desc: "Evaluasi kas", targetTab: "portfolio" },
  ],
  RISK_ON: [
    { label: "Cek Rekomendasi Beli", icon: TrendingUp, desc: "Sinyal akumulasi", targetTab: "analytics" },
    { label: "Lihat Peluang Akumulasi", icon: Zap, desc: "Saham potensial", targetTab: "analytics", targetContext: "opportunity" },
  ],
  RECOVERY_WATCH: [
    { label: "Lihat Progres Pemulihan", icon: TrendingUp, desc: "Indikator pemulihan", targetTab: "", targetInsight: true },
    { label: "Cek Saham Defensif", icon: Shield, desc: "Saham aman", targetTab: "analytics", targetContext: "defensive" },
  ],
};

export function MarketRegimeCard({ myReturnPercent, portfolioCount, onNavigate, onOpenInsight }: MarketRegimeCardProps) {
  const isCrisis = isCrashActive();
  const regimeKey = getRegimeKey();
  const config = isCrisis ? regimeConfig.RISK_OFF : (regimeConfig[regimeKey] || SAFE_CONFIG);
  const regimeLabel = isCrisis ? "RISK OFF" : RS.status === "SAFE" ? "RISK ON" : RS.status;
  const deployPct = isCrisis ? 0 : RS.capital_deployment;
  const actionLabel = isCrisis ? "Tahan Kas" : RS.action === "ACCUMULATE" ? "Akumulasi" : RS.action === "WAIT" ? "Tunggu" : RS.action;
  const links = actionLinks[regimeKey] || actionLinks.RISK_ON;

  const handleActionClick = (link: ActionCard) => {
    if (link.disabled) return;
    if (link.targetInsight && onOpenInsight) {
      onOpenInsight();
      return;
    }
    if (link.targetTab && onNavigate) {
      onNavigate(link.targetTab, link.targetContext);
    }
  };

  return (
    <Card variant="default" padding="none" className="overflow-hidden">
      {/* Hero banner */}
      <div className={`relative ${config.bgColor} border-b ${config.borderColor}`}>
        <div className={`absolute top-0 left-0 w-1.5 h-full ${config.accentBg}`} />
        <div className="p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Left: Regime + IHSG */}
            <div className="flex items-start gap-3">
              {isCrisis ? (
                <AlertTriangle className={`w-6 h-6 ${config.textColor} animate-pulse shrink-0 mt-0.5`} />
              ) : (
                <Shield className={`w-6 h-6 ${config.textColor} shrink-0 mt-0.5`} />
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-extrabold uppercase tracking-[0.2em] ${config.textColor} font-sans`}>
                    Mode Pasar
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${config.borderColor} ${config.bgColor} ${config.textColor} font-mono`}>
                    {regimeLabel}
                  </span>
                  {isCrisis && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/20 animate-pulse uppercase tracking-wider">
                      Crash Protection Aktif
                    </span>
                  )}
                </div>
                <p className="text-caption text-zinc-400 font-sans leading-relaxed">{config.desc}</p>

                {/* IHSG + Gold inline */}
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-label font-mono px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/[0.06]">
                    IHSG {MKT.ihsg.value.toLocaleString("id-ID")}
                    <span className={`ml-1 font-bold ${MKT.ihsg.daily >= 0 ? "text-green-400" : "text-rose-400"}`}>
                      {MKT.ihsg.daily >= 0 ? "+" : ""}{MKT.ihsg.daily}%
                    </span>
                  </span>
                  <span className="text-label font-mono px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/[0.06]">
                    USD/IDR Rp{MKT.usdidr.value.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Key stats */}
            <div className="flex items-center gap-5 shrink-0">
              <div className="text-center">
                <span className="text-label uppercase tracking-wider text-white/30 block mb-0.5">Rekomendasi</span>
                <span className={`text-sm font-black ${config.textColor} font-mono`}>{actionLabel}</span>
              </div>
              <div className="text-center">
                <span className="text-label uppercase tracking-wider text-white/30 block mb-0.5">Deploy</span>
                <span className={`text-sm font-black font-mono ${deployPct === 0 ? "text-rose-400" : "text-green-400"}`}>
                  {deployPct}%
                </span>
              </div>
              {portfolioCount > 0 && (
                <div className="text-center">
                  <span className="text-label uppercase tracking-wider text-white/30 block mb-0.5">Portofolio</span>
                  <span className={`text-sm font-black font-mono ${myReturnPercent >= 0 ? "text-green-400" : "text-rose-400"}`}>
                    {myReturnPercent >= 0 ? "+" : ""}{myReturnPercent.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action CTA cards */}
      {links.length > 0 && (
        <div className="p-3 sm:p-4">
          <span className="text-label uppercase tracking-wider text-white/25 block mb-2.5 font-bold">Langkah Selanjutnya</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {links.map((link, i) => {
              const Icon = link.icon;
              const isDisabled = link.disabled;
              return (
                <motion.button
                  key={i}
                  whileHover={isDisabled ? undefined : { scale: 1.01 }}
                  whileTap={isDisabled ? undefined : { scale: 0.98 }}
                  onClick={() => handleActionClick(link)}
                  disabled={isDisabled}
                  aria-label={link.label}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left group ${
                    isDisabled
                      ? "bg-white/[0.01] border-white/[0.03] opacity-40 cursor-not-allowed"
                      : "bg-white/[0.02] border-white/[0.06] hover:border-emerald-500/25 hover:bg-emerald-500/[0.04] cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:ring-offset-1 focus:ring-offset-black"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isDisabled ? "bg-white/[0.02]" : "bg-white/[0.04] group-hover:bg-emerald-500/10"
                  }`}>
                    <Icon className={`w-4 h-4 transition-colors ${isDisabled ? "text-white/20" : "text-white/40 group-hover:text-emerald-400"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`text-caption font-bold block transition-colors ${isDisabled ? "text-white/30" : "text-white/70 group-hover:text-white/90"}`}>{link.label}</span>
                    <span className="text-label text-white/30 block">{link.desc}</span>
                  </div>
                  {isDisabled ? (
                    <span className="text-[9px] text-white/20 font-mono uppercase shrink-0">Segera</span>
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5 text-white/15 group-hover:text-emerald-400 ml-auto shrink-0 transition-colors" />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
