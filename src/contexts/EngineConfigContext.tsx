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
  simulationMode: "algo" | "custom";
  singleTicker: string;
  singleSellTrigger: number;
  singleBuyTrigger: number;
  universe: string;
  simStartDate: string;
  simEndDate: string;
  algoCapital: string;
  customUniverse: string[];
  enableAdaptiveWeights: boolean;
  lastBacktestProfile: WeightProfile | null;
}

export const DEFAULT_PROFILES: WeightProfile[] = [
  { id: "prod", name: "Quality Momentum (QM)", qualityWeight: 0.45, growthWeight: 0.1, valueWeight: 0.05, momentumWeight: 0.40 },
  { id: "res", name: "Balanced Growth (BG)", qualityWeight: 0.40, growthWeight: 0.25, valueWeight: 0.05, momentumWeight: 0.30 },
];

const getTodayWIB = () => {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
};

export function createDefaultConfig(): EngineConfig {
  return {
    activeProfileId: "res",
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
    customUniverse: [],
    enableAdaptiveWeights: false,
    lastBacktestProfile: null,
  };
}

export interface StrategySnapshot {
  profile: WeightProfile;
  simulationMode: "algo" | "custom";
  universe: string;
  customUniverse: string[];
  topNCount: number;
  singleTicker: string;
  singleSellTrigger: number;
  singleBuyTrigger: number;
  enableCrashProtection: boolean;
  crashSensitivity: number;
  safeHavenAsset: "emas" | "kas";
  enableCrossover: boolean;
  reserveBufferPct: number;
  enableAdaptiveWeights: boolean;
  syncedAt: number;
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
  syncFromBacktest: (snapshot: Omit<StrategySnapshot, "syncedAt">) => void;
  backtestConfig: EngineConfig;
  updateBacktestValue: (key: string, value: any) => void;
  resetBacktestConfig: () => void;
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
        } else {
          // Migrate legacy default profile weights to latest values
          parsed.profiles = parsed.profiles.map((p: WeightProfile) => {
            const defaults = DEFAULT_PROFILES.find(d => d.id === p.id);
            if (defaults) {
              return { ...defaults };
            }
            return p;
          });
        }
        if (!parsed.simStartDate) parsed.simStartDate = "2021-01-04";
        if (!parsed.simEndDate) parsed.simEndDate = getTodayWIB();
        if (!parsed.algoCapital) parsed.algoCapital = "100000000";
        if (!parsed.customUniverse) parsed.customUniverse = [];
        if (parsed.enableAdaptiveWeights === undefined) parsed.enableAdaptiveWeights = false;
        // Migrate legacy "single" mode → "custom"
        if (parsed.simulationMode === "single") {
          parsed.simulationMode = "custom";
          if (parsed.singleTicker && (!parsed.customUniverse || parsed.customUniverse.length === 0)) {
            parsed.customUniverse = [parsed.singleTicker];
          }
        }
        return parsed;
      }
    } catch {}
    return createDefaultConfig();
  });
  const todayWIBStr = getTodayWIB();

  // Backtest Draft Config — isolated from main engineConfig (only syncs via SYNC TO PORTO)
  const [backtestConfig, setBacktestConfig] = useState<EngineConfig>(() => {
    try {
      const saved = localStorage.getItem("idx_engine_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...createDefaultConfig(), ...parsed };
      }
    } catch {}
    return createDefaultConfig();
  });
  const updateBacktestValue = (key: string, value: any) => {
    setBacktestConfig((prev) => ({ ...prev, [key]: value }));
  };
  const resetBacktestConfig = () => {
    setBacktestConfig({ ...engineConfig });
  };

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

  const syncFromBacktest = (snapshot: Omit<StrategySnapshot, "syncedAt">) => {
    setEngineConfig((prev) => {
      const next: EngineConfig = {
        ...prev,
        activeProfileId: snapshot.profile.id,
        simulationMode: snapshot.simulationMode,
        universe: snapshot.universe,
        customUniverse: [...snapshot.customUniverse],
        enableAdaptiveWeights: snapshot.enableAdaptiveWeights,
        topNCount: snapshot.topNCount,
        singleTicker: snapshot.singleTicker,
        singleSellTrigger: snapshot.singleSellTrigger,
        singleBuyTrigger: snapshot.singleBuyTrigger,
        enableCrashProtection: snapshot.enableCrashProtection,
        crashSensitivity: snapshot.crashSensitivity,
        safeHavenAsset: snapshot.safeHavenAsset,
        enableCrossover: snapshot.enableCrossover,
        reserveBufferPct: snapshot.reserveBufferPct,
        lastBacktestProfile: snapshot.profile,
      };
      localStorage.setItem("idx_engine_config", JSON.stringify(next));
      return next;
    });
    setLastBacktestProfile(snapshot.profile);
    setTriggerRun(t => t + 1);
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
      syncFromBacktest,
      backtestConfig, updateBacktestValue, resetBacktestConfig,
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
