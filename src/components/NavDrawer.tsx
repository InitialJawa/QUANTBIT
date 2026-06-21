import { motion, AnimatePresence } from "motion/react";
import { Activity, Briefcase, SlidersHorizontal, Flame, ShieldAlert, Award, Cpu, X } from "lucide-react";

const NAV_TABS = [
  { id: "market", icon: Activity, label: "Market" },
  { id: "ledger", icon: Briefcase, label: "Portfolio" },
  { id: "leaders", icon: SlidersHorizontal, label: "Leaders" },
  { id: "turnaround", icon: Flame, label: "Recovery" },
  { id: "exit", icon: ShieldAlert, label: "Risiko" },
  { id: "simulation", icon: Award, label: "Simulasi" },
  { id: "diagnostics", icon: Cpu, label: "Sistem" },
] as const;

interface NavDrawerProps {
  open: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose: () => void;
}

export function NavDrawer({ open, activeTab, onTabChange, onClose }: NavDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[150]"
            style={{ backgroundColor: '#000000' }}
            onClick={onClose}
          />
          <motion.nav
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed left-0 top-0 bottom-0 z-[160] w-56 flex flex-col border-r border-white/[0.06]"
            style={{ backgroundColor: '#1e222d' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2.5">
                <svg viewBox="0 0 115 100" className="w-5 h-5 shrink-0" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="48" cy="45" r="28" stroke="currentColor" strokeWidth="16" />
                  <path d="M 61 58 L 81 78" stroke="currentColor" strokeWidth="16" strokeLinecap="square" />
                  <circle cx="98" cy="70" r="10" fill="#089981" />
                </svg>
                <span className="text-[11px] font-bold tracking-wide" style={{ color: '#d1d4dc' }}>Quantbit</span>
              </div>
              <button onClick={onClose} className="p-1 transition-colors" style={{ color: '#5d6080' }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
              {NAV_TABS.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => { onTabChange(id); onClose(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-[11px] font-medium transition-colors"
                  style={{
                    backgroundColor: activeTab === id ? 'rgba(8,153,129,0.12)' : 'transparent',
                    color: activeTab === id ? '#089981' : '#787b86',
                    borderLeft: activeTab === id ? '2px solid #089981' : '2px solid transparent'
                  }}
                >
                  <Icon className="w-4 h-4 stroke-[1.5]" />
                  {label}
                </button>
              ))}
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
