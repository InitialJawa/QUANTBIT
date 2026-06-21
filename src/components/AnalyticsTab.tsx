import { useState } from "react";
import { SlidersHorizontal, Flame, ShieldAlert } from "lucide-react";
import { LeadersTab } from "./LeadersTab";
import { RecoveryOpsTab } from "./RecoveryOpsTab";
import { CapitalProtectionTab } from "./CapitalProtectionTab";
import type { StockData, PortfolioItem, WatchlistItem } from "../types";

type SubTab = "leaders" | "recovery" | "risk";

interface AnalyticsTabProps {
  activeConfig: "prod" | "res";
  onSelectTicker: (ticker: string) => void;
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  getDynamicStock: (ticker: string) => StockData | undefined;
  isIHSGInCrisis: boolean;
}

const SUB_TABS = [
  { id: "leaders" as const, icon: SlidersHorizontal, label: "Leaders" },
  { id: "recovery" as const, icon: Flame, label: "Recovery" },
  { id: "risk" as const, icon: ShieldAlert, label: "Risk" },
];

export function AnalyticsTab({ activeConfig, onSelectTicker, portfolio, watchlist, getDynamicStock, isIHSGInCrisis }: AnalyticsTabProps) {
  const [subTab, setSubTab] = useState<SubTab>("leaders");

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
            activeConfig={activeConfig}
            onSelectTicker={onSelectTicker}
            portfolio={portfolio}
            watchlist={watchlist}
            getDynamicStock={getDynamicStock}
          />
        )}
        {subTab === "recovery" && (
          <RecoveryOpsTab
            isIHSGInCrisis={isIHSGInCrisis}
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
