// ─────────────────────────────────────────────────────────────
// Buy Pressure Score (BPS) — Adaptive DCA Engine
//
// Replaces fixed monthly DCA with data-driven position sizing.
// Higher score = more buy opportunity (data says deploy more cash).
// Lower score  = save cash (market expensive / no panic).
//
// See docs/DECISIONS.md "Adaptive DCA Engine" for design rationale.
// ─────────────────────────────────────────────────────────────
import { useMemo } from "react";
import { MKT, RS, getProcessedLeaders } from "../marketData";
import { getIhsgDrawdown60, isCrisisMode } from "../marketRegimeEngine";
import { STOCKS_DATA } from "../stocksData";
import { useEngineConfig } from "../contexts/EngineConfigContext";

export type BuyPressureAction =
  | "none"
  | "small"
  | "normal"
  | "aggressive"
  | "deploy";

export interface BuyPressureFactors {
  valuation: number; // 0-100, higher = stocks cheaper
  momentum: number;  // 0-100, higher = market down (opportunity)
  breadth: number;   // 0-100, higher = fewer stocks healthy
  drawdown: number;  // 0-100, higher = bigger drop from peak
  fear: number;      // 0-100, higher = regime risk elevated
}

export interface BuyPressureInput {
  ihsgMonthly: number;
  drawdown60: number | null;
  breadthAbove60: number;
  watchlistCount: number;
  riskScore: number;
  averageValueScore: number;
}

export interface BuyPressureResult {
  score: number;             // 0-100, weighted sum
  factors: BuyPressureFactors;
  action: BuyPressureAction;
  deployPct: number;         // 0-100, how much of available cash to deploy
  cashPct: number;           // 0-100, how much to keep in cash
  reason: string;            // human-readable summary
  valid: boolean;            // false when in crisis mode
}

const WEIGHTS = {
  valuation: 0.30,
  momentum: 0.25,
  breadth: 0.15,
  drawdown: 0.20,
  fear: 0.10,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function actionFromScore(score: number): { action: BuyPressureAction; deployPct: number } {
  if (score < 30) return { action: "none", deployPct: 0 };
  if (score < 50) return { action: "small", deployPct: 25 };
  if (score < 70) return { action: "normal", deployPct: 50 };
  if (score < 90) return { action: "aggressive", deployPct: 75 };
  return { action: "deploy", deployPct: 90 };
}

function buildReason(factors: BuyPressureFactors, score: number, action: BuyPressureAction): string {
  const labels: Record<BuyPressureAction, string> = {
    none: "Tidak membeli — pasar tidak mendukung.",
    small: "Beli kecil — valuasi mulai menarik.",
    normal: "Beli normal — peluang moderat.",
    aggressive: "Beli agresif — peluang sangat baik.",
    deploy: "Deploy hampir semua kas — capitulasi terdeteksi.",
  };

  const highlights: string[] = [];
  if (factors.drawdown >= 60) highlights.push(`drawdown ${factors.drawdown.toFixed(0)}/100`);
  if (factors.valuation >= 60) highlights.push(`valuasi murah ${factors.valuation.toFixed(0)}/100`);
  if (factors.breadth >= 60) highlights.push(`breadth lemah ${factors.breadth.toFixed(0)}/100`);
  if (factors.momentum >= 60) highlights.push(`momentum turun ${factors.momentum.toFixed(0)}/100`);
  if (factors.fear >= 70) highlights.push(`fear tinggi ${factors.fear.toFixed(0)}/100`);

  if (highlights.length === 0) {
    return `${labels[action]} Skor ${score}/100.`;
  }
  return `${labels[action]} Skor ${score}/100. Pendorong: ${highlights.join(", ")}.`;
}

/**
 * Pure function — compute Buy Pressure Score from market inputs.
 * Returns a fully-typed result with action mapping.
 */
export function computeBuyPressure(input: BuyPressureInput): BuyPressureResult {
  // Each sub-score is 0-100, higher = more buy pressure.
  const valuation = clamp(input.averageValueScore, 0, 100);

  // Momentum: when monthly return is negative, more buy pressure.
  // monthly=0 → 50, monthly=-25 → 100, monthly=+25 → 0.
  const momentum = clamp(50 - input.ihsgMonthly * 2, 0, 100);

  // Breadth: when few stocks are healthy (score>=60), more buy pressure.
  const breadthRatio = input.watchlistCount > 0
    ? input.breadthAbove60 / input.watchlistCount
    : 0;
  const breadth = clamp((1 - breadthRatio) * 100, 0, 100);

  // Drawdown: bigger drop from peak = more buy opportunity.
  // drawdown60=-25% → 100. No drawdown → 0.
  const drawdown = input.drawdown60 !== null && input.drawdown60 < 0
    ? clamp(-input.drawdown60 * 4, 0, 100)
    : 0;

  // Fear: regime risk score directly. Higher risk = more fear = more buy.
  const fear = clamp(input.riskScore, 0, 100);

  const factors: BuyPressureFactors = { valuation, momentum, breadth, drawdown, fear };

  // Weighted sum.
  const rawScore =
    valuation * WEIGHTS.valuation +
    momentum * WEIGHTS.momentum +
    breadth * WEIGHTS.breadth +
    drawdown * WEIGHTS.drawdown +
    fear * WEIGHTS.fear;
  const score = Math.round(clamp(rawScore, 0, 100));

  const { action, deployPct } = actionFromScore(score);
  const reason = buildReason(factors, score, action);

  return {
    score,
    factors,
    action,
    deployPct,
    cashPct: 100 - deployPct,
    reason,
    valid: true,
  };
}

/**
 * Override wrapper — returns a "not valid" result when market is in crisis.
 * The dashboard uses this to grey out and show CASH DEFENSE message.
 */
export function withCrisisOverride(bps: BuyPressureResult): BuyPressureResult {
  if (isCrisisMode()) {
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
    // Average value score across the visible universe (already normalized
    // 0-95 by data pipeline; same direction as BPS: higher = cheaper).
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
    const watchlistCount = RS.radar_context?.watchlist_count ?? leaders.length;
    const riskScore = RS.risk ?? 50;

    const bps = computeBuyPressure({
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

/**
 * Static helper for backtest / non-React contexts. Pass in raw
 * market snapshot (no React, no module state).
 */
export function computeBuyPressureFromMarket(
  ihsgMonthly: number,
  drawdown60: number | null,
  breadthAbove60: number,
  watchlistCount: number,
  riskScore: number,
  averageValueScore: number,
  inCrisis: boolean = false,
): BuyPressureResult {
  const bps = computeBuyPressure({
    ihsgMonthly, drawdown60, breadthAbove60, watchlistCount, riskScore, averageValueScore,
  });
  return inCrisis ? withCrisisOverride(bps) : bps;
}
