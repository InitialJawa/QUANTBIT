import { Activity, Briefcase, SlidersHorizontal, Flame, ShieldAlert, Award, Cpu } from "lucide-react";

const NAV_TABS = [
  { id: "market", icon: Activity, label: "Market" },
  { id: "ledger", icon: Briefcase, label: "Portfolio" },
  { id: "leaders", icon: SlidersHorizontal, label: "Leaders" },
  { id: "turnaround", icon: Flame, label: "Recovery" },
  { id: "exit", icon: ShieldAlert, label: "Risiko" },
  { id: "simulation", icon: Award, label: "Simulasi" },
  { id: "diagnostics", icon: Cpu, label: "Sistem" },
] as const;

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] px-1.5 py-0.5 flex items-center justify-around" style={{ backgroundColor: '#1e222d' }}>
      <div className="flex items-center justify-around w-full max-w-lg mx-auto">
        {NAV_TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            id={`tab-${id}`}
            onClick={() => onTabChange(id)}
            title={label}
            className={`flex flex-col items-center gap-0 px-2 py-1 text-[8px] font-medium transition-colors cursor-pointer rounded min-w-0 ${
              activeTab === id
                ? "text-[#089981]"
                : "text-[#5d6080] hover:text-[#d1d4dc]"
            }`}
          >
            <Icon className="w-3.5 h-3.5 stroke-[1.5]" />
            <span className="leading-tight">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
