import { useState, useEffect, useMemo } from "react";
import { api } from "../../services/api";
import { STOCKS_DATA } from "../../stocksData";
import { assessTickerDataQuality, getDataQualityColor } from "../../utils/tickerDataQuality";
import type { StockData } from "../../types";

interface PeerComparisonTabProps {
  stock: StockData;
  getDynamicStock: (ticker: string) => StockData | undefined;
}

interface PeerData {
  rank: number;
  ticker: string;
  name: string;
  quality: number;
  growth: number;
  value: number;
  momentum: number;
  dividend: number;
  totalScore: number;
}

interface PeerResponse {
  success: boolean;
  sector: string;
  scoreDate: string;
  peers: PeerData[];
  sectorAverages: PeerData | null;
  currentRank: number | null;
  currentPeer: PeerData | null;
}

const COMPARE_METRICS = [
  { key: "peRatio" as const, label: "P/E", fmt: (v: number) => v < 0 ? "Loss" : v.toFixed(1) },
  { key: "pbRatio" as const, label: "P/B", fmt: (v: number) => v.toFixed(1) },
  { key: "roe" as const, label: "ROE", fmt: (v: number) => v.toFixed(1) },
  { key: "dividendYield" as const, label: "D.Yield", fmt: (v: number) => v.toFixed(2) },
  { key: "der" as const, label: "D/E", fmt: (v: number) => v.toFixed(1) },
];

function fmtScore(v: number): string {
  return Math.round(v).toString();
}

function ScoreCell({ v, isSelf, isAvg }: { v: number; isSelf: boolean; isAvg: boolean }) {
  const color = v >= 70 ? "text-emerald-400" : v >= 50 ? "text-yellow-400" : "text-rose-400";
  return (
    <td className={`p-3 font-mono whitespace-nowrap ${isSelf ? "text-emerald-400" : isAvg ? "text-white" : color}`}>
      {Math.round(v)}
    </td>
  );
}

export function PeerComparisonTab({ stock, getDynamicStock }: PeerComparisonTabProps) {
  const [data, setData] = useState<PeerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    api.get<PeerResponse>(`/api/stocks/peers?ticker=${stock.ticker}`)
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

  const peers = useMemo(() => {
    if (!data?.peers) return [];
    return data.peers.map((p) => ({
      ...p,
      dyn: getDynamicStock(p.ticker) ?? STOCKS_DATA.find((s) => s.ticker === p.ticker),
    }));
  }, [data, getDynamicStock]);

  const sectorSummary = useMemo(() => {
    if (!peers.length) return null;
    const total = peers.length;
    const avgScore = peers.reduce((s, p) => s + p.totalScore, 0) / total;
    const top3 = peers.slice(0, 3).map(p => p.ticker);
    const selfRank = peers.find(p => p.ticker === stock.ticker)?.rank ?? null;
    return { total, avgScore: Math.round(avgScore), top3, selfRank };
  }, [peers, stock.ticker]);

  if (loading) {
    return (
      <div className="border border-white/[0.06] rounded-lg p-4">
        <div className="text-center py-12">
          <div className="w-6 h-6 mx-auto mb-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Memuat data peer...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.success || !data.peers.length) {
    return (
      <div className="border border-white/[0.06] rounded-lg p-4">
        <div className="text-center py-12">
          <p className="text-white/40 text-sm">
            Data peer sektor tidak tersedia untuk{" "}
            <span className="font-mono text-white/60">{stock.ticker}</span>.
          </p>
        </div>
      </div>
    );
  }

  const avgs = data.sectorAverages;
  const scoreDate = data.scoreDate;

  return (
    <div className="space-y-3">
      {/* Sector Summary */}
      {sectorSummary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="border border-white/[0.06] rounded-lg p-3 text-center">
            <span className="text-[10px] text-white/30 block uppercase">Emiten Sektor</span>
            <span className="text-sm font-bold text-white font-mono mt-1 block">{sectorSummary.total}</span>
          </div>
          <div className="border border-white/[0.06] rounded-lg p-3 text-center">
            <span className="text-[10px] text-white/30 block uppercase">Rata-rata Skor</span>
            <span className={`text-sm font-bold font-mono mt-1 block ${sectorSummary.avgScore >= 70 ? "text-emerald-400" : sectorSummary.avgScore >= 50 ? "text-yellow-400" : "text-rose-400"}`}>
              {sectorSummary.avgScore}
            </span>
          </div>
          <div className="border border-white/[0.06] rounded-lg p-3 text-center">
            <span className="text-[10px] text-white/30 block uppercase">Peringkat {stock.ticker}</span>
            <span className={`text-sm font-bold font-mono mt-1 block ${sectorSummary.selfRank && sectorSummary.selfRank <= 3 ? "text-emerald-400" : "text-white"}`}>
              {sectorSummary.selfRank ? `#${sectorSummary.selfRank}` : "—"}
            </span>
          </div>
          <div className="border border-white/[0.06] rounded-lg p-3 text-center">
            <span className="text-[10px] text-white/30 block uppercase">Top 3</span>
            <span className="text-sm font-mono mt-1 block">
              {sectorSummary.top3.map(t => (
                <span key={t} className={`mr-1 ${t === stock.ticker ? "text-emerald-400 font-bold" : "text-white/60"}`}>{t}</span>
              ))}
            </span>
          </div>
        </div>
      )}

      {/* Sector Header */}
      <div className="flex items-center justify-between">
        <span className="text-caption text-white/35 uppercase tracking-wider font-medium">
          Sektor: {data.sector} ({data.peers.length} emiten)
        </span>
        {scoreDate && (
          <span className="text-[10px] text-white/20 font-mono">
            Data per {new Date(scoreDate).toLocaleDateString("id-ID", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </span>
        )}
      </div>

      {/* Peer Table — scrollable */}
      <div className="overflow-x-auto border border-white/[0.06] rounded-lg">
        <table className="w-full text-left text-body min-w-[800px]">
          <thead>
            <tr className="border-b border-white/[0.04] text-white/25 text-label tracking-wide uppercase">
              <th className="p-3 font-medium sticky left-0 bg-[#0a0a0f] z-10 min-w-[36px]">#</th>
              <th className="p-3 font-medium sticky left-[36px] bg-[#0a0a0f] z-10 min-w-[90px]">Ticker</th>
              <th className="p-3 font-medium min-w-[60px]">Data</th>
              <th className="p-3 font-medium min-w-[60px]">Price</th>
              <th className="p-3 font-medium min-w-[56px]">Quality</th>
              <th className="p-3 font-medium min-w-[56px]">Growth</th>
              <th className="p-3 font-medium min-w-[56px]">Value</th>
              <th className="p-3 font-medium min-w-[60px]">Momentum</th>
              <th className="p-3 font-medium min-w-[50px]">Score</th>
              {COMPARE_METRICS.map(m => (
                <th key={m.key} className="p-3 font-medium whitespace-nowrap min-w-[56px]">{m.label}</th>
              ))}
              <th className="p-3 font-medium whitespace-nowrap min-w-[72px]">M.Cap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {avgs && (
              <tr className="bg-white/[0.03] border-b border-white/[0.06]">
                <td className="p-3 font-mono text-[10px] text-white/30 sticky left-0 bg-[#0a0a0f]/95 z-10">-</td>
                <td className="p-3 font-medium text-white/60 sticky left-[36px] bg-[#0a0a0f]/95 z-10">Rata-rata</td>
                <td className="p-3 font-mono text-[10px] text-white/30">—</td>
                <td className="p-3 font-mono text-white/50">-</td>
                <ScoreCell v={avgs.quality} isSelf={false} isAvg />
                <ScoreCell v={avgs.growth} isSelf={false} isAvg />
                <ScoreCell v={avgs.value} isSelf={false} isAvg />
                <ScoreCell v={avgs.momentum} isSelf={false} isAvg />
                <td className="p-3 font-mono text-white font-bold">{fmtScore(avgs.totalScore)}</td>
                {COMPARE_METRICS.map(m => (
                  <td key={m.key} className="p-3 font-mono text-white/50">-</td>
                ))}
                <td className="p-3 font-mono text-white/50">-</td>
              </tr>
            )}
            {peers.map((s) => {
              const isSelf = s.ticker === stock.ticker;
              const dynStock = s.dyn;
              const dq = dynStock ? assessTickerDataQuality(dynStock) : null;
              return (
                <tr key={s.ticker} className={`hover:bg-white/[0.02] ${isSelf ? "bg-emerald-600/5" : ""}`}>
                  <td className={`p-3 font-mono text-[11px] whitespace-nowrap sticky left-0 bg-[#0a0a0f] z-10 ${isSelf ? "text-emerald-500" : "text-white/30"}`}>
                    {s.rank}
                  </td>
                  <td className={`p-3 font-mono font-medium whitespace-nowrap sticky left-[36px] bg-[#0a0a0f] z-10 ${isSelf ? "text-emerald-500" : "text-white/80"}`}>
                    {s.ticker}
                    {isSelf && <span className="ml-2 text-[10px] text-emerald-500/60">← ini</span>}
                  </td>
                  <td className="p-3 text-[10px] font-mono">
                    {dq ? (
                      <span className={`px-1.5 py-0.5 rounded border ${getDataQualityColor(dq.status)}`}>
                        {dq.label}
                      </span>
                    ) : (
                      <span className="text-white/20">—</span>
                    )}
                  </td>
                  <td className="p-3 font-mono text-white/70 whitespace-nowrap">
                    {s.dyn ? `Rp${s.dyn.currentPrice.toLocaleString("id-ID")}` : "-"}
                  </td>
                  <ScoreCell v={s.quality} isSelf={isSelf} isAvg={false} />
                  <ScoreCell v={s.growth} isSelf={isSelf} isAvg={false} />
                  <ScoreCell v={s.value} isSelf={isSelf} isAvg={false} />
                  <ScoreCell v={s.momentum} isSelf={isSelf} isAvg={false} />
                  <td className={`p-3 font-mono font-bold whitespace-nowrap ${isSelf ? "text-emerald-400" : "text-white/80"}`}>
                    {s.totalScore}
                  </td>
                  {COMPARE_METRICS.map(m => (
                    <td key={m.key} className={`p-3 font-mono whitespace-nowrap ${isSelf ? "text-emerald-400" : "text-white/60"}`}>
                      {s.dyn ? m.fmt(s.dyn[m.key]) : "-"}
                    </td>
                  ))}
                  <td className="p-3 font-mono text-white/60 whitespace-nowrap">
                    {s.dyn ? `Rp${s.dyn.marketCap.toLocaleString("id-ID")}T` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
