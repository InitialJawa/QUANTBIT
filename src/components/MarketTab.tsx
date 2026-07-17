import { useState, useMemo } from "react";
import { MKT } from "../marketData";
import { STOCKS_DATA } from "../stocksData";
import { StockData, PortfolioItem, WatchlistItem } from "../types";
import { computeRSI, computeMACD, getIhsgData } from "../marketRegimeEngine";
import { Eye, Trash2, Plus, Sparkles } from "lucide-react";
import { MarketOverviewCharts } from "./MarketOverviewCharts";
import { LastUpdatedChip } from "./LastUpdatedChip";
import { useEngineConfig } from "../contexts/EngineConfigContext";
import { SearchableSelect } from "./SearchableSelect";
import { TickerLogo } from "./TickerLogo";
import { ExplainButton } from "./ExplainButton";
import { MarketRegimeCard } from "./MarketRegimeCard";
import { MarketInsightPanel } from "./MarketInsightPanel";
import { MarketMetricsDashboard } from "./MarketMetricsDashboard";

interface SyncStatus {
  lastSynced: string | null;
  latestDate: string | null;
  stale: boolean;
  syncing: boolean;
}

interface MarketTabProps {
  onSelectTicker: (ticker: string) => void;
  onChangeActiveTicker?: (ticker: string) => void;
  activeStock: StockData;
  portfolio: PortfolioItem[];
  onAddTransaction: (ticker: string, shares: number, buyPrice: number) => void;
  onRemoveTransaction: (ticker: string) => void;
  onSellTransaction: (ticker: string, shares: number) => void;
  getDynamicStock: (ticker: string) => StockData | undefined;
  filteredStocks?: (StockData | undefined)[];
  syncStatus?: SyncStatus;
  triggerSync?: () => void;
  watchlist?: WatchlistItem[];
  onToggleWatchlist?: (ticker: string) => void;
}

export function MarketTab({
  onSelectTicker,
  onChangeActiveTicker,
  activeStock,
  portfolio,
  onAddTransaction,
  onRemoveTransaction,
  onSellTransaction,
  getDynamicStock,
  filteredStocks,
  syncStatus,
  triggerSync,
  watchlist = [],
  onToggleWatchlist,
}: MarketTabProps) {
  const { engineConfig } = useEngineConfig();

  const allVisibleStocks = useMemo(
    () => STOCKS_DATA.map(s => getDynamicStock(s.ticker) || s),
    [getDynamicStock]
  );
  const visibleStocks = useMemo(() => {
    const mode = engineConfig.simulationMode;
    if (mode === "custom" && engineConfig.customUniverse.length > 0) {
      return allVisibleStocks.filter(s => engineConfig.customUniverse.includes(s.ticker));
    }
    return allVisibleStocks;
  }, [allVisibleStocks, engineConfig.simulationMode, engineConfig.customUniverse, engineConfig.singleTicker]);

  const [watchlistTicker, setWatchlistTicker] = useState(visibleStocks[0]?.ticker || "");

  let totalCost = 0;
  let totalValueNow = 0;
  portfolio.forEach(item => {
    const liveStock = visibleStocks.find(s => s.ticker === item.ticker);
    const lastPrice = liveStock ? liveStock.currentPrice : item.buyPrice;
    totalCost += item.shares * item.buyPrice;
    totalValueNow += item.shares * lastPrice;
  });
  const myReturnPercent = totalCost > 0 ? ((totalValueNow - totalCost) / totalCost) * 100 : 0;

  const isFilteredByStrategy =
    engineConfig.simulationMode === "custom" && engineConfig.customUniverse.length > 0;

  const ihsgData = getIhsgData();
  const ihsgCloses = useMemo(() => ihsgData.map(d => d.close), [ihsgData]);
  const rsiIHSG = useMemo(() => computeRSI(ihsgCloses, 14), [ihsgCloses]);
  const macdResult = useMemo(() => computeMACD(ihsgCloses), [ihsgCloses]);

  const breadth = useMemo(() => {
    const advancers = allVisibleStocks.filter(s => s.change > 0).length;
    const decliners = allVisibleStocks.filter(s => s.change < 0).length;
    return { advancers, decliners, total: allVisibleStocks.length };
  }, [allVisibleStocks]);

  return (
    <div className="space-y-4">

      {isFilteredByStrategy && (
        <div className="bg-emerald-500/[0.04] border border-emerald-500/15 rounded-xl px-4 py-2 flex items-center gap-2 text-caption font-mono">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-emerald-400 font-bold">FILTERED BY PORTFOLIO STRATEGY:</span>
          <span className="text-white/80 truncate">Custom Universe ({engineConfig.customUniverse.length})</span>
        </div>
      )}

      {/* 1. DOMINANT: Market Regime Status + Action CTAs */}
      <MarketRegimeCard myReturnPercent={myReturnPercent} portfolioCount={portfolio.length} />

      {/* 2. Chart utama — IHSG vs Gold vs Portfolio */}
      <MarketOverviewCharts portfolio={portfolio} />

      {/* 3. Metrics Dashboard — grouped: Tren, Momentum, Risiko, Alokasi */}
      <MarketMetricsDashboard
        rsiIHSG={rsiIHSG}
        macdResult={macdResult}
        ihsgCloses={ihsgCloses}
        breadth={breadth}
      />

      {/* 4. Wawasan AI — merged AI Quick Pulse + AI Brief */}
      <MarketInsightPanel />

      {/* 5. Ringkasan Parameter — sync status bar */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-label uppercase tracking-wider text-white/30 flex items-center gap-1.5">
          Ringkasan Data
          <ExplainButton label="IHSG, USD/IDR, Quant Score Gap, Market Breadth" />
        </h3>
        <div className="flex items-center gap-3">
          <LastUpdatedChip iso={MKT.market_last_update} />
          {syncStatus && (
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${
                syncStatus.stale ? "bg-amber-400 animate-pulse" : "bg-green-400"
              }`} />
              <span className={`text-label font-mono font-bold ${
                syncStatus.stale ? "text-amber-400" : "text-green-400"
              }`}>
                DB: {syncStatus.latestDate || "—"}
              </span>
              {syncStatus.stale && (
                <button
                  onClick={triggerSync}
                  disabled={syncStatus.syncing}
                  className="text-label font-bold uppercase tracking-wider text-white/50 hover:text-white cursor-pointer disabled:opacity-30"
                >
                  {syncStatus.syncing ? "..." : "Sync"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 6. Watchlist — posisi sekunder, lebih compact */}
      <div className="bg-[#0A0A0A] bg-card-gradient-alt rounded-2xl border border-white/10 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h3 className="text-xs font-semibold text-white/85 uppercase tracking-widest flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            Daftar Pantau
          </h3>
          <div className="flex items-center gap-2 max-w-sm w-full sm:w-auto">
            <SearchableSelect
              value={watchlistTicker}
              options={visibleStocks.map((s) => ({
                value: s.ticker,
                label: `${s.ticker} - ${s.name}`,
                logoColor: s.logoColor,
              }))}
              onChange={(val) => setWatchlistTicker(val)}
            />
            <button
              onClick={() => onToggleWatchlist?.(watchlistTicker)}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer shrink-0"
              disabled={watchlist.some((w) => w.ticker === watchlistTicker)}
            >
              <Plus className="w-3 h-3 inline mr-1" />Tambah
            </button>
          </div>
        </div>

        {watchlist.length === 0 ? (
          <div className="p-6 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/10">
            <p className="text-white/40 text-xs">
              Belum ada perusahaan dalam Daftar Pantau. Gunakan tombol Tambah untuk menambahkan saham ke daftar pantau.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {watchlist.map((item) => {
              const liveStock = visibleStocks.find(
                (s) => s.ticker === item.ticker,
              );
              if (!liveStock) return null;
              const isPos = liveStock.change >= 0;
              return (
                <div
                  key={item.ticker}
                  className="p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-emerald-500/20 hover:shadow-xs transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5">
                    <TickerLogo
                      ticker={liveStock.ticker}
                      size="md"
                      fallbackColor={liveStock.logoColor}
                    />
                    <div>
                      <button
                        onClick={() => onSelectTicker(liveStock.ticker)}
                        className="font-bold text-white hover:text-emerald-400 cursor-pointer block text-left"
                      >
                        {liveStock.ticker}
                      </button>
                      <span className="text-caption text-white/40 block truncate max-w-32 mt-0.5">
                        {liveStock.name}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-2.5">
                    <div>
                      <span className="text-xs font-bold text-white block font-mono">
                        Rp {liveStock.currentPrice.toLocaleString()}
                      </span>
                      <span
                        className={`text-caption font-bold ${isPos ? "text-green-400" : "text-rose-400"}`}
                      >
                        {isPos ? "+" : ""}
                        {liveStock.change}%
                      </span>
                    </div>
                    <button
                      onClick={() => onToggleWatchlist?.(liveStock.ticker)}
                      className="p-1 text-white/30 hover:text-rose-400 rounded cursor-pointer transition-colors"
                      title="Hapus Dari Daftar Pantau"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
