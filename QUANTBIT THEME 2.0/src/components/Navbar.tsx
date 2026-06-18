import { motion } from 'motion/react';
import { Sun, Moon } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, isDarkMode, setIsDarkMode }: { activeTab: string, setActiveTab: (tab: string) => void, isDarkMode: boolean, setIsDarkMode: (dark: boolean) => void }) {
  const tabs = ['market', 'portfolio', 'leaders', 'simulasi'];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center mt-3 px-4">
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-5xl bg-white dark:bg-white/5 backdrop-blur-3xl border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-2 flex flex-col md:flex-row items-center justify-between shadow-lg dark:shadow-2xl gap-4 md:gap-0"
      >
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('leaders')}>
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-white font-bold text-sm">Q</span>
            </div>
            <span className="font-semibold text-lg tracking-tight text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-white/80 transition-colors uppercase">
              Quantbit Terminal
            </span>
          </div>
          
          <div className="md:hidden flex items-center gap-4">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/80">
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar justify-start md:justify-center">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 sm:px-5 py-1.5 rounded-lg text-xs sm:text-sm font-bold tracking-wide transition-all duration-300 capitalize whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-blue-500 text-white dark:bg-white/10 dark:text-white shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-4">
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/20 transition-colors">
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/20 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gradient-to-b dark:from-gray-700 dark:to-black border border-gray-300 dark:border-white/10 overflow-hidden shadow-inner flex shrink-0">
            <div className="w-full h-full bg-[url('https://i.pravatar.cc/100?img=11')] bg-cover bg-center dark:mix-blend-overlay dark:opacity-80" />
          </div>
        </div>
      </motion.div>
    </nav>
  );
}
