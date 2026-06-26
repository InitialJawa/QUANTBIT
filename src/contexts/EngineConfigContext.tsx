import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export interface WeightProfile {
  id: string;
  name: string;
  qualityWeight: number;
  growthWeight: number;
  valueWeight: number;
  momentumWeight: number;
  dividendWeight: number;
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
  simulationMode: "algo" | "custom" | "adaptive_dca";
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
  /** When false, hide the BuyPressureDashboard in Portfolio. */
  dcaActive: boolean;
}

export const DEFAULT_PROFILES: WeightProfile[] = [
  { id: "aman", name: "Aman", qualityWeight: 0.30, growthWeight: 0.45, valueWeight: 0.10, momentumWeight: 0.00, dividendWeight: 0.15 },
  { id: "agresif", name: "Agresif", qualityWeight: 0.20, growthWeight: 0.60, valueWeight: 0.10, momentumWeight: 0.10, dividendWeight: 0.00 },
  { id: "dividen", name: "Dividen", qualityWeight: 0.15, growthWeight: 0.20, valueWeight: 0.05, momentumWeight: 0.00, dividendWeight: 0.60 },
];

const getTodayWIB = () => {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
};

export function createDefaultConfig(): EngineConfig {
  return {
    activeProfileId: "aman",
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
    dcaActive: true,
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
  /** @deprecated kept for legacy compat */
  activeConfig: string;
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
  /** True when critical fields of backtestConfig match engineConfig. */
  isConfigSynced: boolean;
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
          parsed.profiles = DEFAULT_PROFILES.map(p => ({ ...p }));
          if (!parsed.activeProfileId) {
            parsed.activeProfileId = "aman";
          }
        } else {
          // Drop legacy "prod"/"res" profiles, keep only new IDs or user-defined custom_* profiles
          parsed.profiles = parsed.profiles
            .filter((p: WeightProfile) => DEFAULT_PROFILES.some(d => d.id === p.id) || p.id.startsWith("custom_"))
            .map((p: WeightProfile) => {
              const defaults = DEFAULT_PROFILES.find(d => d.id === p.id);
              return defaults ? { ...defaults } : p;
            });
          // Ensure all 3 default profiles exist
          DEFAULT_PROFILES.forEach(d => {
            if (!parsed.profiles.find((p: WeightProfile) => p.id === d.id)) {
              parsed.profiles.push({ ...d });
            }
          });
        }
        if (!parsed.simStartDate) parsed.simStartDate = "2021-01-04";
        if (!parsed.simEndDate) parsed.simEndDate = getTodayWIB();
        if (!parsed.algoCapital) parsed.algoCapital = "100000000";
        if (!parsed.customUniverse) parsed.customUniverse = [];
        if (parsed.enableAdaptiveWeights === undefined) parsed.enableAdaptiveWeights = false;
        if (parsed.dcaActive === undefined) parsed.dcaActive = true;
        // Migrate legacy "single" mode → "custom"
        if (parsed.simulationMode === "single") {
          parsed.simulationMode = "custom";
          if (parsed.singleTicker && (!parsed.customUniverse || parsed.customUniverse.length === 0)) {
            parsed.customUniverse = [parsed.singleTicker];
          }
        }
        // Migrate legacy "prod"/"res" activeProfileId → new default IDs
        if (parsed.activeProfileId === "prod") parsed.activeProfileId = "aman";
        else if (parsed.activeProfileId === "res") parsed.activeProfileId = "agresif";
        else if (!DEFAULT_PROFILES.some(d => d.id === parsed.activeProfileId) && !parsed.activeProfileId.startsWith("custom_")) {
          parsed.activeProfileId = "aman";
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
        const merged = { ...createDefaultConfig(), ...parsed };
        if (merged.dcaActive === undefined) merged.dcaActive = true;
        // Same legacy migration for the backtest draft
        if (merged.activeProfileId === "prod") merged.activeProfileId = "aman";
        else if (merged.activeProfileId === "res") merged.activeProfileId = "agresif";
        return merged;
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
  const activeConfig = engineConfig.activeProfileId;

  // Fields that the BPS dashboard + algo engine both depend on. When
  // backtestConfig diverges from engineConfig on any of these, the
  // AppHeader shows a yellow "SYNC" indicator so the user knows the
  // backtest sandbox has settings the live Portfolio doesn't.
  const isConfigSynced = (() => {
    const KEYS: Array<keyof EngineConfig> = [
      "activeProfileId", "universe", "topNCount", "simulationMode",
      "safeHavenAsset", "crashSensitivity", "enableCrashProtection",
      "customUniverse", "enableAdaptiveWeights", "reserveBufferPct",
    ];
    return KEYS.every(k =>
      JSON.stringify(backtestConfig[k]) === JSON.stringify(engineConfig[k]),
    );
  })();

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

  const isDefault = (id: string) => id === "aman" || id === "agresif" || id === "dividen";

  const deleteProfile = (profileId: string) => {
    if (isDefault(profileId)) return;
    setEngineConfig((prev) => {
      const profiles = prev.profiles.filter(p => p.id !== profileId);
      let activeProfileId = prev.activeProfileId;
        if (activeProfileId === profileId) {
          activeProfileId = "aman";
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
      isConfigSynced,
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
