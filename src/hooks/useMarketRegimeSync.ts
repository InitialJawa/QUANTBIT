import { useEffect } from "react";
import { useEngineConfig } from "../contexts/EngineConfigContext";
import {
  setActiveUniverse,
  setCrashSensitivity,
  setCrashProtectionEnabled,
  setActiveConfig,
  refreshRSFromRegime,
} from "../marketRegimeEngine";

/**
 * useMarketRegimeSync — Single source of truth bridge between EngineConfigContext
 * (React state) and marketRegimeEngine (module-level state).
 *
 * Previously the sync logic lived inside PortfolioTracker.tsx — which meant
 * `enableCrashProtection` toggled in AppSidebar (visible across all tabs) only
 * took effect after the user opened the Portfolio tab. By mounting this hook
 * once at App level, all regime engine state stays in sync regardless of which
 * tab the user is viewing.
 *
 * Also wires custom weight profile (B4 fix) so radar/breadth scoring in the
 * sidebar uses the user's active Q/G/V/M weights, not just the QM/BG defaults.
 */
export function useMarketRegimeSync(): void {
  const { engineConfig, activeProfile } = useEngineConfig();

  useEffect(() => {
    setActiveUniverse(engineConfig.universe as "all" | "idx80" | "idx30" | "lq45");
    setCrashSensitivity(engineConfig.crashSensitivity ?? 10);
    setCrashProtectionEnabled(engineConfig.enableCrashProtection);

    setActiveConfig({
      quality: activeProfile.qualityWeight,
      growth: activeProfile.growthWeight,
      value: activeProfile.valueWeight,
      momentum: activeProfile.momentumWeight,
      dividend: activeProfile.dividendWeight,
    });

    refreshRSFromRegime();
  }, [
    engineConfig.universe,
    engineConfig.crashSensitivity,
    engineConfig.enableCrashProtection,
    activeProfile?.id,
    activeProfile?.qualityWeight,
    activeProfile?.growthWeight,
    activeProfile?.valueWeight,
    activeProfile?.momentumWeight,
    activeProfile?.dividendWeight,
  ]);
}
