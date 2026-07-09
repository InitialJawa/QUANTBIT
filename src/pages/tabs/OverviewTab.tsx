import { STOCKS_DATA } from "../../stocksData";
import type { StockData, PortfolioItem } from "../../types";

interface OverviewTabProps {
  stock: StockData;
  getDynamicStock: (ticker: string) => StockData | undefined;
  portfolio: PortfolioItem[];
}

const METRICS = [
  { key: "peRatio" as const, label: "P/E", fmt: (v: number) => v < 0 ? "Loss" : `${v.toFixed(1)}x` },
  { key: "pbRatio" as const, label: "P/B", fmt: (v: number) => `${v.toFixed(1)}x` },
  { key: "roe" as const, label: "ROE", fmt: (v: number) => `${v.toFixed(1)}%` },
  { key: "dividendYield" as const, label: "Div Yield", fmt: (v: number) => `${v.toFixed(2)}%` },
  { key: "der" as const, label: "D/E", fmt: (v: number) => `${v.toFixed(1)}x` },
];

export function OverviewTab({ stock, getDynamicStock, portfolio }: OverviewTabProps) {
  const peers = STOCKS_DATA.filter(s => s.sector === stock.sector && s.ticker !== stock.ticker).slice(0, 5);
  const portfolioItem = portfolio.find(p => p.ticker === stock.ticker);
  const gainLoss = portfolioItem ? ((stock.currentPrice - portfolioItem.buyPrice) / portfolioItem.buyPrice * 100) : null;

  const high52w = Math.max(...stock.chartDataMonthly.slice(-12).map(d => d.price));
  const low52w = Math.min(...stock.chartDataMonthly.slice(-12).map(d => d.price));
  const pctFromHigh = ((stock.currentPrice - high52w) / high52w * 100);
  const pctFromLow = ((stock.currentPrice - low52w) / low52w * 100);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {METRICS.map(({ key, label, fmt }) => (
          <div key={key} className="border border-white/[0.06] rounded-lg p-3">
            <span className="text-label text-white/30 block">{label}</span>
            <span className="text-lg font-bold text-white mt-1 block">{fmt(stock[key])}</span>
          </div>
        ))}
      </div>

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

        {portfolioItem && (
          <div className="border border-white/[0.06] rounded-lg p-3">
            <span className="text-label text-white/30 block">Portfolio</span>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Shares</span>
                <span className="text-white font-mono">{portfolioItem.shares}</span>
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
        )}
      </div>

      <div className="border border-white/[0.06] rounded-lg p-4">
        <span className="text-caption text-white/35 uppercase tracking-wider font-medium">Sektor: {stock.sector}</span>
        <p className="text-body text-white/60 mt-2 leading-relaxed">{stock.description}</p>
      </div>

      {peers.length > 0 && (
        <div className="border border-white/[0.06] rounded-lg p-4">
          <span className="text-caption text-white/35 uppercase tracking-wider font-medium">Peer di Sektor {stock.sector}</span>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {peers.map(peer => (
              <div key={peer.ticker} className="flex items-center gap-2 text-sm text-white/60 hover:text-white/80 transition-colors">
                <span className="font-mono text-white/80">{peer.ticker}</span>
                <span className="truncate text-white/40">{peer.name}</span>
                <span className="ml-auto font-mono">Rp{(getDynamicStock(peer.ticker)?.currentPrice ?? peer.currentPrice).toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
