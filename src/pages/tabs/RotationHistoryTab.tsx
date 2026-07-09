import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { RotationBadge } from "../../components/RotationBadge";
import type { StockData } from "../../types";

interface RotationHistoryTabProps {
  stock: StockData;
}

interface RotationEntry {
  ticker: string;
  date: string;
  sector: string;
  industry: string;
  rotation_label: string;
  rotation_status: string;
  quality_score: number;
  growth_score: number;
  momentum_score: number;
}

interface RotationResponse {
  success: boolean;
  ticker: string;
  current: RotationEntry | null;
  history: RotationEntry[];
  latestDate: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  up: "bg-emerald-500/10 border-emerald-500/20",
  stable: "bg-yellow-500/10 border-yellow-500/20",
  down: "bg-rose-500/10 border-rose-500/20",
};

export function RotationHistoryTab({ stock }: RotationHistoryTabProps) {
  const [data, setData] = useState<RotationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    api.get<RotationResponse>(`/api/stocks/rotation?ticker=${stock.ticker}`)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setError(true);
        }
      });
    return () => { cancelled = true; };
  }, [stock.ticker]);

  if (loading) {
    return (
      <div className="border border-white/[0.06] rounded-lg p-4">
        <div className="text-center py-12">
          <div className="w-6 h-6 mx-auto mb-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Memuat data rotasi...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="border border-white/[0.06] rounded-lg p-4">
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.04] flex items-center justify-center">
            <span className="text-white/20 text-lg font-mono">R</span>
          </div>
          <p className="text-white/40 text-sm">
            Data rotasi tidak tersedia untuk{" "}
            <span className="font-mono text-white/60">{stock.ticker}</span>.
          </p>
        </div>
      </div>
    );
  }

  const current = data.current;
  const history = data.history || [];

  return (
    <div className="space-y-5">
      {current && (
        <div className="border border-white/[0.06] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-caption text-white/35 uppercase tracking-wider font-medium">Status Rotasi</span>
            {current.date && (
              <span className="text-[10px] text-white/20 font-mono">
                Data per {new Date(current.date).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mb-4">
            <RotationBadge label={current.rotation_label} status={current.rotation_status} />
            <span className="text-xs text-white/40">{current.sector}{current.industry ? ` \u00B7 ${current.industry}` : ""}</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className={`border rounded-lg p-3 ${STATUS_COLORS[current.rotation_status] || "border-white/[0.06]"}`}>
              <span className="text-[10px] text-white/30 block uppercase tracking-wider">Status</span>
              <span className="text-sm font-semibold text-white capitalize">{current.rotation_status === "up" ? "Menguat" : current.rotation_status === "down" ? "Melemah" : "Stabil"}</span>
            </div>
            <div className="border border-white/[0.06] rounded-lg p-3">
              <span className="text-[10px] text-white/30 block uppercase tracking-wider">Quality</span>
              <span className={`text-sm font-mono font-semibold ${current.quality_score >= 70 ? "text-emerald-400" : current.quality_score >= 50 ? "text-yellow-400" : "text-rose-400"}`}>
                {Math.round(current.quality_score)}
              </span>
            </div>
            <div className="border border-white/[0.06] rounded-lg p-3">
              <span className="text-[10px] text-white/30 block uppercase tracking-wider">Momentum</span>
              <span className={`text-sm font-mono font-semibold ${current.momentum_score >= 70 ? "text-emerald-400" : current.momentum_score >= 50 ? "text-yellow-400" : "text-rose-400"}`}>
                {Math.round(current.momentum_score)}
              </span>
            </div>
          </div>
        </div>
      )}

      {history.length > 1 && (
        <div className="border border-white/[0.06] rounded-lg p-4">
          <span className="text-caption text-white/35 uppercase tracking-wider font-medium mb-3 block">
            Riwayat Rotasi ({history.length})
          </span>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={`${h.date}-${i}`} className="flex items-center gap-3 text-sm border-b border-white/[0.03] pb-2 last:border-0">
                <span className="font-mono text-[11px] text-white/30 w-24 shrink-0">
                  {new Date(h.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <RotationBadge label={h.rotation_label} status={h.rotation_status} />
                <span className="text-[11px] text-white/30 font-mono">
                  Q:{Math.round(h.quality_score)} G:{Math.round(h.growth_score)} M:{Math.round(h.momentum_score)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!current && (
        <div className="border border-white/[0.06] rounded-lg p-4">
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.04] flex items-center justify-center">
              <span className="text-white/20 text-lg font-mono">R</span>
            </div>
            <p className="text-white/40 text-sm">
              Belum ada data rotasi untuk{" "}
              <span className="font-mono text-white/60">{stock.ticker}</span>.
              Pipeline harian perlu berjalan untuk menghasilkan data rotasi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
