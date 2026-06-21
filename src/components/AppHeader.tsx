import { useRef } from "react";
import type { RefObject } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Settings, LogOut, Moon, Sun, Sliders, Monitor, Hexagon, Palette, Menu, X } from "lucide-react";

interface AppHeaderProps {
  dataFeed: string;
  userEmail: string | undefined;
  settingsRef: RefObject<HTMLDivElement | null>;
  isSettingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  theme: string;
  setTheme: (theme: string) => void;
  activeConfig: string;
  setActiveConfig: (config: string) => void;
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  setDataFeed: (feed: "yahoo" | "goapi" | "simulated") => void;
  logout: () => void;
  onToggleNav: () => void;
}

export function AppHeader({
  onToggleNav,
  dataFeed,
  userEmail,
  settingsRef,
  isSettingsOpen,
  setSettingsOpen,
  theme,
  setTheme,
  activeConfig,
  setActiveConfig,
  isMobileMenuOpen,
  setMobileMenuOpen,
  setDataFeed,
  logout,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] px-3 py-1 shrink-0 flex items-center justify-between">
      <button onClick={onToggleNav} className="flex items-center gap-2.5 cursor-pointer">
        <svg viewBox="0 0 115 100" className="w-6 h-6 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="48" cy="45" r="28" stroke="currentColor" strokeWidth="16" />
          <path d="M 61 58 L 81 78" stroke="currentColor" strokeWidth="16" strokeLinecap="square" />
          <circle cx="98" cy="70" r="10" fill="#089981" />
        </svg>
        <span className="text-xs font-bold tracking-wide text-white/80 uppercase">Quantbit</span>
      </button>

      <div className="flex items-center gap-2 shrink-0 self-end md:self-center relative">

        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded text-[10px] text-white/35 font-mono">
          <span className="w-1 h-1 rounded-full bg-white/40" />
          {dataFeed === "yahoo" ? "Yahoo" : dataFeed === "goapi" ? "GoAPI" : "Simulasi"}
        </div>

        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded text-[10px] text-white/40 font-medium">
          <span className="w-4 h-4 rounded flex items-center justify-center bg-white/[0.06] text-[9px] font-bold uppercase">
            {userEmail?.charAt(0) || "U"}
          </span>
          <span className="truncate max-w-[100px]">{userEmail}</span>
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
                className="absolute top-10 right-0 w-56 border border-white/[0.06] shadow-lg rounded-lg py-1.5 z-[60] flex flex-col text-xs overflow-y-auto"
              >
                <div className="px-3 py-2 border-b border-white/[0.05] mb-0.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-emerald-400 text-[10px] font-bold uppercase bg-emerald-500/10">
                      {userEmail?.charAt(0) || "U"}
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-white font-medium truncate max-w-[140px]">{userEmail}</span>
                      <span className="text-[9px] text-white/30 font-medium">Signed in</span>
                    </div>
                  </div>
                </div>

                <div className="px-1.5 py-0.5">
                  <div className="text-[9px] font-medium text-white/30 px-2 pt-1.5 pb-0.5 uppercase tracking-wider">Theme</div>
                  {([
                    ["deep", Moon, "Deep"],
                    ["slate", Palette, "Slate"],
                    ["nord", Palette, "Nord"],
                    ["light", Sun, "Light"],
                    ["stockbit", Monitor, "TradingView"],
                    ["ios26", Hexagon, "iOS 26"],
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

                <div className="h-px bg-white/[0.04] my-1" />

                <div className="px-1.5 py-0.5">
                  <div className="text-[9px] font-medium text-white/30 px-2 pt-1.5 pb-0.5 uppercase tracking-wider">Data Feed</div>
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

                <div className="h-px bg-white/[0.04] my-1" />

                <div className="px-1.5 py-0.5">
                  <div className="text-[9px] font-medium text-white/30 px-2 pt-1.5 pb-0.5 uppercase tracking-wider">Config</div>
                  {([
                    ["prod", "Config F"],
                    ["res", "Config B"],
                  ] as const).map(([c, label]) => (
                    <button
                      key={c}
                      onClick={() => setActiveConfig(c)}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-white/50 hover:text-white/80 hover:bg-white/[0.03] transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" /> {label}
                      {activeConfig === c && <span className="ml-auto w-1 h-1 rounded-full bg-emerald-400" />}
                    </button>
                  ))}
                </div>

                <div className="h-px bg-white/[0.04] my-1" />

                <div className="px-1.5 py-0.5">
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
