import { motion, AnimatePresence } from "motion/react";
import { Newspaper, TrendingUp, TrendingDown } from "lucide-react";
import { DigitalWalletUI } from "./DigitalWalletUI";
import { idxNews, MKT, RS } from "../marketData";

interface AppSidebarProps {
  isMobileMenuOpen: boolean;
  onCloseMobile: () => void;
  cash: number;
  goldShares: number;
  tradeLogs: any[];
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number) => void;
  onMoveToGold: (amount: number) => void;
  onSellGold: (shares: number) => void;
}

export function AppSidebar({
  isMobileMenuOpen,
  onCloseMobile,
  cash,
  goldShares,
  tradeLogs,
  onDeposit,
  onWithdraw,
  onMoveToGold,
  onSellGold,
}: AppSidebarProps) {
  const isIHSGInCrisis = MKT.ihsg.monthly < -10;

  return (
    <>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={onCloseMobile}
          />
        )}
      </AnimatePresence>

      <aside id="main-sidebar" className={`${isMobileMenuOpen ? 'flex fixed inset-y-0 left-0 w-[85%] max-w-sm z-50 shadow-2xl' : 'hidden'} md:flex w-full md:static md:w-56 lg:w-64 md:border-r border-white/[0.06] shrink-0 flex-col md:overflow-hidden`}>
        <div className="flex flex-col flex-1 overflow-y-auto md:overflow-y-auto py-2 gap-2 scrollbar-thin">

          <div id="rdi-digital-wallet-container" className="mx-2">
            <DigitalWalletUI
              cash={cash}
              goldShares={goldShares}
              tradeLogs={tradeLogs}
              onDeposit={onDeposit}
              onWithdraw={onWithdraw}
              onMoveToGold={onMoveToGold}
              onSellGold={onSellGold}
              onCloseMobile={onCloseMobile}
            />
          </div>

          <div id="sidebar-news-panel" className="mx-2">
            <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
              <Newspaper className="w-3 h-3 text-[#5d6080]" />
              <span className="text-[9px] font-medium text-[#5d6080] uppercase tracking-wider">Berita</span>
            </div>
            <div className="pt-1 space-y-0.5 max-h-[120px] overflow-y-auto scrollbar-thin">
              {idxNews.slice(0, 4).map((news, idx) => (
                <a
                  key={idx}
                  href={news.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  referrerPolicy="no-referrer"
                  className="block px-2 py-1.5 rounded hover:bg-white/[0.03] transition-colors text-left group"
                >
                  <div className="flex justify-between items-center text-[8px] text-[#5d6080] font-mono">
                    <span>{news.portal}</span>
                    <span>{news.time}</span>
                  </div>
                  <h4 className="text-[10px] text-[#787b86] group-hover:text-[#d1d4dc] leading-snug line-clamp-2 mt-0">
                    {news.title}
                  </h4>
                </a>
              ))}
            </div>
          </div>

          <div id="sidebar-macro-indicators-panel" className="mx-2">
            <div className="px-2 py-1.5 border-b border-white/[0.04]">
              <span className="text-[9px] font-medium text-[#5d6080] uppercase tracking-wider">Makro</span>
            </div>
            <div className="px-2 py-2 space-y-2">
              <div className="flex items-center justify-between py-1">
                <span className="text-[9px] text-[#5d6080]">Market</span>
                <span className={`text-[10px] font-medium ${isIHSGInCrisis ? "text-[#f23645]" : RS.status === "SAFE" ? "text-[#089981]" : "text-[#f0a500]"}`}>
                  {isIHSGInCrisis ? "RISK OFF" : RS.status === "SAFE" ? "RISK ON" : "WARNING"}
                </span>
              </div>

              <div className="space-y-1.5">
                <div>
                  <div className="flex justify-between text-[9px] text-[#5d6080] mb-0.5">
                    <span>Health</span>
                    <span className="text-[#787b86]">{RS.market_health}%</span>
                  </div>
                  <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="bg-[#d1d4dc] h-full rounded-full" style={{ width: `${RS.market_health}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-[#5d6080] mb-0.5">
                    <span>Opp.</span>
                    <span className="text-[#787b86]">{RS.opportunity}%</span>
                  </div>
                  <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="bg-[#089981] h-full rounded-full" style={{ width: `${RS.opportunity}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] text-[#5d6080] mb-0.5">
                    <span>Risk</span>
                    <span className="text-[#787b86]">{RS.risk}%</span>
                  </div>
                  <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="bg-[#f23645] h-full rounded-full" style={{ width: `${RS.risk}%` }} />
                  </div>
                </div>
              </div>

              <div className="border-t border-white/[0.04] pt-2 space-y-1.5">
                <div className="flex items-center justify-between py-1">
                  <span className="text-[9px] text-[#5d6080]">USD/IDR</span>
                  <span className="text-[10px] text-[#787b86] font-mono">Rp{MKT.usdidr.value.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-[9px] text-[#5d6080]">Gold/gr</span>
                  <span className="text-[10px] text-[#787b86] font-mono">Rp{MKT.gold.value.toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
