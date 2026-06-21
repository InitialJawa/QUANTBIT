import { motion, AnimatePresence } from "motion/react";
import { Newspaper, TrendingUp, TrendingDown, Wallet, PieChart, BarChart3, Layers, Clock, FileSpreadsheet, ChevronLeft, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { DigitalWalletUI } from "./DigitalWalletUI";
import { idxNews, MKT, RS } from "../marketData";
import type { PortfolioItem, StockData } from "../types";
import { useState } from "react";

interface AppSidebarProps {
  activeTab: string;
  isMobileMenuOpen: boolean;
  onCloseMobile: () => void;
  cash: number;
  goldShares: number;
  tradeLogs: any[];
  portfolio: PortfolioItem[];
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number) => void;
  onMoveToGold: (amount: number) => void;
  onSellGold: (shares: number) => void;
  getDynamicStock: (ticker: string) => StockData;
}

function formatRupiah(val: number) {
  return "Rp " + Math.round(val).toLocaleString("id-ID");
}

export function AppSidebar({
  activeTab,
  isMobileMenuOpen,
  onCloseMobile,
  cash,
  goldShares,
  tradeLogs,
  portfolio,
  onDeposit,
  onWithdraw,
  onMoveToGold,
  onSellGold,
  getDynamicStock,
}: AppSidebarProps) {
  const isIHSGInCrisis = MKT.ihsg.monthly < -10;

  const totalInvestment = portfolio.reduce((sum, p) => sum + p.shares * p.avgPrice, 0);
  const totalCurrentValue = portfolio.reduce((sum, p) => {
    const stock = getDynamicStock(p.ticker);
    return sum + p.shares * (stock?.price || p.avgPrice);
  }, 0);
  const totalReturn = totalCurrentValue - totalInvestment;
  const totalReturnPct = totalInvestment > 0 ? (totalReturn / totalInvestment) * 100 : 0;

  const renderMarketContent = () => (
    <>
      <div id="rdi-digital-wallet-container" className="mx-2">
        <DigitalWalletUI
          cash={cash}
          goldShares={goldShares}
          tradeLogs={tradeLogs}
          onDeposit={onDeposit}
          onWithdraw={onWithdraw}
          onMoveToGold={onMoveToGold}
          onSellGold={onSellGold}
          onCloseMobile={onCloseMobile}
        />
      </div>

      <div id="sidebar-news-panel" className="mx-2">
        <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
          <Newspaper className="w-3 h-3 text-tertiary" />
          <span className="text-label font-medium text-tertiary uppercase tracking-wider">Berita</span>
        </div>
        <div className="pt-1 space-y-0.5 max-h-[120px] overflow-y-auto scrollbar-thin">
          {idxNews.slice(0, 4).map((news, idx) => (
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
              <h4 className="text-caption text-secondary group-hover:text-primary leading-snug line-clamp-2 mt-0">
                {news.title}
              </h4>
            </a>
          ))}
        </div>
      </div>

      <div id="sidebar-macro-indicators-panel" className="mx-2">
        <div className="px-2 py-1.5 border-b border-white/[0.04]">
          <span className="text-label font-medium text-tertiary uppercase tracking-wider">Makro</span>
        </div>
        <div className="px-2 py-2 space-y-2">
          <div className="flex items-center justify-between py-1">
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
                <div className="bg-[#089981] h-full rounded-full" style={{ width: `${RS.opportunity}%` }} />
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
              <span className="text-caption text-secondary font-mono">Rp{MKT.usdidr.value.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Gold/gr</span>
              <span className="text-caption text-secondary font-mono">Rp{MKT.gold.value.toLocaleString("id-ID")}</span>
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
      sectorMap[sector] = (sectorMap[sector] || 0) + p.shares * (stock?.price || p.avgPrice);
    });
    const sectorEntries = Object.entries(sectorMap).sort((a, b) => b[1] - a[1]);

    return (
      <>
        <div className="mx-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Wallet className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-tertiary uppercase tracking-wider">Ringkasan</span>
          </div>
          <div className="px-2 py-2 space-y-2">
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Investasi</span>
              <span className="text-caption text-secondary font-mono">{formatRupiah(totalInvestment)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Nilai Saat Ini</span>
              <span className="text-caption text-secondary font-mono">{formatRupiah(totalCurrentValue)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Return</span>
              <span className={`text-caption font-mono ${totalReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {totalReturn >= 0 ? "+" : ""}{formatRupiah(totalReturn)} ({totalReturnPct >= 0 ? "+" : ""}{totalReturnPct.toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Kas</span>
              <span className="text-caption text-secondary font-mono">{formatRupiah(cash)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Total Aset</span>
              <span className="text-caption text-secondary font-mono">{formatRupiah(totalCurrentValue + cash)}</span>
            </div>
          </div>
        </div>

        <div className="mx-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <PieChart className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-tertiary uppercase tracking-wider">Sektor</span>
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
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Layers className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-tertiary uppercase tracking-wider">Posisi Terbuka</span>
          </div>
          <div className="px-2 py-1 space-y-0.5 max-h-[240px] overflow-y-auto scrollbar-thin">
            {portfolio.length === 0 ? (
              <span className="text-label text-tertiary italic">Kosong</span>
            ) : (
              portfolio.map(p => {
                const stock = getDynamicStock(p.ticker);
                const currentPrice = stock?.price || p.avgPrice;
                const gainPct = ((currentPrice - p.avgPrice) / p.avgPrice) * 100;
                return (
                  <div key={p.ticker} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-caption font-bold text-primary">{p.ticker}</span>
                      <span className="text-label text-tertiary">{p.shares} lbr</span>
                    </div>
                    <span className={`text-caption font-mono ${gainPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </>
    );
  };

  const renderAnalyticsContent = () => {
    const totalStocks = portfolio.length;
    const winners = portfolio.filter(p => {
      const stock = getDynamicStock(p.ticker);
      return (stock?.price || p.avgPrice) > p.avgPrice;
    }).length;
    const losers = totalStocks - winners;

    return (
      <>
        <div className="mx-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <BarChart3 className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-tertiary uppercase tracking-wider">Analitik</span>
          </div>
          <div className="px-2 py-2 space-y-2">
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Portofolio</span>
              <span className="text-caption text-secondary">{totalStocks} saham</span>
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
          </div>
        </div>

        <div className="mx-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <TrendingUp className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-tertiary uppercase tracking-wider">Market Context</span>
          </div>
          <div className="px-2 py-2 space-y-1.5">
            <div className="flex items-center justify-between py-1">
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
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Clock className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-tertiary uppercase tracking-wider">Quick Filters</span>
          </div>
          <div className="px-2 py-2 space-y-1">
            <div className="text-label text-tertiary leading-relaxed">
              Gunakan sub-tab <span className="text-secondary font-medium">Leaders</span>, <span className="text-secondary font-medium">Recovery</span>, dan <span className="text-secondary font-medium">Risk</span> untuk analisis lebih dalam.
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderBacktestContent = () => (
    <>
      <div className="mx-2">
        <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
          <Clock className="w-3 h-3 text-tertiary" />
          <span className="text-label font-medium text-tertiary uppercase tracking-wider">Backtest</span>
        </div>
        <div className="px-2 py-2 space-y-2">
          <div className="text-label text-tertiary leading-relaxed">
            Panel simulasi historis. Atur parameter di tab utama untuk backtest strategi rebalancing dari tahun 2000.
          </div>
          <div className="border-t border-white/[0.04] pt-2 space-y-1.5">
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Data</span>
              <span className="text-caption text-secondary">2000 - 2026</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Mode</span>
              <span className="text-caption text-secondary">Algo / Single</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Universe</span>
              <span className="text-caption text-secondary">All / IDX80 / LQ45</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-2">
        <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
          <Layers className="w-3 h-3 text-tertiary" />
          <span className="text-label font-medium text-tertiary uppercase tracking-wider">Strategi</span>
        </div>
        <div className="px-2 py-2 space-y-1.5">
          <div className="flex items-center justify-between py-1">
            <span className="text-label text-tertiary">Rank Crossover</span>
            <span className="text-caption text-emerald-400">Aktif</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-label text-tertiary">Crash Protection</span>
            <span className="text-caption text-emerald-400">Aktif</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-label text-tertiary">Safe Haven</span>
            <span className="text-caption text-secondary">Emas / Kas</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-label text-tertiary">Reserve Buffer</span>
            <span className="text-caption text-secondary">10%</span>
          </div>
        </div>
      </div>

      <div className="mx-2">
        <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
          <FileSpreadsheet className="w-3 h-3 text-tertiary" />
          <span className="text-label font-medium text-tertiary uppercase tracking-wider">Sub-Tab</span>
        </div>
        <div className="px-2 py-2">
          <div className="text-label text-tertiary leading-relaxed">
            Gunakan sub-tab <span className="text-secondary font-medium">Historis</span>, <span className="text-secondary font-medium">Algoritma</span>, dan <span className="text-secondary font-medium">Log</span> untuk navigasi hasil backtest.
          </div>
        </div>
      </div>
    </>
  );

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

      <aside id="main-sidebar" className={`${isMobileMenuOpen ? 'flex fixed inset-y-0 left-0 w-[85%] max-w-sm z-50 shadow-2xl' : 'hidden'} md:flex w-full md:static ${collapsed ? 'md:w-12' : 'md:w-56 lg:w-64'} md:border-r border-white/[0.06] shrink-0 flex-col md:overflow-hidden relative transition-all duration-200`}>
        <div className="flex flex-col flex-1 overflow-y-auto md:overflow-y-auto py-2 gap-2 scrollbar-thin">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2 px-1">
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
              {activeTab === "market" && renderMarketContent()}
              {activeTab === "portfolio" && renderPortfolioContent()}
              {activeTab === "analytics" && renderAnalyticsContent()}
              {activeTab === "backtest" && renderBacktestContent()}
            </>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="hidden md:flex absolute -right-3 top-3 w-6 h-6 rounded-full bg-[#1a1a1a] border border-white/[0.06] items-center justify-center text-white/30 hover:text-white/60 hover:border-white/[0.12] transition-colors cursor-pointer z-10 shadow-sm"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </aside>
    </>
  );
}
