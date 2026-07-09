import { useState, useEffect, useMemo } from "react";
import { api } from "../../services/api";
import { STOCKS_DATA } from "../../stocksData";
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

      <div className="overflow-x-auto border border-white/[0.06] rounded-lg">
        <table className="w-full text-left text-body">
          <thead>
            <tr className="border-b border-white/[0.04] text-white/25 text-label tracking-wide uppercase">
              <th className="p-3 font-medium sticky left-0 bg-[#0a0a0f] z-10">#</th>
              <th className="p-3 font-medium sticky left-0 bg-[#0a0a0f] z-10">Ticker</th>
              <th className="p-3 font-medium">Price</th>
              <th className="p-3 font-medium">Quality</th>
              <th className="p-3 font-medium">Growth</th>
              <th className="p-3 font-medium">Value</th>
              <th className="p-3 font-medium">Momentum</th>
              <th className="p-3 font-medium">Score</th>
              {COMPARE_METRICS.map(m => (
                <th key={m.key} className="p-3 font-medium whitespace-nowrap">{m.label}</th>
              ))}
              <th className="p-3 font-medium whitespace-nowrap">M.Cap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {avgs && (
              <tr className="bg-white/[0.03] border-b border-white/[0.06]">
                <td className="p-3 font-mono text-[10px] text-white/30 sticky left-0 bg-[#0a0a0f]/95 z-10">-</td>
                <td className="p-3 font-medium text-white/60 sticky left-0 bg-[#0a0a0f]/95 z-10">Rata-rata Sektor</td>
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
              return (
                <tr key={s.ticker} className={`hover:bg-white/[0.02] ${isSelf ? "bg-emerald-600/5" : ""}`}>
                  <td className={`p-3 font-mono text-[11px] whitespace-nowrap sticky left-0 bg-[#0a0a0f] z-10 ${isSelf ? "text-emerald-500" : "text-white/30"}`}>
                    {s.rank}
                  </td>
                  <td className={`p-3 font-mono font-medium whitespace-nowrap sticky left-0 bg-[#0a0a0f] z-10 ${isSelf ? "text-emerald-500" : "text-white/80"}`}>
                    {s.ticker}
                    {isSelf && <span className="ml-2 text-[10px] text-emerald-500/60">← this</span>}
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
