// ─────────────────────────────────────────────────────────────
// AI CLIENT — satu pintu ke /api/ai/chat untuk seluruh UI.
// Membangun AILiveContext dari state app lalu memanggil endpoint
// unified yang sudah "diberi makan" system knowledge.
// ─────────────────────────────────────────────────────────────
import { api } from "../services/api";
import { MKT, RS } from "../marketData";
import { getIhsgDrawdown60 } from "../marketRegimeEngine";
import { computeBuyPressureFromMarket } from "../engine/buyPressure";
import { extractToolCalls, READ_ONLY_TOOLS, ACTION_TOOLS } from "./toolCallParser";
import { generateMockResponse } from "./devMockAI";
import type { AILiveContext } from "./systemKnowledge";
import type { StockData, PortfolioItem } from "../types";
import type { AIToolCall, AIAction } from "../types/ai";

// Re-export parser helpers so existing imports (`from "../ai/aiClient"`) keep working.
export { extractToolCalls, READ_ONLY_TOOLS, ACTION_TOOLS };

export type AIChatMessage = { role: "user" | "assistant" | "tool"; content: string; toolCallId?: string };

export interface BuildContextInputs {
  engineConfig?: any;
  backtestConfig?: any;
  isBacktestOutOfSync?: boolean;
  selectedStock?: StockData;
  portfolio?: PortfolioItem[];
  cash?: number;
  /** Label panel yang sedang dibuka — dipakai tombol "Jelaskan ini". */
  uiContext?: string;
  /** Recent fired notifications (Level 4 proactive) */
  alerts?: { rule: string; title: string; message: string; timestamp: number }[];
}

/** Rakit konteks live dari objek-objek app jadi AILiveContext. */
export function buildLiveContext(inputs: BuildContextInputs = {}): AILiveContext {
  const { engineConfig: c, backtestConfig, isBacktestOutOfSync, selectedStock: s, portfolio, cash, uiContext, alerts } = inputs;

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
      customUniverse: c.customUniverse,
      enableAdaptiveWeights: c.enableAdaptiveWeights,
      simulationMode: c.simulationMode,
      enableCrashProtection: c.enableCrashProtection,
      dcaActive: c.dcaActive,
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

  if (backtestConfig) {
    ctx.backtestConfigSnapshot = {
      activeProfileId: backtestConfig.activeProfileId,
      simulationMode: backtestConfig.simulationMode,
      universe: backtestConfig.universe,
      topNCount: backtestConfig.topNCount,
      enableCrashProtection: backtestConfig.enableCrashProtection,
      crashSensitivity: backtestConfig.crashSensitivity,
      dcaActive: backtestConfig.dcaActive,
    };
    ctx.isBacktestOutOfSync = !!isBacktestOutOfSync;
  }

  // BPS (Adaptive DCA) — always include when MKT is loaded.
  if (typeof MKT.ihsg?.monthly === "number") {
    const bps = computeBuyPressureFromMarket(
      MKT.ihsg.monthly,
      getIhsgDrawdown60(),
      RS.radar_context?.breadth_above_60 ?? 0,
      RS.radar_context?.watchlist_count ?? 0,
      RS.risk ?? 50,
      50, /* avgValueScore — use 50 as default; precise per-universe score requires leader scan */
      false,
    );
    ctx.bps = {
      score: bps.score,
      action: bps.action,
      deployPct: bps.deployPct,
      cashPct: bps.cashPct,
      valid: bps.valid,
      reason: bps.reason,
      factors: bps.factors,
    };
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
  if (alerts?.length) ctx.alerts = alerts.slice(0, 5);

  return ctx;
}

export interface AskAIResult {
  content: string;
  provider: string;
  /** Tools the model wants to call. Mix of read-only + actions. */
  toolCalls: AIToolCall[];
}

export interface AskAIOptions {
  /** When true, skip the network call and return a canned dev-mock
   *  response (pattern-matches the user message to emit tool calls).
   *  Useful when no real AI provider is reachable (e.g. Gemini
   *  geo-blocked + no OpenRouter/Groq key). */
  useDevMock?: boolean;
  /** Current session id (per page load). Used by server to fetch
   *  memory from past sessions. */
  sessionId?: string;
  /** User id (for memory retrieval). Defaults to "dev-user" if not provided. */
  userId?: string;
}

/** Kirim percakapan + konteks ke AI unified. */
export async function askAI(
  messages: AIChatMessage[],
  context?: AILiveContext,
  options: AskAIOptions = {},
): Promise<AskAIResult> {
  if (options.useDevMock) {
    // Use the most recent user message as input to the mock.
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const mock = generateMockResponse(lastUser?.content || "", context);
    return {
      content: mock.content,
      provider: mock.provider,
      toolCalls: mock.toolCalls,
    };
  }
  const data = await api.post<{ content: string; provider?: string }>("/api/ai/chat", {
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    context,
    sessionId: options.sessionId,
    userId: options.userId || "dev-user",
  });
  const raw = data.content || "";
  const provider = data.provider || "unknown";
  const { cleanText, toolCalls } = extractToolCalls(raw);
  return { content: cleanText, provider, toolCalls };
}
