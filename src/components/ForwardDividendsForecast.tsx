import { useState, useMemo, useEffect } from "react";
import { StockData } from "../types";
import { 
  TrendingUp, 
  Calculator, 
  Coins, 
  Percent, 
  CheckCircle2, 
  ArrowRight, 
  ChartBar, 
  BadgeAlert, 
  Dribbble, 
  Sparkles,
  Info
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar,
  CartesianGrid
} from "recharts";

interface ForwardDividendsForecastProps {
  stock: StockData;
  theme?: "dark" | "light";
}

export function ForwardDividendsForecast({ stock, theme }: ForwardDividendsForecastProps) {
  // 1. Inputs & Hyperparameters
  const [initialCapital, setInitialCapital] = useState<number>(50000000); // 50 Million IDR defaults
  const [growthRate, setGrowthRate] = useState<number>(8); // Expected annual EPS/DPS growth %
  const [payoutRatio, setPayoutRatio] = useState<number>(
    stock.peRatio && stock.dividendYield 
      ? Math.round((stock.dividendYield * stock.peRatio * 100) / 100) || 50
      : 50
  ); // Estimated dividend payout ratio (DPR %)
  const [isDripActive, setIsDripActive] = useState<boolean>(true); // Reinvest dividends toggle
  const [customTicker, setCustomTicker] = useState<string>("");

  // Auto-update parameters whenever the active stock changes
  useEffect(() => {
    const calculatedPayout = stock.peRatio && stock.dividendYield 
      ? Math.round((stock.dividendYield * stock.peRatio * 10) / 10) || 50
      : 50;
    // Keep it within a standard realistic boundary (10% to 100%)
    setPayoutRatio(Math.min(100, Math.max(10, calculatedPayout)));
    
    // Automatically calculate historical compound annual growth rate (CAGR) from audited statements
    let defaultGrowth = 8;
    const len = stock.metrics?.length || 0;
    if (len >= 2) {
      const first = stock.metrics[0];
      const last = stock.metrics[len - 1];
      if (first && last && first.netIncome > 0 && last.netIncome > 0) {
        const yearsSpan = len - 1;
        const cagr = (Math.pow(last.netIncome / first.netIncome, 1 / yearsSpan) - 1) * 100;
        if (!isNaN(cagr) && isFinite(cagr)) {
          defaultGrowth = Math.round(cagr);
        }
      } else if (first && last && first.netIncome !== 0) {
        const yearsSpan = len - 1;
        const change = ((last.netIncome - first.netIncome) / Math.abs(first.netIncome)) * 100;
        if (!isNaN(change) && isFinite(change)) {
          defaultGrowth = Math.round(change / yearsSpan);
        }
      }
    }
    
    // Clamp the starting projection growth rate to healthy parameters for a 5-year forecast (-15% to 35%)
    setGrowthRate(Math.min(35, Math.max(-15, defaultGrowth)));
  }, [stock.ticker]);

  // Base estimations
  const currentPrice = stock.currentPrice || 1000;
  const currentYield = stock.dividendYield || 0;

  // Deriving baseline metrics
  const eps0 = useMemo(() => {
    if (stock.peRatio && stock.peRatio > 0) {
      return currentPrice / stock.peRatio;
    }
    // Fallback based on ROE/BV
    return currentPrice * (stock.roe ? stock.roe / 100 : 0.1) * 0.7;
  }, [stock, currentPrice]);

  const dps0 = useMemo(() => {
    if (currentYield > 0) {
      return currentPrice * (currentYield / 100);
    }
    return eps0 * (payoutRatio / 100);
  }, [currentYield, currentPrice, eps0, payoutRatio]);

  // Execute projection over 5 Year scope
  const projectionData = useMemo(() => {
    let shares = Math.floor(initialCapital / currentPrice);
    if (shares <= 0) shares = 1;

    const arr = [];
    let currentShares = shares;
    let accumulatedDividends = 0;
    let priceTrack = currentPrice;
    let epsTrack = eps0;

    // Baseline year (Year 0)
    arr.push({
      year: "FY 0",
      lbl: "Awal",
      "Shares Owned": currentShares,
      "EPS Projected": Math.round(epsTrack),
      "DPS Projected": Math.round(dps0),
      "Yield-on-Cost (YoC)": currentYield,
      "Dividen Diterima": 0,
      "Nilai Portofolio (IDR)": currentShares * currentPrice,
      "Dividen Akumulatif": 0,
    });

    // 5 Year Projections
    for (let i = 1; i <= 5; i++) {
      // EPS grows compoundedly
      epsTrack = epsTrack * (1 + growthRate / 100);
      
      // DPS calculated via DPR
      const dps = epsTrack * (payoutRatio / 100);
      
      // Price follows EPS growth (long-term valuation standard)
      priceTrack = priceTrack * (1 + growthRate / 100);

      // Total gross dividends for this year
      const rawDividend = currentShares * dps;
      
      // Indonesian 10% final dividend tax factor
      const netDividend = rawDividend * 0.90; 

      let newSharesBought = 0;
      if (isDripActive) {
        newSharesBought = Math.floor(netDividend / priceTrack);
        currentShares += newSharesBought;
      } else {
        accumulatedDividends += netDividend;
      }

      // Calculate Yield on Cost relative to original capital
      const averageCostPerShare = initialCapital / shares;
      // YoC = (DPS / Average Cost Per Share) * 100
      const yoc = (dps / averageCostPerShare) * 100;

      const portfolioVal = currentShares * priceTrack + (isDripActive ? 0 : accumulatedDividends);

      arr.push({
        year: `Tahun ${i}`,
        lbl: `Y${i}`,
        "Shares Owned": currentShares,
        "EPS Projected": Math.round(epsTrack),
        "DPS Projected": Math.round(dps),
        "Yield-on-Cost (YoC)": parseFloat(yoc.toFixed(2)),
        "Dividen Diterima": Math.round(netDividend),
        "Nilai Portofolio (IDR)": Math.round(portfolioVal),
        "Dividen Akumulatif": Math.round(accumulatedDividends + (isDripActive ? 0 : 0)), // accumulated in model
      });
    }

    return arr;
  }, [initialCapital, currentPrice, currentYield, eps0, dps0, growthRate, payoutRatio, isDripActive]);

  // Computed summary highlights
  const finalShares = projectionData[5]["Shares Owned"];
  const totalDivReceived = useMemo(() => {
    let sum = 0;
    // Year 1 to 5
    for (let i = 1; i <= 5; i++) {
      sum += projectionData[i]["Dividen Diterima"];
    }
    return sum;
  }, [projectionData]);

  const finalValue = projectionData[5]["Nilai Portofolio (IDR)"];
  const returnOnCapital = ((finalValue - initialCapital) / initialCapital) * 100;
  const finalYoC = projectionData[5]["Yield-on-Cost (YoC)"];

  // Quick preset capital options
  const handlePresetCapital = (amt: number) => {
    setInitialCapital(amt);
  };

  const isLight = theme === "light";

  return (
    <div id="dividends-forecast-card" className="space-y-6">
      
      {/* 1. Header Information Panel */}
      <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Coins className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight font-serif italic">
              Forward Dividends Forecast &amp; Compounder
            </h3>
            <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
              Model pertumbuhan dividen dan korelasi harga emiten <span className="text-emerald-400 font-bold">{stock.ticker}</span> dalam kurun waktu 5 tahun mendatang. Analisis kekuatan bunga berbunga (<span className="text-emerald-400">compounding effect</span>) dan Yield on Cost (YoC).
            </p>
          </div>
        </div>
      </div>

      {/* 2. Parameters Setup Block - Sliders & Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        
        {/* Parameters Control Panel */}
        <div className="md:col-span-12 lg:col-span-5 bg-[#0A0A0A] border border-white/5 p-5 rounded-2xl space-y-4">
          <span className="text-[10px] text-white/40 uppercase font-black tracking-widest block font-mono">
            SETUP PAROCHIAL MATRIX
          </span>

          {/* Capital Input field */}
          <div className="space-y-2">
            <label className="text-[10px] text-white/50 block font-bold font-mono">
              MODAL PEMBELIAN AWAL (IDR)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-bold text-white/40 font-mono">Rp</span>
              <input
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-xs pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl font-bold font-mono text-white outline-none focus:border-emerald-500 transition-colors"
                placeholder="Jumlah Investasi..."
              />
            </div>
            {/* Quick Presets */}
            <div className="flex gap-1.5 pt-1">
              {[10000000, 50000000, 100000000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => handlePresetCapital(amt)}
                  className={`text-[9px] px-2.5 py-1 rounded bg-white/5 border hover:bg-white/10 text-white/70 cursor-pointer font-mono font-bold transition-all ${
                    initialCapital === amt ? "border-emerald-400 text-emerald-400 bg-emerald-500/5" : "border-white/5"
                  }`}
                >
                  Rp {(amt / 1000000).toLocaleString()} Jt
                </button>
              ))}
            </div>
          </div>

          {/* Annual Earnings Growth CAGR Slider */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center text-[10px] font-bold font-mono">
              <span className="text-white/50">PERTUMBUHAN LABA (CAGR %)</span>
              <span className="text-amber-400 font-bold">{growthRate}%/Thn</span>
            </div>
            <input
              type="range"
              min="-20"
              max="40"
              step="1"
              value={growthRate}
              onChange={(e) => setGrowthRate(parseInt(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-[8px] text-white/30 font-mono font-medium">
              <span>-20% (Krisis)</span>
              <span>8% (Sektor)</span>
              <span>40% (Agresif)</span>
            </div>
          </div>

          {/* Dividend Payout Ratio Slider */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between items-center text-[10px] font-bold font-mono">
              <span className="text-white/50">DIVIDEND PAYOUT RATIO (DPR)</span>
              <span className="text-emerald-400 font-bold">{payoutRatio}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={payoutRatio}
              onChange={(e) => setPayoutRatio(parseInt(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
            />
            <div className="flex justify-between text-[8px] text-white/30 font-mono font-medium">
              <span>10% (Ekspansi)</span>
              <span>50% (Standard)</span>
              <span>100% (Kas Maksimal)</span>
            </div>
          </div>

          {/* DRIP toggle button */}
          <div className="pt-2">
            <button
              onClick={() => setIsDripActive(!isDripActive)}
              className={`w-full p-3 rounded-xl border flex items-center justify-between text-left transition-all ${
                isDripActive
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : "bg-white/5 border-white/5 text-[#E0E0E0]/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className={`w-2.5 h-2.5 rounded-full ${isDripActive ? "bg-emerald-400 animate-pulse" : "bg-white/25"}`} />
                <div>
                  <span className="text-[11px] font-bold block">Reinvestasikan Dividen (DRIP)</span>
                  <span className="text-[8px] text-white/30 block mt-0.5">Beli saham baru otomatis dengan dividen nett (Pajak 10% dihitung)</span>
                </div>
              </div>
              <span className="text-[9px] font-black uppercase font-mono px-1.5 py-0.5 rounded bg-black/20">
                {isDripActive ? "AKTIF" : "KAS SAJA"}
              </span>
            </button>
          </div>

        </div>

        {/* Projection results cards */}
        <div className="md:col-span-12 lg:col-span-7 bg-[#0A0A0A] border border-white/5 p-5 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <span className="text-[10px] text-white/40 uppercase font-black tracking-widest block font-mono">
              OUTPUT EVALUASI COMPOUNDING
            </span>

            {/* Results Grid Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-white/5 border border-white/5 rounded-xl font-mono">
                <span className="text-[8px] text-white/40 block font-sans">Sisa Kepemilikan Saham</span>
                <span className="text-[15px] font-black tracking-tight text-white block mt-1.5">
                  {finalShares.toLocaleString("id-ID")} Lbr
                </span>
                <span className="text-[8px] text-emerald-400 block mt-0.5">
                  +{Math.round(finalShares - (initialCapital / currentPrice)).toLocaleString("id-ID")} dari DRIP
                </span>
              </div>

              <div className="p-3 bg-white/5 border border-white/5 rounded-xl font-mono">
                <span className="text-[8px] text-white/40 block font-sans">Yield-on-Cost (YoC)</span>
                <span className="text-[15px] font-black tracking-tight text-yellow-400 block mt-1.5">
                  {finalYoC}%
                </span>
                <span className="text-[8px] text-white/45 block mt-0.5">
                  Yield Awal: {currentYield}%
                </span>
              </div>

              <div className="p-3 bg-white/5 border border-white/5 rounded-xl font-mono">
                <span className="text-[8px] text-white/40 block font-sans">Total Dana Dividen</span>
                <span className="text-[15px] font-black tracking-tight text-emerald-400 block mt-1.5">
                  Rp{totalDivReceived >= 1000000 ? `${(totalDivReceived / 1000000).toFixed(1)} Jt` : totalDivReceived.toLocaleString("id-ID")}
                </span>
                <span className="text-[8px] text-white/30 block mt-0.5">
                  Nett setelah pph 10%
                </span>
              </div>

              <div className="p-3 bg-white/5 border border-white/5 rounded-xl font-mono">
                <span className="text-[8px] text-white/40 block font-sans">Evaluasi Portofolio</span>
                <span className="text-[15px] font-black tracking-tight text-white block mt-1.5">
                  Rp{(finalValue / 1000000).toFixed(1)} Jt
                </span>
                <span className="text-[8px] text-emerald-400 font-bold block mt-0.5">
                  +{returnOnCapital.toFixed(1)}% CAGR
                </span>
              </div>
            </div>

            {/* Explanatory text banner */}
            <div className="p-3.5 bg-yellow-950/10 border border-yellow-500/10 rounded-xl flex items-start gap-2.5">
              <Info className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-white/50 leading-relaxed">
                <strong className="text-yellow-400">Yield on Cost (YoC)</strong> mengukur hasil dividen tahunan berdasarkan harga beli awal Anda, bukan harga pasar sekarang. Di Tahun ke-5, dengan pertumbuhan laba <span className="text-white font-mono">{growthRate}%</span>, YoC Anda tumbuh dari <span className="text-emerald-400 font-bold font-mono">{currentYield}%</span> menjadi <span className="text-emerald-400 font-bold font-mono">{finalYoC}%</span>.
              </p>
            </div>
          </div>

          {/* Visualizing dynamic compounding Recharts */}
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projectionData} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorYoC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.22}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="lbl" stroke="#444" tickLine={false} style={{ fontSize: 9, fontFamily: "monospace" }} />
                <YAxis stroke="#444" tickLine={false} style={{ fontSize: 9, fontFamily: "monospace" }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: isLight ? "#ffffff" : "#0A0A0A", borderColor: "rgba(255,255,255,0.08)", borderRadius: "8px" }}
                  labelClassName="text-[10px] font-mono text-white/50"
                  itemStyle={{ fontSize: 10, fontFamily: "monospace" }}
                />
                <Legend verticalAlign="top" height={24} style={{ fontSize: 9 }} />
                <Area type="monotone" name="Nilai Portofolio (K)" dataKey="Nilai Portofolio (IDR)" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#colorValue)" />
                <Area type="monotone" name="YoC %" dataKey="Yield-on-Cost (YoC)" stroke="#f59e0b" strokeWidth={1.5} fillOpacity={1} fill="url(#colorYoC)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

        </div>

      </div>

      {/* 3. Detailed Data Table Projection block */}
      <div className="bg-[#0A0A0A] border border-white/5 rounded-2xl p-5 overflow-hidden">
        <span className="text-[10px] text-white/40 uppercase font-black tracking-widest block font-mono mb-4">
          TABEL PROYEKSI PERTUMBUHAN DIVIDEN BERKALA
        </span>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] font-mono">
            <thead>
              <tr className="border-b border-white/10 text-white/30 uppercase text-[9px] tracking-wider pb-2">
                <th className="pb-2 text-left">Periode</th>
                <th className="pb-2 text-center">Jumlah Saham</th>
                <th className="pb-2 text-right">EPS Proj</th>
                <th className="pb-2 text-right">DPS Proj (DPR)</th>
                <th className="pb-2 text-right">Yield on Cost (YoC)</th>
                <th className="pb-2 text-right">Dividen Bersih Thn Ini</th>
                <th className="pb-2 text-right">Nilai Akhir Saham</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {projectionData.map((item, idx) => {
                const isStart = idx === 0;
                return (
                  <tr key={item.year} className={`hover:bg-white/[0.01] transition-all ${isStart ? "text-white/40 font-bold" : "text-[#E0E0E0]/80"}`}>
                    <td className="py-2.5 font-sans font-bold text-white/70">{item.year} <span className="text-[9px] font-light text-white/30">({item.lbl})</span></td>
                    <td className="py-2.5 text-center">{item["Shares Owned"].toLocaleString("id-ID")} lembar</td>
                    <td className="py-2.5 text-right text-white/50">Rp {item["EPS Projected"].toLocaleString("id-ID")}</td>
                    <td className="py-2.5 text-right text-white/50">Rp {item["DPS Projected"].toLocaleString("id-ID")} <span className="text-[9px] text-emerald-400">({payoutRatio}%)</span></td>
                    <td className="py-2.5 text-right font-bold text-yellow-400">{item["Yield-on-Cost (YoC)"]}%</td>
                    <td className="py-2.5 text-right font-medium text-emerald-300">
                      {isStart ? "-" : `Rp ${item["Dividen Diterima"].toLocaleString("id-ID")}`}
                    </td>
                    <td className="py-2.5 text-right font-bold text-white">Rp {item["Nilai Portofolio (IDR)"].toLocaleString("id-ID")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
