import { useState, FormEvent } from "react";
import { StockData, PortfolioItem, WatchlistItem } from "../types";
import { STOCKS_DATA } from "../stocksData";
import { SearchableSelect } from "./SearchableSelect";
import { EX, getProcessedLeaders } from "../marketData";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
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
  ShoppingBag,
  AlertTriangle
} from "lucide-react";
import { motion } from "motion/react";

interface PortfolioTrackerProps {
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  onAddTransaction: (ticker: string, shares: number, buyPrice: number) => void;
  onRemoveTransaction: (ticker: string) => void;
  onSellTransaction: (ticker: string, shares: number) => void;
  onSelectStock: (ticker: string) => void;
  onToggleWatchlist: (ticker: string) => void;
  getDynamicStock: (ticker: string) => StockData | null;
  activeConfig: "prod" | "res";
}

export function PortfolioTracker({ 
  portfolio, 
  watchlist, 
  onAddTransaction, 
  onRemoveTransaction,
  onSellTransaction,
  onSelectStock, 
  onToggleWatchlist,
  getDynamicStock,
  activeConfig
}: PortfolioTrackerProps) {
  const visibleStocks = STOCKS_DATA.map(s => getDynamicStock(s.ticker) || s);
  const [selectedTicker, setSelectedTicker] = useState(visibleStocks[0].ticker);
  const [sharesStr, setSharesStr] = useState("1000");
  const [customPriceStr, setCustomPriceStr] = useState("");
  const [sellInputs, setSellInputs] = useState<Record<string, string>>({});
  const [watchlistTicker, setWatchlistTicker] = useState(visibleStocks[0]?.ticker || "");

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

  // Sync market rank with Leaders tab actively based on exact active config weights
  const processedLeaders = getProcessedLeaders(visibleStocks, activeConfig);

  const getStockRankAndScore = (ticker: string) => {
    const leaderIdx = processedLeaders.findIndex(r => r.ticker.replace(".JK", "").toUpperCase() === ticker.toUpperCase());
    const rank = leaderIdx !== -1 ? leaderIdx + 1 : 99;
    const score = leaderIdx !== -1 ? processedLeaders[leaderIdx].score.toFixed(1) : "50.0";
    return { rank, score };
  };

  const enrichedPortfolio = portfolio.map((item) => {
    const liveStock = visibleStocks.find(s => s.ticker === item.ticker);
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

  // Pie chart calculation
  const sectorAllocation = enrichedPortfolio.reduce((acc, item) => {
    const liveStock = visibleStocks.find(s => s.ticker === item.ticker);
    const sector = liveStock ? liveStock.sector : 'Lainnya';
    acc[sector] = (acc[sector] || 0) + item.valueNow;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(sectorAllocation)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#EF4444', '#14B8A6', '#6366F1'];

  const portfolioWarnings = enrichedPortfolio.filter(item => {
    const liveStock = visibleStocks.find(s => s.ticker === item.ticker);
    const drop = liveStock ? liveStock.change : 0;
    const exData = EX.find(e => e.ticker.split('.')[0] === item.ticker);
    const isExitStatic = exData && (exData.exit_state === "EXIT" || exData.exit_state === "EXIT RISK");
    const isExitLive = drop <= -0.5;
    const outOfTop5 = item.rank > 5;
    return isExitStatic || isExitLive || outOfTop5;
  });

  return (
    <div id="portfolio-container" className="space-y-6">

      {portfolioWarnings.length > 0 && (
        <div className="bg-[#0A0A0A] border border-rose-500/20 p-4 sm:p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <h3 className="text-sm uppercase font-extrabold tracking-widest font-sans">
              Peringatan Portofolio: Sinyal Keluar / Turun Peringkat
            </h3>
          </div>
          <p className="text-xs text-rose-200/70 font-sans max-w-3xl">
            Sistem mendeteksi satu atau lebih saham dalam portofolio Anda telah memicu sinyal jual atau tidak lagi berada dalam posisi unggulan (Top 5). Pertimbangkan untuk mengamankan keuntungan atau membatasi kerugian.
          </p>
          <div className="space-y-2 mt-2">
            {portfolioWarnings.map(item => {
              const liveStock = visibleStocks.find(s => s.ticker === item.ticker);
              const drop = liveStock ? liveStock.change : 0;
              const exData = EX.find(e => e.ticker.split('.')[0] === item.ticker);
              const isExitStatic = exData && exData.exit_state === "EXIT";
              const isExitRiskStatic = exData && exData.exit_state === "EXIT RISK";
              
              let reason = "";
              if (drop <= -2.2) reason = "Masuk zona EXIT secara LIVE (Penurunan Harian > -2.2%)";
              else if (drop <= -0.5) reason = "Dalam zona EXIT RISK secara LIVE (Penurunan Harian > -0.5%)";
              else if (isExitStatic) reason = "Masuk zona EXIT Historis (Sinyal Jual Terkonfirmasi)";
              else if (isExitRiskStatic) reason = "Dalam zona EXIT RISK Historis (Risiko Tinggi Penurunan)";
              else if (item.rank > 5) reason = `Terlempar dari Top 5 (Peringkat Saat Ini: ${item.rank})`;

              return (
                <div key={item.ticker} className="flex items-center gap-2.5 p-2 bg-rose-500/5 rounded-lg border border-rose-500/10">
                  <div className="px-2.5 py-1 bg-black/60 text-white font-mono font-bold text-[10px] rounded border border-rose-500/20">
                    {item.ticker}
                  </div>
                  <span className="text-xs text-rose-300 font-semibold">{reason}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Top Summary Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        
        {/* Left Stats Column */}
        <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Cost card */}
          <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-5 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[9px] uppercase font-bold text-white/45 tracking-widest block">
                Total Modal
              </span>
              <h4 id="portfolio-total-cost" className="text-xl font-bold text-white font-mono mt-1 pr-1">
                Rp {totalInvestment.toLocaleString("id-ID")}
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
                Nilai Saat Ini
              </span>
              <h4 id="portfolio-current-value" className="text-xl font-bold text-emerald-400 font-mono mt-1 pr-1">
                Rp {totalCurrentValue.toLocaleString("id-ID")}
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
                Total Keuntungan
              </span>
              <h4 id="portfolio-total-return" className={`text-xl font-bold font-mono mt-1 flex items-center gap-1.5 ${
                totalReturn >= 0 ? "text-emerald-400" : "text-rose-400"
              }`}>
                Rp {totalReturn.toLocaleString("id-ID")}
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

        {/* Right Sector Allocation Card */}
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-4 flex flex-col shadow-sm">
          <span className="text-[9px] uppercase font-bold text-white/45 tracking-widest block mb-1.5">
            Alokasi Sektor
          </span>
          <div className="flex-1 min-h-[140px] w-full relative">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#121212', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => `Rp ${value.toLocaleString("id-ID")}`}
                  />
                  <Pie
                    data={pieData}
                    innerRadius={30}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] text-white/30 font-sans">Belum ada data</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Active Holdings List Table */}
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/5 p-6 shadow-sm lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white/85 uppercase tracking-widest flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Portofolio Saham
            </h3>
            <span className="text-xs font-medium text-white/40">
              {portfolio.length} Saham Terpantau
            </span>
          </div>

          {enrichedPortfolio.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/10">
              <p className="text-white/40 text-xs font-sans">Belum ada saham di portofolio Anda. Silakan beli saham melalui formulir di samping.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-max">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] font-bold text-white/40 uppercase tracking-widest whitespace-nowrap">
                    <th className="pb-2 pr-3">Saham</th>
                    <th className="pb-2 px-3 text-center">Peringkat</th>
                    <th className="pb-2 px-3 text-right">Jumlah (Lembar)</th>
                    <th className="pb-2 px-3 text-right">Harga Beli / Saat Ini</th>
                    <th className="pb-2 pl-3 text-right">Nilai (Rp) / Keuntungan</th>
                    <th className="pb-2 w-[110px]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-[11px]">
                  {enrichedPortfolio.map((item, index) => {
                    const isPos = item.profitOrLoss >= 0;
                    return (
                      <tr key={index} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${item.logoColor} text-white flex items-center justify-center font-extrabold text-[8px] shrink-0 filter brightness-90`}>
                              {item.ticker}
                            </div>
                            <div>
                              <button 
                                onClick={() => onSelectStock(item.ticker)}
                                className="font-bold text-white hover:text-emerald-400 block text-left font-sans cursor-pointer hover:underline text-xs"
                              >
                                {item.ticker}
                              </button>
                              <span className="text-[9px] text-white/40 block truncate max-w-40 font-sans">
                                {item.companyName}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold font-mono ${
                            item.rank <= 5 ? "bg-emerald-500/10 text-emerald-400" :
                            item.rank <= 15 ? "bg-blue-500/10 text-blue-400" :
                            item.rank >= 40 ? "bg-rose-500/10 text-rose-400" : "bg-white/5 text-white/60"
                          }`}>
                            Peringkat {item.rank}
                          </span>
                          <span className="text-[8px] text-white/30 block mt-0.5 font-mono">Skor {item.score}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-white font-mono text-[11px]">
                          {item.shares.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-mono text-[9px] text-white/40">
                            Beli: Rp {item.buyPrice.toLocaleString()}
                          </div>
                          <div className="font-mono text-[11px] text-white mt-0.5 font-bold">
                            Live: Rp {item.currentPrice.toLocaleString()}
                          </div>
                        </td>
                        <td className="py-2.5 pl-3 text-right">
                          <div className="font-bold text-white text-[11px] font-mono">
                            Rp {item.valueNow.toLocaleString()}
                          </div>
                          <div className={`text-[9.5px] font-bold mt-1 inline-flex items-center gap-0.5 px-1 py-0.5 rounded ${
                            isPos ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                          }`}>
                            {isPos ? "+" : ""}
                            {item.profitOrLoss.toLocaleString()} ({isPos ? "+" : ""}{item.percentChange.toFixed(1)}%)
                          </div>
                        </td>
                        <td className="py-2.5 pl-2 text-right">
                          <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2 sm:gap-1.5 opacity-100 transition-opacity">
                            <div className="flex items-center bg-black/40 border border-white/10 rounded overflow-hidden">
                              <input
                                type="number"
                                min="1"
                                max={item.shares}
                                value={sellInputs[item.ticker] || ""}
                                onChange={(e) => setSellInputs(prev => ({...prev, [item.ticker]: e.target.value}))}
                                placeholder="Lembar"
                                className="w-16 sm:w-16 bg-transparent text-white text-[9px] px-2 py-1 outline-none text-right font-mono"
                              />
                              <button
                                onClick={() => {
                                  const toSell = parseInt(sellInputs[item.ticker] || "0");
                                  if (toSell > 0 && toSell <= item.shares) {
                                    onSellTransaction(item.ticker, toSell);
                                    setSellInputs(prev => ({ ...prev, [item.ticker]: "" }));
                                  }
                                }}
                                className="px-2 py-1 text-[9px] font-bold uppercase text-white bg-rose-500 hover:bg-rose-600 cursor-pointer transition-colors"
                                title="Jual"
                              >
                                Jual
                              </button>
                            </div>
                            <button
                              onClick={() => onRemoveTransaction(item.ticker)}
                              className="p-1.5 text-white/60 hover:text-white hover:bg-rose-500/20 hover:border-rose-500/30 hover:text-rose-400 rounded bg-white/5 cursor-pointer border border-white/10 transition-all flex items-center justify-center"
                              title="Hapus Dari Portofolio"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                            </button>
                          </div>
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
          <div className="flex justify-between items-center pb-3 border-b border-white/5">
            <h3 className="text-xs font-semibold text-white/85 uppercase tracking-widest flex items-center gap-1.5 ">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              Beli Saham Simulasi
            </h3>
          </div>

          <form onSubmit={handleAdd} className="space-y-4">
            
            {/* Select Stock */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase text-white/40 tracking-widest">
                Pilih Perusahaan
              </label>
              <SearchableSelect
                value={selectedTicker}
                options={visibleStocks.map((s) => ({ value: s.ticker, label: `${s.ticker} - ${s.name}` }))}
                onChange={(val) => {
                  setSelectedTicker(val);
                  setCustomPriceStr("");
                }}
                theme="emerald"
                className="w-full"
              />
            </div>

            {/* Shares Input */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase text-white/40 tracking-widest flex justify-between">
                <span>Jumlah (Lembar Saham)</span>
                <span className="text-emerald-400 font-semibold lowercase">1 Lot = 100 Lembar</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={sharesStr}
                onChange={(e) => setSharesStr(e.target.value)}
                placeholder="cth. 1000"
                className="w-full text-xs px-3.5 py-3 rounded-xl border border-white/10 outline-none focus:ring-1 focus:ring-emerald-500 bg-white/5 text-white font-mono"
              />
            </div>

            {/* Setup Price */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold uppercase text-white/40 tracking-widest flex justify-between">
                <span>Harga per Lembar (Rp)</span>
                <span className="text-white/50 font-semibold font-mono">Berdasarkan: {currentSelectedStock.currentPrice}</span>
              </label>
              <input
                type="number"
                value={customPriceStr}
                onChange={(e) => setCustomPriceStr(e.target.value)}
                placeholder={`Gunakan harga saat ini (${currentSelectedStock.currentPrice})`}
                className="w-full text-xs px-3.5 py-3 rounded-xl border border-white/10 outline-none focus:ring-1 focus:ring-emerald-500 bg-white/5 text-white font-mono"
              />
            </div>

            {/* Simulated Transaction Pricing Check */}
            {sharesStr && !isNaN(parseInt(sharesStr)) && (
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-xs space-y-1.5">
                <div className="flex justify-between text-white/40">
                  <span>Harga Beli:</span>
                  <span className="font-mono text-white/80">Rp {customPriceStr ? parseInt(customPriceStr).toLocaleString() : currentSelectedStock.currentPrice.toLocaleString()} / Lembar</span>
                </div>
                <div className="flex justify-between font-bold text-white border-t border-white/5 pt-1.5 mt-1">
                  <span>Estimasi Total Biaya:</span>
                  <span className="font-mono text-xs text-emerald-400">
                    Rp {((parseInt(sharesStr) || 0) * (customPriceStr ? parseInt(customPriceStr) : currentSelectedStock.currentPrice)).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full font-semibold py-3 rounded-xl transition-all shadow-sm text-sm cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-black"
            >
              Tambahkan Transaksi
            </button>
          </form>
        </div>

      </div>

      {/* Watchlist Strip */}
      <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h3 className="text-xs font-semibold text-white/85 uppercase tracking-widest flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-450 text-emerald-400" />
            Daftar Pantau
          </h3>
          <div className="flex items-center gap-2 max-w-sm w-full sm:w-auto">
            <SearchableSelect
              value={watchlistTicker}
              options={visibleStocks.map((s) => ({ value: s.ticker, label: `${s.ticker} - ${s.name}` }))}
              onChange={(val) => setWatchlistTicker(val)}
            />
            <button
              onClick={() => onToggleWatchlist(watchlistTicker)}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer shrink-0"
              disabled={watchlist.some(w => w.ticker === watchlistTicker)}
            >
              Tambah
            </button>
          </div>
        </div>

        {watchlist.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/10">
            <p className="text-white/40 text-xs">Belum ada perusahaan dalam Daftar Pantau. Klik ikon mata pada saham untuk menambahkannya.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist.map((item) => {
              const liveStock = visibleStocks.find(s => s.ticker === item.ticker);
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
                        Rp {liveStock.currentPrice.toLocaleString()}
                      </span>
                      <span className={`text-[10px] font-bold ${isPos ? "text-emerald-400" : "text-rose-400"}`}>
                        {isPos ? "+" : ""}{liveStock.change}%
                      </span>
                    </div>
                    <button
                      onClick={() => onToggleWatchlist(liveStock.ticker)}
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
