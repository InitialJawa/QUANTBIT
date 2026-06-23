import { useState, useEffect, useMemo } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line } from "recharts";
import { api } from "../services/api";
import { RS } from "../marketData";
import { TrendingUp, TrendingDown, Activity, Shield, AlertTriangle, BarChart3 } from "lucide-react";

type Timeframe = "1M" | "6M" | "1Y" | "5Y" | "MAX";

const REGIME_COLORS: Record<string, string> = {
  RISK_ON: "#10b981",
  RISK_OFF: "#ef4444",
  RECOVERY_WATCH: "#eab308",
  GOLD_DEFENSE: "#f59e0b",
  CASH_DEFENSE: "#9ca3af",
};

function computeSMA(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((s, v) => s + v, 0) / period;
  });
}

function formatRupiah(val: number) {
  return "Rp " + Math.round(val).toLocaleString("id-ID");
}

interface RawDay {
  date: string;
  ihsgPrice: number;
  goldPrice: number;
}

interface ChartDay {
  date: string;
  ihsg: number | null;
  gold: number | null;
  ihsgSma20: number | null;
  ihsgSma50: number | null;
}

export function MarketOverviewCharts() {
  const [timeframe, setTimeframe] = useState<Timeframe>("1Y");
  const [rawData, setRawData] = useState<RawDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ success: boolean; data: any[] }>("/api/backtest-data")
      .then(res => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setRawData(res.data.map(d => ({ date: d.date, ihsgPrice: d.ihsgPrice, goldPrice: d.goldPrice })));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const regimeStatus = RS.status === "SAFE" || RS.status === "WARNING"
    ? "RISK_ON"
    : RS.status === "CRASH"
    ? "RISK_OFF"
    : "RISK_ON";

  const regimeColor = REGIME_COLORS[regimeStatus] || "#10b981";

  const slicedData = useMemo(() => {
    if (rawData.length === 0) return [];
    const now = new Date(rawData[rawData.length - 1].date);
    const cutoffs: Record<Timeframe, number> = {
      "1M": 30,
      "6M": 180,
      "1Y": 365,
      "5Y": 1825,
      "MAX": 99999,
    };
    const cutoff = cutoffs[timeframe];
    const start = new Date(now);
    start.setDate(start.getDate() - cutoff);
    const filtered = rawData.filter(d => new Date(d.date) >= start);
    return filtered.length > 0 ? filtered : rawData;
  }, [rawData, timeframe]);

  const chartData: ChartDay[] = useMemo(() => {
    if (slicedData.length < 2) return [];
    const baseIhsg = slicedData[0].ihsgPrice;
    const baseGold = slicedData[0].goldPrice;
    if (!baseIhsg || !baseGold) return [];

    const indexed: ChartDay[] = slicedData.map(d => ({
      date: d.date,
      ihsg: d.ihsgPrice ? (d.ihsgPrice / baseIhsg) * 100 : null,
      gold: d.goldPrice ? (d.goldPrice / baseGold) * 100 : null,
      ihsgSma20: null,
      ihsgSma50: null,
    }));

    const ihsgValues = indexed.map(d => d.ihsg).filter((v): v is number => v !== null);
    const sma20 = computeSMA(ihsgValues, 20);
    const sma50 = computeSMA(ihsgValues, 50);

    let smaIdx = 0;
    return indexed.map((d, i) => {
      if (d.ihsg !== null) {
        d.ihsgSma20 = sma20[smaIdx];
        d.ihsgSma50 = sma50[smaIdx];
        smaIdx++;
      }
      return d;
    });
  }, [slicedData]);

  const currentIhsg = slicedData.length > 0 ? slicedData[slicedData.length - 1].ihsgPrice : 0;
  const currentGold = slicedData.length > 0 ? slicedData[slicedData.length - 1].goldPrice : 0;
  const firstIhsg = slicedData.length > 0 ? slicedData[0].ihsgPrice : 0;
  const firstGold = slicedData.length > 0 ? slicedData[0].goldPrice : 0;
  const ihsgChange = firstIhsg > 0 ? ((currentIhsg - firstIhsg) / firstIhsg) * 100 : 0;
  const goldChange = firstGold > 0 ? ((currentGold - firstGold) / firstGold) * 100 : 0;

  const timeframeBtns: Timeframe[] = ["1M", "6M", "1Y", "5Y", "MAX"];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-white/30 text-body">
        Memuat data pasar...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-surface-alt border border-white/10 rounded-2xl p-4" style={{ background: "#0a0a0a" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-heading font-bold text-white">IHSG vs Gold — Indexed to 100</h3>
          </div>
          <div className="flex items-center gap-1">
            {timeframeBtns.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 text-caption font-medium rounded-lg transition-colors cursor-pointer ${
                  timeframe === tf
                    ? "text-white bg-white/10"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 mb-3 text-caption">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full bg-white/80" />
            <span className="text-white/50">IHSG</span>
            <span className={`font-mono font-medium ${ihsgChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {ihsgChange >= 0 ? "+" : ""}{ihsgChange.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full bg-amber-400" />
            <span className="text-white/50">Gold</span>
            <span className={`font-mono font-medium ${goldChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {goldChange >= 0 ? "+" : ""}{goldChange.toFixed(1)}%
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-white/40" />
            <span className="text-white/50">SMA20</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t border-dashed border-white/20" />
            <span className="text-white/50">SMA50</span>
          </div>
        </div>

        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIhsg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="colorGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff0a" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#333"
                tickLine={false}
                dy={8}
                tick={{ fill: "#666", fontSize: 10 }}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getDate()}/${d.getMonth() + 1}`;
                }}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#333"
                tickLine={false}
                dx={-4}
                tick={{ fill: "#666", fontSize: 10 }}
                domain={["auto", "auto"]}
                tickFormatter={(val) => val.toFixed(0)}
              />
              <Tooltip
                contentStyle={{
                  background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#ddd",
                }}
                labelFormatter={(label) => `Tanggal: ${label}`}
                formatter={(value: number, name: string) => {
                  const label = name === "ihsg" ? "IHSG" : name === "gold" ? "Gold" : name === "ihsgSma20" ? "SMA20" : "SMA50";
                  return [value.toFixed(1), label];
                }}
              />
              <Area type="monotone" dataKey="ihsg" stroke="#ffffff" strokeWidth={1.5} fillOpacity={1} fill="url(#colorIhsg)" dot={false} connectNulls />
              <Area type="monotone" dataKey="gold" stroke="#f59e0b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorGold)" dot={false} connectNulls />
              <Line type="monotone" dataKey="ihsgSma20" stroke="#ffffff" strokeWidth={1} strokeDasharray="4 4" dot={false} connectNulls />
              <Line type="monotone" dataKey="ihsgSma50" stroke="#666666" strokeWidth={1} strokeDasharray="4 4" dot={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between mt-2 text-caption text-white/30">
          <span>Base: {slicedData[0]?.date || "-"} = 100</span>
          <span>{slicedData.length} hari</span>
        </div>
      </div>

      <div className="bg-surface-alt border border-white/10 rounded-2xl p-4" style={{ background: "#0a0a0a" }}>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-heading font-bold text-white">Indikator & Keputusan</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="w-3 h-3 text-emerald-400" />
              <span className="text-caption text-white/40 uppercase tracking-wider">Health</span>
            </div>
            <span className="text-heading font-bold text-white">{RS.market_health}</span>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="w-3 h-3 text-cyan-400" />
              <span className="text-caption text-white/40 uppercase tracking-wider">Oppty</span>
            </div>
            <span className="text-heading font-bold text-white">{RS.opportunity}</span>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield className="w-3 h-3 text-rose-400" />
              <span className="text-caption text-white/40 uppercase tracking-wider">Risk</span>
            </div>
            <span className="text-heading font-bold text-white">{RS.risk}</span>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <BarChart3 className="w-3 h-3 text-amber-400" />
              <span className="text-caption text-white/40 uppercase tracking-wider">Deploy</span>
            </div>
            <span className="text-heading font-bold text-white">{RS.capital_deployment}%</span>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: regimeColor }}
            />
            <span className="text-body font-semibold text-white">Regime: {regimeStatus}</span>
            <span className="text-body text-cyan-400">→ {RS.action}</span>
          </div>

          <div className="flex flex-wrap gap-3 text-caption text-white/50">
            <span>Breadth: {RS.radar_context.breadth_above_60}/{RS.radar_context.watchlist_count} ≥60</span>
            <span>Score Gap: {RS.radar_context.score_gap}</span>
            <span>Faktor: {RS.radar_context.strongest_factor} ({RS.radar_context.strongest_factor_score})</span>
          </div>

          <p className="text-caption text-white/40 leading-relaxed">{RS.rationale}</p>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(REGIME_COLORS).map(([key, color]) => (
            <div key={key} className="flex items-center gap-1.5 text-caption text-white/40">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span>{key.replace(/_/g, " ")}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
