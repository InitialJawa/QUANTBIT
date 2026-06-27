import { useState, useEffect } from "react";
import { SlidersHorizontal, Flame, ShieldAlert } from "lucide-react";
import { LeadersTab } from "./LeadersTab";
import { TurnaroundOpsTab } from "./TurnaroundOpsTab";
import { CapitalProtectionTab } from "./CapitalProtectionTab";
import type { StockData, PortfolioItem, WatchlistItem } from "../types";
import { useEngineConfig } from "../contexts/EngineConfigContext";

type SubTab = "leaders" | "turnaround" | "risk";

interface AnalyticsTabProps {
  activeConfig: string;
  onSelectTicker: (ticker: string) => void;
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  getDynamicStock: (ticker: string) => StockData | undefined;
  isIHSGInCrisis: boolean;
}

const SUB_TABS = [
  { id: "leaders" as const, icon: SlidersHorizontal, label: "Leaders" },
  { id: "turnaround" as const, icon: Flame, label: "Turnaround" },
  { id: "risk" as const, icon: ShieldAlert, label: "Proteksi Modal" },
];

const SUB_TAB_STORAGE_KEY = "quantbit_analytics_subtab";

export function AnalyticsTab({ activeConfig: _activeConfig, onSelectTicker, portfolio, watchlist, getDynamicStock, isIHSGInCrisis }: AnalyticsTabProps) {
  const { activeProfile, engineConfig } = useEngineConfig();
  const [subTab, setSubTab] = useState<SubTab>(() => {
    try {
      const saved = localStorage.getItem(SUB_TAB_STORAGE_KEY);
      if (saved === "leaders" || saved === "turnaround" || saved === "risk") return saved;
    } catch {}
    return "leaders";
  });

  useEffect(() => {
    try { localStorage.setItem(SUB_TAB_STORAGE_KEY, subTab); } catch {}
  }, [subTab]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex border-b border-white/[0.04] mb-4">
        {SUB_TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`flex-1 py-2.5 text-body font-medium tracking-wide transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              subTab === id
                ? "text-emerald-500 border-b-2 border-emerald-500"
                : "text-white/30 hover:text-white/60"
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {label}

          </button>
        ))}
      </div>

      <div className="flex-1">
        {subTab === "leaders" && (
          <LeadersTab
            activeConfig={engineConfig.activeProfileId}
            activeProfile={activeProfile ? { quality: activeProfile.qualityWeight, growth: activeProfile.growthWeight, value: activeProfile.valueWeight, momentum: activeProfile.momentumWeight, dividend: activeProfile.dividendWeight } : null}
            onSelectTicker={onSelectTicker}
            portfolio={portfolio}
            watchlist={watchlist}
            getDynamicStock={getDynamicStock}
          />
        )}
        {subTab === "turnaround" && (
          <TurnaroundOpsTab
            onSelectTicker={onSelectTicker}
            portfolio={portfolio}
            watchlist={watchlist}
            getDynamicStock={getDynamicStock}
          />
        )}
        {subTab === "risk" && (
          <CapitalProtectionTab
            isIHSGInCrisis={isIHSGInCrisis}
            onSelectTicker={onSelectTicker}
            portfolio={portfolio}
            watchlist={watchlist}
            getDynamicStock={getDynamicStock}
          />
        )}
      </div>
    </div>
  );
}
