import { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Play, Bookmark, Activity, Info, Calendar, Maximize, Minimize } from 'lucide-react';

export default function Simulasi() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full animate-in fade-in duration-500">
      {/* Form Sidebar */}
      <div className="w-full xl:w-96 shrink-0 bg-white/[0.03] backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 p-6 lg:p-8 flex flex-col gap-8 shadow-2xl h-fit">
         <div className="flex items-center gap-3 border-b border-gray-200 dark:border-white/10 pb-6">
            <Settings className="text-gray-900 dark:text-white/60" size={24} />
            <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-widest text-sm">Parameter Backtest</h3>
         </div>

         <div className="space-y-6">
           <div>
             <label className="text-gray-900 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest block mb-3 text-shadow-sm">Mode Simulasi</label>
             <div className="grid grid-cols-2 gap-3">
               <button className="py-3 px-2 bg-green-50 dark:bg-green-500/10 border border-green-600 dark:border-green-500/30 rounded-2xl text-green-700 dark:text-green-400 text-xs font-bold leading-tight shadow-[0_0_15px_rgba(74,222,128,0.1)] hover:bg-green-200 dark:bg-green-500/20 transition-all">Algo<br/>Rebalancer</button>
               <button className="py-3 px-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white/60 text-xs font-bold hover:bg-gray-200 dark:bg-white/10 transition-colors leading-tight hover:text-gray-900 dark:text-white shadow-inner">Single<br/>Stock</button>
             </div>
           </div>

           <div>
             <label className="text-gray-900 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest block mb-3">Jumlah Saham Dibeli</label>
             <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-gray-100 dark:border-white/5 shadow-inner">
               <button className="flex-1 py-3 bg-transparent rounded-xl text-gray-900 dark:text-white/40 text-xs font-bold hover:text-gray-900 dark:text-white transition-colors">Top 1</button>
               <button className="flex-1 py-3 bg-gray-200 dark:bg-white/10 rounded-xl text-gray-900 dark:text-white text-xs font-bold shadow-sm border border-gray-100 dark:border-white/5">Top 3</button>
               <button className="flex-1 py-3 bg-transparent rounded-xl text-gray-900 dark:text-white/40 text-xs font-bold hover:text-gray-900 dark:text-white transition-colors">Top 5</button>
             </div>
             <p className="text-[11px] text-gray-900 dark:text-white/40 mt-3 leading-relaxed font-medium">Beli 5 saham terbaik berdasarkan skor faktor setiap hari.</p>
           </div>

           <div>
             <label className="text-gray-900 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest block mb-3">Universe Seleksi Saham</label>
             <div className="grid grid-cols-4 gap-2">
               <button className="py-3 px-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white/60 text-[10px] sm:text-xs font-bold hover:bg-gray-200 dark:bg-white/10 transition-colors">Semua</button>
               <button className="py-3 px-1 bg-blue-500/10 border border-blue-500/30 rounded-2xl text-blue-600 dark:text-blue-400 text-[10px] sm:text-xs font-bold shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:bg-blue-500/20 transition-all">IDX80</button>
               <button className="py-3 px-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white/60 text-[10px] sm:text-xs font-bold hover:bg-gray-200 dark:bg-white/10 transition-colors">IDX30</button>
               <button className="py-3 px-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white/60 text-[10px] sm:text-xs font-bold hover:bg-gray-200 dark:bg-white/10 transition-colors">LQ45</button>
             </div>
           </div>

           <div>
             <label className="text-gray-900 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest block mb-3">Pilih Strategi Faktor</label>
             <div className="flex gap-3">
               <button className="flex-1 py-3.5 px-2 bg-green-50 dark:bg-green-500/10 border border-green-600 dark:border-green-500/30 rounded-2xl text-green-700 dark:text-green-400 text-xs font-bold shadow-[0_0_15px_rgba(74,222,128,0.1)] hover:bg-green-200 dark:bg-green-500/20 transition-all flex items-center justify-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" /> Config F
               </button>
               <button className="flex-1 py-3.5 px-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white/60 text-xs font-bold hover:bg-gray-200 dark:bg-white/10 hover:text-gray-900 dark:text-white transition-all shadow-inner">
                 Config B
               </button>
             </div>
             <div className="mt-3 p-3 bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-xl">
               <p className="text-[11px] text-gray-900 dark:text-white/50 leading-relaxed font-medium">
                 Menguji <strong className="text-gray-900 dark:text-white">Config F</strong>: Fundamental Focus (Kualitas & Value diunggulkan).
               </p>
             </div>
           </div>

           <div className="border-t border-gray-200 dark:border-white/10 pt-6">
             <label className="text-gray-900 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest block mb-3">Rentang Waktu Backtest</label>
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[10px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-widest block mb-2">Mulai Dari</label>
                  <button className="w-full py-3.5 px-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white text-xs font-bold flex justify-between items-center hover:bg-gray-200 dark:bg-white/10 transition-colors shadow-inner">
                     01/01/20 <Calendar size={14} className="text-gray-900 dark:text-white/40" />
                  </button>
               </div>
               <div>
                  <label className="text-[10px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-widest block mb-2">Sampai Dengan</label>
                  <button className="w-full py-3.5 px-4 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-gray-900 dark:text-white text-xs font-bold flex justify-between items-center hover:bg-gray-200 dark:bg-white/10 transition-colors shadow-inner">
                     06/06/26 <Calendar size={14} className="text-gray-900 dark:text-white/40" />
                  </button>
               </div>
             </div>
           </div>

           <div className="pt-2">
             <label className="text-gray-900 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest block mb-3">Modal Awal Simulasi (IDR)</label>
             <input type="text" value="100.000.000" readOnly className="w-full bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-2xl py-4 px-5 text-sm font-bold text-gray-900 dark:text-white text-center focus:outline-none shadow-inner" />
           </div>

           <button className="w-full py-5 bg-blue-600 dark:bg-white text-white dark:text-blue-900 font-bold rounded-2xl text-sm flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform uppercase tracking-widest mt-4 shadow-xl">
             <Play size={16} fill="currentColor" /> Jalankan Backtest
           </button>
         </div>
      </div>

      {/* Results Area */}
      <div className="flex-1 flex flex-col gap-6">
         {/* Title area */}
         <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 p-6 lg:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-96 h-96 bg-green-50 dark:bg-green-500/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="relative z-10 w-full md:w-auto">
               <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-gray-900 dark:text-white mb-2 uppercase flex items-center gap-3">
                 <Bookmark className="text-green-700 dark:text-green-400 shrink-0" size={28} />
                 Advanced Real-Time Algorithmic Backtester
               </h1>
               <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-gray-900 dark:text-white/50 text-xs font-bold uppercase tracking-widest">
                 <span className="bg-gray-100 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-gray-100 dark:border-white/5 text-gray-900 dark:text-white/70">2000-01-03 HINGGA 2026-06-16</span>
                 <p className="normal-case tracking-normal">Simulasikan rotasi harian dengan perlindungan crash IHSG & rebalance otomatis.</p>
               </div>
            </div>
            <div className="relative z-10 px-5 py-4 bg-green-50 dark:bg-green-500/10 border border-green-600 dark:border-green-500/20 text-green-700 dark:text-green-400 rounded-2xl text-xs sm:text-sm font-bold uppercase tracking-widest text-right shadow-[0_0_20px_rgba(74,222,128,0.1)] min-w-[140px] text-center border-dashed">
               Daily<br/>Rebalancing<br/>Engine
            </div>
         </div>

         {/* Results Grid Top (4 cols) */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 backdrop-blur-md shadow-2xl relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <p className="text-gray-900 dark:text-white/40 text-[10px] lg:text-xs font-bold uppercase tracking-widest mb-4 leading-tight h-8 relative z-10">Hasil Akhir Strategi</p>
               <h3 className="text-green-700 dark:text-green-400 text-3xl lg:text-4xl font-medium break-words tracking-tighter leading-none mb-4 relative z-10">Rp<br/>492.334.867</h3>
               <div className="relative z-10 inline-flex items-center px-3 py-1.5 bg-green-50 dark:bg-green-500/10 border border-green-600 dark:border-green-500/20 text-green-700 dark:text-green-400 rounded-lg text-xs font-bold shadow-sm">
                 +392.3% Absolut
               </div>
            </div>
            <div className="bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 backdrop-blur-md shadow-2xl group relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <p className="text-gray-900 dark:text-white/40 text-[10px] lg:text-xs font-bold uppercase tracking-widest mb-4 leading-tight h-8 relative z-10">Benchmark IHSG</p>
               <h3 className="text-gray-900 dark:text-white text-3xl lg:text-4xl font-medium break-words tracking-tighter leading-none mb-4 relative z-10">Rp<br/>858.285.714</h3>
               <p className="text-green-700 dark:text-green-400 text-sm font-bold mt-1 relative z-10">+758.3% <span className="text-gray-900 dark:text-white/40 text-xs font-medium ml-1">(Hold)</span></p>
            </div>
            <div className="bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 backdrop-blur-md shadow-2xl group relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <p className="text-gray-900 dark:text-white/40 text-[10px] lg:text-xs font-bold uppercase tracking-widest mb-4 leading-tight h-8 relative z-10">Pelarian Emas / Kas</p>
               <h3 className="text-yellow-700 dark:text-yellow-500 text-3xl lg:text-4xl font-medium break-words tracking-tighter leading-none mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.3)] relative z-10">Rp<br/>284.158.881</h3>
               <p className="text-gray-900 dark:text-white/50 text-sm font-bold mt-1 relative z-10">Emas: +184.2% <span className="text-gray-900 dark:text-white/30 text-xs">(Hold)</span></p>
            </div>
            <div className="bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 backdrop-blur-md shadow-2xl group relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <p className="text-gray-900 dark:text-white/40 text-[10px] lg:text-xs font-bold uppercase tracking-widest mb-4 leading-tight h-8 relative z-10">Swaps & Dividen</p>
               <h3 className="text-blue-600 dark:text-blue-400 text-3xl lg:text-4xl font-medium break-words tracking-tighter leading-none mb-4 drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] relative z-10">223<br/><span className="text-sm font-semibold uppercase tracking-widest opacity-80 mt-1 block h-5">Rebalances</span></h3>
               <p className="text-gray-900 dark:text-white/60 text-xs font-medium bg-gray-100 dark:bg-white/5 border border-gray-100 dark:border-white/5 px-2 py-1 rounded inline-block relative z-10">Div: Rp 239.248.620</p>
            </div>
         </div>

         {/* Results Grid Middle (4 cols) */}
         <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 backdrop-blur-md flex flex-col justify-center shadow-2xl relative overflow-hidden hover:border-gray-300 dark:border-white/20 transition-colors">
               <p className="text-gray-900 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest mb-4 leading-tight border-b border-gray-200 dark:border-white/10 pb-4">CAGR (Annualized)</p>
               <p className="text-3xl font-medium text-gray-900 dark:text-white tracking-tighter mb-2">6.21%</p>
               <p className="text-gray-900 dark:text-white/40 text-xs font-medium">Tingkat Pertumbuhan</p>
            </div>
            <div className="bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 backdrop-blur-md flex flex-col justify-center shadow-2xl relative overflow-hidden hover:border-gray-300 dark:border-white/20 transition-colors">
               <p className="text-gray-900 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest mb-4 leading-tight border-b border-gray-200 dark:border-white/10 pb-4">Rasio Sharpe</p>
               <p className="text-3xl font-medium text-green-700 dark:text-green-400 tracking-tighter mb-2 font-mono">0.04</p>
               <p className="text-gray-900 dark:text-white/40 text-xs font-medium">Sortino: <span className="text-gray-900 dark:text-white font-bold ml-1 font-mono">0.05</span></p>
            </div>
            <div className="bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 backdrop-blur-md flex flex-col justify-center shadow-2xl relative overflow-hidden hover:border-gray-300 dark:border-white/20 transition-colors">
               <p className="text-gray-900 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest mb-4 leading-tight border-b border-gray-200 dark:border-white/10 pb-4">Volatilitas</p>
               <p className="text-3xl font-medium text-red-400 tracking-tighter mb-2 font-mono">33.7%</p>
               <p className="text-gray-900 dark:text-white/40 text-xs font-medium">Calmar: <span className="text-gray-900 dark:text-white font-bold ml-1 font-mono">0.10</span></p>
            </div>
            <div className="bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-6 lg:p-8 backdrop-blur-md flex flex-col justify-center shadow-2xl relative overflow-hidden hover:border-gray-300 dark:border-white/20 transition-colors">
               <p className="text-gray-900 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest mb-4 leading-tight border-b border-gray-200 dark:border-white/10 pb-4">Win Rate</p>
               <p className="text-3xl font-medium text-yellow-700 dark:text-yellow-400 tracking-tighter mb-2 font-mono">48.8%</p>
               <p className="text-gray-900 dark:text-white/40 text-xs font-medium">Turnover: <span className="text-gray-900 dark:text-white font-bold ml-1 font-mono">12096.8%</span></p>
            </div>
         </div>

         {/* Info Alert Box */}
         <div className="bg-gradient-to-r from-blue-500/10 dark:from-blue-900/40 to-blue-400/5 dark:to-blue-800/10 border border-blue-500/30 rounded-2xl p-8 flex flex-col md:flex-row gap-6 backdrop-blur-xl shadow-[0_10px_30px_rgba(59,130,246,0.1)] relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 blur-[60px] rounded-full pointer-events-none" />
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 shadow-inner z-10">
               <Info className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div className="text-sm md:text-base text-gray-800 dark:text-white/80 leading-relaxed font-medium z-10 relative">
               Algoritma rotasi harian dengan penyisihan saham Rank ≥7 berbasis <span className="text-blue-600 dark:text-blue-400 font-bold px-1">Config F (Fundamental Focus)</span> berhasil melampaui tolok ukur pasar IHSG. Dengan modal awal <span className="font-bold text-gray-900 dark:text-white px-1">Rp 100.000.000</span> sejak 2000-01-03 hingga 2026-06-16, rebalancing portofolio otomatis Anda melonjak menjadi <span className="text-green-700 dark:text-green-400 font-bold px-1 bg-green-50 dark:bg-green-500/10 rounded border border-green-600 dark:border-green-500/20">Rp 492.334.867</span> dibandingkan acuan pasar IHSG <span className="text-gray-900 dark:text-white font-bold opacity-80">Rp 858.285.714</span>.
            </div>
         </div>

         {/* Chart Area */}
         <div className={`transition-all duration-500 flex flex-col shadow-2xl relative overflow-hidden ${isFullscreen ? 'fixed inset-0 z-[100] bg-gray-50 dark:bg-[#050505] p-6 lg:p-12' : 'bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-8 lg:p-10 backdrop-blur-md min-h-[600px]'}`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 relative z-10 gap-4">
               <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                 <Activity size={18} className="text-blue-600 dark:text-blue-400" />
                 Grafik Compounding Multi-Asset Backtest
               </h4>
               <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-gray-900 dark:text-white/50">
                  <div className="flex items-center gap-4 bg-gray-100 dark:bg-white/5 px-4 py-2 rounded-xl border border-gray-100 dark:border-white/5">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span> Benchmark Emas Fisik</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white/40"></span> Benchmark IHSG</span>
                    <span className="flex items-center gap-1.5 text-gray-900 dark:text-white shadow-sm"><span className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.5)]"></span> Strategi Rebalance Algo</span>
                  </div>
                  <button 
                    onClick={() => setIsFullscreen(!isFullscreen)} 
                    className="p-2 bg-gray-200 dark:bg-white/10 hover:bg-white/20 transition-colors rounded-xl text-gray-900 dark:text-white flex items-center justify-center shrink-0"
                    title={isFullscreen ? "Tutup Layar Penuh" : "Layar Penuh"}
                  >
                    {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                  </button>
               </div>
            </div>
            
            <div className="flex-1 border border-gray-100 dark:border-white/5 bg-white/[0.01] rounded-2xl relative flex items-center justify-center overflow-hidden z-10">
               {/* Grid lines */}
               <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:40px_40px]" />
               
               {/* Y-axis labels mock */}
               <div className="absolute left-4 top-4 bottom-4 flex flex-col justify-between text-[10px] font-mono text-gray-900 dark:text-white/30 font-bold opacity-50">
                  <span>800000</span>
                  <span>600000</span>
                  <span>400000</span>
                  <span>200000</span>
                  <span>0</span>
               </div>
               
               <p className="absolute text-xs text-gray-900 dark:text-white/30 font-mono tracking-widest uppercase z-20 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-100 dark:border-white/5 bg-black/20">Canvas Rendering Area</p>
               
               {/* Mock SVG lines */}
               <svg className="absolute inset-0 w-full h-full z-10 p-10" preserveAspectRatio="none">
                 {/* IHSG Line (White/Grey) */}
                 <path d="M0,90 Q50,85 100,70 T200,85 T300,60 T400,90 T500,50 T600,40 T700,35 T800,20 T900,10 T1000,15" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-900 dark:text-white/30 drop-shadow-md"/>
                 {/* Gold Line (Yellow) */}
                 <path d="M0,95 Q100,90 200,85 T400,75 T600,60 T800,40 T1000,25" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-700 dark:text-yellow-500/50 drop-shadow-md"/>
                 {/* Strategy Line (Green) */}
                 <path d="M0,80 Q50,90 100,60 T200,65 T300,40 T400,80 T500,30 T600,45 T700,20 T800,35 T900,10 T1000,5" fill="none" stroke="url(#gradientGreen)" strokeWidth="3" className="drop-shadow-[0_5px_15px_rgba(74,222,128,0.4)]"/>
                 
                 <defs>
                   <linearGradient id="gradientGreen" x1="0%" y1="0%" x2="100%" y2="0%">
                     <stop offset="0%" stopColor="#22c55e" />
                     <stop offset="100%" stopColor="#4ade80" />
                   </linearGradient>
                 </defs>
               </svg>
            </div>
         </div>
      </div>
    </div>
  );
}
