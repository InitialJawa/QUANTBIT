import { useState } from "react";
import { Play, RefreshCw, TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
import type { StockData, PortfolioItem, WatchlistItem } from "../types";

interface SimulasiTabProps {
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  cash: number;
  getDynamicStock: (ticker: string) => StockData | undefined;
}

export function SimulasiTab({ portfolio, watchlist, cash, getDynamicStock }: SimulasiTabProps) {
  const totalInvested = portfolio.reduce((sum, p) => sum + p.totalCost, 0);
  const totalValue = portfolio.reduce((sum, p) => {
    const s = getDynamicStock(p.ticker);
    return sum + (s?.price || p.avgPrice) * p.qty;
  }, 0);
  const unrealizedPnL = totalValue - totalInvested;
  const totalPortfolioValue = cash + totalValue;

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <Play className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Simulasi Portfolio</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#050505] border border-white/[0.03] rounded-xl p-4">
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Total Portfolio</div>
          <div className="text-lg font-bold text-white">Rp {totalPortfolioValue.toLocaleString("id-ID")}</div>
        </div>
        <div className="bg-[#050505] border border-white/[0.03] rounded-xl p-4">
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Kas</div>
          <div className="text-lg font-bold text-white">Rp {cash.toLocaleString("id-ID")}</div>
        </div>
        <div className="bg-[#050505] border border-white/[0.03] rounded-xl p-4">
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Investasi</div>
          <div className="text-lg font-bold text-white">Rp {totalInvested.toLocaleString("id-ID")}</div>
        </div>
        <div className="bg-[#050505] border border-white/[0.03] rounded-xl p-4">
          <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Unrealized P&L</div>
          <div className={`text-lg font-bold flex items-center gap-1 ${unrealizedPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {unrealizedPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            Rp {unrealizedPnL.toLocaleString("id-ID")}
          </div>
        </div>
      </div>

      <div className="bg-[#050505] border border-white/[0.03] rounded-2xl p-5">
        <h3 className="text-[11px] uppercase font-bold tracking-widest text-white/70 mb-4 font-mono flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 text-white/40" />
          Posisi Terbuka
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-[9px] text-white/30 uppercase tracking-wider border-b border-white/[0.04]">
                <th className="text-left py-2 pr-4">Ticker</th>
                <th className="text-right py-2 pr-4">Qty</th>
                <th className="text-right py-2 pr-4">Avg Price</th>
                <th className="text-right py-2 pr-4">Market</th>
                <th className="text-right py-2 pr-4">Value</th>
                <th className="text-right py-2 pr-4">P&L</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-white/20 text-[11px]">Belum ada posisi</td></tr>
              ) : (
                portfolio.map(p => {
                  const s = getDynamicStock(p.ticker);
                  const price = s?.price || p.avgPrice;
                  const value = price * p.qty;
                  const pl = value - p.totalCost;
                  return (
                    <tr key={p.ticker} className="border-b border-white/[0.02]">
                      <td className="py-2.5 pr-4 text-white font-bold">{p.ticker}</td>
                      <td className="py-2.5 pr-4 text-right text-white/70">{p.qty}</td>
                      <td className="py-2.5 pr-4 text-right text-white/50">Rp {p.avgPrice.toLocaleString("id-ID")}</td>
                      <td className="py-2.5 pr-4 text-right text-white/70">Rp {price.toLocaleString("id-ID")}</td>
                      <td className="py-2.5 pr-4 text-right text-white">Rp {value.toLocaleString("id-ID")}</td>
                      <td className={`py-2.5 text-right ${pl >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        Rp {pl.toLocaleString("id-ID")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}