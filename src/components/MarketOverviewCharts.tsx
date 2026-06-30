import { useState, useEffect, useMemo, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Line } from "recharts";
import { api } from "../services/api";
import { Activity, RefreshCw } from "lucide-react";
import { portfolioIndexedHistory } from "../utils/reconstructPortfolioHistory";
import type { PortfolioItem } from "../types";

type Timeframe = "1M" | "6M" | "1Y" | "5Y" | "MAX";

function computeSMA(data: number[], period: number): (number | null)[] {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((s, v) => s + v, 0) / period;
  });
}

interface RawDay {
  date: string;
  ihsgPrice: number;
  goldPrice: number;
  stockAdjPrices?: Record<string, number>;
}

interface ChartDay {
  date: string;
  ihsg: number | null;
  gold: number | null;
  portfolio: number | null;
  ihsgSma20: number | null;
  ihsgSma50: number | null;
}

function Skeleton() {
  return (
    <div className="space-y-4 animate-pulse p-4">
      <div className="h-8 bg-white/5 rounded-lg w-64" />
      <div className="flex gap-2">
        {[1,2,3,4,5].map(i => <div key={i} className="h-6 bg-white/5 rounded-lg w-10" />)}
      </div>
      <div className="h-[320px] bg-white/[0.02] rounded-2xl border border-white/5 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          <span className="text-caption text-white/30">Memuat data pasar...</span>
        </div>
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-80">
      <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 text-rose-400" />
      </div>
      <p className="text-caption text-white/40 text-center max-w-xs">
        Gagal memuat data chart. Periksa koneksi atau coba lagi.
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 text-caption font-bold uppercase tracking-widest bg-white/10 hover:bg-white/15 text-white rounded-xl border border-white/10 transition-colors cursor-pointer"
      >
        Coba Lagi
      </button>
    </div>
  );
}

interface MarketOverviewChartsProps {
  portfolio?: PortfolioItem[];
}

export function MarketOverviewCharts({ portfolio }: MarketOverviewChartsProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>("1Y");
  const [rawData, setRawData] = useState<RawDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError(false);
    api.get<{ success: boolean; data: any[] }>("/api/backtest-data")
      .then(res => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setRawData(res.data.map(d => ({
            date: d.date,
            ihsgPrice: d.ihsgPrice,
            goldPrice: d.goldPrice,
            stockAdjPrices: d.stockAdjPrices,
          })));
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const portfolioIndexed = useMemo(() => {
    if (!portfolio || portfolio.length === 0 || rawData.length === 0) return [];
    return portfolioIndexedHistory(portfolio, rawData);
  }, [portfolio, rawData]);

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

    const portMap = new Map<string, number>();
    for (const p of portfolioIndexed) {
      if (p.portfolioValue !== null) portMap.set(p.date, p.portfolioValue);
    }

    const indexed: ChartDay[] = slicedData.map(d => ({
      date: d.date,
      ihsg: d.ihsgPrice ? (d.ihsgPrice / baseIhsg) * 100 : null,
      gold: d.goldPrice ? (d.goldPrice / baseGold) * 100 : null,
      portfolio: portMap.get(d.date) ?? null,
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
  }, [slicedData, portfolioIndexed]);

  const lastPort = portfolioIndexed[portfolioIndexed.length - 1]?.portfolioValue;
  const firstPort = portfolioIndexed.find(p => p.portfolioValue !== null)?.portfolioValue;
  const portChange = firstPort && lastPort ? ((lastPort - firstPort) / firstPort) * 100 : null;

  const currentIhsg = slicedData.length > 0 ? slicedData[slicedData.length - 1].ihsgPrice : 0;
  const currentGold = slicedData.length > 0 ? slicedData[slicedData.length - 1].goldPrice : 0;
  const firstIhsg = slicedData.length > 0 ? slicedData[0].ihsgPrice : 0;
  const firstGold = slicedData.length > 0 ? slicedData[0].goldPrice : 0;
  const ihsgChange = firstIhsg > 0 ? ((currentIhsg - firstIhsg) / firstIhsg) * 100 : 0;
  const goldChange = firstGold > 0 ? ((currentGold - firstGold) / firstGold) * 100 : 0;

  const timeframeBtns: Timeframe[] = ["1M", "6M", "1Y", "5Y", "MAX"];

  if (loading) return <Skeleton />;
  if (error) return <ErrorState onRetry={fetchData} />;

  return (
    <div className="space-y-3">
      <div className="bg-surface-alt border border-white/10 rounded-2xl p-4" style={{ background: "#0a0a0a" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h3 className="text-heading font-bold text-white">IHSG vs Gold vs Portfolio — Indexed to 100</h3>
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

        <div className="flex items-center gap-4 mb-3 text-caption flex-wrap">
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
          {portChange !== null && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 rounded-full bg-emerald-400" />
              <span className="text-white/50">Portfolio</span>
              <span className={`font-mono font-medium ${portChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {portChange >= 0 ? "+" : ""}{portChange.toFixed(1)}%
              </span>
            </div>
          )}
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
                <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00c9a5" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#00c9a5" stopOpacity={0.01} />
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
                  const labels: Record<string, string> = { ihsg: "IHSG", gold: "Gold", portfolio: "Portfolio", ihsgSma20: "SMA20", ihsgSma50: "SMA50" };
                  return [value.toFixed(1), labels[name] || name];
                }}
              />
              <Area type="monotone" dataKey="ihsg" stroke="#ffffff" strokeWidth={1.5} fillOpacity={1} fill="url(#colorIhsg)" dot={false} connectNulls />
              <Area type="monotone" dataKey="gold" stroke="#f59e0b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorGold)" dot={false} connectNulls />
              {portfolio && portfolio.length > 0 && (
                <Area type="monotone" dataKey="portfolio" stroke="#00c9a5" strokeWidth={1.5} fillOpacity={1} fill="url(#colorPortfolio)" dot={false} connectNulls />
              )}
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
    </div>
  );
}
