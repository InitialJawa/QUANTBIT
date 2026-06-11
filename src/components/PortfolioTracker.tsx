import { useState, FormEvent } from "react";
import { StockData, PortfolioItem, WatchlistItem } from "../types";
import { STOCKS_DATA } from "../stocksData";
import { 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Briefcase, 
  Eye, 
  Wallet, 
  FileSpreadsheet, 
  ArrowRight,
  Sparkles,
  ShoppingBag
} from "lucide-react";
import { motion } from "motion/react";

interface PortfolioTrackerProps {
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  onAddTransaction: (ticker: string, shares: number, buyPrice: number) => void;
  onRemoveTransaction: (ticker: string) => void;
  onSelectStock: (ticker: string) => void;
  onToggleWatchlist: (ticker: string) => void;
  idxUniverse?: "idx30" | "idx80";
}

export function PortfolioTracker({ 
  portfolio, 
  watchlist, 
  onAddTransaction, 
  onRemoveTransaction, 
  onSelectStock, 
  onToggleWatchlist,
  idxUniverse = "idx80"
}: PortfolioTrackerProps) {
  const visibleStocks = idxUniverse === "idx30" ? STOCKS_DATA.slice(0, 30) : STOCKS_DATA;
  const [selectedTicker, setSelectedTicker] = useState(visibleStocks[0].ticker);
  const [sharesStr, setSharesStr] = useState("1000");
  const [customPriceStr, setCustomPriceStr] = useState("");

  const currentSelectedStock = visibleStocks.find(s => s.ticker === selectedTicker) || visibleStocks[0];

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    const sharesNum = parseInt(sharesStr);
    const priceNum = customPriceStr ? parseFloat(customPriceStr) : currentSelectedStock.currentPrice;

    if (isNaN(sharesNum) || sharesNum <= 0) return;
    onAddTransaction(selectedTicker, sharesNum, priceNum);
    setSharesStr("1000");
    setCustomPriceStr("");
  };

  // Calculations
  let totalInvestment = 0;
  let totalCurrentValue = 0;

  // Dynamic market rank calculator for all STOCKS_DATA based on standard quant weights (Config F)
  const computeScore = (s: StockData) => {
    const qVal = Math.round(Math.min(99, Math.max(10, (s.roe || 12) * 5 + (100 - (s.der || 0.4) * 45))));
    const gVal = Math.round(Math.min(99, Math.max(10, 50 + (s.change || 0) * 12)));
    const vVal = Math.round(Math.min(99, Math.max(10, 100 - (s.peRatio || 14.5) * 2.5 - (s.pbRatio || 1.6) * 6)));
    const mVal = Math.round(Math.min(99, Math.max(10, 50 + (s.change || 0) * 18)));
    return qVal * 0.25 + gVal * 0.10 + vVal * 0.30 + mVal * 0.35;
  };

  const rankedStocks = [...visibleStocks]
    .map(s => ({ ticker: s.ticker, score: computeScore(s) }))
    .sort((a, b) => b.score - a.score);

  const getStockRankAndScore = (ticker: string) => {
    const idx = rankedStocks.findIndex(r => r.ticker.toUpperCase() === ticker.toUpperCase());
    const rank = idx !== -1 ? idx + 1 : 99;
    const score = idx !== -1 ? rankedStocks[idx].score.toFixed(1) : "50.0";
    return { rank, score };
  };

  const enrichedPortfolio = portfolio.map((item) => {
    const liveStock = STOCKS_DATA.find(s => s.ticker === item.ticker);
    const currentPrice = liveStock ? liveStock.currentPrice : item.buyPrice;
    
    const originalCost = item.shares * item.buyPrice;
    const valueNow = item.shares * currentPrice;
    const profitOrLoss = valueNow - originalCost;
    const percentChange = (profitOrLoss / originalCost) * 100;

    totalInvestment += originalCost;
    totalCurrentValue += valueNow;

    const rankInfo = getStockRankAndScore(item.ticker);

    return {
      ...item,
      companyName: liveStock ? liveStock.name : item.ticker,
      logoColor: liveStock ? liveStock.logoColor : "bg-gray-400",
      currentPrice,
      originalCost,
      valueNow,
      profitOrLoss,
      percentChange,
      rank: rankInfo.rank,
      score: rankInfo.score
    };
  });

  const totalReturn = totalCurrentValue - totalInvestment;
  const totalReturnPercent = totalInvestment > 0 ? (totalReturn / totalInvestment) * 100 : 0;

  return (
    <div id="portfolio-container" className="space-y-6">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Total Cost card */}
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] uppercase font-bold text-white/45 tracking-widest block">
              Simulated Investment
            </span>
            <h4 id="portfolio-total-cost" className="text-xl font-bold text-white font-mono mt-1 pr-1">
              IDR {totalInvestment.toLocaleString("id-ID")}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        {/* Current Value card */}
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] uppercase font-bold text-white/45 tracking-widest block">
              Current Balance
            </span>
            <h4 id="portfolio-current-value" className="text-xl font-bold text-emerald-400 font-mono mt-1 pr-1">
              IDR {totalCurrentValue.toLocaleString("id-ID")}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        {/* Total Return card */}
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[9px] uppercase font-bold text-white/45 tracking-widest block">
              Cumulative Return
            </span>
            <h4 id="portfolio-total-return" className={`text-xl font-bold font-mono mt-1 flex items-center gap-1.5 ${
              totalReturn >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              IDR {totalReturn.toLocaleString("id-ID")}
              <span className="text-xs font-semibold">
                ({totalReturn >= 0 ? "+" : ""}{totalReturnPercent.toFixed(2)}%)
              </span>
            </h4>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            totalReturn >= 0 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          }`}>
            {totalReturn >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active Holdings List Table */}
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-6 shadow-sm lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white/85 uppercase tracking-widest flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Simulated Holdings
            </h3>
            <span className="text-xs font-medium text-white/40">
              {portfolio.length} position{portfolio.length === 1 ? "" : "s"} tracked
            </span>
          </div>

          {enrichedPortfolio.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/10">
              <p className="text-white/40 text-xs font-sans">No items in your portfolio. Use the form to buy simulated equities.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    <th className="pb-3 pr-4">Equity</th>
                    <th className="pb-3 px-4 text-center">Quant Rank</th>
                    <th className="pb-3 px-4 text-right">Shares Owned</th>
                    <th className="pb-3 px-4 text-right">Acquisition / Current</th>
                    <th className="pb-3 pl-4 text-right">Value (IDR) / Return</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {enrichedPortfolio.map((item, index) => {
                    const isPos = item.profitOrLoss >= 0;
                    return (
                      <tr key={index} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg ${item.logoColor} text-white flex items-center justify-center font-extrabold text-[10px] shrink-0 filter brightness-90`}>
                              {item.ticker}
                            </div>
                            <div>
                              <button 
                                onClick={() => onSelectStock(item.ticker)}
                                className="font-bold text-white hover:text-emerald-400 block text-left font-sans cursor-pointer hover:underline"
                              >
                                {item.ticker}
                              </button>
                              <span className="text-[10px] text-white/40 block truncate max-w-40 mt-0.5 font-sans">
                                {item.companyName}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            item.rank <= 5 ? "bg-emerald-500/10 text-emerald-400" :
                            item.rank <= 15 ? "bg-blue-500/10 text-blue-400" :
                            item.rank >= 40 ? "bg-rose-500/10 text-rose-400" : "bg-white/5 text-white/60"
                          }`}>
                            Rank {item.rank}
                          </span>
                          <span className="text-[9px] text-white/30 block mt-1 font-mono">Score {item.score}</span>
                        </td>
                        <td className="py-4 px-4 text-right font-medium text-white font-mono text-xs">
                          {item.shares.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="font-mono text-[11px] text-white/40">
                            Buy: IDR {item.buyPrice.toLocaleString()}
                          </div>
                          <div className="font-mono text-xs text-white mt-1 font-bold">
                            Live: IDR {item.currentPrice.toLocaleString()}
                          </div>
                        </td>
                        <td className="py-4 pl-4 text-right">
                          <div className="font-bold text-white text-xs font-mono">
                            IDR {item.valueNow.toLocaleString()}
                          </div>
                          <div className={`text-[10px] font-bold mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                            isPos ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          }`}>
                            {isPos ? "+" : ""}
                            {item.profitOrLoss.toLocaleString()} ({isPos ? "+" : ""}{item.percentChange.toFixed(1)}%)
                          </div>
                        </td>
                        <td className="py-4 pl-2 text-right">
                          <button
                            onClick={() => onRemoveTransaction(item.ticker)}
                            className="p-1.5 text-white/40 hover:text-rose-400 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 hover:bg-rose-955/35 transition-all cursor-pointer border border-white/5"
                            title="Remove transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Transaction Simulator Form */}
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 shadow-sm lg:col-span-4 space-y-4">
          <h3 className="text-xs font-semibold text-white/85 uppercase tracking-widest flex items-center gap-1.5 pb-3 border-b border-white/5">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            Buy Simulated Shares
          </h3>

          <form onSubmit={handleAdd} className="space-y-4">
            
            {/* Select Stock */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase text-white/40 tracking-widest">
                Select Company
              </label>
              <select
                value={selectedTicker}
                onChange={(e) => {
                  setSelectedTicker(e.target.value);
                  setCustomPriceStr("");
                }}
                className="w-full text-xs px-3.5 py-3 rounded-xl border border-white/10 outline-none focus:ring-1 focus:ring-emerald-500 bg-[#121212] text-white font-medium cursor-pointer"
              >
                {visibleStocks.map((s) => (
                  <option key={s.ticker} value={s.ticker} className="bg-[#121212] text-white text-xs">
                    {s.ticker} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Shares Input */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase text-white/40 tracking-widest flex justify-between">
                <span>Quantity (Shares)</span>
                <span className="text-emerald-400 font-semibold lowercase">1 Lot = 100 Shares</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={sharesStr}
                onChange={(e) => setSharesStr(e.target.value)}
                placeholder="e.g. 1000"
                className="w-full text-xs px-3.5 py-3 rounded-xl border border-white/10 outline-none focus:ring-1 focus:ring-emerald-500 bg-white/5 text-white font-mono"
              />
            </div>

            {/* Setup Price */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase text-white/40 tracking-widest flex justify-between">
                <span>Price per Share (IDR)</span>
                <span className="text-white/50 font-semibold font-mono">Rate: {currentSelectedStock.currentPrice}</span>
              </label>
              <input
                type="number"
                value={customPriceStr}
                onChange={(e) => setCustomPriceStr(e.target.value)}
                placeholder={`Use current price (${currentSelectedStock.currentPrice})`}
                className="w-full text-xs px-3.5 py-3 rounded-xl border border-white/10 outline-none focus:ring-1 focus:ring-emerald-500 bg-white/5 text-white font-mono"
              />
            </div>

            {/* Simulated Transaction Pricing Check */}
            {sharesStr && !isNaN(parseInt(sharesStr)) && (
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs space-y-1.5">
                <div className="flex justify-between text-white/40">
                  <span>Price Rate:</span>
                  <span className="font-mono text-white/80">IDR {customPriceStr ? parseInt(customPriceStr).toLocaleString() : currentSelectedStock.currentPrice.toLocaleString()} / Share</span>
                </div>
                <div className="flex justify-between font-bold text-white border-t border-white/5 pt-1.5 mt-1">
                  <span>Est. Total Cost:</span>
                  <span className="font-mono text-emerald-400 text-xs">
                    IDR {((parseInt(sharesStr) || 0) * (customPriceStr ? parseInt(customPriceStr) : currentSelectedStock.currentPrice)).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-3 rounded-xl transition-all shadow-sm text-sm cursor-pointer"
            >
              Add Sim Transaction
            </button>
          </form>
        </div>

      </div>

      {/* Watchlist Strip */}
      <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 shadow-sm">
        <h3 className="text-xs font-semibold text-white/85 uppercase tracking-widest flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-emerald-450 text-emerald-400" />
          Active Watchlist
        </h3>

        {watchlist.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/10">
            <p className="text-white/40 text-xs">No companies added to your Watchlist. Click the watch icon on top of any stock to add.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist.map((item) => {
              const liveStock = STOCKS_DATA.find(s => s.ticker === item.ticker);
              if (!liveStock) return null;
              const isPos = liveStock.change >= 0;
              return (
                <div 
                  key={item.ticker}
                  className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-emerald-500/20 hover:shadow-xs transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${liveStock.logoColor} text-white flex items-center justify-center font-extrabold text-[10px] shrink-0 filter brightness-90`}>
                      {liveStock.ticker}
                    </div>
                    <div>
                      <button 
                        onClick={() => onSelectStock(liveStock.ticker)}
                        className="font-bold text-white hover:text-emerald-400 cursor-pointer block text-left"
                      >
                        {liveStock.ticker}
                      </button>
                      <span className="text-[10px] text-white/40 block truncate max-w-32 mt-0.5">{liveStock.name}</span>
                    </div>
                  </div>
                  
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="text-xs font-bold text-white block font-mono">
                        IDR {liveStock.currentPrice.toLocaleString()}
                      </span>
                      <span className={`text-[10px] font-bold ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                        {isPos ? "+" : ""}{liveStock.change}%
                      </span>
                    </div>
                    <button
                      onClick={() => onToggleWatchlist(liveStock.ticker)}
                      className="p-1 text-white/30 hover:text-rose-400 rounded cursor-pointer transition-colors"
                      title="Remove from Watchlist"
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
