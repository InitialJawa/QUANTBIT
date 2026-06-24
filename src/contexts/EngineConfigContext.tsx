import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface WeightProfile {
  id: string;
  name: string;
  qualityWeight: number;
  growthWeight: number;
  valueWeight: number;
  momentumWeight: number;
}

export interface EngineConfig {
  activeProfileId: string;
  profiles: WeightProfile[];
  safeHavenAsset: "emas" | "kas";
  topNCount: number;
  enableCrashProtection: boolean;
  crashSensitivity: number;
  enableCrossover: boolean;
  reserveBufferPct: number;
  simulationMode: "algo" | "single";
  singleTicker: string;
  singleSellTrigger: number;
  singleBuyTrigger: number;
  universe: string;
  simStartDate: string;
  simEndDate: string;
  algoCapital: string;
  customTickers: string[];
  lastBacktestProfile: WeightProfile | null;
}

export const DEFAULT_PROFILES: WeightProfile[] = [
  { id: "prod", name: "Fundamental Focus (F)", qualityWeight: 0.25, growthWeight: 0.1, valueWeight: 0.3, momentumWeight: 0.35 },
  { id: "res", name: "Backtest Optimized (B)", qualityWeight: 0.25, growthWeight: 0.3, valueWeight: 0.1, momentumWeight: 0.35 },
];

const getTodayWIB = () => {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
};

export function createDefaultConfig(): EngineConfig {
  return {
    activeProfileId: "prod",
    profiles: DEFAULT_PROFILES,
    safeHavenAsset: "emas",
    topNCount: 5,
    enableCrashProtection: true,
    crashSensitivity: 10,
    enableCrossover: true,
    reserveBufferPct: 10,
    simulationMode: "algo",
    singleTicker: "BBCA",
    singleSellTrigger: 8,
    singleBuyTrigger: 5,
    universe: "idx80",
    simStartDate: "2021-01-04",
    simEndDate: getTodayWIB(),
    algoCapital: "100000000",
    customTickers: [],
    lastBacktestProfile: null,
  };
}

export interface EngineConfigContextType {
  engineConfig: EngineConfig;
  activeProfile: WeightProfile;
  /** @deprecated Use activeProfileId / activeProfile instead */
  activeConfig: "prod" | "res";
  updateConfigValue: (key: string, value: any) => void;
  updateProfile: (profileId: string, updates: Partial<WeightProfile>) => void;
  addProfile: (name: string, weights: Omit<WeightProfile, "id" | "name">) => string;
  deleteProfile: (profileId: string) => void;
  setActiveProfile: (profileId: string) => void;
  isSettingsLocked: boolean;
  setIsSettingsLocked: (v: boolean) => void;
  todayWIBStr: string;
  backtestResult: any;
  isBacktesting: boolean;
  triggerRun: number;
  triggerBacktest: () => void;
  setBacktesting: (v: boolean) => void;
  setBacktestResult: (r: any) => void;
  lastBacktestProfile: WeightProfile | null;
  setLastBacktestProfile: (profile: WeightProfile) => void;
}

const EngineConfigContext = createContext<EngineConfigContextType | null>(null);

export function EngineConfigProvider({ children }: { children: ReactNode }) {
  const [isSettingsLocked, setIsSettingsLocked] = useState(false);
  const [engineConfig, setEngineConfig] = useState<EngineConfig>(() => {
    try {
      const saved = localStorage.getItem("idx_engine_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.profiles) {
          parsed.profiles = DEFAULT_PROFILES;
          if (!parsed.activeProfileId) {
            parsed.activeProfileId = parsed.activeConfig === "res" ? "res" : "prod";
          }
        }
        if (!parsed.simStartDate) parsed.simStartDate = "2021-01-04";
        if (!parsed.simEndDate) parsed.simEndDate = getTodayWIB();
        if (!parsed.algoCapital) parsed.algoCapital = "100000000";
        if (!parsed.customTickers) parsed.customTickers = [];
        return parsed;
      }
    } catch {}
    return createDefaultConfig();
  });
  const todayWIBStr = getTodayWIB();

  // Transient (non-persisted) backtest run-state
  const [isBacktesting, setBacktesting] = useState(false);
  const [backtestResult, setBacktestResultState] = useState<any>(null);
  const [triggerRun, setTriggerRun] = useState(0);
  const triggerBacktest = () => setTriggerRun(t => t + 1);

  const [lastBacktestProfile, setLastBacktestProfile] = useState<WeightProfile | null>(engineConfig.lastBacktestProfile || null);

  const activeProfile = engineConfig.profiles.find(p => p.id === engineConfig.activeProfileId) || engineConfig.profiles[0];
  const activeConfig: "prod" | "res" = engineConfig.activeProfileId === "res" ? "res" : "prod";

  const updateConfigValue = (key: string, value: any) => {
    setEngineConfig((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem("idx_engine_config", JSON.stringify(next));
      return next;
    });
  };

  const setBacktestResult = (r: any) => {
    setBacktestResultState(r);
    if (r?.configName) {
      setLastBacktestProfile(activeProfile);
      updateConfigValue("lastBacktestProfile", activeProfile);
    }
  };

  const updateProfile = (profileId: string, updates: Partial<WeightProfile>) => {
    setEngineConfig((prev) => {
      const profiles = prev.profiles.map(p =>
        p.id === profileId ? { ...p, ...updates } : p
      );
      const next = { ...prev, profiles };
      localStorage.setItem("idx_engine_config", JSON.stringify(next));
      return next;
    });
  };

  const addProfile = (name: string, weights: Omit<WeightProfile, "id" | "name">): string => {
    const id = "custom_" + Date.now().toString(36);
    setEngineConfig((prev) => {
      const newProfile: WeightProfile = { id, name, ...weights };
      const next = { ...prev, profiles: [...prev.profiles, newProfile] };
      localStorage.setItem("idx_engine_config", JSON.stringify(next));
      return next;
    });
    return id;
  };

  const deleteProfile = (profileId: string) => {
    if (profileId === "prod" || profileId === "res") return;
    setEngineConfig((prev) => {
      const profiles = prev.profiles.filter(p => p.id !== profileId);
      let activeProfileId = prev.activeProfileId;
      if (activeProfileId === profileId) {
        activeProfileId = "prod";
      }
      const next = { ...prev, profiles, activeProfileId };
      localStorage.setItem("idx_engine_config", JSON.stringify(next));
      return next;
    });
  };

  const setActiveProfile = (profileId: string) => {
    if (engineConfig.profiles.some(p => p.id === profileId)) {
      updateConfigValue("activeProfileId", profileId);
    }
  };

  return (
    <EngineConfigContext.Provider value={{
      engineConfig, activeProfile, activeConfig,
      updateConfigValue, updateProfile,
      addProfile, deleteProfile, setActiveProfile,
      isSettingsLocked, setIsSettingsLocked,
      todayWIBStr,
      backtestResult, isBacktesting, triggerRun,
      triggerBacktest, setBacktesting, setBacktestResult,
      lastBacktestProfile, setLastBacktestProfile,
    }}>
      {children}
    </EngineConfigContext.Provider>
  );
}

export function useEngineConfig() {
  const ctx = useContext(EngineConfigContext);
  if (!ctx) throw new Error("useEngineConfig must be used within EngineConfigProvider");
  return ctx;
}
