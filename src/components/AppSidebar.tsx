import { motion, AnimatePresence } from "motion/react";
import { Newspaper, TrendingUp, TrendingDown, Wallet, PieChart, BarChart3, Layers, Clock, FileSpreadsheet, ChevronLeft, PanelLeftClose, PanelLeftOpen, Play, Download, Award, Calendar, Settings, BarChart2 } from "lucide-react";
import { idxNews, MKT, RS } from "../marketData";
import { STOCKS_DATA } from "../stocksData";
import { getIhsgData, computeRSI, computeMACD, isCrisisMode } from "../marketRegimeEngine";
import type { PortfolioItem, StockData } from "../types";
import { useState, useMemo } from "react";
import { ManageProfilesModal } from "./ManageProfilesModal";
import { useEngineConfig } from "../contexts/EngineConfigContext";
import { ExplainButton } from "./ExplainButton";
import { MultiSearchableSelect } from "./MultiSearchableSelect";
import { ConfirmModal } from "./ConfirmModal";

interface AppSidebarProps {
  activeTab: string;
  isMobileMenuOpen: boolean;
  onCloseMobile: () => void;
  cash: number;
  portfolio: PortfolioItem[];
  onClearPortfolio?: () => void;
  getDynamicStock: (ticker: string) => StockData | undefined;
}

function formatRupiah(val: number) {
  return "Rp " + Math.round(val).toLocaleString("id-ID");
}

function MiniSparkline({ data, width = 40, height = 16, color = "currentColor" }: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="flex-shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatVolume(vol: number): string {
  if (vol >= 1_000_000_000) return (vol / 1_000_000_000).toFixed(1) + "B";
  if (vol >= 1_000_000) return (vol / 1_000_000).toFixed(1) + "M";
  if (vol >= 1_000) return (vol / 1_000).toFixed(0) + "K";
  return vol.toString();
}

export function AppSidebar({
  activeTab,
  isMobileMenuOpen,
  onCloseMobile,
  cash,
  portfolio,
  onClearPortfolio,
  getDynamicStock,
}: AppSidebarProps) {
  const isIHSGInCrisis = isCrisisMode();
  const [showProfileManager, setShowProfileManager] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const totalInvestment = portfolio.reduce((sum, p) => sum + p.shares * p.buyPrice, 0);
  const totalCurrentValue = portfolio.reduce((sum, p) => {
    const stock = getDynamicStock(p.ticker);
    return sum + p.shares * (stock?.currentPrice || p.buyPrice);
  }, 0);
  const totalReturn = totalCurrentValue - totalInvestment;
  const totalReturnPct = totalInvestment > 0 ? (totalReturn / totalInvestment) * 100 : 0;

  const ihsgData = useMemo(() => getIhsgData(), []);
  const ihsgCloses = useMemo(() => ihsgData.map(d => d.close), [ihsgData]);
  const rsiIHSG = useMemo(() => computeRSI(ihsgCloses, 14), [ihsgCloses]);
  const macdResult = useMemo(() => computeMACD(ihsgCloses), [ihsgCloses]);

  function stockRSI(stock: StockData): number | null {
    const prices = stock.chartDataDaily?.map(d => d.price);
    if (!prices || prices.length < 15) return null;
    return computeRSI(prices, 14);
  }

  const topMovers = useMemo(() => {
    const sorted = [...STOCKS_DATA].sort((a, b) => b.change - a.change);
    return {
      gainers: sorted.slice(0, 5),
      losers: sorted.slice(-5).reverse(),
    };
  }, []);

  const gainersWithRSI = useMemo(() => topMovers.gainers.map(s => ({ stock: s, rsi: stockRSI(s) })), [topMovers]);
  const losersWithRSI = useMemo(() => topMovers.losers.map(s => ({ stock: s, rsi: stockRSI(s) })), [topMovers]);

  const breadth = useMemo(() => {
    const advancers = STOCKS_DATA.filter(s => s.change > 0).length;
    const decliners = STOCKS_DATA.filter(s => s.change < 0).length;
    return { advancers, decliners, total: STOCKS_DATA.length };
  }, []);

  function rsiColorClass(rsi: number | null): string {
    if (rsi === null) return "text-tertiary";
    if (rsi >= 70) return "text-emerald-400";
    if (rsi <= 30) return "text-rose-400";
    return "text-tertiary";
  }

  function rsiBgBar(rsi: number | null): string {
    if (rsi === null) return "bg-white/[0.06]";
    if (rsi >= 70) return "bg-emerald-400/30";
    if (rsi <= 30) return "bg-rose-400/30";
    return "bg-white/[0.10]";
  }

  const maxAbsChange = useMemo(() => {
    return Math.max(
      ...STOCKS_DATA.map(s => Math.abs(s.change)),
      1
    );
  }, []);

  const renderMarketContent = () => (
    <>
      <div id="sidebar-news-panel" className="mx-2">
        <div className="px-2 py-1 flex items-center gap-1.5 border-b border-white/[0.04]">
          <Newspaper className="w-3 h-3 text-tertiary" />
          <span className="text-caption font-medium text-tertiary uppercase tracking-wider">Berita</span>
        </div>
        <div className="pt-0.5 space-y-0 scrollbar-thin">
          {idxNews.map((news, idx) => (
            <a
              key={idx}
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="block px-2 py-1.5 rounded hover:bg-white/[0.03] transition-colors text-left group"
            >
              <div className="flex justify-between items-center text-label text-tertiary font-mono">
                <span>{news.portal}</span>
                <span>{news.time}</span>
              </div>
              <h4 className="text-caption text-tertiary group-hover:text-secondary leading-snug line-clamp-2 mt-0">
                {news.title}
              </h4>
            </a>
          ))}
        </div>
      </div>

      <div id="sidebar-macro-indicators-panel" className="mx-2">
        <div className="px-2 py-1 border-b border-white/[0.04] flex items-center justify-between">
          <span className="text-label font-medium text-tertiary uppercase tracking-wider">Makro</span>
          <ExplainButton label="Regime Status (Health / Opportunity / Risk)" />
        </div>
        <div className="px-2 py-1.5 space-y-1">
          <div className="flex items-center justify-between py-0.5">
            <span className="text-label text-tertiary">Market</span>
            <span className={`text-caption font-medium ${isIHSGInCrisis ? "text-rose-400" : RS.status === "SAFE" ? "text-emerald-400" : "text-amber-400"}`}>
              {isIHSGInCrisis ? "RISK OFF" : RS.status === "SAFE" ? "RISK ON" : "WARNING"}
            </span>
          </div>

          <div className="space-y-1.5">
            <div>
              <div className="flex justify-between text-label text-tertiary mb-0.5">
                <span>Health</span>
                <span className="text-secondary">{RS.market_health}%</span>
              </div>
              <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="bg-[#d1d4dc] h-full rounded-full" style={{ width: `${RS.market_health}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-label text-tertiary mb-0.5">
                <span>Opp.</span>
                <span className="text-secondary">{RS.opportunity}%</span>
              </div>
              <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="bg-[#00c9a5] h-full rounded-full" style={{ width: `${RS.opportunity}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-label text-tertiary mb-0.5">
                <span>Risk</span>
                <span className="text-secondary">{RS.risk}%</span>
              </div>
              <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="bg-[#f23645] h-full rounded-full" style={{ width: `${RS.risk}%` }} />
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.04] pt-2 space-y-1.5">
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">USD/IDR</span>
              <span className="text-body text-secondary font-mono">Rp{MKT.usdidr.value.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Gold/gr</span>
              <span className="text-body text-secondary font-mono">Rp{MKT.gold.value.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>
      </div>

      <div id="sidebar-top-movers" className="mx-2">
        <div className="px-2 py-1 flex items-center gap-1.5 border-b border-white/[0.04]">
          <TrendingUp className="w-3 h-3 text-tertiary" />
          <span className="text-caption font-medium text-tertiary uppercase tracking-wider">Top Movers</span>
          <span className="ml-auto"><ExplainButton label="Top Gainers &amp; Losers — sparkline 20 hari, volume terakhir, RSI (Hijau ≥70, Abu 30-70, Merah ≤30)" /></span>
        </div>
        <div className="grid grid-cols-2 gap-1 px-2 py-1.5">
          <div>
            <div className="flex items-center gap-1 mb-1">
              <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
              <span className="text-caption font-medium text-emerald-400">Gainers</span>
            </div>
            <div className="space-y-1">
              {gainersWithRSI.map(({ stock, rsi }) => {
                const sparkData = stock.chartDataDaily?.slice(-20).map(d => d.price) || [];
                const lastVol = stock.chartDataDaily?.[stock.chartDataDaily.length - 1]?.volume || 0;
                return (
                  <div key={stock.ticker} className="flex items-center gap-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-caption font-medium text-primary truncate">{stock.ticker.replace(".JK","")}</span>
                        <span className={`text-caption font-mono font-bold ${stock.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MiniSparkline data={sparkData} color={stock.change >= 0 ? "#34d399" : "#fb7185"} />
                        <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${stock.change >= 0 ? "bg-emerald-400/50" : "bg-rose-400/50"}`}
                            style={{ width: `${Math.min(Math.abs(stock.change) / maxAbsChange * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-label text-tertiary font-mono">{formatVolume(lastVol)}</span>
                        <span className={`text-label font-mono ${rsiColorClass(rsi)}`}>
                          {rsi !== null ? rsi.toFixed(0) : "--"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 mb-1">
              <TrendingDown className="w-2.5 h-2.5 text-rose-400" />
              <span className="text-caption font-medium text-rose-400">Losers</span>
            </div>
            <div className="space-y-1">
              {losersWithRSI.map(({ stock, rsi }) => {
                const sparkData = stock.chartDataDaily?.slice(-20).map(d => d.price) || [];
                const lastVol = stock.chartDataDaily?.[stock.chartDataDaily.length - 1]?.volume || 0;
                return (
                  <div key={stock.ticker} className="flex items-center gap-1.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-caption font-medium text-primary truncate">{stock.ticker.replace(".JK","")}</span>
                        <span className={`text-caption font-mono font-bold ${stock.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MiniSparkline data={sparkData} color={stock.change >= 0 ? "#34d399" : "#fb7185"} />
                        <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${stock.change >= 0 ? "bg-emerald-400/50" : "bg-rose-400/50"}`}
                            style={{ width: `${Math.min(Math.abs(stock.change) / maxAbsChange * 100, 100)}%` }}
                          />
                        </div>
                        <span className="text-label text-tertiary font-mono">{formatVolume(lastVol)}</span>
                        <span className={`text-label font-mono ${rsiColorClass(rsi)}`}>
                          {rsi !== null ? rsi.toFixed(0) : "--"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div id="sidebar-technical-stats" className="mx-2">
        <div className="px-2 py-1 flex items-center gap-1.5 border-b border-white/[0.04]">
          <BarChart3 className="w-3 h-3 text-tertiary" />
          <span className="text-caption font-medium text-tertiary uppercase tracking-wider">Teknikal</span>
          <span className="ml-auto"><ExplainButton label="Indikator teknikal IHSG: RSI, MACD, SMA, Market Breadth, Score Gap" /></span>
        </div>
        <div className="px-2 py-1.5 space-y-1.5">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <div>
              <span className="text-label text-tertiary block">RSI(14)</span>
              <span className={`text-body font-mono font-bold ${rsiColorClass(rsiIHSG)}`}>
                {rsiIHSG !== null ? rsiIHSG.toFixed(1) : "--"}
              </span>
            </div>
            <div>
              <span className="text-label text-tertiary block">MACD</span>
              <span className="text-body font-mono font-bold text-secondary">
                {macdResult !== null ? macdResult.macd.toFixed(1) : "--"}
              </span>
              {macdResult !== null && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`text-caption font-mono ${macdResult.histogram >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {macdResult.histogram >= 0 ? "+" : ""}{macdResult.histogram.toFixed(1)}
                  </span>
                  <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${macdResult.histogram >= 0 ? "bg-emerald-400/50" : "bg-rose-400/50"}`}
                      style={{ width: `${Math.min(Math.abs(macdResult.histogram) * 10, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            <div>
              <span className="text-label text-tertiary block">SMA20</span>
              <span className="text-caption font-mono text-secondary">
                {ihsgCloses.length > 20 ? ihsgCloses.slice(-20).reduce((s, v) => s + v, 0) / 20 : "--"}
              </span>
            </div>
            <div>
              <span className="text-label text-tertiary block">SMA50</span>
              <span className="text-caption font-mono text-secondary">
                {ihsgCloses.length > 50 ? ihsgCloses.slice(-50).reduce((s, v) => s + v, 0) / 50 : "--"}
              </span>
            </div>
          </div>
          <div className="border-t border-white/[0.04] pt-1.5 grid grid-cols-2 gap-x-3 gap-y-1">
            <div>
              <span className="text-label text-tertiary block">Breadth</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-caption text-emerald-400 font-mono">{breadth.advancers}</span>
                <span className="text-label text-tertiary">/</span>
                <span className="text-caption text-rose-400 font-mono">{breadth.decliners}</span>
                <span className="text-label text-tertiary">/</span>
                <span className="text-caption text-tertiary font-mono">{breadth.total}</span>
              </div>
            </div>
            <div>
              <span className="text-label text-tertiary block">Score Gap</span>
              <span className="text-body font-mono font-bold text-secondary">
                {RS.radar_context?.score_gap !== undefined
                  ? RS.radar_context.score_gap.toFixed(1)
                  : "--"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderPortfolioContent = () => {
    const sectorMap: Record<string, number> = {};
    portfolio.forEach(p => {
      const stock = getDynamicStock(p.ticker);
      const sector = stock?.sector || "Unknown";
      sectorMap[sector] = (sectorMap[sector] || 0) + p.shares * (stock?.currentPrice || p.buyPrice);
    });
    const sectorEntries = Object.entries(sectorMap).sort((a, b) => b[1] - a[1]);

    return (
      <>
        <div className="mx-2">
          <div className="px-2 py-1 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Wallet className="w-3 h-3 text-tertiary" />
            <span className="text-caption font-medium text-tertiary uppercase tracking-wider">Ringkasan</span>
          </div>
          <div className="px-2 py-1.5 space-y-1">
            <div className="flex items-center justify-between py-0.5">
              <span className="text-label text-tertiary">Investasi</span>
              <span className="text-body text-secondary font-mono">{formatRupiah(totalInvestment)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Nilai Saat Ini</span>
              <span className="text-body text-secondary font-mono">{formatRupiah(totalCurrentValue)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Return</span>
              <span className={`text-body font-mono ${totalReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {totalReturn >= 0 ? "+" : ""}{formatRupiah(totalReturn)} ({totalReturnPct >= 0 ? "+" : ""}{totalReturnPct.toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Kas</span>
              <span className="text-body text-secondary font-mono">{formatRupiah(cash)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Total Aset</span>
              <span className="text-body text-secondary font-mono">{formatRupiah(totalCurrentValue + cash)}</span>
            </div>
          </div>
        </div>

        <div className="mx-2">
          <div className="px-2 py-1 flex items-center gap-1.5 border-b border-white/[0.04]">
            <PieChart className="w-3 h-3 text-tertiary" />
            <span className="text-caption font-medium text-tertiary uppercase tracking-wider">Sektor</span>
            <span className="ml-auto"><ExplainButton label="Alokasi Sektor (bobot nilai portfolio per sektor)" /></span>
          </div>
          <div className="px-2 py-2 space-y-1.5">
            {sectorEntries.length === 0 ? (
              <span className="text-label text-tertiary italic">Belum ada posisi</span>
            ) : (
              sectorEntries.slice(0, 6).map(([sector, value]) => (
                <div key={sector}>
                  <div className="flex justify-between text-label text-tertiary mb-0.5">
                    <span>{sector}</span>
                    <span className="text-secondary font-mono">{formatRupiah(value)}</span>
                  </div>
                  <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400/60"
                      style={{ width: `${(value / (totalCurrentValue || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mx-2">
          <div className="px-2 py-1 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Layers className="w-3 h-3 text-tertiary" />
            <span className="text-caption font-medium text-tertiary uppercase tracking-wider">Posisi Terbuka</span>
          </div>
          <div className="px-2 space-y-0 max-h-[240px] overflow-y-auto scrollbar-thin">
            {portfolio.length === 0 ? (
              <span className="text-label text-tertiary italic">Kosong</span>
            ) : (
              portfolio.map(p => {
                const stock = getDynamicStock(p.ticker);
                const currentPrice = stock?.currentPrice || p.buyPrice;
                const gainPct = ((currentPrice - p.buyPrice) / p.buyPrice) * 100;
                return (
                  <div key={p.ticker} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-body font-bold text-primary">{p.ticker}</span>
                      <span className="text-label text-tertiary">{p.shares} lbr</span>
                    </div>
                    <span className={`text-body font-mono ${gainPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Mobile-friendly config section header - only in sidebar */}
        <div className="mx-2">
          <div className="px-2 py-1 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Settings className="w-3 h-3 text-tertiary" />
            <span className="text-caption font-medium text-primary uppercase tracking-wider">Mesin Kuantitatif</span>
            <span className="ml-auto"><ExplainButton label="Mesin Kuantitatif (topNCount, reserveBufferPct, crashSensitivity, sell/buy triggers, bobot Q/G/V/M)" /></span>
          </div>
          <EngineConfigSidebarContent />
        </div>
      </>
    );
  };

  const renderAnalyticsContent = () => {
    const totalStocks = portfolio.length;
    const winners = portfolio.filter(p => {
      const stock = getDynamicStock(p.ticker);
      return (stock?.currentPrice || p.buyPrice) > p.buyPrice;
    }).length;
    const losers = totalStocks - winners;

    return (
      <>
        <div className="mx-2">
          <div className="px-2 py-1 flex items-center gap-1.5 border-b border-white/[0.04]">
            <BarChart3 className="w-3 h-3 text-tertiary" />
            <span className="text-caption font-medium text-tertiary uppercase tracking-wider">Analitik</span>
          </div>
          <div className="px-2 py-1.5 space-y-1">
            <div className="flex items-center justify-between py-0.5">
              <span className="text-label text-tertiary">Portofolio</span>
              <span className="text-body text-secondary">{totalStocks} saham</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Profit</span>
              <span className="text-caption text-emerald-400">{winners} saham</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Loss</span>
              <span className="text-caption text-rose-400">{losers} saham</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Win Rate</span>
              <span className="text-caption text-secondary">{totalStocks > 0 ? ((winners / totalStocks) * 100).toFixed(0) : 0}%</span>
            </div>
            {totalStocks > 0 && (
              <div className="mt-2 pt-2 border-t border-rose-500/20">
                <span className="text-label font-bold uppercase tracking-widest text-rose-400/60 block mb-1">Danger Zone</span>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="w-full py-1.5 text-label font-bold uppercase tracking-wider text-rose-400/70 hover:text-rose-300 bg-white/[0.03] hover:bg-rose-900/20 rounded-lg border border-white/[0.04] hover:border-rose-800/30 transition-all cursor-pointer"
                >
                  Reset Portofolio
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mx-2">
          <div className="px-2 py-1 flex items-center gap-1.5 border-b border-white/[0.04]">
            <TrendingUp className="w-3 h-3 text-tertiary" />
            <span className="text-caption font-medium text-tertiary uppercase tracking-wider">Market Context</span>
          </div>
          <div className="px-2 py-1.5 space-y-1">
            <div className="flex items-center justify-between py-0.5">
              <span className="text-label text-tertiary">IHSG</span>
              <span className="text-caption text-secondary font-mono">{MKT.ihsg.value.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">MoM</span>
              <span className={`text-caption font-mono ${MKT.ihsg.monthly >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {MKT.ihsg.monthly >= 0 ? "+" : ""}{MKT.ihsg.monthly.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">RS Status</span>
              <span className={`text-caption font-medium ${RS.status === "SAFE" ? "text-emerald-400" : RS.status === "WARNING" ? "text-amber-400" : "text-rose-400"}`}>
                {RS.status}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Health</span>
              <span className="text-caption text-secondary">{RS.market_health}%</span>
            </div>
          </div>
        </div>

        <div className="mx-2">
          <div className="px-2 py-1 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Clock className="w-3 h-3 text-tertiary" />
            <span className="text-caption font-medium text-tertiary uppercase tracking-wider">Quick Filters</span>
          </div>
          <div className="px-2 py-1 space-y-0.5">
            <div className="text-label text-tertiary leading-relaxed">
              Gunakan sub-tab <span className="text-secondary font-medium">Leaders</span>, <span className="text-secondary font-medium">Recovery</span>, dan <span className="text-secondary font-medium">Risk</span> untuk analisis lebih dalam.
            </div>
          </div>
        </div>
      </>
    );
  };

  function EngineConfigSidebarContent() {
    const { engineConfig, activeProfile, updateConfigValue, setActiveProfile, isSettingsLocked, setIsSettingsLocked, isConfigSynced } = useEngineConfig();
    return (
      <div className="px-2 py-2 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-label text-tertiary">Status</span>
          <button onClick={() => setIsSettingsLocked(!isSettingsLocked)}
            className={`text-label font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
              isSettingsLocked
                ? "bg-white/[0.04] text-tertiary"
                : "bg-white/10 text-primary"
            }`}>
            {isSettingsLocked ? "Terkunci" : "Terbuka"}
          </button>
        </div>

        {/* DCA Rekomendasi on/off toggle — gates BuyPressureDashboard in Portfolio */}
        <div className="flex items-center justify-between">
          <span className="text-label text-tertiary">DCA Rekomendasi</span>
          <button onClick={() => updateConfigValue("dcaActive", !engineConfig.dcaActive)}
            className="text-label font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer"
            style={{
              backgroundColor: engineConfig.dcaActive !== false ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)',
              color: engineConfig.dcaActive !== false ? '#00c9a5' : '#7a7a7a',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
            {engineConfig.dcaActive !== false ? "AKTIF" : "NONAKTIF"}
          </button>
        </div>

        {/* BPS Config — show what config the live BPS dashboard is using */}
        <div className="px-2 py-1.5 bg-white/[0.01] border border-white/[0.03] rounded-lg space-y-0.5">
          <span className="text-label text-tertiary block font-mono">Profil Strategi Aktif</span>
          <div className="text-caption text-white/70 font-mono">
            Profile: <span className="text-emerald-400">{activeProfile?.name || engineConfig.activeProfileId}</span>
          </div>
          <div className="text-caption text-white/70 font-mono">
            Universe: <span className="text-emerald-400">{engineConfig.universe.toUpperCase()}</span>
          </div>
          <div className="text-caption text-white/70 font-mono">
            Top N: <span className="text-emerald-400">{engineConfig.topNCount}</span>
          </div>
          <div className="text-caption text-white/70 font-mono">
            Q/G/V/M/D: <span className="text-emerald-400">{Math.round((activeProfile?.qualityWeight ?? 0) * 100)}/{Math.round((activeProfile?.growthWeight ?? 0) * 100)}/{Math.round((activeProfile?.valueWeight ?? 0) * 100)}/{Math.round((activeProfile?.momentumWeight ?? 0) * 100)}/{Math.round((activeProfile?.dividendWeight ?? 0) * 100)}</span>
          </div>
          {isConfigSynced === false && (
            <div className="text-label text-amber-400 mt-1 font-mono">⚠ Backtest config differs</div>
          )}
        </div>

          <div className={`space-y-2 ${isSettingsLocked ? "opacity-50 pointer-events-none" : ""}`}>
            <span className="text-label text-tertiary block">Mode</span>
            <div className="flex gap-1">
              {([["algo","Algo"],["custom","Custom"]] as const).map(([k, label]) => (
                <button key={k} onClick={() => updateConfigValue("simulationMode", k)}
                  className="flex-1 py-1 text-caption font-medium rounded transition-colors cursor-pointer"
                  style={{ backgroundColor: engineConfig.simulationMode === k ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.simulationMode === k ? '#00c9a5' : '#7a7a7a', border: engineConfig.simulationMode === k ? '1px solid rgba(0,201,165,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

        {engineConfig.simulationMode === "custom" ? (
          <div className={`space-y-2 ${isSettingsLocked ? "opacity-50 pointer-events-none" : ""}`}>
            <div>
              <span className="text-label text-tertiary block mb-1">Custom Universe</span>
              {engineConfig.customUniverse && engineConfig.customUniverse.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {engineConfig.customUniverse.map((t, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      #{t}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-caption text-tertiary italic">Set di panel Backtest</span>
              )}
            </div>
          </div>
        ) : (
          <div className={`space-y-2 ${isSettingsLocked ? "opacity-50 pointer-events-none" : ""}`}>
            <div>
              <span className="text-label text-tertiary block mb-1">Konfigurasi</span>
              <div className="flex gap-1 flex-wrap">
                {engineConfig.profiles.map(p => (
                  <button key={p.id} onClick={() => setActiveProfile(p.id)}
                    className="flex-1 py-1 text-caption font-medium rounded transition-colors cursor-pointer"
                    style={{ backgroundColor: engineConfig.activeProfileId === p.id ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.activeProfileId === p.id ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {p.name.length > 15 ? p.id.toUpperCase() : p.name}
                  </button>
                ))}
              </div>
              {engineConfig.profiles.length > 2 && (
                <div className="mt-1 text-caption text-tertiary">
                  Aktif: <span className="text-accent">{activeProfile.name}</span>
                </div>
              )}
              <button onClick={() => setShowProfileManager(true)}
                className="mt-1 text-caption text-emerald-500/60 hover:text-emerald-400 transition-colors cursor-pointer">
                Edit Profiles
              </button>
            </div>
            <div>
              <span className="text-label text-tertiary block mb-1">Universe</span>
              <div className="flex gap-1 flex-wrap">
                {([["all","All"],["idx80","IDX80"],["idx30","IDX30"],["lq45","LQ45"]] as const).map(([k, label]) => (
                  <button key={k} onClick={() => updateConfigValue("universe", k)}
                    className="flex-1 py-0.5 text-caption font-medium rounded transition-colors cursor-pointer"
                    style={{ backgroundColor: engineConfig.universe === k ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.universe === k ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex justify-between text-label mb-0.5">
                <span className="text-tertiary">Top N</span>
                <span className="text-accent font-bold">{engineConfig.topNCount}</span>
              </div>
              <input type="range" min="3" max="7" step="1" value={engineConfig.topNCount}
                onChange={e => updateConfigValue("topNCount", parseInt(e.target.value))}
                className="w-full accent-emerald-500 h-1" />
            </div>
            <div>
              <span className="text-label text-tertiary block mb-1">Rotasi Saham</span>
              <div className="flex gap-1">
                <button onClick={() => updateConfigValue("enableCrossover", true)}
                  className="flex-1 py-1 text-caption font-medium rounded transition-colors cursor-pointer"
                  style={{ backgroundColor: engineConfig.enableCrossover !== false ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.enableCrossover !== false ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Aktif
                </button>
                <button onClick={() => updateConfigValue("enableCrossover", false)}
                  className="flex-1 py-1 text-caption font-medium rounded transition-colors cursor-pointer"
                  style={{ backgroundColor: engineConfig.enableCrossover === false ? 'rgba(242,54,69,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.enableCrossover === false ? '#f23645' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Tanpa
                </button>
              </div>
            </div>
            <div>
              <span className="text-label text-tertiary block mb-1">Adaptive Weights (Auto)</span>
              <button onClick={() => updateConfigValue("enableAdaptiveWeights", !engineConfig.enableAdaptiveWeights)}
                className="w-full py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                style={{ backgroundColor: engineConfig.enableAdaptiveWeights ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.enableAdaptiveWeights ? '#a855f7' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                {engineConfig.enableAdaptiveWeights ? "ON — Auto-adjust Q/G/V/M" : "OFF — Static Profile Weights"}
              </button>
            </div>
          </div>
        )}

        <div className={`border-t border-white/[0.04] pt-2 space-y-2 ${isSettingsLocked ? "opacity-50 pointer-events-none" : ""}`}>
          <div>
            <span className="text-label text-tertiary block mb-1">Safeguard</span>
            <div className="flex gap-1">
              <button onClick={() => updateConfigValue("safeHavenAsset", "emas")}
                className="flex-1 py-1 text-caption font-medium rounded transition-colors cursor-pointer"
                style={{ backgroundColor: engineConfig.safeHavenAsset === "emas" ? 'rgba(240,165,0,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.safeHavenAsset === "emas" ? '#f0a500' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                Emas
              </button>
              <button onClick={() => updateConfigValue("safeHavenAsset", "kas")}
                className="flex-1 py-1 text-caption font-medium rounded transition-colors cursor-pointer"
                style={{ backgroundColor: engineConfig.safeHavenAsset === "kas" ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.safeHavenAsset === "kas" ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                Kas
              </button>
            </div>
          </div>
          {/* FASE 2.4 — Advanced Safeguards (Crash + Buffer) collapsed by default */}
          <details className="border-t border-white/[0.04] pt-2">
            <summary className="text-label font-medium text-tertiary cursor-pointer hover:text-secondary transition-colors py-1 list-none flex items-center gap-1">
              <span className="text-caption">▸</span>
              Pengaturan Lanjutan
            </summary>
            <div className="mt-2 space-y-2">
              <div>
                <span className="text-label text-tertiary block mb-1">Proteksi Crash</span>
                <div className="flex gap-1 items-center">
                  <button onClick={() => updateConfigValue("enableCrashProtection", engineConfig.enableCrashProtection === false ? true : false)}
                    className="px-2 py-1 text-caption font-medium rounded transition-colors cursor-pointer"
                    style={{ backgroundColor: engineConfig.enableCrashProtection !== false ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.enableCrashProtection !== false ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {engineConfig.enableCrashProtection !== false ? "AKTIF" : "NONAKTIF"}
                  </button>
                  <input type="range" min="5" max="30" step="1" value={engineConfig.crashSensitivity ?? 10}
                    onChange={e => updateConfigValue("crashSensitivity", Number(e.target.value))}
                    disabled={engineConfig.enableCrashProtection === false}
                    className="flex-1 accent-emerald-500 h-1.5" />
                  <span className="text-caption text-tertiary ml-1">{engineConfig.crashSensitivity ?? 10}%</span>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-label mb-0.5">
                  <span className="text-tertiary">Buffer Kas</span>
                  <span className="text-accent font-bold">{engineConfig.reserveBufferPct ?? 10}%</span>
                </div>
                <input type="range" min="0" max="30" step="5" value={engineConfig.reserveBufferPct ?? 10}
                  onChange={e => updateConfigValue("reserveBufferPct", Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1" />
              </div>
            </div>
          </details>
        </div>
      </div>
    );
  }

  const renderBacktestContent = () => {
    const { engineConfig, updateConfigValue, setActiveProfile, todayWIBStr, backtestResult, isBacktesting, triggerBacktest, backtestConfig, updateBacktestValue } = useEngineConfig();
    return (
      <>
        <div className="mx-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Clock className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-primary uppercase tracking-wider">Mode</span>
          </div>
          <div className="px-2 py-1.5 space-y-1.5">
          <div className="flex gap-1">
              {([
                ["algo", "Algo"],
                ["custom", "Custom"],
              ] as const).map(([k, label]) => (
                <button key={k} onClick={() => updateBacktestValue("simulationMode", k)}
                  className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                  style={{ backgroundColor: backtestConfig.simulationMode === k ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: backtestConfig.simulationMode === k ? '#00c9a5' : '#7a7a7a', border: backtestConfig.simulationMode === k ? '1px solid rgba(0,201,165,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {(backtestConfig.simulationMode === "algo" || backtestConfig.simulationMode === "adaptive_dca") ? (
          <>
            <div className="mx-2">
              <div className="px-2 py-1 border-b border-white/[0.04]">
                <span className="text-caption font-medium text-tertiary uppercase tracking-wider">Strategi</span>
              </div>
              <div className="px-2 py-2">
                <div className="flex gap-1">
                  {([
                    ["algo", "Rotation"],
                    ["adaptive_dca", "Adaptive (BPS)"],
                  ] as const).map(([k, label]) => (
                    <button key={k} onClick={() => updateBacktestValue("simulationMode", k)}
                      className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                      style={{ backgroundColor: backtestConfig.simulationMode === k ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: backtestConfig.simulationMode === k ? '#00c9a5' : '#7a7a7a', border: backtestConfig.simulationMode === k ? '1px solid rgba(0,201,165,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="text-label text-tertiary mt-1.5 leading-relaxed">
                  {backtestConfig.simulationMode === "adaptive_dca"
                    ? "BPS-driven deploy. Buy Pressure Score menentukan % kas."
                    : "Rebalancing bulanan berdasarkan ranking profil."}
                </p>
              </div>
            </div>

            <div className="mx-2">
              <div className="px-2 py-1 border-b border-white/[0.04]">
                <span className="text-caption font-medium text-tertiary uppercase tracking-wider">Jumlah Saham</span>
              </div>
              <div className="px-2 py-2">
                <div className="flex gap-1">
                  {[1, 3, 5, 10].map((n) => (
                    <button key={n} onClick={() => updateBacktestValue("topNCount", n)}
                      className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                      style={{ backgroundColor: backtestConfig.topNCount === n ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: backtestConfig.topNCount === n ? '#00c9a5' : '#7a7a7a', border: backtestConfig.topNCount === n ? '1px solid rgba(0,201,165,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                      Top {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mx-2">
              <div className="px-2 py-1 border-b border-white/[0.04]">
                <span className="text-caption font-medium text-tertiary uppercase tracking-wider">Universe</span>
              </div>
              <div className="px-2 py-2">
                <div className="flex gap-1 flex-wrap">
                  {([["all","Semua"],["idx80","IDX80"],["idx30","IDX30"],["lq45","LQ45"]] as const).map(([k, label]) => (
                    <button key={k} onClick={() => updateBacktestValue("universe", k)}
                      className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                      style={{ backgroundColor: backtestConfig.universe === k ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: backtestConfig.universe === k ? '#00c9a5' : '#7a7a7a', border: backtestConfig.universe === k ? '1px solid rgba(0,201,165,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mx-2">
              <div className="px-2 py-1 border-b border-white/[0.04]">
                <span className="text-caption font-medium text-tertiary uppercase tracking-wider">Konfigurasi</span>
              </div>
              <div className="px-2 py-2">
                <div className="flex gap-1">
                  {(["aman", "agresif", "dividen"] as const).map((pid) => (
                    <button key={pid} onClick={() => updateBacktestValue("activeProfileId", pid)}
                      className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                      style={{ backgroundColor: backtestConfig.activeProfileId === pid ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: backtestConfig.activeProfileId === pid ? '#00c9a5' : '#7a7a7a', border: backtestConfig.activeProfileId === pid ? '1px solid rgba(0,201,165,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                      {pid === "aman" ? "Aman" : pid === "agresif" ? "Agresif" : "Dividen"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="mx-2">
            <div className="px-2 py-1.5 border-b border-white/[0.04]">
              <span className="text-label font-medium text-tertiary uppercase tracking-wider">Saham</span>
            </div>
            <div className="px-2 py-1.5 space-y-1.5">
              <div>
                <span className="text-label text-tertiary block mb-1">Custom Universe (Eksklusif)</span>
                <MultiSearchableSelect
                  options={STOCKS_DATA.map(s => ({ value: s.ticker, label: `${s.ticker} — ${s.name}` }))}
                  value={backtestConfig.customUniverse || []}
                  onChange={(v) => updateBacktestValue("customUniverse", v)}
                  placeholder="Cari saham..."
                  theme="emerald"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mx-2">
          <div className="px-2 py-1 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Calendar className="w-3 h-3 text-tertiary" />
            <span className="text-caption font-medium text-primary uppercase tracking-wider">Waktu & Modal</span>
          </div>
          <div className="px-2 py-1.5 space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-label text-tertiary block mb-0.5">Mulai</label>
                <input type="date" value={backtestConfig.simStartDate} min="2000-01-03" max={backtestConfig.simEndDate}
                  onChange={e => updateBacktestValue("simStartDate", e.target.value)}
                  className="w-full text-caption p-1 bg-black border border-white/[0.08] rounded outline-none text-white font-mono" />
              </div>
              <div>
                <label className="text-label text-tertiary block mb-0.5">Sampai</label>
                <input type="date" value={backtestConfig.simEndDate} min={backtestConfig.simStartDate} max={todayWIBStr}
                  onChange={e => updateBacktestValue("simEndDate", e.target.value)}
                  className="w-full text-caption p-1 bg-black border border-white/[0.08] rounded outline-none text-white font-mono" />
              </div>
            </div>
            <div>
              <label className="text-label text-tertiary block mb-1">Modal (IDR)</label>
              <input type="text" value={backtestConfig.algoCapital.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                onChange={e => updateBacktestValue("algoCapital", e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Rp 100.000.000"
                className="w-full text-caption p-1.5 bg-black border border-white/[0.08] rounded outline-none text-white font-mono" />
              <div className="flex gap-1 mt-1">
                {["10000000", "50000000", "100000000"].map((preset) => (
                  <button key={preset} onClick={() => updateBacktestValue("algoCapital", preset)}
                    className={`text-label px-1.5 py-0.5 font-medium rounded transition-colors cursor-pointer ${
                      backtestConfig.algoCapital === preset
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 border border-white/[0.06] text-tertiary hover:text-secondary"
                    }`}>
                    Rp {(parseInt(preset) / 1000000).toLocaleString("id-ID")}Jt
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-2">
          <div className="px-2 py-1 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Layers className="w-3 h-3 text-tertiary" />
            <span className="text-caption font-medium text-primary uppercase tracking-wider">Strategi</span>
          </div>
          <div className="px-2 py-1.5 space-y-1.5">
            <div>
              <span className="text-label text-tertiary block mb-1">Rotasi Saham</span>
              <div className="flex gap-1">
                <button onClick={() => updateBacktestValue("enableCrossover", true)}
                  className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                  style={{ backgroundColor: backtestConfig.enableCrossover ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: backtestConfig.enableCrossover ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Rank &lt; 7
                </button>
                <button onClick={() => updateBacktestValue("enableCrossover", false)}
                  className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                  style={{ backgroundColor: !backtestConfig.enableCrossover ? 'rgba(242,54,69,0.15)' : 'rgba(255,255,255,0.04)', color: !backtestConfig.enableCrossover ? '#f23645' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Tanpa
                </button>
              </div>
            </div>

            <div>
              <span className="text-label text-tertiary block mb-1">Adaptive Weights (Auto)</span>
              <button onClick={() => updateBacktestValue("enableAdaptiveWeights", !backtestConfig.enableAdaptiveWeights)}
                className="w-full py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                style={{ backgroundColor: backtestConfig.enableAdaptiveWeights ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.04)', color: backtestConfig.enableAdaptiveWeights ? '#a855f7' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                {backtestConfig.enableAdaptiveWeights ? "ON — Auto-adjust Q/G/V/M" : "OFF — Static Profile Weights"}
              </button>
            </div>

            <div>
              <span className="text-label text-tertiary block mb-1">Proteksi Crash</span>
              <div className="flex gap-1 items-center">
                <button onClick={() => updateBacktestValue("enableCrashProtection", !backtestConfig.enableCrashProtection)}
                  className="px-2 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                  style={{ backgroundColor: backtestConfig.enableCrashProtection ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: backtestConfig.enableCrashProtection ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {backtestConfig.enableCrashProtection ? "ON" : "OFF"}
                </button>
                <input type="range" min="5" max="30" step="1" value={backtestConfig.crashSensitivity}
                  onChange={e => updateBacktestValue("crashSensitivity", Number(e.target.value))}
                  disabled={!backtestConfig.enableCrashProtection}
                  className="flex-1 accent-emerald-500 h-1.5" />
                <span className="text-caption text-tertiary ml-1">{backtestConfig.crashSensitivity}%</span>
              </div>
            </div>

            <div>
              <span className="text-label text-tertiary block mb-1">Safe Haven</span>
              <div className="flex gap-1">
                <button onClick={() => updateBacktestValue("safeHavenAsset", "emas")} disabled={!backtestConfig.enableCrashProtection}
                  className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer disabled:opacity-40"
                  style={{ backgroundColor: backtestConfig.safeHavenAsset === "emas" ? 'rgba(240,165,0,0.15)' : 'rgba(255,255,255,0.04)', color: backtestConfig.safeHavenAsset === "emas" ? '#f0a500' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Emas
                </button>
                <button onClick={() => updateBacktestValue("safeHavenAsset", "kas")} disabled={!backtestConfig.enableCrashProtection}
                  className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer disabled:opacity-40"
                  style={{ backgroundColor: backtestConfig.safeHavenAsset === "kas" ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: backtestConfig.safeHavenAsset === "kas" ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Kas
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-label mb-1">
                <span className="text-tertiary">Buffer Kas</span>
                <span className="text-accent">{backtestConfig.reserveBufferPct}%</span>
              </div>
              <input type="range" min="0" max="30" step="5" value={backtestConfig.reserveBufferPct}
                onChange={e => updateBacktestValue("reserveBufferPct", Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5" />
            </div>
          </div>
        </div>

        <div className="mx-2">
          <div className="px-2 py-1 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Play className="w-3 h-3 text-tertiary" />
            <span className="text-caption font-medium text-primary uppercase tracking-wider">Eksekusi</span>
          </div>
          <div className="px-2 py-2 space-y-2">
            <button onClick={() => triggerBacktest()}
              disabled={isBacktesting}
              className="w-full py-1.5 text-caption font-bold rounded-md transition-opacity cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: '#00c9a5', color: '#000' }}>
              {isBacktesting ? "Memproses..." : "Jalankan Backtest"}
            </button>
            {backtestResult && (
              <button onClick={() => document.dispatchEvent(new CustomEvent("download-csv-backtest"))}
                className="w-full py-1.5 text-caption font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#b0b0b0', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Download className="w-3 h-3 text-accent" />
                Unduh CSV
              </button>
            )}
          </div>
        </div>
      </>
    );
  };

  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={onCloseMobile}
          />
        )}
      </AnimatePresence>

      <aside id="main-sidebar" className={`${isMobileMenuOpen ? 'flex fixed inset-y-0 left-0 w-[85%] max-w-sm z-50 shadow-2xl' : 'hidden'} md:flex w-full md:static ${collapsed ? 'md:w-12' : 'md:w-64'} md:border-r border-white/[0.06] shrink-0 flex-col md:overflow-hidden relative transition-all duration-200`}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 py-2 px-1">
            <button
              onClick={() => setCollapsed(false)}
              className="w-8 h-8 rounded-md flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors cursor-pointer"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <div className="w-full h-px bg-white/[0.04]" />
            <div className="flex flex-col items-center gap-1 text-label text-tertiary">
              <Wallet className="w-4 h-4" />
              <span className="mt-1">Q</span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.04] shrink-0">
              <span className="text-label font-medium text-tertiary uppercase tracking-wider">
                {activeTab === "market" ? "Pasar" : activeTab === "portfolio" ? "Portofolio" : activeTab === "analytics" ? "Analitik" : "Backtest"}
              </span>
              <button
                onClick={() => setCollapsed(true)}
                className="w-5 h-5 rounded flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors cursor-pointer"
                title="Collapse sidebar"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-col flex-1 overflow-y-auto md:overflow-y-auto py-1 gap-1 scrollbar-thin">
              {activeTab === "market" && renderMarketContent()}
              {activeTab === "portfolio" && renderPortfolioContent()}
              {activeTab === "analytics" && renderAnalyticsContent()}
              {activeTab === "backtest" && renderBacktestContent()}
            </div>
          </>
        )}
      </aside>
      {showProfileManager && <ManageProfilesModal onClose={() => setShowProfileManager(false)} />}
      <ConfirmModal
        open={showResetConfirm}
        title="Reset Portofolio"
        message={
          <>
            Tindakan ini akan menghapus <strong>SEMUA posisi saham</strong> dari
            portofolio Anda. Tindakan ini <strong>tidak bisa dibatalkan</strong>.
            Lanjutkan?
          </>
        }
        confirmLabel="Hapus Permanen"
        variant="danger"
        onConfirm={() => onClearPortfolio?.()}
        onCancel={() => setShowResetConfirm(false)}
      />
    </>
  );
}


