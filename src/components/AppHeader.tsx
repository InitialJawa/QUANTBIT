import type { RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Settings, LogOut, Moon, Sun, Menu, X, Activity, Briefcase, BarChart3, History, Search, Bell, BellOff, BellRing, Sparkles, Wallet, AlertTriangle } from "lucide-react";
import { totalWealth, formatRupiahShort } from "../utils/portfolioValue";
import type { PortfolioItem, StockData } from "../types";

interface AppHeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  dataFeed: string;
  userEmail: string | undefined;
  settingsRef: RefObject<HTMLDivElement | null>;
  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  theme: string;
  setTheme: (theme: string) => void;
  activeConfig: string;
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  setDataFeed: (feed: "yahoo" | "goapi" | "simulated") => void;
  logout: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit?: (q: string) => void;
  proactiveAIEnabled: boolean;
  setProactiveAIEnabled: (v: boolean) => void;
  useDevMockAI: boolean;
  setUseDevMockAI: (v: boolean) => void;
  showToasts: boolean;
  setShowToasts: (v: boolean) => void;
  showCrisisSignals: boolean;
  setShowCrisisSignals: (v: boolean) => void;
  // FASE 1.4 — Total Wealth (single source of truth = stocks + cash + gold)
  portfolio: PortfolioItem[];
  cash: number;
  getDynamicStock: (ticker: string) => StockData | undefined;
}

const TABS = [
  { id: "market", icon: Activity, label: "Pasar", shortcut: "1" },
  { id: "portfolio", icon: Briefcase, label: "Portofolio", shortcut: "2" },
  { id: "backtest", icon: History, label: "Backtest", shortcut: "3" },
  { id: "analytics", icon: BarChart3, label: "Analitik", shortcut: "4" },

] as const;

export function AppHeader({
  activeTab,
  onTabChange,
  dataFeed,
  userEmail,
  settingsRef,
  isSettingsOpen,
  setSettingsOpen,
  theme,
  setTheme,
  activeConfig,
  isMobileMenuOpen,
  setMobileMenuOpen,
  setDataFeed,
  logout,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  proactiveAIEnabled,
  setProactiveAIEnabled,
  useDevMockAI,
  setUseDevMockAI,
  showToasts,
  setShowToasts,
  showCrisisSignals,
  setShowCrisisSignals,
  portfolio,
  cash,
  getDynamicStock,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-header-gradient px-2 py-1.5 shrink-0 flex items-center justify-between gap-2">
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2.5 shrink-0">
          <svg viewBox="0 0 115 100" className="w-6 h-6 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="48" cy="45" r="28" stroke="currentColor" strokeWidth="16" />
            <path d="M 61 58 L 81 78" stroke="currentColor" strokeWidth="16" strokeLinecap="square" />
            <circle cx="98" cy="70" r="10" fill="#00c9a5" />
          </svg>
          <span className="text-xs font-bold tracking-wide text-white/80 uppercase hidden sm:inline">Quantbit</span>
        </span>

        <div className="flex items-center gap-0.5 border-l border-white/[0.06] pl-3 ml-1">
          {TABS.map(({ id, icon: Icon, label, shortcut }) => (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              title={`${label} (tekan ${shortcut})`}
              className={`flex items-center gap-2 px-3.5 h-9 rounded-md text-label font-medium transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === id
                  ? "text-[#00c9a5] bg-[#00c9a5]/10"
                  : "text-white/30 hover:text-white/60 hover:bg-white/[0.04]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              <kbd className="hidden lg:inline-block text-[9px] font-mono text-white/20 border border-white/10 rounded px-1 py-0.5 leading-none">
                {shortcut}
              </kbd>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center relative">

        {/* FASE 1.4 — Total Wealth (stocks + cash + gold). Klik = buka tab Portfolio. */}
        <button
          onClick={() => onTabChange("portfolio")}
          title="Total Wealth = Saham + Kas + Emas. Klik untuk buka Portofolio."
          className="flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-emerald-500/[0.08] border border-emerald-500/15 hover:bg-emerald-500/[0.14] transition-colors cursor-pointer"
        >
          <Wallet className="w-3 h-3 text-emerald-400" />
          <span className="text-caption font-mono font-bold text-emerald-300 whitespace-nowrap">
            {formatRupiahShort(totalWealth(portfolio, cash, getDynamicStock))}
          </span>
        </button>

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="w-3 h-3 text-white/30 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && onSearchSubmit) onSearchSubmit(searchQuery); }}
            placeholder="Cari saham..."
            className="w-36 h-7 pl-7 pr-2 text-caption bg-white/[0.04] border border-white/[0.06] outline-none text-white/70 placeholder:text-white/20 transition-colors focus:border-white/20 focus:text-white"
          />
        </div>

        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setSettingsOpen(!isSettingsOpen)}
            className="w-7 h-7 rounded-md hover:bg-white/[0.06] flex items-center justify-center transition-colors"
          >
            <Settings className="w-3.5 h-3.5 text-white/50" />
          </button>

          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute top-10 right-0 w-56 border border-white/[0.06] shadow-lg rounded-lg py-1.5 z-[60] flex flex-col text-xs overflow-y-auto settings-dropdown"
              >
                <div className="px-3 py-2.5 border-b border-white/[0.05]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-400 text-body font-bold uppercase bg-emerald-500/10">
                      {userEmail?.charAt(0) || "U"}
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-white font-medium truncate max-w-[140px] text-body">{userEmail}</span>
                      <span className="text-label text-white/30">Signed in</span>
                      <span className="text-label text-white/20 font-mono mt-0.5">
                        {dataFeed === "yahoo" ? "Yahoo Finance" : dataFeed === "goapi" ? "GoAPI.io" : "Offline Sim"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-1.5 py-1">
                  <div className="text-label font-medium text-white/30 px-2 pt-1.5 pb-1 uppercase tracking-wider">Theme</div>
                  {([
                    ["dark", Moon, "Dark"],
                    ["light", Sun, "Light"],
                  ] as const).map(([t, Icon, label]) => (
                    <button
                      key={t}
                      onClick={() => setTheme(t)}
                      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md transition-colors ${theme === t ? "text-white bg-white/[0.06]" : "text-white/50 hover:text-white/80 hover:bg-white/[0.03]"}`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {label}
                      {theme === t && <span className="ml-auto w-1 h-1 rounded-full bg-emerald-400" />}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-white/[0.04] my-0.5" />

                <div className="px-1.5 py-1">
                  <div className="text-label font-medium text-white/30 px-2 pt-1.5 pb-1 uppercase tracking-wider">Data Feed</div>
                  {([
                    ["yahoo", "Yahoo Finance"],
                    ["goapi", "GoAPI.io"],
                    ["simulated", "Offline Sim"],
                  ] as const).map(([f, label]) => (
                    <button
                      key={f}
                      onClick={() => setDataFeed(f)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.03] transition-colors"
                    >
                      {label}
                      {dataFeed === f && <span className="ml-auto w-1 h-1 rounded-full bg-emerald-400" />}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-white/[0.04] my-0.5" />
                {/* FASE 2.5 — duplicate profile picker REMOVED. Gunakan chip di sidebar. */}

                <div className="h-px bg-white/[0.04] my-0.5" />

                <div className="px-1.5 py-1">
                  <div className="text-label font-medium text-white/30 px-2 pt-1.5 pb-1 uppercase tracking-wider">Sinyal Pasar</div>
                  <button
                    onClick={() => setShowCrisisSignals(!showCrisisSignals)}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.03] transition-colors"
                    title={showCrisisSignals
                      ? "Sembunyikan banner 'Strategy Says: Exit ke EMAS' & 'Exit Safe Haven'. Algoritma tetap berjalan."
                      : "Tampilkan banner sinyal krisis IHSG di tab Portofolio"
                    }
                  >
                    {showCrisisSignals ? <AlertTriangle className="w-3.5 h-3.5 text-amber-400" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                    <span className="flex-1 text-left">Sinyal Krisis</span>
                    <span className={`text-label font-mono ${showCrisisSignals ? "text-emerald-400" : "text-white/30"}`}>
                      {showCrisisSignals ? "ON" : "OFF"}
                    </span>
                  </button>
                </div>

                <div className="h-px bg-white/[0.04] my-0.5" />

                <div className="px-1.5 py-1">
                  <div className="text-label font-medium text-white/30 px-2 pt-1.5 pb-1 uppercase tracking-wider">Alert Pop-up</div>
                  <button
                    onClick={() => setShowToasts(!showToasts)}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.03] transition-colors"
                    title={showToasts
                      ? "Matikan toast pop-up. Event tetap tersimpan di notifikasi persistent & dibaca AI."
                      : "Tampilkan toast pop-up singkat di pojok kanan atas saat ada aksi (beli/jual)"
                    }
                  >
                    {showToasts ? <BellRing className="w-3.5 h-3.5 text-cyan-400" /> : <BellOff className="w-3.5 h-3.5" />}
                    <span className="flex-1 text-left">Toast Pop-up</span>
                    <span className={`text-label font-mono ${showToasts ? "text-emerald-400" : "text-white/30"}`}>
                      {showToasts ? "ON" : "OFF"}
                    </span>
                  </button>
                  <div className="px-2 pt-1 pb-1.5 text-label text-white/25 leading-snug italic">
                    Notifikasi persistent (bell icon) selalu aktif, event disimpan dan dibaca AI walaupun toast mati.
                  </div>
                </div>

                <div className="h-px bg-white/[0.04] my-0.5" />

                <div className="px-1.5 py-1">
                  <div className="text-label font-medium text-white/30 px-2 pt-1.5 pb-1 uppercase tracking-wider">AI Agent</div>
                  <button
                    onClick={() => setProactiveAIEnabled(!proactiveAIEnabled)}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.03] transition-colors"
                    title={proactiveAIEnabled ? "Matikan notifikasi peluang pasar" : "Aktifkan notifikasi peluang pasar"}
                  >
                    {proactiveAIEnabled ? <Bell className="w-3.5 h-3.5 text-cyan-400" /> : <BellOff className="w-3.5 h-3.5" />}
                    <span className="flex-1 text-left">Proactive Alerts</span>
                    <span className={`text-label font-mono ${proactiveAIEnabled ? "text-emerald-400" : "text-white/30"}`}>
                      {proactiveAIEnabled ? "ON" : "OFF"}
                    </span>
                  </button>
                  {import.meta.env?.DEV && (
                    <button
                      onClick={() => setUseDevMockAI(!useDevMockAI)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.03] transition-colors"
                      title={useDevMockAI
                        ? "Dev mock aktif — Quantbit AI pakai canned responses. Set OPENROUTER_API_KEY lalu matikan toggle ini untuk real AI."
                        : "Aktifkan canned responses (untuk demo tanpa API key)"
                      }
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${useDevMockAI ? "text-amber-400" : ""}`} />
                      <span className="flex-1 text-left">Use Dev Mock</span>
                      <span className={`text-label font-mono ${useDevMockAI ? "text-amber-400" : "text-white/30"}`}>
                        {useDevMockAI ? "ON" : "OFF"}
                      </span>
                    </button>
                  )}
                </div>

                <div className="h-px bg-white/[0.04] my-0.5" />

                <div className="px-1.5 py-1">
                  <button
                    onClick={() => { setSettingsOpen(false); logout(); }}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-rose-400/80 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          className="md:hidden w-7 h-7 rounded-md hover:bg-white/[0.06] flex items-center justify-center text-white/50 transition-colors"
          onClick={() => setMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
        </button>

      </div>
    </header>
  );
}
