import { useState, useMemo } from "react";
import { History, TrendingUp, TrendingDown, Calendar, DollarSign } from "lucide-react";
import type { StockData } from "../types";

interface BacktestTabProps {
  getDynamicStock: (ticker: string) => StockData | undefined;
}

const ALL_TICKERS = [
  "BBCA", "BBRI", "BMRI", "BBNI", "ARTO",
  "TLKM", "EXCL", "ISAT",
  "ADRO", "ITMG", "PTBA", "BUMI", "HRUM",
  "ASII", "UNTR",
  "GGRM", "HMSP",
  "INDF", "ICBP", "MYOR",
  "UNVR", "KLBF", "SIDO",
  "ACES", "ERAA", "MAPI",
  "SMGR", "INTP", "SMBR",
  "ANTM", "MDKA", "ADMR",
  "PGAS",
  "CPIN", "JPFA",
  "MEDC",
  "JSMR",
  "EXCL",
];

export function BacktestTab({ getDynamicStock }: BacktestTabProps) {
  const [selectedTicker, setSelectedTicker] = useState("BBCA");
  const [investmentAmount, setInvestmentAmount] = useState(10000000);

  const stock = getDynamicStock(selectedTicker);

  const backtestResult = useMemo(() => {
    if (!stock?.price || !stock?.previousClose) return null;
    const monthlyReturn = (stock.price - stock.previousClose) / stock.previousClose;
    const annualReturn = monthlyReturn * 12;
    const finalValue = investmentAmount * (1 + annualReturn);

    return {
      ticker: stock.ticker,
      entryPrice: stock.previousClose,
      currentPrice: stock.price,
      monthlyReturn: monthlyReturn * 100,
      annualReturn: annualReturn * 100,
      investmentAmount,
      finalValue,
      profit: finalValue - investmentAmount,
    };
  }, [stock, investmentAmount]);

  return (
    <div className="p-5 space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <History className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-bold text-white uppercase tracking-wider">Backtest Simulasi</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#050505] border border-white/[0.03] rounded-xl p-5 space-y-4">
            <h3 className="text-[10px] uppercase font-bold tracking-widest text-white/50 font-mono">Parameter</h3>

            <div>
              <label className="text-[9px] text-white/30 uppercase tracking-wider block mb-1.5">Ticker</label>
              <select
                value={selectedTicker}
                onChange={e => setSelectedTicker(e.target.value)}
                className="w-full rounded px-3 py-2 text-xs font-mono outline-none transition-colors bg-black/50 border border-white/[0.08] text-white"
              >
                {ALL_TICKERS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[9px] text-white/30 uppercase tracking-wider block mb-1.5">Investasi Awal (Rp)</label>
              <input
                type="number"
                value={investmentAmount}
                onChange={e => setInvestmentAmount(Number(e.target.value) || 0)}
                className="w-full rounded px-3 py-2 text-xs font-mono outline-none bg-black/50 border border-white/[0.08] text-white"
              />
            </div>

            <div className="text-[10px] text-white/30 font-mono pt-2 border-t border-white/[0.04]">
              <p>Metode: proyeksi berdasarkan perubahan harga bulan terakhir terhadap harga setahun</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          {backtestResult ? (
            <div className="bg-[#050505] border border-white/[0.03] rounded-xl p-5 space-y-5">
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-white/50 font-mono flex items-center gap-2">
                <Calendar className="w-3 h-3 text-white/30" />
                Hasil Backtest — {backtestResult.ticker}
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Entry Price</div>
                  <div className="text-sm font-bold text-white font-mono">Rp {backtestResult.entryPrice.toLocaleString("id-ID")}</div>
                </div>
                <div>
                  <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Current Price</div>
                  <div className="text-sm font-bold text-white font-mono">Rp {backtestResult.currentPrice.toLocaleString("id-ID")}</div>
                </div>
                <div>
                  <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Monthly Return</div>
                  <div className={`text-sm font-bold font-mono flex items-center gap-1 ${backtestResult.monthlyReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {backtestResult.monthlyReturn >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {backtestResult.monthlyReturn.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-[9px] text-white/30 uppercase tracking-wider mb-0.5">Annual Return</div>
                  <div className={`text-sm font-bold font-mono flex items-center gap-1 ${backtestResult.annualReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {backtestResult.annualReturn >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    {backtestResult.annualReturn.toFixed(2)}%
                  </div>
                </div>
              </div>

              <div className="border-t border-white/[0.04] pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Investasi</div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-white/30" />
                      <span className="text-base font-bold text-white font-mono">Rp {backtestResult.investmentAmount.toLocaleString("id-ID")}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[9px] text-white/30 uppercase tracking-wider mb-1">Nilai Akhir (proyeksi 1 thn)</div>
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-white/30" />
                      <span className={`text-base font-bold font-mono ${backtestResult.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        Rp {backtestResult.finalValue.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/[0.04] pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/30 font-mono">Profit / Loss</span>
                  <span className={`text-lg font-bold font-mono ${backtestResult.profit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {backtestResult.profit >= 0 ? "+" : ""}Rp {backtestResult.profit.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#050505] border border-white/[0.03] rounded-xl p-10 flex items-center justify-center text-white/20 text-xs">
              Pilih ticker dan masukkan jumlah investasi untuk memulai backtest
            </div>
          )}
        </div>
      </div>
    </div>
  );
}