import { Wallet, Newspaper } from 'lucide-react';

export default function Sidebar() {
  return (
    <div className="flex flex-col gap-6">
      {/* Dompet RDI */}
      <div className="bg-white/[0.03] backdrop-blur-md text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-white/10 p-6 flex flex-col shadow-2xl">
        <div className="flex items-center gap-2 mb-8">
          <Wallet className="text-gray-900 dark:text-white/50" size={20} />
          <h2 className="text-gray-900 dark:text-white font-bold tracking-wide">DOMPET RDI</h2>
        </div>
        
        <p className="text-gray-900 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1 text-center">Total Nilai Aset</p>
        <h3 className="text-3xl font-medium tracking-tighter text-gray-900 dark:text-white mb-6 text-center">
          <span className="text-lg text-gray-900 dark:text-white/50 font-medium mr-1 tracking-normal">Rp</span>
          27.283.531
        </h3>
        
        <div className="flex gap-2 mb-8 justify-center">
          <div className="px-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-900 dark:text-white/70 flex items-center gap-2">
             <Wallet size={12} className="opacity-50" /> Rp 0
          </div>
          <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs font-bold text-yellow-700 dark:text-yellow-500 flex items-center gap-2 shadow-[0_0_15px_rgba(234,179,8,0.1)]">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse border border-yellow-500" /> 11.0000 gr
          </div>
        </div>

        {/* Tabs for Kas/Emas/Riwayat */}
        <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl mb-8 border border-gray-100 dark:border-white/5 shadow-inner">
          <button className="flex-1 py-2.5 bg-gray-200 dark:bg-white/10 rounded-xl text-[10px] sm:text-xs font-bold text-gray-900 dark:text-white shadow shadow-black/20 uppercase tracking-widest">Kas Tunai</button>
          <button className="flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold text-gray-900 dark:text-white/40 hover:text-gray-900 dark:text-white/80 transition-colors uppercase tracking-widest">Emas Fisik</button>
          <button className="flex-1 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold text-gray-900 dark:text-white/40 hover:text-gray-900 dark:text-white/80 transition-colors uppercase tracking-widest">Riwayat</button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-gray-900 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest mb-2">Nominal Transaksi (Rp)</p>
            <div className="relative">
              <input type="text" placeholder="Contoh: 1000000" className="w-full bg-white/[0.02] border border-gray-200 dark:border-white/10 rounded-xl py-4 px-5 text-sm font-bold text-gray-900 dark:text-white placeholder:text-gray-900 dark:text-white/30 focus:outline-none focus:border-gray-300 dark:border-white/20 transition-all shadow-inner" />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-900 dark:text-white/30 tracking-widest">IDR</span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-2">
            <button className="px-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-900 dark:text-white/70 hover:bg-gray-200 dark:bg-white/10 transition-colors">+100.000</button>
            <button className="px-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-900 dark:text-white/70 hover:bg-gray-200 dark:bg-white/10 transition-colors">+1.000.000</button>
            <button className="px-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold text-gray-900 dark:text-white/70 hover:bg-gray-200 dark:bg-white/10 transition-colors">+5.000.000</button>
            <button className="px-4 py-2 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all ml-auto">Max Kas</button>
          </div>
          
          <div className="py-6 border-b border-gray-100 dark:border-white/5">
             <p className="text-[10px] text-gray-900 dark:text-white/30 font-medium leading-relaxed">Transaksi disimulasikan secara real-time berdasarkan harga acuan pasar saat ini. Saldo Emas dikonversi dalam ukuran gram.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button className="flex-1 py-4 bg-gray-900 dark:bg-white text-white dark:text-black font-bold rounded-xl text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:scale-[1.02] transition-transform">Deposit Kas</button>
            <button className="flex-1 py-4 bg-transparent border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-gray-100 dark:bg-white/5 transition-colors">Tarik Tunai</button>
          </div>
        </div>
      </div>

      {/* Portal Berita */}
      <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Newspaper className="text-gray-900 dark:text-white/50" size={20} />
            <h2 className="text-gray-900 dark:text-white font-bold tracking-wide uppercase text-sm">Portal Berita</h2>
          </div>
        </div>

        <div className="space-y-4 max-h-[300px] overflow-y-auto no-scrollbar pr-1 relative">
          <div className="bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-xl p-5 hover:border-gray-200 dark:border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold text-gray-900 dark:text-white/80 uppercase tracking-widest">CNBC Indonesia</span>
              <span className="text-[10px] font-bold text-gray-900 dark:text-white/30 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">20 mins ago</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-relaxed tracking-tight italic">"BI-Rate Tetap 6.25%: Sentimen Likuiditas Perbankan Masih Terjaga Sempurna"</p>
          </div>
          
          <div className="bg-white/[0.02] border border-gray-100 dark:border-white/5 rounded-xl p-5 hover:border-gray-200 dark:border-white/10 hover:bg-white/[0.04] transition-all cursor-pointer">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[10px] font-bold text-gray-900 dark:text-white/80 uppercase tracking-widest">Bisnis.com</span>
              <span className="text-[10px] font-bold text-gray-900 dark:text-white/30 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded">1 hour ago</span>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white leading-relaxed tracking-tight italic">"Emiten Batubara Menggeliat, ADRO & ITMG Nikmati Berkah Lonjakan Volume..."</p>
          </div>
        </div>
      </div>
    </div>
  );
}
