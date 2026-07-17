import { motion } from "motion/react";
import { TrendingDown, TrendingUp, Shield, Banknote, Gem, AlertTriangle, ChevronRight } from "lucide-react";
import { RS, MKT } from "../marketData";
import { isCrashActive } from "../marketRegimeEngine";
import Card from "./Card";

interface MarketRegimeCardProps {
  myReturnPercent: number;
  portfolioCount: number;
}

const regimeConfig: Record<string, {
  label: string;
  desc: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  iconColor: string;
}> = {
  RISK_ON: {
    label: "RISK ON",
    desc: "Pasar dalam fase akumulasi. Alokasi saham aktif.",
    borderColor: "border-green-500/25",
    bgColor: "bg-green-500/[0.06]",
    textColor: "text-green-400",
    iconColor: "text-green-400",
  },
  RISK_OFF: {
    label: "RISK OFF",
    desc: "Pasar dalam fase defensif. Tahan kas atau emas.",
    borderColor: "border-rose-500/25",
    bgColor: "bg-rose-500/[0.06]",
    textColor: "text-rose-400",
    iconColor: "text-rose-400",
  },
  GOLD_DEFENSE: {
    label: "GOLD DEFENSE",
    desc: "Rotasi ke emas direkomendasikan. Kurangi eksposur saham.",
    borderColor: "border-amber-500/25",
    bgColor: "bg-amber-500/[0.06]",
    textColor: "text-amber-400",
    iconColor: "text-amber-400",
  },
  CASH_DEFENSE: {
    label: "CASH DEFENSE",
    desc: "Perlindungan kas aktif. Deploy capital ke minimum.",
    borderColor: "border-orange-500/25",
    bgColor: "bg-orange-500/[0.06]",
    textColor: "text-orange-400",
    iconColor: "text-orange-400",
  },
  RECOVERY_WATCH: {
    label: "RECOVERY WATCH",
    desc: "Pasar dalam pemantauan pemulihan. Siap untuk akumulasi bertahap.",
    borderColor: "border-cyan-500/25",
    bgColor: "bg-cyan-500/[0.06]",
    textColor: "text-cyan-400",
    iconColor: "text-cyan-400",
  },
};

const SAFE_CONFIG = {
  label: "RISK ON",
  desc: "Pasar dalam kondisi normal. Alokasi saham aktif.",
  borderColor: "border-green-500/25",
  bgColor: "bg-green-500/[0.06]",
  textColor: "text-green-400",
  iconColor: "text-green-400",
};

function getRegimeKey(): string {
  const isCrisis = isCrashActive();
  if (isCrisis) return "RISK_OFF";
  if (RS.status === "SAFE") return "RISK_ON";
  if (RS.status === "WARNING") return "GOLD_DEFENSE";
  return "CASH_DEFENSE";
}

const actionLinks: Record<string, { label: string; icon: typeof Shield; desc: string }[]> = {
  RISK_OFF: [
    { label: "Lihat Alasan Risk Off", icon: AlertTriangle, desc: "Detail komponen penilaian" },
    { label: "Simulasikan Rotasi ke Emas", icon: Gem, desc: "Alokasi ke safe haven" },
    { label: "Cek Portofolio Terdampak", icon: TrendingDown, desc: "Analisis posisi saat ini" },
    { label: "Buka Saham Defensif", icon: Shield, desc: "Saham defensif unggulan" },
  ],
  GOLD_DEFENSE: [
    { label: "Lihat Rekomendasi Emas", icon: Gem, desc: "Alokasi ke emas" },
    { label: "Cek Portofolio Terdampak", icon: TrendingDown, desc: "Posisi saham" },
  ],
  CASH_DEFENSE: [
    { label: "Lihat Kondisi Pasar", icon: AlertTriangle, desc: "Evaluasi pasar" },
    { label: "Cek Portofolio", icon: Banknote, desc: "Evaluasi kas" },
  ],
  RISK_ON: [
    { label: "Lihat Peluang Akumulasi", icon: TrendingUp, desc: "Saham potensial" },
    { label: "Cek Rekomendasi Beli", icon: ChevronRight, desc: "Sinyal beli" },
  ],
  RECOVERY_WATCH: [
    { label: "Lihat Progres Pemulihan", icon: TrendingUp, desc: "Indikator pemulihan" },
    { label: "Cek Saham Defensif", icon: Shield, desc: "Saham aman" },
  ],
};

export function MarketRegimeCard({ myReturnPercent, portfolioCount }: MarketRegimeCardProps) {
  const isCrisis = isCrashActive();
  const regimeKey = getRegimeKey();
  const config = isCrisis ? (regimeConfig.RISK_OFF) : (regimeConfig[regimeKey] || SAFE_CONFIG);
  const regimeLabel = isCrisis ? "RISK OFF" : RS.status === "SAFE" ? "RISK ON" : RS.status;
  const deployPct = isCrisis ? 0 : RS.capital_deployment;
  const actionLabel = isCrisis ? "Tahan Kas" : RS.action === "ACCUMULATE" ? "Akumulasi" : RS.action === "WAIT" ? "Tunggu" : RS.action;
  const links = actionLinks[regimeKey] || actionLinks.RISK_ON;

  return (
    <Card variant="default" padding="none" className="overflow-hidden">
      {/* Dominant regime banner */}
      <div className={`relative ${config.bgColor} border-b ${config.borderColor}`}>
        <div className={`absolute top-0 left-0 w-1.5 h-full ${config.textColor === "text-rose-400" ? "bg-rose-500" : config.textColor === "text-amber-400" ? "bg-amber-500" : config.textColor === "text-orange-400" ? "bg-orange-500" : "bg-green-500"}`} />
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isCrisis ? (
                <AlertTriangle className={`w-6 h-6 ${config.iconColor} animate-pulse`} />
              ) : (
                <Shield className={`w-6 h-6 ${config.iconColor}`} />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-extrabold uppercase tracking-[0.2em] ${config.textColor} font-sans`}>
                    Mode Pasar
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${config.borderColor} ${config.bgColor} ${config.textColor} font-mono`}>
                    {regimeLabel}
                  </span>
                </div>
                <p className="text-caption text-zinc-400 mt-1 max-w-xl font-sans">{config.desc}</p>
              </div>
            </div>

            {/* Quick stats right side */}
            <div className="hidden sm:flex items-center gap-4">
              <div className="text-right">
                <span className="text-label uppercase tracking-wider text-white/30 block">Rekomendasi</span>
                <span className={`text-xs font-bold ${config.textColor} font-mono`}>{actionLabel}</span>
              </div>
              <div className="text-right">
                <span className="text-label uppercase tracking-wider text-white/30 block">Alokasi Saham</span>
                <span className={`text-xs font-bold font-mono ${deployPct === 0 ? "text-rose-400" : "text-white/80"}`}>
                  {deployPct}%
                </span>
              </div>
              {portfolioCount > 0 && (
                <div className="text-right">
                  <span className="text-label uppercase tracking-wider text-white/30 block">Portofolio</span>
                  <span className={`text-xs font-bold font-mono ${myReturnPercent >= 0 ? "text-green-400" : "text-rose-400"}`}>
                    {myReturnPercent >= 0 ? "+" : ""}{myReturnPercent.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* IHSG + USD quick */}
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <span className="text-label font-mono px-2 py-0.5 rounded bg-white/5 text-white/50 border border-white/[0.06]">
              IHSG {MKT.ihsg.value.toLocaleString("id-ID")}
              <span className={`ml-1 ${MKT.ihsg.daily >= 0 ? "text-green-400" : "text-rose-400"}`}>
                {MKT.ihsg.daily >= 0 ? "+" : ""}{MKT.ihsg.daily}%
              </span>
            </span>
            <span className="text-label font-mono px-2 py-0.5 rounded bg-white/5 text-white/50 border border-white/[0.06]">
              USD/IDR Rp{MKT.usdidr.value.toLocaleString("id-ID")}
            </span>
            {isCrisis && (
              <span className="text-label font-mono px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 border border-rose-500/20 animate-pulse">
                CRASH PROTECTION AKTIF
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action CTA links */}
      {links.length > 0 && (
        <div className="p-3 sm:p-4">
          <span className="text-label uppercase tracking-wider text-white/25 block mb-2">Langkah Selanjutnya</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {links.map((link, i) => {
              const Icon = link.icon;
              return (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-emerald-500/20 hover:bg-white/[0.04] transition-all text-left group cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0 group-hover:bg-emerald-500/10 transition-colors">
                    <Icon className="w-4 h-4 text-white/40 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-caption font-bold text-white/70 block group-hover:text-white/90 transition-colors">{link.label}</span>
                    <span className="text-label text-white/30 block">{link.desc}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-white/20 group-hover:text-emerald-400 ml-auto shrink-0 transition-colors" />
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
