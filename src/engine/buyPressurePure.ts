// ─────────────────────────────────────────────────────────────
// Buy Pressure Score (BPS) — Pure functions (no React, no UI state)
//
// H3 fix: separated from React hook to avoid dragging React/UI
// imports into the backtest engine bundle.
// ─────────────────────────────────────────────────────────────

export type BuyPressureAction =
  | "none"
  | "small"
  | "normal"
  | "aggressive"
  | "deploy";

export interface BuyPressureFactors {
  valuation: number;
  momentum: number;
  breadth: number;
  drawdown: number;
  fear: number;
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
  score: number;
  factors: BuyPressureFactors;
  action: BuyPressureAction;
  deployPct: number;
  cashPct: number;
  reason: string;
  valid: boolean;
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

export function computeBuyPressure(input: BuyPressureInput): BuyPressureResult {
  const valuation = clamp(input.averageValueScore, 0, 100);
  const momentum = clamp(50 - input.ihsgMonthly * 2, 0, 100);
  const breadthRatio = input.watchlistCount > 0
    ? input.breadthAbove60 / input.watchlistCount
    : 0;
  const breadth = clamp((1 - breadthRatio) * 100, 0, 100);
  const drawdown = input.drawdown60 !== null && input.drawdown60 < 0
    ? clamp(-input.drawdown60 * 4, 0, 100)
    : 0;
  const fear = clamp(input.riskScore, 0, 100);

  const factors: BuyPressureFactors = { valuation, momentum, breadth, drawdown, fear };

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
 * Static helper for backtest / non-React contexts.
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
  if (inCrisis) {
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
