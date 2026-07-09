import { useState, useEffect } from "react";
import { LeadersTab } from "./LeadersTab";
import { CW_MAP, CW_AMAN } from "../marketData";
import type { StockData, PortfolioItem, WatchlistItem } from "../types";

interface AnalyticsTabProps {
  onSelectTicker: (ticker: string) => void;
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  getDynamicStock: (ticker: string) => StockData | undefined;
  isIHSGInCrisis: boolean;
}

const PROFILES = [
  { id: "aman", label: "Aman" },
  { id: "agresif", label: "Agresif" },
  { id: "dividen", label: "Dividen" },
  { id: "growth-heavy", label: "Growth-heavy" },
];

const STORAGE_KEY = "qa_analytics_profile";

export function AnalyticsTab({ onSelectTicker, portfolio, watchlist, getDynamicStock, isIHSGInCrisis: _isIHSGInCrisis }: AnalyticsTabProps) {
  const [profileId, setProfileId] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "aman";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, profileId);
  }, [profileId]);

  const weights = CW_MAP[profileId] || CW_AMAN;

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex gap-2 mb-4">
        {PROFILES.map((p) => (
          <button
            key={p.id}
            onClick={() => setProfileId(p.id)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer ${
              profileId === p.id
                ? "bg-white/10 text-white border border-white/20"
                : "bg-white/[0.02] text-white/50 border border-white/[0.05] hover:border-white/20"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex-1">
        <LeadersTab
          activeConfig={profileId}
          activeProfile={weights}
          onSelectTicker={onSelectTicker}
          portfolio={portfolio}
          watchlist={watchlist}
          getDynamicStock={getDynamicStock}
        />
      </div>
    </div>
  );
}
