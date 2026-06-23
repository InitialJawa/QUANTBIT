import { MKT, L, EX, RS, CW_F, CW_B, getProcessedLeaders } from "./marketData";
import { IDX80_TICKERS, IDX30_TICKERS, LQ45_TICKERS } from "./constants/idx80";

export type RegimeState =
  | "RISK_ON"
  | "RISK_OFF"
  | "GOLD_DEFENSE"
  | "CASH_DEFENSE"
  | "RECOVERY_WATCH";

export type CurrentDecision =
  | "BUY_STOCKS"
  | "HOLD_GOLD"
  | "HOLD_CASH"
  | "WAIT_RECOVERY";

export interface RegimeOutput {
  regime: RegimeState;
  decision: CurrentDecision;
  marketHealth: number;
  opportunity: number;
  risk: number;
  confidence: number;
  capitalDeployment: number;
  action: string;
  rationale: string;
  ihsgTrend: {
    monthly: number;
    aboveMa20: boolean;
    aboveMa50: boolean;
  };
  breadth: {
    stocksAbove60: number;
    stocksAbove70: number;
    totalTracked: number;
    allScores: number[];
  };
  exitRisk: {
    exitCount: number;
    exitRiskCount: number;
    healthyCount: number;
  };
}

let _lastIhsgData: { close: number; date: string; isCarriedForward?: boolean }[] = [];
let _activeUniverse: "all" | "idx80" | "idx30" | "lq45" = "all";
let _activeConfig: "prod" | "res" = "prod";
let _crashSensitivity = 10;

export function setIhsgHistory(data: { close: number; date: string; isCarriedForward?: boolean }[]) {
  _lastIhsgData = data;
}

export function setActiveUniverse(u: "all" | "idx80" | "idx30" | "lq45") {
  _activeUniverse = u;
}

export function setActiveConfig(c: "prod" | "res") {
  _activeConfig = c;
}

export function setCrashSensitivity(n: number) {
  _crashSensitivity = n;
}

export function getIhsgData(): { close: number; date: string; isCarriedForward?: boolean }[] {
  return _lastIhsgData;
}

export function computeRSI(data: number[], period: number = 14): number | null {
  if (data.length < period + 1) return null;
  const closes = data.slice(-period - 1);
  let gains = 0, losses = 0;
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  for (let i = closes.length; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
  }
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 10) / 10;
}

function computeEMA(data: number[], period: number): number | null {
  if (data.length < period) return null;
  const multiplier = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * multiplier + ema;
  }
  return Math.round(ema * 10) / 10;
}

export function computeMACD(data: number[]): { macd: number; signal: number; histogram: number } | null {
  if (data.length < 35) return null;
  const ema12 = computeEMA(data, 12);
  const ema26 = computeEMA(data, 26);
  if (ema12 === null || ema26 === null) return null;
  const macdLine = Math.round((ema12 - ema26) * 10) / 10;

  const macdValues: number[] = [];
  for (let i = 25; i < data.length; i++) {
    const e12 = computeEMA(data.slice(0, i + 1), 12);
    const e26 = computeEMA(data.slice(0, i + 1), 26);
    if (e12 !== null && e26 !== null) {
      macdValues.push(e12 - e26);
    }
  }
  if (macdValues.length < 9) return { macd: macdLine, signal: 0, histogram: macdLine };

  const signalLine = computeEMA(macdValues, 9);
  if (signalLine === null) return { macd: macdLine, signal: 0, histogram: macdLine };

  const histogram = Math.round((macdLine - signalLine) * 10) / 10;
  return { macd: macdLine, signal: Math.round(signalLine * 10) / 10, histogram };
}

export function getIhsgDrawdown60(): number | null {
  if (_lastIhsgData.length < 2) return null;
  const closes = _lastIhsgData.map(d => d.close);
  const window = closes.slice(-60);
  const peak = Math.max(...window);
  const current = closes[closes.length - 1];
  return ((current - peak) / peak) * 100;
}

function filterTickersForUniverse(tickers: string[]): string[] {
  if (_activeUniverse === "idx30") {
    const set = new Set(IDX30_TICKERS);
    return tickers.filter(t => set.has(t));
  }
  if (_activeUniverse === "idx80") {
    const set = new Set(IDX80_TICKERS);
    return tickers.filter(t => set.has(t));
  }
  if (_activeUniverse === "lq45") {
    const set = new Set(LQ45_TICKERS);
    return tickers.filter(t => set.has(t));
  }
  return tickers;
}

function computeSMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  const slice = data.slice(-period);
  return slice.reduce((sum, v) => sum + v, 0) / period;
}

export function computeMarketRegime(): RegimeOutput {
  const ihsgMonthly = MKT.ihsg.monthly;
  const ihsgCurrent = MKT.ihsg.value;

  const closes = _lastIhsgData.map(d => d.close);
  const sma20 = computeSMA(closes, 20);
  const sma50 = computeSMA(closes, 50);

  const aboveMa20 = sma20 > 0 ? ihsgCurrent > sma20 : true;
  const aboveMa50 = sma50 > 0 ? ihsgCurrent > sma50 : true;

  const universeTickers = filterTickersForUniverse(L.map(s => s.ticker));
  const universeL = L.filter(s => universeTickers.includes(s.ticker));
  const universeEX = EX.filter(e => universeTickers.includes(e.ticker));

  const lenL = universeL.length || 1;
  const configWeights = _activeConfig === "prod" ? CW_F : CW_B;
  const scores = universeL.map(s =>
    (parseFloat(s.quality) || 0) * configWeights.quality +
    (parseFloat(s.growth) || 0) * configWeights.growth +
    (parseFloat(s.value) || 0) * configWeights.value +
    (parseFloat(s.momentum) || 0) * configWeights.momentum
  );
  const above60 = scores.filter(s => s >= 60).length;
  const above70 = scores.filter(s => s >= 70).length;

  const exCount = universeEX.filter(e => e.exit_state === "EXIT").length;
  const exRiskCount = universeEX.filter(e => e.exit_state === "EXIT RISK").length;
  const healthyCount = universeEX.filter(e => e.exit_state === "HEALTHY").length;
  const totalEx = universeEX.length || 1;

  const crisisThreshold = ihsgMonthly < -_crashSensitivity;
  const bearishTrend = !aboveMa20 && !aboveMa50;
  const bullishTrend = aboveMa20 && aboveMa50;
  const recoveringTrend = aboveMa20 && !aboveMa50;

  const highExitRisk = exCount + exRiskCount > totalEx * 0.4;
  const lowBreadth = above60 < lenL * 0.15;

  let regime: RegimeState;
  let decision: CurrentDecision;
  let rationale: string;

  if (crisisThreshold && bearishTrend) {
    regime = "GOLD_DEFENSE";
    decision = "HOLD_GOLD";
    rationale = `IHSG bulanan ${ihsgMonthly.toFixed(1)}% melebihi threshold krisis (${_crashSensitivity}%). Trend bearish: MA20 dan MA50 sudah ditembus ke bawah. Prioritaskan proteksi kapital.`;
  } else if (crisisThreshold) {
    regime = "CASH_DEFENSE";
    decision = "HOLD_CASH";
    rationale = `IHSG bulanan ${ihsgMonthly.toFixed(1)}% dalam zona krisis (threshold ${_crashSensitivity}%), namun harga masih di atas moving average jangka pendek. Hold cash, tunggu konfirmasi lanjutan.`;
  } else if (bearishTrend && highExitRisk) {
    regime = "RISK_OFF";
    decision = "WAIT_RECOVERY";
    rationale = `IHSG di bawah MA20 dan MA50 dengan ${exCount + exRiskCount}/${totalEx} emiten dalam status exit/exit risk. Pasar belum layak diserang.`;
  } else if (bearishTrend) {
    regime = "RECOVERY_WATCH";
    decision = "WAIT_RECOVERY";
    rationale = `IHSG di bawah MA jangka panjang. Tunggu recovery confirmation + kandidat saham lolos rank/score sebelum entry.`;
  } else if (recoveringTrend && !highExitRisk && lowBreadth) {
    regime = "RECOVERY_WATCH";
    decision = "WAIT_RECOVERY";
    rationale = `IHSG kembali di atas MA20 tetapi breadth masih rendah (${above60}/${lenL} saham >=60). Butuh konfirmasi lanjutan untuk mode RISK_ON.`;
  } else if (recoveringTrend) {
    regime = "RISK_OFF";
    decision = "WAIT_RECOVERY";
    rationale = `IHSG mulai membaik (di atas MA20) tetapi masih di bawah MA50. Pasar dalam transisi, wait for full recovery.`;
  } else if (lowBreadth || highExitRisk) {
    regime = "RISK_OFF";
    decision = "WAIT_RECOVERY";
    rationale = `IHSG secara teknikal di atas MA, namun breadth (${above60}/${lenL}) masih lemah atau exit risk tinggi. Belum aman untuk RISK_ON.`;
  } else {
    regime = "RISK_ON";
    decision = "BUY_STOCKS";
    rationale = `IHSG sehat di atas MA20 dan MA50, breadth memadai (${above60}/${lenL} >=60). Pasar dalam mode RISK_ON.`;
  }

  const healthScore = Math.min(99, Math.max(1,
    Math.round(
      (bullishTrend ? 25 : bearishTrend ? -15 : 5) +
      (above60 / Math.max(1, lenL)) * 30 +
      (1 - (exCount + exRiskCount) / Math.max(1, totalEx)) * 25 +
      Math.max(0, Math.min(20, 20 + ihsgMonthly * 2))
    )
  ));

  const opportunityScore = Math.min(99, Math.max(1,
    regime === "RISK_ON" ? Math.round(60 + (above60 / Math.max(1, lenL)) * 30) :
    regime === "RECOVERY_WATCH" ? Math.round(40 + (above60 / Math.max(1, lenL)) * 20) :
    Math.round(15 + (above60 / Math.max(1, lenL)) * 15)
  ));

  const riskScore = Math.min(99, Math.max(1,
    regime === "GOLD_DEFENSE" ? 85 :
    regime === "RISK_ON" ? Math.round(15 + (1 - (above60 / Math.max(1, lenL))) * 20) :
    Math.round(40 + (exCount + exRiskCount) / Math.max(1, totalEx) * 30)
  ));

  const confidenceScore = Math.min(99, Math.max(1,
    Math.round(
      (bullishTrend ? 30 : bearishTrend ? 10 : 20) +
      (above60 / Math.max(1, lenL)) * 25 +
      (healthyCount / Math.max(1, totalEx)) * 25 +
      Math.max(0, Math.min(20, 30 + ihsgMonthly * 1.5))
    )
  ));

  const deployPct =
    regime === "RISK_ON" ? Math.min(95, Math.round(40 + (above60 / Math.max(1, lenL)) * 40)) :
    regime === "RECOVERY_WATCH" ? 25 :
    regime === "RISK_OFF" ? 15 : 0;

  const actionLabel =
    regime === "RISK_ON" ? "ACCUMULATE" :
    regime === "RECOVERY_WATCH" ? "WAIT" :
    regime === "RISK_OFF" ? "WAIT" :
    "LIQUIDATE / CASH OUT";

  return {
    regime,
    decision,
    marketHealth: healthScore,
    opportunity: opportunityScore,
    risk: riskScore,
    confidence: confidenceScore,
    capitalDeployment: deployPct,
    action: actionLabel,
    rationale,
    ihsgTrend: {
      monthly: ihsgMonthly,
      aboveMa20,
      aboveMa50,
    },
    breadth: {
      stocksAbove60: above60,
      stocksAbove70: above70,
      totalTracked: lenL,
      allScores: scores,
    },
    exitRisk: {
      exitCount: exCount,
      exitRiskCount: exRiskCount,
      healthyCount,
    },
  };
}

export function refreshRSFromRegime(): void {
  const regime = computeMarketRegime();
  RS.last_update = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) + " WIB";
  RS.status =
    regime.regime === "GOLD_DEFENSE" ? "DANGER" :
    regime.regime === "CASH_DEFENSE" ? "DANGER" :
    regime.regime === "RISK_OFF" ? "WARNING" :
    regime.regime === "RECOVERY_WATCH" ? "WARNING" :
    "SAFE";
  RS.market_health = regime.marketHealth;
  RS.opportunity = regime.opportunity;
  RS.risk = regime.risk;
  RS.confidence = regime.confidence;
  RS.capital_deployment = regime.capitalDeployment;
  RS.action = regime.action;
  RS.rationale = regime.rationale;
  RS.detail_message = regime.rationale;
  const sortedAll = [...regime.breadth.allScores].sort((a, b) => b - a);
  const topScores = sortedAll.filter(s => s >= 70).slice(0, 5);
  const botScores = sortedAll.filter(s => s < 60).slice(-5);
  const topAvg = topScores.length > 0 ? Math.round(topScores.reduce((a, v) => a + v, 0) / topScores.length * 10) / 10 : 0;
  const botAvg = botScores.length > 0 ? Math.round(botScores.reduce((a, v) => a + v, 0) / botScores.length * 10) / 10 : 0;
  RS.radar_context = {
    ...RS.radar_context,
    top5_avg_score: topAvg,
    bot5_avg_score: botAvg,
    breadth_above_70: regime.breadth.stocksAbove70,
    breadth_above_60: regime.breadth.stocksAbove60,
    score_gap: Math.round((topAvg - botAvg) * 10) / 10,
  };
}

export interface AuditTrailEntry {
  decision: CurrentDecision;
  regime: RegimeState;
  reason: string;
  position: string;
  reentryCondition: string;
  ihsgMa20Above: boolean;
  ihsgMa50Above: boolean;
  breadthPercent: string;
  exitRiskPercent: string;
  noBuyReasons: string[];
}

export function getAuditTrail(): AuditTrailEntry {
  const regime = computeMarketRegime();

  const positionLabel =
    regime.decision === "HOLD_GOLD" ? "Emas" :
    regime.decision === "HOLD_CASH" ? "Cash" :
    regime.decision === "BUY_STOCKS" ? "Saham" :
    "Cash (Menunggu)";

  const reentryCondition =
    regime.regime === "GOLD_DEFENSE"
      ? "IHSG harus kembali di atas MA20 dan MA50. Minimal 20% kandidat saham harus lolos score >=60. Tidak ada exit risk dominan."
      : regime.regime === "CASH_DEFENSE"
        ? `Konfirmasi pemulihan IHSG bulanan > -${_crashSensitivity}% + MA20 crossing.`
        : regime.regime === "RISK_OFF"
          ? "IHSG crossing di atas MA50 + breadth membaik (>=20% saham score >=60)."
          : regime.regime === "RECOVERY_WATCH"
            ? "Breadth perlu meningkat (>=30% saham score >=60) + IHSG bertahan di atas MA50."
            : "Pertahankan kondisi saat ini.";

  const reasons: string[] = [];
  if (regime.decision !== "BUY_STOCKS") {
    if (regime.regime === "GOLD_DEFENSE") {
      reasons.push("IHSG dalam fase krisis dan bearish — mode GOLD DEFENSE aktif");
    } else if (regime.regime === "CASH_DEFENSE") {
      reasons.push("IHSG dalam fase krisis — mode CASH DEFENSE aktif");
    }
    if (!regime.ihsgTrend.aboveMa20) {
      reasons.push("IHSG di bawah MA20 — trend jangka pendek bearish");
    }
    if (!regime.ihsgTrend.aboveMa50) {
      reasons.push("IHSG di bawah MA50 — trend jangka panjang bearish");
    }
    if (regime.breadth.stocksAbove60 < Math.max(1, Math.round(regime.breadth.totalTracked * 0.2))) {
      reasons.push(`Breadth rendah (<20% saham score >=60): hanya ${regime.breadth.stocksAbove60}/${regime.breadth.totalTracked}`);
    }
    if (regime.exitRisk.exitCount + regime.exitRisk.exitRiskCount > 0) {
      reasons.push(`${regime.exitRisk.exitCount + regime.exitRisk.exitRiskCount} emiten dalam status EXIT/EXIT RISK`);
    }
    if (regime.marketHealth < 40) {
      reasons.push("Skor kesehatan pasar di bawah 40");
    }
  }
  if (reasons.length === 0 && regime.decision !== "BUY_STOCKS") {
    reasons.push("Kondisi pasar belum memenuhi threshold RISK_ON");
  }

  return {
    decision: regime.decision,
    regime: regime.regime,
    reason: regime.rationale,
    position: positionLabel,
    reentryCondition: reentryCondition,
    ihsgMa20Above: regime.ihsgTrend.aboveMa20,
    ihsgMa50Above: regime.ihsgTrend.aboveMa50,
    breadthPercent: `${Math.round(regime.breadth.stocksAbove60 / Math.max(1, regime.breadth.totalTracked) * 100)}%`,
    exitRiskPercent: `${Math.round((regime.exitRisk.exitCount + regime.exitRisk.exitRiskCount) / Math.max(1, regime.exitRisk.exitCount + regime.exitRisk.exitRiskCount + regime.exitRisk.healthyCount) * 100)}%`,
    noBuyReasons: reasons,
  };
}
