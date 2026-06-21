import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { StockData } from "../types";
import { TrendingUp, TrendingDown, Clock, Calendar, BarChart3 } from "lucide-react";

interface HistoricalChartProps {
  stock: StockData;
  theme?: "dark" | "light";
}

export function HistoricalChart({ stock, theme }: HistoricalChartProps) {
  const [timeframe, setTimeframe] = useState<"1D" | "1W" | "1M">("1D");

  const getChartData = () => {
    switch (timeframe) {
      case "1D":
        return stock.chartDataDaily;
      case "1W":
        return stock.chartDataWeekly;
      case "1M":
        return stock.chartDataMonthly;
    }
  };

  const chartData = getChartData();
  const isPositive = stock.change >= 0;
  
  // Calculate high/low for selected timeframe
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length);

  const isLight = theme === "light";

  return (
    <div id="historical-chart-container" className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 id="chart-title" className="text-caption font-bold text-white/40 uppercase tracking-widest mb-1.5 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            Historical Price Trend ({timeframe})
          </h3>
          <div className="flex items-baseline gap-3">
            <span id="current-price-val" className="text-3xl font-bold tracking-tight text-white font-mono">
              IDR {stock.currentPrice.toLocaleString("id-ID")}
            </span>
            <span
              id="price-change-pct"
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                isPositive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-455"
              }`}
            >
              {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isPositive ? "+" : ""}
              {stock.change}%
            </span>
          </div>
        </div>

        {/* Timeframe Selectors */}
        <div id="chart-timeframe-selectors" className="inline-flex rounded-lg bg-white/5 p-1 border border-white/10 self-start sm:self-center">
          {(["1D", "1W", "1M"] as const).map((tf) => (
            <button
              key={tf}
              id={`tf-btn-${tf}`}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                timeframe === tf
                  ? "bg-emerald-500 text-black shadow-sm font-bold"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {tf === "1D" ? "Intraday" : tf === "1W" ? "1 Week" : "1 Month"}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chart Area */}
      <div id="main-area-chart" className="h-64 sm:h-80 w-full mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity={0.15} />
                <stop offset="95%" stopColor={isPositive ? "#10b981" : "#f43f5e"} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              stroke={isLight ? "#cbd5e1" : "#444"}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dy={10}
              tick={{ fill: isLight ? "#475569" : "#999" }}
            />
            <YAxis
              domain={["auto", "auto"]}
              stroke={isLight ? "#cbd5e1" : "#444"}
              fontSize={11}
              tickLine={false}
              axisLine={false}
              dx={-5}
              tickFormatter={(val) => val.toLocaleString("id-ID")}
              tick={{ fill: isLight ? "#475569" : "#999" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isLight ? "#ffffff" : "#0F0F0F",
                border: isLight ? "1px solid rgba(15, 23, 42, 0.15)" : "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "10px",
                padding: "10px 14px",
              }}
              labelStyle={{ color: isLight ? "#475569" : "rgba(255, 255, 255, 0.4)", fontSize: "11px", marginBottom: "4px" }}
              itemStyle={{ color: isLight ? "#0f172a" : "#fff", fontSize: "14px", fontWeight: "bold" }}
              formatter={(value: any) => [`IDR ${value.toLocaleString("id-ID")}`, "Price"]}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isPositive ? "#10b981" : "#f43f5e"}
               strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* High, Low, Avg stats strip */}
      <div id="chart-summary-stats-strip" className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
        <div>
          <span className="text-label uppercase font-bold text-white/40 tracking-wider flex items-center gap-1 mb-0.5">
            <TrendingUp className="w-3 h-3 text-emerald-400" /> High Price
          </span>
          <span id="stat-high-val" className="text-sm font-semibold text-white font-mono">
            IDR {maxPrice.toLocaleString("id-ID")}
          </span>
        </div>
        <div>
          <span className="text-label uppercase font-bold text-white/40 tracking-wider flex items-center gap-1 mb-0.5">
            <TrendingDown className="w-3 h-3 text-rose-400" /> Low Price
          </span>
          <span id="stat-low-val" className="text-sm font-semibold text-white font-mono">
            IDR {minPrice.toLocaleString("id-ID")}
          </span>
        </div>
        <div>
          <span className="text-label uppercase font-bold text-white/40 tracking-wider flex items-center gap-1 mb-0.5">
            <Clock className="w-3 h-3 text-emerald-500" /> Average
          </span>
          <span id="stat-avg-val" className="text-sm font-semibold text-white font-mono">
            IDR {avgPrice.toLocaleString("id-ID")}
          </span>
        </div>
      </div>
    </div>
  );
}
