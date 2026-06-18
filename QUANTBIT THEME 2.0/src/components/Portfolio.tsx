import { motion } from 'motion/react';
import { Wallet, ArrowDownLeft, ArrowUpRight, Clock, ShieldCheck, CreditCard } from 'lucide-react';

export default function Portfolio() {
  return (
    <div className="w-full flex justify-center pb-10">
      <div className="w-full">
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">Portfolio</h1>
        <p className="text-gray-900 dark:text-white/50 text-lg mb-10">Manage your wealth intelligently</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="col-span-1 lg:col-span-2 bg-gradient-to-br from-blue-600/30 to-indigo-800/30 border border-gray-200 dark:border-white/10 rounded-2xl p-8 md:p-12 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none transform translate-x-8 -translate-y-8">
            <Wallet size={200} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <p className="text-gray-900 dark:text-white/60 text-sm font-bold uppercase tracking-widest">Total Balance</p>
              <div className="flex items-center gap-1 text-xs text-gray-900 dark:text-white/40 bg-gray-200 dark:bg-white/10 px-2 py-1 rounded-md">
                <ShieldCheck size={12} /> Protected
              </div>
            </div>
            
            <h2 className="text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white mb-4 tracking-tighter drop-shadow-lg">$245,892.45</h2>
            
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 dark:bg-green-500/20 border border-green-500 dark:border-green-500/30 text-green-700 dark:text-green-400 rounded-full text-sm font-bold mb-10 shadow-sm dark:shadow-[0_0_15px_rgba(74,222,128,0.2)]">
              <ArrowUpRight size={16} />
              +18.4% All Time
            </div>

            <div className="flex flex-wrap gap-4">
              <button className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-blue-900 font-bold rounded-2xl flex items-center gap-2 hover:scale-105 transition-transform duration-300 shadow-xl">
                <ArrowDownLeft size={20} />
                Deposit Funds
              </button>
              <button className="px-8 py-4 bg-white dark:bg-white/10 text-gray-900 dark:text-white font-bold rounded-2xl flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-white/20 transition-all duration-300 border border-gray-200 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md">
                <ArrowUpRight size={20} />
                Withdraw
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-8 md:p-10 backdrop-blur-md flex flex-col justify-between shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Allocation</h3>
            <button className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-900 dark:text-white/50 hover:text-gray-900 dark:text-white hover:bg-gray-200 dark:bg-white/10 transition-colors">
              <CreditCard size={14} />
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center gap-6">
            <div>
              <div className="flex justify-between text-sm mb-2 font-medium">
                <span className="text-gray-900 dark:text-white">Bitcoin (BTC)</span>
                <span className="text-gray-900 dark:text-white/60">45%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-3 border border-gray-200 dark:border-white/10 overflow-hidden p-0.5">
                <div className="bg-gradient-to-r from-orange-400 to-orange-500 h-full rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" style={{ width: '45%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2 font-medium">
                <span className="text-gray-900 dark:text-white">Ethereum (ETH)</span>
                <span className="text-gray-900 dark:text-white/60">30%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-3 border border-gray-200 dark:border-white/10 overflow-hidden p-0.5">
                <div className="bg-gradient-to-r from-blue-400 to-blue-500 h-full rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: '30%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2 font-medium">
                <span className="text-gray-900 dark:text-white">Solana (SOL)</span>
                <span className="text-gray-900 dark:text-white/60">15%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-3 border border-gray-200 dark:border-white/10 overflow-hidden p-0.5">
                <div className="bg-gradient-to-r from-purple-400 to-purple-500 h-full rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ width: '15%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2 font-medium">
                <span className="text-gray-900 dark:text-white">USDC</span>
                <span className="text-gray-900 dark:text-white/60">10%</span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-white/5 rounded-full h-3 border border-gray-200 dark:border-white/10 overflow-hidden p-0.5">
                <div className="bg-gradient-to-r from-green-400 to-green-500 h-full rounded-full shadow-[0_0_10px_rgba(74,222,128,0.5)]" style={{ width: '10%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/[0.03] border border-gray-200 dark:border-white/10 rounded-2xl p-8 md:p-10 backdrop-blur-md shadow-2xl">
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-100 dark:border-white/5">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
          <button className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-300 bg-blue-400/10 hover:bg-blue-400/20 px-4 py-2 rounded-full transition-colors">
            View All History
          </button>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((_, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-xl hover:bg-white/[0.04] transition-colors border border-transparent hover:border-gray-200 dark:border-white/10 gap-4">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 flex items-center justify-center shrink-0 shadow-inner">
                  <ArrowDownLeft className="text-green-700 dark:text-green-400" size={24} />
                </div>
                <div>
                  <p className="text-gray-900 dark:text-white font-semibold text-lg">Received Ethereum</p>
                  <p className="text-gray-900 dark:text-white/40 text-sm font-medium flex items-center gap-1.5 mt-0.5">
                    <Clock size={14} /> Today, 14:32 PM • Internal Wallet
                  </p>
                </div>
              </div>
              <div className="sm:text-right flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                <p className="text-green-700 dark:text-green-400 font-bold text-lg">+1.45 ETH</p>
                <p className="text-gray-900 dark:text-white/40 text-sm font-medium mt-0.5">+$5,063.40</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}
