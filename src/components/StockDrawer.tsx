import { motion, AnimatePresence } from "motion/react";
import {
  X, Plus, Minus, Trash2, Bookmark, BookmarkCheck,
  LineChart, BookOpen, Sparkles, Coins
} from "lucide-react";
import { TickerLogo } from "./TickerLogo";
import { DataSourcesRow } from "./SourceBadge";
import { HistoricalChart } from "./HistoricalChart";
import { DeepReport } from "./DeepReport";
import { ForwardDividendsForecast } from "./ForwardDividendsForecast";
import type { StockData, PortfolioItem, WatchlistItem, AnalysisResult } from "../types";

interface StockDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeStock: StockData;
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  drawerTab: "chart" | "sheets" | "gemini-ai" | "forecast";
  onTabChange: (tab: "chart" | "sheets" | "gemini-ai" | "forecast") => void;
  drawerLots: number | "";
  onLotsChange: (lots: number | "") => void;
  onBuy: (ticker: string, shares: number, price: number) => void;
  onSell: (ticker: string, shares: number) => void;
  onRemove: (ticker: string) => void;
  onToggleWatchlist: (ticker: string) => void;
  onGenerateReport: (customFocus?: string) => Promise<void>;
  isGenerating: boolean;
  generationError: string | null;
  activeReport: AnalysisResult | null;
  chartTheme: "dark" | "light";
}

const DRAWER_TABS = [
  { id: "chart" as const, icon: LineChart, label: "Chart" },
  { id: "sheets" as const, icon: BookOpen, label: "Financials" },
  { id: "gemini-ai" as const, icon: Sparkles, label: "AI Intel" },
  { id: "forecast" as const, icon: Coins, label: "Dividend" },
];

export function StockDrawer({
  isOpen,
  onClose,
  activeStock,
  portfolio,
  watchlist,
  drawerTab,
  onTabChange,
  drawerLots,
  onLotsChange,
  onBuy,
  onSell,
  onRemove,
  onToggleWatchlist,
  onGenerateReport,
  isGenerating,
  generationError,
  activeReport,
  chartTheme,
}: StockDrawerProps) {
  const inPorto = portfolio.find(p => p.ticker === activeStock.ticker);

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="drawer-backdrop" className="fixed inset-0 z-50 flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black"
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative w-full max-w-2xl border-l border-white/[0.06] h-full flex flex-col justify-between shadow-2xl z-10 drawer-panel"
          >
            <div className="flex-1 flex flex-col min-h-0">

              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.04]">
                <div className="flex items-center gap-2.5">
                  <TickerLogo ticker={activeStock.ticker} size="lg" fallbackColor={activeStock.logoColor || "bg-[#3b82f6]"} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-white">{activeStock.ticker}</h3>
                      <span className="text-[11px] text-white/50">{activeStock.name}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-white/30 uppercase">{activeStock.sector}</span>
                      <DataSourcesRow dataSources={activeStock.dataSources} />
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1 rounded hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-5 py-3 border-b border-white/[0.04] flex items-center gap-2 flex-wrap">
                {inPorto && (
                  <span className="text-[11px] text-white/50 mr-1">
                    Held: <strong className="text-emerald-500 font-medium">{(inPorto.shares / 100).toLocaleString('id-ID')} Lot</strong>
                  </span>
                )}
                <input
                  type="number"
                  min="1"
                  value={drawerLots}
                  onChange={(e) => onLotsChange(e.target.value ? parseInt(e.target.value) : "")}
                  placeholder="Lots"
                  className="w-16 px-2 py-1 bg-white/[0.04] border border-white/[0.08] focus:border-emerald-500/50 outline-none text-white text-[11px] font-mono rounded text-center"
                />
                <button
                  onClick={() => {
                    if (drawerLots && drawerLots > 0) {
                      onBuy(activeStock.ticker, drawerLots * 100, activeStock.currentPrice);
                      onLotsChange("");
                    }
                  }}
                  className={`px-3 py-1 text-[11px] font-medium rounded transition-colors ${drawerLots && drawerLots > 0 ? "bg-emerald-500 hover:bg-emerald-600 text-white cursor-pointer" : "bg-white/[0.04] text-white/20 cursor-not-allowed"}`}
                >
                  <Plus className="w-3 h-3 inline mr-1" />Buy
                </button>
                {inPorto && (
                  <>
                    <button
                      onClick={() => {
                        if (drawerLots && drawerLots > 0) {
                          onSell(activeStock.ticker, drawerLots * 100);
                          onLotsChange("");
                        }
                      }}
                      className={`px-3 py-1 text-[11px] font-medium rounded transition-colors ${drawerLots && drawerLots > 0 ? "bg-rose-500 hover:bg-rose-600 text-white cursor-pointer" : "bg-white/[0.04] text-white/20 cursor-not-allowed"}`}
                    >
                      <Minus className="w-3 h-3 inline mr-1" />Sell
                    </button>
                    <button
                      onClick={() => onRemove(activeStock.ticker)}
                      className="p-1.5 rounded hover:bg-rose-500/10 text-rose-400/60 hover:text-rose-400 transition-colors"
                      title="Remove from portfolio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => onToggleWatchlist(activeStock.ticker)}
                  className={`p-1.5 rounded transition-colors ${
                    watchlist.some(w => w.ticker === activeStock.ticker)
                      ? "text-amber-500 hover:bg-amber-500/10"
                      : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
                  }`}
                  title="Toggle watchlist"
                >
                  {watchlist.some(w => w.ticker === activeStock.ticker) ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex border-b border-white/[0.04]">
                {DRAWER_TABS.map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => onTabChange(id)}
                    className={`flex-1 py-2 text-[10px] font-medium tracking-wide transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      drawerTab === id
                        ? "text-emerald-500 border-b-2 border-emerald-500"
                        : "text-white/30 hover:text-white/60"
                    }`}
                  >
                    <Icon className="w-3 h-3" /> {label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    ["P/E", activeStock.peRatio < 0 ? "Loss" : `${activeStock.peRatio}x`],
                    ["P/B", `${activeStock.pbRatio}x`],
                    ["ROE", `${activeStock.roe}%`],
                    ["Div Yield", `${activeStock.dividendYield}%`],
                  ].map(([label, val]) => (
                    <div key={label as string} className="text-center">
                      <span className="text-[9px] text-white/30 block">{label}</span>
                      <span className="text-sm font-medium text-white block mt-0.5">{val}</span>
                    </div>
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {drawerTab === "chart" && (
                    <motion.div
                      key="drawer-chart"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <HistoricalChart stock={activeStock} theme={chartTheme} />
                    </motion.div>
                  )}

                  {drawerTab === "sheets" && (
                    <motion.div
                      key="drawer-sheets"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="border border-white/[0.06] rounded-lg p-4">
                        <span className="text-[10px] text-white/35 uppercase tracking-wider font-medium">Financial Statement (IDR B)</span>
                        <table className="w-full text-left mt-3 text-[11px]">
                          <thead>
                            <tr className="border-b border-white/[0.04] text-white/25 text-[9px] tracking-wide uppercase">
                              <th className="pb-2 font-medium">Metric</th>
                              {activeStock.metrics.map(m => (
                                <th key={m.year} className="pb-2 text-right font-medium">FY {m.year}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {[
                              ["Revenue", activeStock.metrics.map(m => m.revenue), false],
                              ["Net Income", activeStock.metrics.map(m => m.netIncome), true],
                              ["Total Assets", activeStock.metrics.map(m => m.totalAssets), false],
                              ["Liabilities", activeStock.metrics.map(m => m.totalLiabilities), false],
                              ["Equity", activeStock.metrics.map(m => m.totalEquity), false],
                            ].map(([label, values, isGreen]) => (
                              <tr key={label as string} className="hover:bg-white/[0.02]">
                                <td className={`py-2 text-white/70 ${isGreen ? "text-emerald-500" : ""}`}>{label}</td>
                                {(values as number[]).map((v, i) => (
                                  <td key={i} className={`py-2 text-right ${isGreen ? "text-emerald-500 font-medium" : "text-white"}`}>
                                    Rp{v.toLocaleString()} B
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {drawerTab === "gemini-ai" && (
                    <motion.div
                      key="drawer-gemini-ai"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <DeepReport
                        stock={activeStock}
                        report={activeReport}
                        onGenerateReport={onGenerateReport}
                        isGenerating={isGenerating}
                        error={generationError}
                      />
                    </motion.div>
                  )}

                  {drawerTab === "forecast" && (
                    <motion.div
                      key="drawer-forecast"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <ForwardDividendsForecast
                        stock={activeStock}
                        theme={chartTheme}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="border-t border-white/[0.04] pt-4">
                  <span className="text-[9px] text-white/25 uppercase tracking-wider font-medium">Profile</span>
                  <p className="text-[11px] text-white/60 mt-1.5 leading-relaxed">{activeStock.description}</p>
                </div>
              </div>
            </div>

            <div className="py-3 border-t border-white/[0.04] text-[9px] text-white/20 text-center shrink-0">
              Click outside to close
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
