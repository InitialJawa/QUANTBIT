import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TrendingUp, Activity, ShieldAlert, PieChart, ChevronDown, ChevronUp } from "lucide-react";
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

interface PanelConfig {
  title: string;
  icon: typeof TrendingUp;
  iconColor: string;
  primary: MetricItem[];
  detail: MetricItem[];
}

export function MarketMetricsDashboard({ rsiIHSG, macdResult, ihsgCloses, breadth }: MarketMetricsDashboardProps) {
  const isCrisis = isCrashActive();
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(new Set());

  const togglePanel = (title: string) => {
    setExpandedPanels(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const sma20 = useMemo(() => {
    if (ihsgCloses.length > 20) return (ihsgCloses.slice(-20).reduce((s, v) => s + v, 0) / 20).toFixed(0);
    return "--";
  }, [ihsgCloses]);

  const sma50 = useMemo(() => {
    if (ihsgCloses.length > 50) return (ihsgCloses.slice(-50).reduce((s, v) => s + v, 0) / 50).toFixed(0);
    return "--";
  }, [ihsgCloses]);

  const sma20Above = Number(sma20) > 0 && MKT.ihsg.value > Number(sma20);
  const sma50Above = Number(sma50) > 0 && MKT.ihsg.value > Number(sma50);

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

  const healthColor = RS.market_health >= 60 ? "text-green-400" : RS.market_health <= 40 ? "text-rose-400" : "text-amber-400";
  const riskColor = RS.risk >= 60 ? "text-rose-400" : RS.risk <= 30 ? "text-green-400" : "text-amber-400";

  const panels: PanelConfig[] = [
    {
      title: "Tren",
      icon: TrendingUp,
      iconColor: "text-cyan-400",
      primary: [
        { label: "IHSG", value: MKT.ihsg.value.toLocaleString("id-ID"), sub: `${MKT.ihsg.daily >= 0 ? "+" : ""}${MKT.ihsg.daily}% harian`, color: MKT.ihsg.daily >= 0 ? "text-green-400" : "text-rose-400" },
        { label: "Bulanan", value: `${MKT.ihsg.monthly >= 0 ? "+" : ""}${MKT.ihsg.monthly}%`, color: MKT.ihsg.monthly >= 0 ? "text-green-400" : "text-rose-400" },
        { label: "SMA20/50", value: `${sma20Above ? "↑" : "↓"} / ${sma50Above ? "↑" : "↓"}`, sub: `${sma20Above && sma50Above ? "Di atas keduanya" : !sma20Above && !sma50Above ? "Di bawah keduanya" : "Mixed"}`, color: sma20Above && sma50Above ? "text-green-400" : !sma20Above && !sma50Above ? "text-rose-400" : "text-amber-400" },
      ],
      detail: [
        { label: "SMA20", value: sma20, sub: sma20Above ? "IHSG di atas" : "IHSG di bawah", color: sma20Above ? "text-green-400" : "text-rose-400" },
        { label: "SMA50", value: sma50, sub: sma50Above ? "IHSG di atas" : "IHSG di bawah", color: sma50Above ? "text-green-400" : "text-rose-400" },
      ],
    },
    {
      title: "Momentum",
      icon: Activity,
      iconColor: "text-emerald-400",
      primary: [
        { label: "RSI(14)", value: rsiIHSG !== null ? rsiIHSG.toFixed(1) : "--", sub: rsiLabel, color: rsiColor },
        { label: "MACD", value: macdLabel, sub: macdResult !== null ? `${macdResult.macd.toFixed(1)}` : "--", color: macdColor },
        { label: "Breadth", value: `${breadthPct}%`, sub: `${breadth.advancers}↑ ${breadth.decliners}↓`, color: breadthColor },
      ],
      detail: [
        { label: "Score Gap", value: RS.radar_context?.score_gap?.toFixed(1) || "--", sub: "Top 5 vs Bottom 5" },
        { label: "MACD Value", value: macdResult !== null ? macdResult.macd.toFixed(2) : "--", sub: `Signal: ${macdResult !== null ? macdResult.signal.toFixed(2) : "--"}` },
      ],
    },
    {
      title: "Risiko",
      icon: ShieldAlert,
      iconColor: "text-rose-400",
      primary: [
        { label: "Kesehatan", value: `${RS.market_health}%`, color: healthColor },
        { label: "Risiko", value: `${RS.risk}%`, color: riskColor },
        { label: "Keyakinan", value: `${RS.confidence}%`, color: RS.confidence >= 60 ? "text-green-400" : "text-white/60" },
      ],
      detail: [
        { label: "Peluang", value: `${RS.opportunity}%`, color: RS.opportunity >= 60 ? "text-green-400" : "text-white/60" },
      ],
    },
    {
      title: "Alokasi",
      icon: PieChart,
      iconColor: "text-amber-400",
      primary: [
        { label: "Deploy", value: isCrisis ? "0%" : `${RS.capital_deployment}%`, color: isCrisis ? "text-rose-400" : "text-green-400" },
        { label: "USD/IDR", value: `Rp${MKT.usdidr.value.toLocaleString("id-ID")}`, sub: MKT.usdidr.daily <= 0 ? "IDR Menguat" : "IDR Melemah", color: MKT.usdidr.daily <= 0 ? "text-green-400" : "text-rose-400" },
        { label: "Gold", value: `Rp${MKT.gold.value.toLocaleString("id-ID")}`, sub: "per gram" },
      ],
      detail: [
        { label: "Breadth ≥60", value: `${RS.radar_context?.breadth_above_60 || "--"}/${RS.radar_context?.idx_universe_size || 80}`, sub: "Broad Support" },
      ],
    },
  ];

  return (
    <div className="space-y-2">
      {panels.map((panel) => {
        const Icon = panel.icon;
        const isExpanded = expandedPanels.has(panel.title);
        const hasDetail = panel.detail.length > 0;

        return (
          <div key={panel.title}>
            <button
              onClick={() => hasDetail && togglePanel(panel.title)}
              className={`w-full flex items-center gap-2 mb-1.5 px-1 ${hasDetail ? "cursor-pointer group" : ""}`}
            >
              <Icon className={`w-3.5 h-3.5 ${panel.iconColor}`} />
              <span className="text-label uppercase tracking-wider text-white/25 font-bold">{panel.title}</span>
              {hasDetail && (
                <span className="ml-auto text-white/15 group-hover:text-white/30 transition-colors">
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </span>
              )}
            </button>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {panel.primary.map((item) => (
                <Card key={item.label} variant="inset" padding="sm" className="space-y-0.5">
                  <span className="text-label uppercase tracking-wider text-white/30 block">{item.label}</span>
                  <span className={`text-sm font-mono font-bold block ${item.color || "text-white/80"}`}>{item.value}</span>
                  {item.sub && (
                    <span className="text-[10px] text-white/25 block leading-tight">{item.sub}</span>
                  )}
                </Card>
              ))}
            </div>

            <AnimatePresence>
              {isExpanded && hasDetail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/[0.03]">
                    {panel.detail.map((item) => (
                      <Card key={item.label} variant="inset" padding="sm" className="space-y-0.5">
                        <span className="text-label uppercase tracking-wider text-white/25 block">{item.label}</span>
                        <span className={`text-sm font-mono font-bold block ${item.color || "text-white/60"}`}>{item.value}</span>
                        {item.sub && (
                          <span className="text-[10px] text-white/20 block leading-tight">{item.sub}</span>
                        )}
                      </Card>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
