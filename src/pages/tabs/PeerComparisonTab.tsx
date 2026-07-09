import { STOCKS_DATA } from "../../stocksData";
import type { StockData } from "../../types";

interface PeerComparisonTabProps {
  stock: StockData;
  getDynamicStock: (ticker: string) => StockData | undefined;
}

const COMPARE_METRICS = [
  { key: "peRatio" as const, label: "P/E", fmt: (v: number) => v < 0 ? "Loss" : v.toFixed(1) },
  { key: "pbRatio" as const, label: "P/B", fmt: (v: number) => v.toFixed(1) },
  { key: "roe" as const, label: "ROE", fmt: (v: number) => v.toFixed(1) },
  { key: "dividendYield" as const, label: "Div Yield", fmt: (v: number) => v.toFixed(2) },
  { key: "der" as const, label: "D/E", fmt: (v: number) => v.toFixed(1) },
];

export function PeerComparisonTab({ stock, getDynamicStock }: PeerComparisonTabProps) {
  const peers = STOCKS_DATA
    .filter(s => s.sector === stock.sector)
    .map(s => getDynamicStock(s.ticker) ?? s)
    .sort((a, b) => b.marketCap - a.marketCap);

  return (
    <div className="overflow-x-auto border border-white/[0.06] rounded-lg">
      <table className="w-full text-left text-body">
        <thead>
          <tr className="border-b border-white/[0.04] text-white/25 text-label tracking-wide uppercase">
            <th className="p-3 font-medium sticky left-0 bg-[#0a0a0f]">Ticker</th>
            <th className="p-3 font-medium">Price</th>
            {COMPARE_METRICS.map(m => (
              <th key={m.key} className="p-3 font-medium whitespace-nowrap">{m.label}</th>
            ))}
            <th className="p-3 font-medium whitespace-nowrap">M.Cap</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {peers.map(s => {
            const isSelf = s.ticker === stock.ticker;
            return (
              <tr key={s.ticker} className={`hover:bg-white/[0.02] ${isSelf ? "bg-emerald-600/5" : ""}`}>
                <td className={`p-3 font-mono font-medium whitespace-nowrap sticky left-0 bg-[#0a0a0f] ${isSelf ? "text-emerald-500" : "text-white/80"}`}>
                  {s.ticker}
                  {isSelf && <span className="ml-2 text-[10px] text-emerald-500/60">← this</span>}
                </td>
                <td className="p-3 font-mono text-white/70 whitespace-nowrap">Rp{(s.currentPrice).toLocaleString("id-ID")}</td>
                {COMPARE_METRICS.map(m => (
                  <td key={m.key} className={`p-3 font-mono whitespace-nowrap ${isSelf ? "text-emerald-400" : "text-white/60"}`}>
                    {m.fmt(s[m.key])}
                  </td>
                ))}
                <td className="p-3 font-mono text-white/60 whitespace-nowrap">Rp{s.marketCap.toLocaleString("id-ID")}T</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
