import { useState, useEffect } from "react";
import { SlidersHorizontal } from "lucide-react";
import { LeadersTab } from "./LeadersTab";
import type { StockData, PortfolioItem, WatchlistItem } from "../types";
import { useEngineConfig } from "../contexts/EngineConfigContext";

type SubTab = "leaders";

interface AnalyticsTabProps {
  activeConfig: string;
  onSelectTicker: (ticker: string) => void;
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  getDynamicStock: (ticker: string) => StockData | undefined;
  isIHSGInCrisis: boolean;
}

const SUB_TAB_STORAGE_KEY = "quantbit_analytics_subtab";

export function AnalyticsTab({ activeConfig: _activeConfig, onSelectTicker, portfolio, watchlist, getDynamicStock, isIHSGInCrisis }: AnalyticsTabProps) {
  const { activeProfile, engineConfig } = useEngineConfig();

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1">
        <LeadersTab
          activeConfig={engineConfig.activeProfileId}
          activeProfile={activeProfile ? { quality: activeProfile.qualityWeight, growth: activeProfile.growthWeight, value: activeProfile.valueWeight, momentum: activeProfile.momentumWeight, dividend: activeProfile.dividendWeight } : null}
          onSelectTicker={onSelectTicker}
          portfolio={portfolio}
          watchlist={watchlist}
          getDynamicStock={getDynamicStock}
        />
      </div>
    </div>
  );
}
