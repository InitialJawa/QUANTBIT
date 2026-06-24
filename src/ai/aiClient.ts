// ─────────────────────────────────────────────────────────────
// AI CLIENT — satu pintu ke /api/ai/chat untuk seluruh UI.
// Membangun AILiveContext dari state app lalu memanggil endpoint
// unified yang sudah "diberi makan" system knowledge.
// ─────────────────────────────────────────────────────────────
import { api } from "../services/api";
import { MKT, RS } from "../marketData";
import { getIhsgDrawdown60 } from "../marketRegimeEngine";
import type { AILiveContext } from "./systemKnowledge";
import type { StockData, PortfolioItem } from "../types";

export type AIChatMessage = { role: "user" | "assistant"; content: string };

export interface BuildContextInputs {
  engineConfig?: any;
  selectedStock?: StockData;
  portfolio?: PortfolioItem[];
  cash?: number;
  /** Label panel yang sedang dibuka — dipakai tombol "Jelaskan ini". */
  uiContext?: string;
}

/** Rakit konteks live dari objek-objek app jadi AILiveContext. */
export function buildLiveContext(inputs: BuildContextInputs = {}): AILiveContext {
  const { engineConfig: c, selectedStock: s, portfolio, cash, uiContext } = inputs;

  const ctx: AILiveContext = {
    regime: {
      status: RS.status,
      market_health: RS.market_health,
      opportunity: RS.opportunity,
      risk: RS.risk,
      confidence: RS.confidence,
      capital_deployment: RS.capital_deployment,
      action: RS.action,
      rationale: RS.rationale,
    },
    market: {
      ihsg: MKT.ihsg?.value,
      ihsgMonthly: MKT.ihsg?.monthly,
      usdidr: MKT.usdidr?.value,
      gold: MKT.gold?.value,
    },
  };

  if (c) {
    const profile = (c.profiles || []).find((p: any) => p.id === c.activeProfileId);
    ctx.config = {
      activeConfig: c.activeConfig ?? (c.activeProfileId === "res" ? "res" : "prod"),
      activeProfileId: c.activeProfileId,
      activeProfileName: profile?.name,
      safeHavenAsset: c.safeHavenAsset,
      topNCount: c.topNCount,
      reserveBufferPct: c.reserveBufferPct,
      crashSensitivity: c.crashSensitivity,
      singleSellTrigger: c.singleSellTrigger,
      singleBuyTrigger: c.singleBuyTrigger,
      universe: c.universe,
      qualityWeight: profile?.qualityWeight,
      growthWeight: profile?.growthWeight,
      valueWeight: profile?.valueWeight,
      momentumWeight: profile?.momentumWeight,
      customTickers: c.customTickers,
      customUniverse: c.customUniverse,
      simulationMode: c.simulationMode,
      lastBacktestProfile: c.lastBacktestProfile ? {
        id: c.lastBacktestProfile.id,
        name: c.lastBacktestProfile.name,
        qualityWeight: c.lastBacktestProfile.qualityWeight,
        growthWeight: c.lastBacktestProfile.growthWeight,
        valueWeight: c.lastBacktestProfile.valueWeight,
        momentumWeight: c.lastBacktestProfile.momentumWeight,
      } : undefined,
    };

    if (c.simulationMode === "custom" && c.customUniverse?.length) {
      ctx.activeUniverse = [...c.customUniverse];
    } else if (c.simulationMode === "algo" && c.customTickers?.length) {
      ctx.activeUniverse = [...c.customTickers];
    }

    if (c.enableCrashProtection) {
      const ihsgPrice = MKT.ihsg?.value;
      const ihsgDrawdown60 = getIhsgDrawdown60();
      if (typeof ihsgPrice === "number") {
        const shouldExit = ihsgDrawdown60 !== null && ihsgDrawdown60 <= -(c.crashSensitivity ?? 10);
        ctx.strategyEvaluation = {
          shouldExit,
          reason: shouldExit
            ? `IHSG dropped ${Math.abs(ihsgDrawdown60!).toFixed(1)}% from 60d peak (threshold: ${c.crashSensitivity}%)`
            : `IHSG within tolerance (${ihsgDrawdown60 !== null ? ihsgDrawdown60.toFixed(1) : "N/A"}%, threshold: ${c.crashSensitivity}%)`,
          targetSafeHaven: shouldExit ? c.safeHavenAsset : null,
        };
      }
    }
  }

  if (s) {
    ctx.selectedStock = {
      ticker: s.ticker,
      name: s.name,
      sector: s.sector,
      currentPrice: s.currentPrice,
      change: s.change,
      peRatio: s.peRatio,
      pbRatio: s.pbRatio,
      roe: s.roe,
      der: s.der,
      dividendYield: s.dividendYield,
    };
  }

  if (portfolio?.length) {
    ctx.portfolio = portfolio.map((p) => ({
      ticker: p.ticker,
      shares: p.shares,
      buyPrice: p.buyPrice,
    }));
  }
  if (cash != null) ctx.cash = cash;
  if (uiContext) ctx.uiContext = uiContext;

  return ctx;
}

export interface AskAIResult {
  content: string;
  provider: string;
}

/** Kirim percakapan + konteks ke AI unified. */
export async function askAI(
  messages: AIChatMessage[],
  context?: AILiveContext
): Promise<AskAIResult> {
  const data = await api.post<{ content: string; provider?: string }>("/api/ai/chat", {
    messages,
    context,
  });
  return { content: data.content, provider: data.provider || "unknown" };
}
