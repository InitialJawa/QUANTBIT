import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export interface EngineConfig {
  activeConfig: "prod" | "res";
  safeHavenAsset: "emas" | "kas";
  topNCount: number;
  qualityWeight: number;
  growthWeight: number;
  valueWeight: number;
  momentumWeight: number;
  enableCrashProtection: boolean;
  crashSensitivity: number;
  enableCrossover: boolean;
  reserveBufferPct: number;
  simulationMode: "algo" | "single";
  singleTicker: string;
  singleSellTrigger: number;
  singleBuyTrigger: number;
  universe: string;
}

export interface EngineConfigContextType {
  engineConfig: EngineConfig;
  updateConfigValue: (key: string, value: any) => void;
  isSettingsLocked: boolean;
  setIsSettingsLocked: (v: boolean) => void;
}

const EngineConfigContext = createContext<EngineConfigContextType | null>(null);

function saveStateToBackend(cash: number, config: EngineConfig, tradeLogs: any[]) {
  try {
    const { getSession, api } = require("../services/api");
    const session = getSession();
    if (session?.token) {
      api.post("/api/portfolio/state", { cash, config, tradeLogs }).catch(() => {});
    }
  } catch {}
}

export function EngineConfigProvider({ children }: { children: ReactNode }) {
  const [isSettingsLocked, setIsSettingsLocked] = useState(false);
  const [engineConfig, setEngineConfig] = useState<EngineConfig>(() => {
    let parsed: Partial<EngineConfig> = {};
    try {
      const saved = localStorage.getItem("idx_engine_config");
      if (saved) parsed = JSON.parse(saved);
    } catch {}
    return {
      activeConfig: "prod",
      safeHavenAsset: "emas",
      topNCount: 5,
      qualityWeight: 0.25,
      growthWeight: 0.1,
      valueWeight: 0.3,
      momentumWeight: 0.35,
      enableCrashProtection: true,
      crashSensitivity: 10,
      enableCrossover: true,
      reserveBufferPct: 10,
      simulationMode: "algo",
      singleTicker: "BBCA",
      singleSellTrigger: 8,
      singleBuyTrigger: 5,
      universe: "idx80",
      ...parsed,
    };
  });

  const updateConfigValue = (key: string, value: any) => {
    setEngineConfig((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "activeConfig") {
        if (value === "prod") {
          next.qualityWeight = 0.25;
          next.growthWeight = 0.1;
          next.valueWeight = 0.3;
          next.momentumWeight = 0.35;
        } else if (value === "res") {
          next.qualityWeight = 0.25;
          next.growthWeight = 0.3;
          next.valueWeight = 0.1;
          next.momentumWeight = 0.35;
        }
      }
      localStorage.setItem("idx_engine_config", JSON.stringify(next));
      return next;
    });
  };

  return (
    <EngineConfigContext.Provider value={{ engineConfig, updateConfigValue, isSettingsLocked, setIsSettingsLocked }}>
      {children}
    </EngineConfigContext.Provider>
  );
}

export function useEngineConfig() {
  const ctx = useContext(EngineConfigContext);
  if (!ctx) throw new Error("useEngineConfig must be used within EngineConfigProvider");
  return ctx;
}
