import { useMemo } from "react";
import { RS, MKT } from "../marketData";
import { isCrashActive } from "../marketRegimeEngine";
import Card from "./Card";

interface MarketMetricsDashboardProps {
  rsiIHSG: number | null;
  macdResult: { macd: number; histogram: number; signal: number } | null;
  ihsgCloses: number[];
  breadth: { advancers: number; decliners: number; total: number };
}

interface MetricItem {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

export function MarketMetricsDashboard({ rsiIHSG, macdResult, ihsgCloses, breadth }: MarketMetricsDashboardProps) {
  const isCrisis = isCrashActive();

  const sma20 = useMemo(() => {
    if (ihsgCloses.length > 20) return (ihsgCloses.slice(-20).reduce((s, v) => s + v, 0) / 20).toFixed(0);
    return "--";
  }, [ihsgCloses]);

  const sma50 = useMemo(() => {
    if (ihsgCloses.length > 50) return (ihsgCloses.slice(-50).reduce((s, v) => s + v, 0) / 50).toFixed(0);
    return "--";
  }, [ihsgCloses]);

  const rsiLabel = rsiIHSG !== null
    ? rsiIHSG >= 70 ? "Overbought" : rsiIHSG <= 30 ? "Oversold" : "Netral"
    : "--";
  const rsiColor = rsiIHSG !== null
    ? rsiIHSG >= 70 ? "text-rose-400" : rsiIHSG <= 30 ? "text-green-400" : "text-white/80"
    : "text-white/30";

  const macdLabel = macdResult !== null
    ? macdResult.histogram >= 0 ? "Bullish" : "Bearish"
    : "--";
  const macdColor = macdResult !== null
    ? macdResult.histogram >= 0 ? "text-green-400" : "text-rose-400"
    : "text-white/30";

  const breadthPct = breadth.total > 0 ? ((breadth.advancers / breadth.total) * 100).toFixed(0) : "0";
  const breadthColor = Number(breadthPct) >= 60 ? "text-green-400" : Number(breadthPct) <= 40 ? "text-rose-400" : "text-white/80";

  const groups = [
    {
      title: "Tren",
      items: [
        { label: "IHSG", value: MKT.ihsg.value.toLocaleString("id-ID"), sub: `Harian: ${MKT.ihsg.daily >= 0 ? "+" : ""}${MKT.ihsg.daily}%`, color: MKT.ihsg.daily >= 0 ? "text-green-400" : "text-rose-400" },
        { label: "Bulanan", value: `${MKT.ihsg.monthly >= 0 ? "+" : ""}${MKT.ihsg.monthly}%`, color: MKT.ihsg.monthly >= 0 ? "text-green-400" : "text-rose-400" },
        { label: "SMA20", value: sma20, sub: Number(sma20) > MKT.ihsg.value ? "IHSG di bawah" : "IHSG di atas" },
        { label: "SMA50", value: sma50, sub: Number(sma50) > MKT.ihsg.value ? "IHSG di bawah" : "IHSG di atas" },
      ] as MetricItem[],
    },
    {
      title: "Momentum",
      items: [
        { label: "RSI(14)", value: rsiIHSG !== null ? rsiIHSG.toFixed(1) : "--", sub: rsiLabel, color: rsiColor },
        { label: "MACD", value: macdResult !== null ? macdResult.macd.toFixed(1) : "--", sub: macdLabel, color: macdColor },
        { label: "Score Gap", value: RS.radar_context?.score_gap?.toFixed(1) || "--", sub: "Top 5 vs Bottom 5" },
        { label: "Breadth", value: `${breadth.advancers} / ${breadth.decliners}`, sub: `${breadthPct}% advancer`, color: breadthColor },
      ] as MetricItem[],
    },
    {
      title: "Risiko",
      items: [
        { label: "Kesehatan", value: `${RS.market_health}%`, color: RS.market_health >= 60 ? "text-green-400" : RS.market_health <= 40 ? "text-rose-400" : "text-white/80" },
        { label: "Risiko", value: `${RS.risk}%`, color: RS.risk >= 60 ? "text-rose-400" : "text-white/80" },
        { label: "Keyakinan", value: `${RS.confidence}%`, color: RS.confidence >= 60 ? "text-green-400" : "text-white/80" },
        { label: "Peluang", value: `${RS.opportunity}%`, color: RS.opportunity >= 60 ? "text-green-400" : "text-white/80" },
      ] as MetricItem[],
    },
    {
      title: "Alokasi",
      items: [
        { label: "Deploy Capital", value: isCrisis ? "0%" : `${RS.capital_deployment}%`, color: isCrisis ? "text-rose-400" : "text-emerald-400" },
        { label: "USD/IDR", value: `Rp${MKT.usdidr.value.toLocaleString("id-ID")}`, sub: MKT.usdidr.daily <= 0 ? "IDR Menguat" : "IDR Melemah", color: MKT.usdidr.daily <= 0 ? "text-green-400" : "text-rose-400" },
        { label: "Gold", value: `Rp${MKT.gold.value.toLocaleString("id-ID")}`, sub: "per gram" },
        { label: "Breadth ≥60", value: `${RS.radar_context?.breadth_above_60 || "--"}/${RS.radar_context?.idx_universe_size || 80}`, sub: "Broad Support" },
      ] as MetricItem[],
    },
  ];

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.title}>
          <span className="text-label uppercase tracking-wider text-white/25 font-bold block mb-2 px-1">{group.title}</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {group.items.map((item) => (
              <Card key={item.label} variant="inset" padding="sm" className="space-y-1">
                <span className="text-label uppercase tracking-wider text-white/30 block">{item.label}</span>
                <span className={`text-body font-mono font-bold block ${item.color || "text-white/80"}`}>{item.value}</span>
                {item.sub && (
                  <span className="text-label text-white/30 block leading-tight">{item.sub}</span>
                )}
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
