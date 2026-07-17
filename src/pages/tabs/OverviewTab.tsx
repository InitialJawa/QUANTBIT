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
  { key: "peRatio" as const, label: "P/E", fmt: (v: number) => v <= 0 ? "N/A" : `${v.toFixed(1)}x` },
  { key: "pbRatio" as const, label: "P/B", fmt: (v: number) => v <= 0 ? "N/A" : `${v.toFixed(1)}x` },
  { key: "roe" as const, label: "ROE", fmt: (v: number) => v === 0 ? "N/A" : `${v.toFixed(1)}%` },
  { key: "dividendYield" as const, label: "Div Yield", fmt: (v: number) => v === 0 ? "N/A" : `${v.toFixed(2)}%` },
  { key: "der" as const, label: "D/E", fmt: (v: number) => v === 0 ? "N/A" : `${v.toFixed(1)}x` },
];

export function OverviewTab({ stock, getDynamicStock, portfolio, theme }: OverviewTabProps) {
  const portfolioItem = portfolio.find(p => p.ticker === stock.ticker);
  const gainLoss = portfolioItem ? ((stock.currentPrice - portfolioItem.buyPrice) / portfolioItem.buyPrice * 100) : null;

  const peers = useMemo(() =>
    STOCKS_DATA.filter(s => s.sector === stock.sector && s.ticker !== stock.ticker).slice(0, 5),
    [stock.sector]
  );

  const high52w = stock.chartDataMonthly.length > 0
    ? Math.max(...stock.chartDataMonthly.slice(-12).map(d => d.price))
    : stock.currentPrice;
  const low52w = stock.chartDataMonthly.length > 0
    ? Math.min(...stock.chartDataMonthly.slice(-12).map(d => d.price))
    : stock.currentPrice;
  const pctFromHigh = high52w > 0 ? ((stock.currentPrice - high52w) / high52w * 100) : 0;
  const pctFromLow = low52w > 0 ? ((stock.currentPrice - low52w) / low52w * 100) : 0;

  const hasFinancials = stock.metrics.length > 0 && stock.metrics[0]?.revenue > 0;
  const isDescriptionFallback = !stock.description || stock.description.includes("adalah salah satu perusahaan publik terkemuka");

  return (
    <div className="space-y-4">
      {/* Investment Summary */}
      <div className="border border-white/[0.06] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-caption text-white/35 uppercase tracking-wider font-bold">Ringkasan Investasi</span>
          {stock.sector !== "-" && stock.sector !== "Unknown" && (
            <span className="text-[10px] text-white/30 font-mono">{stock.sector}{stock.subSector !== "-" ? ` · ${stock.subSector}` : ""}</span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-2 bg-white/[0.02] rounded-lg">
            <span className="text-[10px] text-white/30 block uppercase">Harga</span>
            <span className="text-sm font-bold text-white font-mono block mt-1">Rp{stock.currentPrice.toLocaleString("id-ID")}</span>
          </div>
          <div className="p-2 bg-white/[0.02] rounded-lg">
            <span className="text-[10px] text-white/30 block uppercase">Market Cap</span>
            <span className="text-sm font-bold text-white font-mono block mt-1">{stock.marketCap > 0 ? `Rp${stock.marketCap.toLocaleString("id-ID")}T` : "—"}</span>
          </div>
          <div className="p-2 bg-white/[0.02] rounded-lg">
            <span className="text-[10px] text-white/30 block uppercase">P/E Ratio</span>
            <span className={`text-sm font-bold font-mono block mt-1 ${stock.peRatio > 25 ? "text-amber-400" : stock.peRatio > 0 ? "text-white" : "text-white/40"}`}>
              {stock.peRatio > 0 ? `${stock.peRatio.toFixed(1)}x` : "—"}
            </span>
          </div>
          <div className="p-2 bg-white/[0.02] rounded-lg">
            <span className="text-[10px] text-white/30 block uppercase">Div Yield</span>
            <span className={`text-sm font-bold font-mono block mt-1 ${stock.dividendYield >= 4 ? "text-emerald-400" : stock.dividendYield > 0 ? "text-white" : "text-white/40"}`}>
              {stock.dividendYield > 0 ? `${stock.dividendYield.toFixed(2)}%` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Key Ratios */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {METRICS.map(({ key, label, fmt }) => (
          <div key={key} className="border border-white/[0.06] rounded-lg p-3">
            <span className="text-label text-white/30 block">{label}</span>
            <span className="text-lg font-bold text-white mt-1 block">{fmt(stock[key])}</span>
          </div>
        ))}
      </div>

      {/* 52W Range + Portfolio */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="border border-white/[0.06] rounded-lg p-3">
          <span className="text-label text-white/30 block">52 Minggu</span>
          <div className="mt-2 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Tertinggi</span>
              <span className="text-white font-mono">Rp{high52w.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Terendah</span>
              <span className="text-white font-mono">Rp{low52w.toLocaleString("id-ID")}</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-emerald-500/50 rounded-full"
                style={{ width: `${Math.max(5, Math.min(95, ((stock.currentPrice - low52w) / (high52w - low52w || 1)) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className={`font-mono ${pctFromLow >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {pctFromLow >= 0 ? "+" : ""}{pctFromLow.toFixed(1)}% dari low
              </span>
              <span className={`font-mono ${pctFromHigh <= 0 ? "text-rose-500" : "text-emerald-500"}`}>
                {pctFromHigh >= 0 ? "+" : ""}{pctFromHigh.toFixed(1)}% dari high
              </span>
            </div>
          </div>
        </div>

        {portfolioItem ? (
          <div className="border border-white/[0.06] rounded-lg p-3">
            <span className="text-label text-white/30 block">Posisi Portofolio</span>
            <div className="mt-2 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Lembar</span>
                <span className="text-white font-mono">{portfolioItem.shares.toLocaleString()} ({Math.round(portfolioItem.shares / 100)} lot)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Harga Beli</span>
                <span className="text-white font-mono">Rp{portfolioItem.buyPrice.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Nilai Saat Ini</span>
                <span className="text-white font-mono">Rp{(portfolioItem.shares * stock.currentPrice).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Laba / Rugi</span>
                <span className={`font-mono font-bold ${(gainLoss ?? 0) > 0 ? "text-emerald-500" : (gainLoss ?? 0) < 0 ? "text-rose-500" : "text-white/40"}`}>
                  {gainLoss !== null ? `${gainLoss > 0 ? "+" : ""}${gainLoss.toFixed(1)}%` : "—"}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="border border-white/[0.06] rounded-lg p-3 flex flex-col justify-center">
            <span className="text-label text-white/30 block">Posisi Portofolio</span>
            <p className="text-white/40 text-sm mt-2">Belum memiliki <span className="font-mono text-white/60">{stock.ticker}</span></p>
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="border border-white/[0.06] rounded-lg p-4">
        <span className="text-caption text-white/35 uppercase tracking-wider font-bold mb-3 block">Grafik Harga</span>
        <HistoricalChart stock={stock} theme={theme} />
      </div>

      {/* Financial Statement */}
      {hasFinancials && (
        <div className="border border-white/[0.06] rounded-lg p-4">
          <span className="text-caption text-white/35 uppercase tracking-wider font-bold">Laporan Keuangan (IDR Miliar)</span>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="border-b border-white/[0.04] text-white/25 text-label tracking-wide uppercase">
                  <th className="pb-2 font-medium">Metrik</th>
                  {stock.metrics.map(m => (
                    <th key={m.year} className="pb-2 text-right font-medium">FY {m.year}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {([
                  ["Pendapatan", stock.metrics.map(m => m.revenue)],
                  ["Laba Bersih", stock.metrics.map(m => m.netIncome)],
                  ["Total Aset", stock.metrics.map(m => m.totalAssets)],
                  ["Liabilitas", stock.metrics.map(m => m.totalLiabilities)],
                  ["Ekuitas", stock.metrics.map(m => m.totalEquity)],
                  ["Kas Operasi", stock.metrics.map(m => m.cashFlowOperating)],
                  ["Kas Investasi", stock.metrics.map(m => m.cashFlowInvesting)],
                  ["Kas Pendanaan", stock.metrics.map(m => m.cashFlowFinancing)],
                ] as const).map(([label, values]) => (
                  <tr key={label} className="hover:bg-white/[0.02]">
                    <td className="py-2 text-white/70">{label}</td>
                    {values.map((v, i) => (
                      <td key={i} className="py-2 text-right text-white">
                        Rp{v.toLocaleString()} B
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!hasFinancials && stock.metrics.length === 0 && (
        <div className="border border-white/[0.06] rounded-lg p-4">
          <span className="text-caption text-white/35 uppercase tracking-wider font-bold">Laporan Keuangan</span>
          <div className="text-center py-6">
            <p className="text-white/30 text-caption">Data keuangan untuk <span className="font-mono text-white/50">{stock.ticker}</span> belum tersedia.</p>
          </div>
        </div>
      )}

      {/* Company Profile — no duplicate description */}
      <div className="border border-white/[0.06] rounded-lg p-4">
        <span className="text-caption text-white/35 uppercase tracking-wider font-bold">Profil Perusahaan</span>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-label text-white/30 block">Sektor</span>
              <span className="text-body text-white/70">{stock.sector !== "-" && stock.sector !== "Unknown" ? stock.sector : "—"}</span>
            </div>
            <div>
              <span className="text-label text-white/30 block">Sub Sektor</span>
              <span className="text-body text-white/70">{stock.subSector !== "-" && stock.subSector !== "Unknown" ? stock.subSector : "—"}</span>
            </div>
            <div>
              <span className="text-label text-white/30 block">Market Cap</span>
              <span className="text-body text-white/70">{stock.marketCap > 0 ? `Rp${stock.marketCap.toLocaleString('id-ID')} T` : "—"}</span>
            </div>
            <div>
              <span className="text-label text-white/30 block">Ticker</span>
              <span className="text-body text-white/70 font-mono">{stock.ticker}</span>
            </div>
          </div>
          <div>
            <span className="text-label text-white/30 block">Deskripsi</span>
            {isDescriptionFallback ? (
              <p className="text-body text-white/30 mt-1 italic">Deskripsi belum tersedia untuk ticker ini.</p>
            ) : (
              <p className="text-body text-white/60 mt-1 leading-relaxed">{stock.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Light peer preview */}
      {peers.length > 0 && (
        <div className="border border-white/[0.06] rounded-lg p-4">
          <span className="text-caption text-white/35 uppercase tracking-wider font-bold">Peer di Sektor {stock.sector}</span>
          <div className="mt-3 space-y-1.5">
            {peers.map(peer => (
              <div key={peer.ticker} className="flex items-center gap-2 text-sm text-white/60 hover:text-white/80 transition-colors">
                <span className="font-mono text-white/80">{peer.ticker}</span>
                <span className="truncate text-white/40 text-xs">{peer.name}</span>
                <span className="ml-auto font-mono text-xs">Rp{(getDynamicStock(peer.ticker)?.currentPrice ?? peer.currentPrice).toLocaleString("id-ID")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
