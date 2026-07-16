// ─────────────────────────────────────────────────────────────
// Buy Pressure Score (BPS) — React hook wrapper
//
// Pure functions live in buyPressurePure.ts (no React dependency).
// This file re-exports types + provides the React hook.
// ─────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { MKT, RS, getProcessedLeaders } from "../marketData";
import { getIhsgDrawdown60, isCrashActive } from "../marketRegimeEngine";
import { STOCKS_DATA } from "../stocksData";
import { useEngineConfig } from "../contexts/EngineConfigContext";
export type { BuyPressureAction, BuyPressureFactors, BuyPressureInput, BuyPressureResult } from "./buyPressurePure";
import { computeBuyPressure as pureComputeBuyPressure, computeBuyPressureFromMarket as pureComputeBuyPressureFromMarket, type BuyPressureResult } from "./buyPressurePure";

export const computeBuyPressure = pureComputeBuyPressure;
export const computeBuyPressureFromMarket = pureComputeBuyPressureFromMarket;

function withCrisisOverride(bps: BuyPressureResult): BuyPressureResult {
  if (isCrashActive()) {
    return {
      ...bps,
      valid: false,
      action: "none",
      deployPct: 0,
      cashPct: 100,
      reason: "CASH DEFENSE — pasar dalam krisis. Jangan membeli; alihkan ke safe haven dulu.",
    };
  }
  return bps;
}

/**
 * React hook — wires live market data (MKT, RS, drawdown) + active
 * weight profile to compute BPS in real time. Memoised on the inputs
 * that actually change BPS.
 */
export function useBuyPressure(): BuyPressureResult {
  const { engineConfig, activeProfile } = useEngineConfig();

  return useMemo(() => {
    const profileWeights = activeProfile
      ? {
          quality: activeProfile.qualityWeight,
          growth: activeProfile.growthWeight,
          value: activeProfile.valueWeight,
          momentum: activeProfile.momentumWeight,
          dividend: activeProfile.dividendWeight,
        }
      : engineConfig.activeProfileId;
    const leaders = getProcessedLeaders(STOCKS_DATA, profileWeights);
    const avgValue = leaders.length > 0
      ? leaders.reduce((sum, l) => sum + parseFloat(l.value || "0"), 0) / leaders.length
      : 50;

    const breadthAbove60 = RS.radar_context?.breadth_above_60 ?? 0;
    const watchlistCount = RS.radar_context?.idx_universe_size ?? leaders.length;
    const riskScore = RS.risk ?? 50;

    const bps = pureComputeBuyPressure({
      ihsgMonthly: MKT.ihsg.monthly,
      drawdown60: getIhsgDrawdown60(),
      breadthAbove60,
      watchlistCount,
      riskScore,
      averageValueScore: avgValue,
    });

    return withCrisisOverride(bps);
  }, [
    engineConfig.activeProfileId,
    activeProfile?.qualityWeight,
    activeProfile?.growthWeight,
    activeProfile?.valueWeight,
    activeProfile?.momentumWeight,
  ]);
}
