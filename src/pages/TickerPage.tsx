import { useState, lazy, Suspense, useMemo } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Coins, LayoutDashboard, GitCompare, RotateCcw, Activity,
  Plus, Minus, Trash2, Bookmark, BookmarkCheck,
  ChevronDown, ChevronUp, Info, AlertTriangle, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { STOCKS_DATA } from "../stocksData";
import { TickerLogo } from "../components/TickerLogo";
import { ForwardDividendsForecast } from "../components/ForwardDividendsForecast";
import { assessTickerDataQuality, getDataQualityColor, getDecisionBadge } from "../utils/tickerDataQuality";
import { isCrashActive } from "../marketRegimeEngine";
import type { StockData, PortfolioItem, WatchlistItem } from "../types";

const OverviewTab = lazy(() => import("./tabs/OverviewTab").then(m => ({ default: m.OverviewTab })));
const PeerComparisonTab = lazy(() => import("./tabs/PeerComparisonTab").then(m => ({ default: m.PeerComparisonTab })));
const RotationHistoryTab = lazy(() => import("./tabs/RotationHistoryTab").then(m => ({ default: m.RotationHistoryTab })));
const SignalHistoryTab = lazy(() => import("./tabs/SignalHistoryTab").then(m => ({ default: m.SignalHistoryTab })));

interface TickerPageProps {
  code: string;
  getDynamicStock: (ticker: string) => StockData | undefined;
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  cash: number;
  onAddTransaction: (ticker: string, shares: number, price: number) => void;
  onSellTransaction: (ticker: string, shares: number) => void;
  onRemoveTransaction: (ticker: string) => void;
  onToggleWatchlist: (ticker: string) => void;
  tradeLogs: { ticker: string; shares: number; price: number; type: "buy" | "sell"; date: string }[];
  theme: "dark" | "light";
}

const TICKER_TABS = [
  { id: "overview", icon: LayoutDashboard, label: "Ringkasan" },
  { id: "forecast", icon: Coins, label: "Dividen" },
  { id: "peers", icon: GitCompare, label: "Peer" },
  { id: "rotation", icon: RotateCcw, label: "Rotasi" },
  { id: "signals", icon: Activity, label: "Sinyal" },
];

export function TickerPage({
  code,
  getDynamicStock,
  portfolio,
  watchlist,
  cash,
  onAddTransaction,
  onSellTransaction,
  onRemoveTransaction,
  onToggleWatchlist,
  tradeLogs,
  theme,
}: TickerPageProps) {
  const [, navigate] = useLocation();
  const stock = getDynamicStock(code) || STOCKS_DATA.find(s => s.ticker === code);
  const [tab, setTab] = useState("overview");
  const [lots, setLots] = useState<number | "">("");
  const [tradeExpanded, setTradeExpanded] = useState(false);

  const portfolioItem = portfolio.find(p => p.ticker === code);
  const isWatchlisted = watchlist.some(w => w.ticker === code);
  const price = stock?.currentPrice ?? 0;

  const isRiskOff = isCrashActive();

  const safeStock = stock ?? {
    ticker: code,
    name: code,
    sector: "-",
    subSector: "-",
    description: "Data tidak tersedia",
    logoColor: "bg-gray-600",
    marketCap: 0,
    currentPrice: 0,
    change: 0,
    peRatio: 0,
    pbRatio: 0,
    roe: 0,
    der: 0,
    dividendYield: 0,
    metrics: [],
    dataSources: { price: 0, fundamentals: 0, charts: 0, description: 0 } as any,
    chartDataDaily: [],
    chartDataWeekly: [],
    chartDataMonthly: [],
  };

  const dataQuality = useMemo(() => assessTickerDataQuality(safeStock), [safeStock.ticker]);
  const decision = useMemo(() => getDecisionBadge(safeStock, isRiskOff), [safeStock.ticker, isRiskOff]);

  if (!stock) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-white/60 gap-4">
        <Info className="w-12 h-12 opacity-40" />
        <p className="text-lg">Saham <span className="font-mono text-white/80">{code}</span> tidak ditemukan</p>
        <button
          onClick={() => navigate("/")}
          className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg transition-colors"
        >
          Kembali ke Market
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="shrink-0 border-b border-white/[0.06] bg-[#0a0a0f]/95 backdrop-blur-md sticky top-0 z-40">
        {/* Risk-Off Banner */}
        {isRiskOff && (
          <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="text-caption text-rose-400 font-medium">
              Pasar Risk Off — pembelian saham perlu kehati-hatian. Simpan kas atau alokasikan ke safe haven.
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => navigate("/")}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <TickerLogo ticker={safeStock.ticker} fallbackColor={safeStock.logoColor} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-white truncate">{safeStock.ticker}</h1>
              <span className="text-xs text-white/40 truncate hidden sm:inline">{safeStock.name}</span>
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getDataQualityColor(dataQuality.status)}`}>
                {dataQuality.label}
              </span>
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${decision.color}`}>
                {decision.label}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="font-mono text-white font-medium">Rp{price.toLocaleString("id-ID")}</span>
              <span className={`font-mono text-xs ${(safeStock.change ?? 0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {(safeStock.change ?? 0) >= 0 ? "+" : ""}{(safeStock.change ?? 0).toFixed(2)}%
              </span>
              {safeStock.sector !== "-" && safeStock.sector !== "Unknown" && (
                <span className="text-[10px] text-white/30 font-mono hidden sm:inline">
                  {safeStock.sector}{safeStock.subSector !== "-" ? ` · ${safeStock.subSector}` : ""}
                </span>
              )}
              {safeStock.marketCap > 0 && (
                <span className="text-[10px] text-white/30 font-mono hidden sm:inline">
                  Rp{safeStock.marketCap.toLocaleString("id-ID")}T
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleWatchlist(code)}
              className={`p-2 rounded-lg transition-colors ${isWatchlisted ? "text-yellow-400 hover:bg-yellow-400/10" : "text-white/30 hover:text-white/60 hover:bg-white/[0.06]"}`}
              title={isWatchlisted ? "Hapus dari watchlist" : "Tambah ke watchlist"}
            >
              {isWatchlisted ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>

            <button
              onClick={() => setTradeExpanded(!tradeExpanded)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                isRiskOff
                  ? "bg-amber-600/80 hover:bg-amber-500 text-white"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
              }`}
            >
              {tradeExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {isRiskOff ? "Simulasi" : "Beli"}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {tradeExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-white/[0.04]"
            >
              <div className="px-4 py-3 flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/40 font-medium">Lot</span>
                  <div className="flex items-center bg-white/[0.06] rounded-lg">
                    <button
                      onClick={() => setLots(l => l === "" ? "" : Math.max(0, Number(l) - 1))}
                      className="p-1.5 hover:bg-white/[0.06] text-white/50 hover:text-white transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      value={lots}
                      onChange={e => setLots(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                      className="w-16 text-center bg-transparent text-white text-sm font-mono outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      min="0"
                    />
                    <button
                      onClick={() => setLots(l => Number(l) + 1)}
                      className="p-1.5 hover:bg-white/[0.06] text-white/50 hover:text-white transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-white/40">
                  1 lot = 100 lembar · Rp{(price * (Number(lots) || 0) * 100).toLocaleString("id-ID")}
                </div>
                <button
                  onClick={() => { onAddTransaction(code, (Number(lots) || 1) * 100, price); setTradeExpanded(false); }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Beli
                </button>
                {portfolioItem && (
                  <button
                    onClick={() => { onSellTransaction(code, (Number(lots) || 1) * 100); setTradeExpanded(false); }}
                    className="px-3 py-1.5 bg-rose-600/80 hover:bg-rose-500 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Jual
                  </button>
                )}
                {portfolioItem && (
                  <button
                    onClick={() => { onRemoveTransaction(code); setTradeExpanded(false); }}
                    className="p-1.5 text-white/40 hover:text-white hover:bg-rose-600 rounded-lg bg-white/5 border border-white/[0.05]"
                    title="Hapus dari portofolio"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex overflow-x-auto px-4 gap-1 scrollbar-none">
          {TICKER_TABS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`shrink-0 px-3 py-2 text-caption font-medium tracking-wide transition-colors flex items-center gap-1.5 border-b-2 ${
                tab === id
                  ? "text-emerald-500 border-emerald-500"
                  : "text-white/30 hover:text-white/60 border-transparent"
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <AnimatePresence mode="wait">
          {tab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<TabLoader label="Ringkasan" />}>
                <OverviewTab stock={safeStock} getDynamicStock={getDynamicStock} portfolio={portfolio} theme={theme} />
              </Suspense>
            </motion.div>
          )}
          {tab === "forecast" && (
            <motion.div key="forecast" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<TabLoader label="Dividen" />}>
                <ForwardDividendsForecast stock={safeStock} theme={theme} />
              </Suspense>
            </motion.div>
          )}
          {tab === "peers" && (
            <motion.div key="peers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<TabLoader label="Peer" />}>
                <PeerComparisonTab stock={safeStock} getDynamicStock={getDynamicStock} />
              </Suspense>
            </motion.div>
          )}
          {tab === "rotation" && (
            <motion.div key="rotation" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<TabLoader label="Rotasi" />}>
                <RotationHistoryTab stock={safeStock} />
              </Suspense>
            </motion.div>
          )}
          {tab === "signals" && (
            <motion.div key="signals" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Suspense fallback={<TabLoader label="Sinyal" />}>
                <SignalHistoryTab stock={safeStock} />
              </Suspense>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function TabLoader({ label }: { label: string }) {
  return (
    <div className="text-center py-12">
      <div className="w-6 h-6 mx-auto mb-3 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      <p className="text-white/40 text-caption">Memuat {label}...</p>
    </div>
  );
}
