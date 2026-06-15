import { AlertTriangle, Database, Sparkles, Wifi } from "lucide-react";

export type DataSourceKind = "simulated" | "static" | "estimated" | "partial";

interface DataSourceBadgeProps {
  /** Jenis data: simulasi (acak), statis (snapshot), estimasi (turunan), atau parsial (sebagian riil). */
  kind: DataSourceKind;
  /** Data apa yang ditandai. */
  what: string;
  /** Kenapa data ini bukan data riil. */
  why: string;
  /** Cara membuatnya menjadi data riil. */
  solution: string;
  /** Label pendek opsional untuk menimpa teks default badge. */
  label?: string;
  className?: string;
}

const KIND_META: Record<DataSourceKind, { label: string; classes: string; Icon: typeof AlertTriangle }> = {
  simulated: {
    label: "SIMULASI",
    classes: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    Icon: AlertTriangle,
  },
  static: {
    label: "DATA STATIS",
    classes: "text-sky-400 bg-sky-500/10 border-sky-500/20",
    Icon: Database,
  },
  estimated: {
    label: "ESTIMASI",
    classes: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    Icon: Sparkles,
  },
  partial: {
    label: "FEED PARSIAL",
    classes: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    Icon: Wifi,
  },
};

/**
 * Badge transparansi sumber data. Menandai data yang BUKAN data pasar riil
 * (acak / statis / turunan) lalu menjelaskan apa, kenapa, dan solusinya
 * lewat tooltip saat di-hover.
 */
export function DataSourceBadge({ kind, what, why, solution, label, className = "" }: DataSourceBadgeProps) {
  const meta = KIND_META[kind];
  const { Icon } = meta;

  return (
    <span className={`relative inline-flex group/dsb align-middle ${className}`}>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-mono font-bold uppercase tracking-widest cursor-help select-none ${meta.classes}`}
        title={`${what} — ${why} Solusi: ${solution}`}
      >
        <Icon className="w-2.5 h-2.5" />
        {label || meta.label}
      </span>

      <span className="pointer-events-none absolute left-0 top-full mt-2 z-50 w-64 opacity-0 translate-y-1 group-hover/dsb:opacity-100 group-hover/dsb:translate-y-0 transition-all duration-150">
        <span className="block rounded-xl border border-white/10 bg-[#0A0A0A] p-3 shadow-xl shadow-black/50 text-left space-y-1.5">
          <span className="block text-[10px] font-bold text-white/90 font-mono">{what}</span>
          <span className="block text-[10px] leading-relaxed text-white/50">
            <span className="text-white/70 font-semibold">Kenapa: </span>
            {why}
          </span>
          <span className="block text-[10px] leading-relaxed text-emerald-400/90">
            <span className="font-semibold">Solusi: </span>
            {solution}
          </span>
        </span>
      </span>
    </span>
  );
}
