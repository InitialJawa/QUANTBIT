import { motion } from 'motion/react';
import { Search, Filter, LayoutGrid, List, TrendingUp, TrendingDown, Activity, ChevronDown } from 'lucide-react';

const stocks = [
  { rank: 1, emiten: 'MAPI', quality: 90.0, growth: 100.0, value: 60.0, moment: 100.0, sector: 'BREAKOUT', sectorType: 'up', t: 14, b: 6, score: 85.5 },
  { rank: 2, emiten: 'ADRO', quality: 80.0, growth: 100.0, value: 80.0, moment: 80.0, sector: 'KONSISTEN PEAK', sectorType: 'up', t: 28, b: 2, score: 82.0 },
  { rank: 3, emiten: 'ADMR', quality: 70.0, growth: 100.0, value: 80.0, moment: 80.0, sector: 'MOMENTUM', sectorType: 'up', t: 26, b: 5, score: 79.5 },
  { rank: 4, emiten: 'PTBA', quality: 80.0, growth: 65.0, value: 80.0, moment: 80.0, sector: 'AYUNAN TINGGI', sectorType: 'down', t: 19, b: 5, score: 78.5 },
  { rank: 5, emiten: 'JPFA', quality: 90.0, growth: 100.0, value: 80.0, moment: 60.0, sector: 'AKUMULASI', sectorType: 'up', t: 19, b: 9, score: 77.5 },
  { rank: 6, emiten: 'ULTJ', quality: 90.0, growth: 100.0, value: 80.0, moment: 60.0, sector: 'MOMENTUM', sectorType: 'up', t: 28, b: 9, score: 77.5 },
  { rank: 7, emiten: 'BDMN', quality: 60.0, growth: 85.0, value: 60.0, moment: 100.0, sector: 'MOMENTUM', sectorType: 'up', t: 16, b: 9, score: 76.5 },
  { rank: 8, emiten: 'AKRA', quality: 90.0, growth: 85.0, value: 80.0, moment: 60.0, sector: 'SATURASI', sectorType: 'down-red', t: 6, b: 10, score: 76.0 },
];

export default function Leaders() {
  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
      {/* Top Header Stats */}
      <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 p-8 lg:p-10 flex flex-col lg:flex-row justify-between items-start lg:items-center shadow-2xl relative overflow-hidden">
         {/* Decorative background element */}
         <div className="absolute right-0 top-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
         
         <div className="relative z-10 w-full lg:w-auto">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="text-blue-600 dark:text-blue-400" size={24} />
              <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white uppercase">Strategi Fundamental</h2>
            </div>
            <div className="flex flex-wrap gap-4 text-[11px] font-bold tracking-widest uppercase text-gray-900 dark:text-white/50 bg-gray-100 dark:bg-white/5 px-4 py-2 border border-gray-100 dark:border-white/5 rounded-full w-fit">
              <span>Kualitas: <span className="text-gray-900 dark:text-white">25%</span></span> <span className="text-gray-900 dark:text-white/20">•</span>
              <span>Growth: <span className="text-gray-900 dark:text-white">10%</span></span> <span className="text-gray-900 dark:text-white/20">•</span>
              <span>Value: <span className="text-gray-900 dark:text-white">30%</span></span> <span className="text-gray-900 dark:text-white/20">•</span>
              <span>Momentum: <span className="text-gray-900 dark:text-white">35%</span></span>
            </div>
         </div>
         <div className="text-left lg:text-right mt-8 lg:mt-0 relative z-10 w-full lg:w-auto border-t border-gray-200 dark:border-white/10 lg:border-t-0 pt-6 lg:pt-0">
            <p className="text-gray-900 dark:text-white/50 text-[11px] font-bold uppercase tracking-widest mb-1">Rata-Rata 5 Teratas</p>
            <h3 className="text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white tracking-tighter drop-shadow-lg">80.6</h3>
         </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col xl:flex-row gap-4 items-center justify-between mt-2">
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
           <div className="relative w-full sm:w-72">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-900 dark:text-white/40" size={18} />
              <input type="text" placeholder="Cari emiten ticker" className="w-full bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-900 dark:text-white/30 focus:outline-none focus:border-gray-300 dark:border-white/20 focus:bg-white/[0.05] transition-all shadow-inner" />
           </div>
           
           <button className="px-6 py-3.5 bg-green-50 dark:bg-green-500/10 border border-green-600 dark:border-green-500/30 rounded-2xl text-[11px] sm:text-xs font-bold text-green-700 dark:text-green-400 flex items-center justify-center gap-2 hover:bg-green-200 dark:bg-green-500/20 transition-colors uppercase tracking-widest shadow-[0_0_15px_rgba(74,222,128,0.1)]">
              <Filter size={16} /> Semua Saham
           </button>
           
           <button className="px-6 py-3.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl text-[11px] sm:text-xs font-bold text-gray-900 dark:text-white/80 flex items-center justify-center gap-4 hover:bg-gray-200 dark:bg-white/10 transition-colors uppercase tracking-widest">
              Total Score <ChevronDown size={16} className="text-gray-900 dark:text-white/40" />
           </button>
        </div>
        
        <div className="flex bg-gray-100 dark:bg-white/5 p-1 border border-gray-200 dark:border-white/10 rounded-2xl shrink-0 w-full xl:w-auto justify-center sm:justify-start shadow-inner">
           <button className="px-6 py-2.5 bg-gray-200 dark:bg-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white shadow shadow-black/20 flex items-center gap-2">
              <List size={16} /> Matrix
           </button>
           <button className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-900 dark:text-white/40 hover:text-gray-900 dark:text-white/80 transition-colors flex items-center gap-2">
              <LayoutGrid size={16} /> Cards
           </button>
        </div>
      </div>

      {/* Table Area */}
      <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden shadow-2xl">
         <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1000px]">
               <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10 text-gray-900 dark:text-white/50 text-[10px] sm:text-xs font-bold tracking-widest uppercase bg-white/[0.02]">
                    <th className="py-6 px-8 w-24">Rank</th>
                    <th className="py-6 px-4">Emiten Saham</th>
                    <th className="py-6 px-4 text-center">Quality</th>
                    <th className="py-6 px-4 text-center">Growth</th>
                    <th className="py-6 px-4 text-center">Value</th>
                    <th className="py-6 px-4 text-center">Moment</th>
                    <th className="py-6 px-4 text-center w-48">Rotasi Sektor</th>
                    <th className="py-6 px-8 text-right w-32">Total Score</th>
                  </tr>
               </thead>
               <tbody>
                 {stocks.map((stock, i) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={stock.rank} 
                      className="border-b border-gray-100 dark:border-white/5 hover:bg-white/[0.04] transition-colors group cursor-default"
                    >
                       <td className="py-5 px-8 text-sm font-bold text-gray-900 dark:text-white/50">#{stock.rank}</td>
                       <td className="py-5 px-4">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-white/10 to-transparent flex items-center justify-center text-sm font-bold font-mono border border-gray-300 dark:border-white/20 shadow-inner group-hover:scale-110 transition-transform">
                                {stock.emiten.charAt(0)}
                             </div>
                             <span className="font-bold text-gray-900 dark:text-white tracking-wide">{stock.emiten}</span>
                          </div>
                       </td>
                       <td className="py-5 px-4 text-center text-sm font-bold text-gray-900 dark:text-white/80">{stock.quality.toFixed(2)}</td>
                       <td className="py-5 px-4 text-center text-sm font-bold text-gray-900 dark:text-white/80">{stock.growth.toFixed(2)}</td>
                       <td className="py-5 px-4 text-center text-sm font-bold text-gray-900 dark:text-white/80">{stock.value.toFixed(2)}</td>
                       <td className="py-5 px-4 text-center text-sm font-bold text-gray-900 dark:text-white/80">{stock.moment.toFixed(2)}</td>
                       <td className="py-5 px-4">
                          <div className="flex flex-col items-center">
                             <div className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 border mb-1.5 min-w-[120px] transition-all
                                ${stock.sectorType === 'up' ? 'text-green-700 dark:text-green-400 border-green-500/20 bg-green-50 dark:bg-green-400/10 shadow-[0_0_10px_rgba(74,222,128,0.05)] text-shadow-sm' : ''}
                                ${stock.sectorType === 'down' ? 'text-blue-600 dark:text-blue-400 border-blue-400/20 bg-blue-400/10 shadow-[0_0_10px_rgba(59,130,246,0.05)] text-shadow-sm' : ''}
                                ${stock.sectorType === 'down-red' ? 'text-red-400 border-red-400/20 bg-red-400/10 shadow-[0_0_10px_rgba(248,113,113,0.05)] text-shadow-sm' : ''}
                             `}>
                                {(stock.sectorType === 'up') && <TrendingUp size={12} />}
                                {(stock.sectorType === 'down' || stock.sectorType === 'down-red') && <TrendingDown size={12} />}
                                {stock.sector}
                             </div>
                             <span className="text-[10px] text-gray-900 dark:text-white/30 font-bold uppercase tracking-widest">T: {stock.t} <span className="opacity-50">|</span> B: {stock.b}</span>
                          </div>
                       </td>
                       <td className="py-5 px-8 text-right">
                          <span className="text-2xl font-semibold tracking-tighter text-gray-900 dark:text-white drop-shadow-md">{stock.score.toFixed(1)}</span>
                       </td>
                    </motion.tr>
                 ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  )
}
