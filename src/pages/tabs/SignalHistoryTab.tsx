import { useState, useEffect, useMemo } from "react";
import { api } from "../../services/api";
import { SignalBadge } from "../../components/SignalBadge";
import { ScoreBreakdown } from "../../components/ScoreBreakdown";
import type { StockData } from "../../types";

interface SignalHistoryTabProps {
  stock: StockData;
}

interface SignalEntry {
  ticker: string;
  date: string;
  signal_tier: number;
  signal_label: string;
  signal_reason: string;
}

interface SignalsResponse {
  success: boolean;
  ticker: string;
  signals: SignalEntry[];
  latestDate: string | null;
}

// Also fetch scores for breakdown
interface ScoreData {
  quality: number;
  growth: number;
  value: number;
  momentum: number;
  dividend: number;
}

interface FundamentalsResponse {
  success: boolean;
  data: Record<string, {
    quality_score: number;
    growth_score: number;
    value_score: number;
    momentum_score: number;
    dividend_score: number;
  }>;
}

export function SignalHistoryTab({ stock }: SignalHistoryTabProps) {
  const [signals, setSignals] = useState<SignalEntry[]>([]);
  const [scores, setScores] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    Promise.all([
      api.get<SignalsResponse>(`/api/stocks/signals?ticker=${stock.ticker}`),
      api.get<FundamentalsResponse>("/api/stocks/fundamentals"),
    ])
      .then(([sigRes, fundRes]) => {
        if (cancelled) return;
        setSignals(sigRes.signals || []);

        if (fundRes.success && fundRes.data) {
          const d = fundRes.data[stock.ticker];
          if (d) {
            setScores({
              quality: d.quality_score ?? 50,
              growth: d.growth_score ?? 50,
              value: d.value_score ?? 50,
              momentum: d.momentum_score ?? 50,
              dividend: d.dividend_score ?? 50,
            });
          }
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setError(true);
        }
      });

    return () => { cancelled = true; };
  }, [stock.ticker]);

  const current = signals[0] || null;
  const history = signals.slice(1);

  const dominantFactor = useMemo(() => {
    if (!scores) return null;
    const factors = [
      { label: "Quality", value: scores.quality },
      { label: "Growth", value: scores.growth },
      { label: "Value", value: scores.value },
      { label: "Momentum", value: scores.momentum },
    ];
    const sorted = [...factors].sort((a, b) => b.value - a.value);
    return { strongest: sorted[0], weakest: sorted[sorted.length - 1] };
  }, [scores]);

  if (loading) {
    return (
      <div className="border border-white/[0.06] rounded-lg p-4">
        <div className="text-center py-12">
          <div className="w-6 h-6 mx-auto mb-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Memuat sinyal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-white/[0.06] rounded-lg p-4">
        <div className="text-center py-12">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.04] flex items-center justify-center">
            <span className="text-white/20 text-lg font-mono">S</span>
          </div>
          <p className="text-white/40 text-sm">
            Data sinyal tidak tersedia untuk{" "}
            <span className="font-mono text-white/60">{stock.ticker}</span>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {current && (
        <div className="border border-white/[0.06] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-caption text-white/35 uppercase tracking-wider font-medium">Sinyal Hari Ini</span>
            <span className="text-[10px] text-white/20 font-mono">
              Data per {new Date(current.date).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <SignalBadge tier={current.signal_tier} label={current.signal_label} />
            <span className="text-xs text-white/40">{current.signal_reason}</span>
          </div>

          {scores && (
            <div className="mb-4">
              <span className="text-label text-white/30 block mb-2">Breakdown Skor</span>
              <ScoreBreakdown
                quality={scores.quality}
                growth={scores.growth}
                value={scores.value}
                momentum={scores.momentum}
                dividend={scores.dividend}
              />
            </div>
          )}

          {dominantFactor && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="border border-white/[0.06] rounded-lg p-3">
                <span className="text-[10px] text-white/30 block uppercase tracking-wider">Faktor Terkuat</span>
                <span className="text-emerald-400 font-semibold">{dominantFactor.strongest.label}</span>
                <span className="text-white/40 ml-1">({Math.round(dominantFactor.strongest.value)})</span>
              </div>
              <div className="border border-white/[0.06] rounded-lg p-3">
                <span className="text-[10px] text-white/30 block uppercase tracking-wider">Faktor Terlemah</span>
                <span className="text-rose-400 font-semibold">{dominantFactor.weakest.label}</span>
                <span className="text-white/40 ml-1">({Math.round(dominantFactor.weakest.value)})</span>
              </div>
            </div>
          )}
        </div>
      )}

      {!current && scores && (
        <div className="border border-white/[0.06] rounded-lg p-4">
          <span className="text-caption text-white/35 uppercase tracking-wider font-medium">Skor Terkini</span>
          {scores && (
            <div className="mt-3">
              <ScoreBreakdown
                quality={scores.quality}
                growth={scores.growth}
                value={scores.value}
                momentum={scores.momentum}
                dividend={scores.dividend}
              />
            </div>
          )}
        </div>
      )}

      {!current && !scores && (
        <div className="border border-white/[0.06] rounded-lg p-4">
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.04] flex items-center justify-center">
              <span className="text-white/20 text-lg font-mono">S</span>
            </div>
            <p className="text-white/40 text-sm">
              Belum ada data sinyal untuk{" "}
              <span className="font-mono text-white/60">{stock.ticker}</span>.
              Pipeline harian perlu berjalan untuk menghasilkan sinyal.
            </p>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="border border-white/[0.06] rounded-lg p-4">
          <span className="text-caption text-white/35 uppercase tracking-wider font-medium mb-3 block">
            Riwayat Sinyal ({history.length})
          </span>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={`${h.date}-${i}`} className="flex items-center gap-3 text-sm border-b border-white/[0.03] pb-2 last:border-0">
                <span className="font-mono text-[11px] text-white/30 w-24 shrink-0">
                  {new Date(h.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <SignalBadge tier={h.signal_tier} label={h.signal_label} />
                <span className="text-white/40 text-xs truncate">{h.signal_reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
