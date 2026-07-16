import { useMemo } from "react";
import { STOCKS_DATA } from "../../stocksData";
import { HistoricalChart } from "../../components/HistoricalChart";
import type { StockData, PortfolioItem } from "../../types";

interface OverviewTabProps {
  stock: StockData;
  getDynamicStock: (ticker: string) => StockData | undefined;
  portfolio: PortfolioItem[];
  theme: "dark" | "light";
}

const METRICS = [
  { key: "peRatio" as const, label: "P/E", fmt: (v: number) => v < 0 ? "Loss" : `${v.toFixed(1)}x` },
  { key: "pbRatio" as const, label: "P/B", fmt: (v: number) => `${v.toFixed(1)}x` },
  { key: "roe" as const, label: "ROE", fmt: (v: number) => `${v.toFixed(1)}%` },
  { key: "dividendYield" as const, label: "Div Yield", fmt: (v: number) => `${v.toFixed(2)}%` },
  { key: "der" as const, label: "D/E", fmt: (v: number) => `${v.toFixed(1)}x` },
];

export function OverviewTab({ stock, getDynamicStock, portfolio, theme }: OverviewTabProps) {
  const portfolioItem = portfolio.find(p => p.ticker === stock.ticker);
  const gainLoss = portfolioItem ? ((stock.currentPrice - portfolioItem.buyPrice) / portfolioItem.buyPrice * 100) : null;

  const peers = useMemo(() =>
    STOCKS_DATA.filter(s => s.sector === stock.sector && s.ticker !== stock.ticker).slice(0, 5),
    [stock.sector]
  );

  const high52w = Math.max(...stock.chartDataMonthly.slice(-12).map(d => d.price));
  const low52w = Math.min(...stock.chartDataMonthly.slice(-12).map(d => d.price));
  const pctFromHigh = ((stock.currentPrice - high52w) / high52w * 100);
  const pctFromLow = ((stock.currentPrice - low52w) / low52w * 100);

  const hasFinancials = stock.metrics.length > 0 && stock.metrics[0]?.revenue > 0;

  return (
    <div className="space-y-5">
      {/* Metrik cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {METRICS.map(({ key, label, fmt }) => (
          <div key={key} className="border border-white/[0.06] rounded-lg p-3">
            <span className="text-label text-white/30 block">{label}</span>
            <span className="text-lg font-bold text-white mt-1 block">{fmt(stock[key])}</span>
          </div>
        ))}
      </div>

      {/* 52W Range + Portfolio ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-white/[0.06] rounded-lg p-3">
          <span className="text-label text-white/30 block">52W Range</span>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">High</span>
              <span className="text-white font-mono">Rp{high52w.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Low</span>
              <span className="text-white font-mono">Rp{low52w.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Dari High</span>
              <span className={`font-mono ${pctFromHigh >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {pctFromHigh >= 0 ? "+" : ""}{pctFromHigh.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Dari Low</span>
              <span className={`font-mono ${pctFromLow >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {pctFromLow >= 0 ? "+" : ""}{pctFromLow.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {portfolioItem ? (
          <div className="border border-white/[0.06] rounded-lg p-3">
            <span className="text-label text-white/30 block">Portfolio</span>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Shares</span>
                <span className="text-white font-mono">{portfolioItem.shares} lot</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Avg Price</span>
                <span className="text-white font-mono">Rp{portfolioItem.buyPrice.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Value</span>
                <span className="text-white font-mono">Rp{(portfolioItem.shares * stock.currentPrice).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Gain/Loss</span>
                <span className={`font-mono ${(gainLoss ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {gainLoss !== null ? `${gainLoss >= 0 ? "+" : ""}${gainLoss.toFixed(1)}%` : "-"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-white/[0.06] rounded-lg p-3">
            <span className="text-label text-white/30 block">Portfolio</span>
            <p className="text-white/40 text-sm mt-1">Belum memiliki <span className="font-mono text-white/60">{stock.ticker}</span></p>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="border border-white/[0.06] rounded-lg p-4">
        <span className="text-caption text-white/35 uppercase tracking-wider font-medium mb-3 block">Chart Harga</span>
        <HistoricalChart stock={stock} theme={theme} />
      </div>

      {/* Financials */}
      <div className="border border-white/[0.06] rounded-lg p-4">
        <span className="text-caption text-white/35 uppercase tracking-wider font-medium">Financial Statement (IDR B)</span>
        {!hasFinancials ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-white/[0.04] flex items-center justify-center">
              <span className="text-white/20 text-base font-mono">$</span>
            </div>
            <p className="text-white/40 text-sm">
              Data keuangan untuk <span className="font-mono text-white/60">{stock.ticker}</span> belum tersedia.
            </p>
            <p className="text-white/20 text-xs mt-1">Pipeline data keuangan akan mengisi data ini setelah tersedia.</p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="border-b border-white/[0.04] text-white/25 text-label tracking-wide uppercase">
                  <th className="pb-2 font-medium">Metric</th>
                  {stock.metrics.map(m => (
                    <th key={m.year} className="pb-2 text-right font-medium">FY {m.year}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {([
                  ["Revenue", stock.metrics.map(m => m.revenue), false],
                  ["Net Income", stock.metrics.map(m => m.netIncome), true],
                  ["Total Assets", stock.metrics.map(m => m.totalAssets), false],
                  ["Liabilities", stock.metrics.map(m => m.totalLiabilities), false],
                  ["Equity", stock.metrics.map(m => m.totalEquity), false],
                  ["Op. CF", stock.metrics.map(m => m.cashFlowOperating), true],
                  ["Inv. CF", stock.metrics.map(m => m.cashFlowInvesting), false],
                  ["Fin. CF", stock.metrics.map(m => m.cashFlowFinancing), false],
                ] as const).map(([label, values, isGreen]) => (
                  <tr key={label} className="hover:bg-white/[0.02]">
                    <td className={`py-2 text-white/70 ${isGreen ? "text-green-500" : ""}`}>{label}</td>
                    {values.map((v, i) => (
                      <td key={i} className={`py-2 text-right ${isGreen ? "text-green-500 font-medium" : "text-white"}`}>
                        Rp{v.toLocaleString()} B
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Company Profile */}
      <div className="border border-white/[0.06] rounded-lg p-4">
        <span className="text-caption text-white/35 uppercase tracking-wider font-medium">Company Profile</span>
        <div className="mt-3 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-label text-white/30 block">Sector</span>
              <span className="text-body text-white/70">{stock.sector !== "-" && stock.sector !== "Unknown" ? stock.sector : "\u2014"}</span>
            </div>
            <div>
              <span className="text-label text-white/30 block">Sub Sector</span>
              <span className="text-body text-white/70">{stock.subSector !== "-" && stock.subSector !== "Unknown" ? stock.subSector : "\u2014"}</span>
            </div>
            <div>
              <span className="text-label text-white/30 block">Market Cap</span>
              <span className="text-body text-white/70">{stock.marketCap > 0 ? `Rp${stock.marketCap.toLocaleString('id-ID')} T` : "\u2014"}</span>
            </div>
            <div>
              <span className="text-label text-white/30 block">Ticker</span>
              <span className="text-body text-white/70">{stock.ticker}</span>
            </div>
          </div>
          <div>
            <span className="text-label text-white/30 block">Description</span>
            <p className="text-body text-white/60 mt-1 leading-relaxed">{stock.description !== "-" && stock.description !== "Data tidak tersedia" ? stock.description : "\u2014"}</p>
          </div>
        </div>
      </div>

      {/* Sektor info + lightweight peers */}
      <div className="border border-white/[0.06] rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-caption text-white/35 uppercase tracking-wider font-medium">Sektor: {stock.sector}</span>
          {portfolioItem && (
            <span className="text-[10px] text-emerald-400/60 font-mono">{portfolioItem.shares} lot</span>
          )}
        </div>
        {stock.description && (
          <p className="text-body text-white/60 mt-2 leading-relaxed">{stock.description}</p>
        )}
        {peers.length > 0 && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {peers.map(peer => (
              <div key={peer.ticker} className="flex items-center gap-2 text-sm text-white/60 hover:text-white/80 transition-colors">
                <span className="font-mono text-white/80">{peer.ticker}</span>
                <span className="truncate text-white/40">{peer.name}</span>
                <span className="ml-auto font-mono">Rp{(getDynamicStock(peer.ticker)?.currentPrice ?? peer.currentPrice).toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
