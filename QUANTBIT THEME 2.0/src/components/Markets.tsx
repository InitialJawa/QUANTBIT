import { motion } from 'motion/react';
import { TrendingUp, TrendingDown, Search, ArrowUpRight, BarChart3 } from 'lucide-react';

const marketData = [
  { id: 1, symbol: 'BTC', name: 'Bitcoin', price: '$64,230.00', change: '+2.4%', changeValue: '+$1,420.00', isUp: true, volume: '$34.2B', marketCap: '$1.2T' },
  { id: 2, symbol: 'ETH', name: 'Ethereum', price: '$3,492.15', change: '-0.8%', changeValue: '-$28.40', isUp: false, volume: '$15.1B', marketCap: '$420B' },
  { id: 3, symbol: 'SOL', name: 'Solana', price: '$143.20', change: '+5.2%', changeValue: '+$7.10', isUp: true, volume: '$4.2B', marketCap: '$65B' },
  { id: 4, symbol: 'BNB', name: 'Binance Coin', price: '$580.40', change: '+1.2%', changeValue: '+$6.90', isUp: true, volume: '$1.8B', marketCap: '$89B' },
  { id: 5, symbol: 'XRP', name: 'Ripple', price: '$0.52', change: '-0.4%', changeValue: '-$0.002', isUp: false, volume: '$900M', marketCap: '$28B' },
];

export default function Markets() {
  return (
    <div className="w-full flex justify-center pb-10">
      <div className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">Markets</h1>
          <p className="text-gray-900 dark:text-white/50 text-lg">Real-time algorithmic price feeds</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-900 dark:text-white/40" size={18} />
          <input 
            type="text" 
            placeholder="Search assets..." 
            className="w-full bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 text-gray-900 dark:text-white placeholder:text-gray-900 dark:text-white/30 focus:outline-none focus:border-gray-300 dark:border-white/20 focus:bg-white/[0.05] transition-all backdrop-blur-md shadow-inner"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 p-6 flex items-center justify-between hover:border-gray-300 dark:border-white/20 transition-all cursor-pointer group">
          <div>
            <p className="text-gray-900 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1 group-hover:text-gray-900 dark:text-white/60 transition-colors">Global Market Cap</p>
            <p className="text-3xl font-medium text-gray-900 dark:text-white">$2.45T</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <BarChart3 className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 p-6 flex items-center justify-between hover:border-gray-300 dark:border-white/20 transition-all cursor-pointer group">
          <div>
            <p className="text-gray-900 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1 group-hover:text-gray-900 dark:text-white/60 transition-colors">24h Volume</p>
            <p className="text-3xl font-medium text-gray-900 dark:text-white">$84.2B</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <TrendingUp className="text-purple-600 dark:text-purple-400" size={24} />
          </div>
        </div>
        <div className="bg-white/[0.03] backdrop-blur-md rounded-2xl border border-gray-200 dark:border-white/10 p-6 flex items-center justify-between hover:border-gray-300 dark:border-white/20 transition-all cursor-pointer group">
          <div>
            <p className="text-gray-900 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest mb-1 group-hover:text-gray-900 dark:text-white/60 transition-colors">BTC Dominance</p>
            <p className="text-3xl font-medium text-gray-900 dark:text-white">52.4%</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-600 dark:border-yellow-500/20 flex items-center justify-center">
            <BarChart3 className="text-yellow-700 dark:text-yellow-400" size={24} />
          </div>
        </div>
      </div>

      <div className="bg-white/[0.03] backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5 text-gray-900 dark:text-white/40 text-xs font-semibold tracking-wider uppercase">
                <th className="py-5 px-8">Asset</th>
                <th className="py-5 px-6">Price</th>
                <th className="py-5 px-6">24h Change</th>
                <th className="py-5 px-6">24h Volume</th>
                <th className="py-5 px-6 text-right">Market Cap</th>
                <th className="py-5 px-6"></th>
              </tr>
            </thead>
            <tbody>
              {marketData.map((asset, index) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  key={asset.id} 
                  className="border-b border-gray-100 dark:border-white/5 hover:bg-white/[0.02] transition-colors group cursor-pointer"
                >
                  <td className="py-6 px-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center font-bold text-gray-900 dark:text-white/80 shrink-0">
                        {asset.symbol.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white text-lg">{asset.name}</p>
                        <p className="text-xs text-gray-900 dark:text-white/40 font-medium tracking-wide">{asset.symbol}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 px-6 font-semibold text-gray-900 dark:text-white tracking-tight">{asset.price}</td>
                  <td className="py-6 px-6">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 dark:bg-white/5 border border-gray-100 dark:border-white/5 ${asset.isUp ? 'text-green-700 dark:text-green-400 border-green-500/20 bg-green-50 dark:bg-green-400/10' : 'text-red-400 border-red-400/20 bg-red-400/10'}`}>
                      {asset.isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {asset.change}
                    </div>
                  </td>
                  <td className="py-6 px-6 text-gray-900 dark:text-white/70 font-medium tracking-tight">{asset.volume}</td>
                  <td className="py-6 px-6 text-gray-900 dark:text-white/70 font-medium tracking-tight text-right">{asset.marketCap}</td>
                  <td className="py-6 px-6 text-right">
                    <button className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-500/20 hover:border-blue-500/30 hover:scale-110 ml-auto">
                      <ArrowUpRight size={18} />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </div>
  );
}
