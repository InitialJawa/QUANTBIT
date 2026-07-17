import { useState, useEffect, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { api } from "../../services/api";
import { SignalBadge } from "../../components/SignalBadge";
import { ScoreBreakdown } from "../../components/ScoreBreakdown";
import { isCrashActive } from "../../marketRegimeEngine";
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

function getConfidenceScore(scores: ScoreData): number {
  const vals = [scores.quality, scores.growth, scores.value, scores.momentum, scores.dividend].filter(v => v > 0);
  if (!vals.length) return 0;
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / vals.length;
  const stdDev = Math.sqrt(variance);
  const avgScore = Math.round(avg);
  const consistency = Math.max(0, 100 - stdDev);
  return Math.round(avgScore * 0.6 + consistency * 0.4);
}

function getConfidenceLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: "Tinggi", color: "text-emerald-400" };
  if (score >= 50) return { label: "Sedang", color: "text-yellow-400" };
  if (score >= 25) return { label: "Rendah", color: "text-orange-400" };
  return { label: "Sangat Rendah", color: "text-rose-400" };
}

function getSignalTierLabel(tier: number): string {
  if (tier >= 3) return "Sinyal Kuat";
  if (tier >= 2) return "Sinyal Sedang";
  if (tier >= 1) return "Sinyal Lemah";
  return "Tidak Ada Sinyal";
}

function getSignalTierColor(tier: number): string {
  if (tier >= 3) return "text-emerald-400";
  if (tier >= 2) return "text-yellow-400";
  if (tier >= 1) return "text-white/50";
  return "text-white/30";
}

export function SignalHistoryTab({ stock }: SignalHistoryTabProps) {
  const [signals, setSignals] = useState<SignalEntry[]>([]);
  const [scores, setScores] = useState<ScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const isRiskOff = isCrashActive();

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
      { label: "Kualitas", value: scores.quality },
      { label: "Pertumbuhan", value: scores.growth },
      { label: "Nilai", value: scores.value },
      { label: "Momentum", value: scores.momentum },
    ];
    const sorted = [...factors].sort((a, b) => b.value - a.value);
    return { strongest: sorted[0], weakest: sorted[sorted.length - 1] };
  }, [scores]);

  const confidence = useMemo(() => scores ? getConfidenceScore(scores) : null, [scores]);
  const confidenceLabel = useMemo(() => confidence !== null ? getConfidenceLabel(confidence) : null, [confidence]);

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
    <div className="space-y-4">
      {/* Risk-Off Warning */}
      {isRiskOff && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <p className="text-caption text-rose-400/80">
            Risk Off aktif — sinyal beli saat ini perlu dikonfirmasi lebih lanjut. Utamakan perlindungan modal.
          </p>
        </div>
      )}

      {/* Current Signal + Score */}
      {current && (
        <div className="border border-white/[0.06] rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-caption text-white/35 uppercase tracking-wider font-bold">Sinyal Hari Ini</span>
            <span className="text-[10px] text-white/20 font-mono">
              {new Date(current.date).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <SignalBadge tier={current.signal_tier} label={current.signal_label} />
          </div>

          {/* Signal Reason */}
          <p className="text-sm text-white/50 mb-4 leading-relaxed">{current.signal_reason}</p>

          {/* Confidence Score */}
          {confidence !== null && confidenceLabel && (
            <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04] mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/30 uppercase tracking-wider">Skor Kepercayaan</span>
                <span className={`text-sm font-mono font-bold ${confidenceLabel.color}`}>{confidence}/100 — {confidenceLabel.label}</span>
              </div>
              <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-emerald-500/50 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, confidence)}%` }}
                />
              </div>
              <p className="text-[10px] text-white/25 mt-1.5">
                Konsistensi skor + kekuatan gabungan komponen fundamental
              </p>
            </div>
          )}

          {/* Score Breakdown */}
          {scores && (
            <div className="mb-4">
              <span className="text-label text-white/30 block mb-2">Breakdown Skor Fundamental</span>
              <ScoreBreakdown
                quality={scores.quality}
                growth={scores.growth}
                value={scores.value}
                momentum={scores.momentum}
                dividend={scores.dividend}
              />
            </div>
          )}

          {/* Dominant Factors */}
          {dominantFactor && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="border border-white/[0.06] rounded-lg p-3">
                <span className="text-[10px] text-white/30 block uppercase tracking-wider">Faktor Terkuat</span>
                <span className="text-emerald-400 font-semibold mt-1 block">{dominantFactor.strongest.label}</span>
                <span className="text-white/40 font-mono text-xs">({Math.round(dominantFactor.strongest.value)})</span>
              </div>
              <div className="border border-white/[0.06] rounded-lg p-3">
                <span className="text-[10px] text-white/30 block uppercase tracking-wider">Faktor Terlemah</span>
                <span className="text-rose-400 font-semibold mt-1 block">{dominantFactor.weakest.label}</span>
                <span className="text-white/40 font-mono text-xs">({Math.round(dominantFactor.weakest.value)})</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Score-only (no signal) */}
      {!current && scores && (
        <div className="border border-white/[0.06] rounded-lg p-4">
          <span className="text-caption text-white/35 uppercase tracking-wider font-bold">Skor Fundamental Saat Ini</span>
          <div className="mt-3">
            <ScoreBreakdown
              quality={scores.quality}
              growth={scores.growth}
              value={scores.value}
              momentum={scores.momentum}
              dividend={scores.dividend}
            />
          </div>
          {confidence !== null && confidenceLabel && (
            <div className="mt-3 p-2 bg-white/[0.02] rounded-lg">
              <span className="text-[10px] text-white/30 uppercase tracking-wider">Kepercayaan</span>
              <span className={`ml-2 text-xs font-mono font-bold ${confidenceLabel.color}`}>{confidence}/100 — {confidenceLabel.label}</span>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!current && !scores && (
        <div className="border border-white/[0.06] rounded-lg p-4">
          <div className="text-center py-12">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.04] flex items-center justify-center">
              <span className="text-white/20 text-lg font-mono">S</span>
            </div>
            <p className="text-white/40 text-sm">
              Belum ada data sinyal untuk{" "}
              <span className="font-mono text-white/60">{stock.ticker}</span>.
            </p>
            <p className="text-white/25 text-caption mt-1">Pipeline harian perlu berjalan untuk menghasilkan sinyal.</p>
          </div>
        </div>
      )}

      {/* Signal History */}
      {history.length > 0 && (
        <div className="border border-white/[0.06] rounded-lg p-4">
          <span className="text-caption text-white/35 uppercase tracking-wider font-bold mb-3 block">
            Riwayat Sinyal ({history.length})
          </span>
          <div className="space-y-2">
            {history.map((h, i) => {
              const tierLabel = getSignalTierLabel(h.signal_tier);
              return (
                <div key={`${h.date}-${i}`} className="flex items-center gap-3 text-sm border-b border-white/[0.03] pb-2 last:border-0">
                  <span className="font-mono text-[11px] text-white/30 w-24 shrink-0">
                    {new Date(h.date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <SignalBadge tier={h.signal_tier} label={h.signal_label} />
                  <span className={`text-[10px] font-mono font-bold ${getSignalTierColor(h.signal_tier)} hidden sm:inline`}>
                    {tierLabel}
                  </span>
                  <span className="text-white/40 text-xs truncate">{h.signal_reason}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
