// ─────────────────────────────────────────────────────────────
// useAITools — frontend tool + action registry for the AI agent.
//
// Read-only tools (Level 2) execute immediately and return their
// result to the model. Action tools (Level 3) DON'T execute — they
// return a PendingAction for the chat UI to render an approval card.
// All deterministic math stays in engine/; this file is glue only.
//
// Pure logic is exported as static helpers (ACTION_REGISTRY,
// buildPendingActionFromContext) so it can be unit-tested without
// React or DOM.
// ─────────────────────────────────────────────────────────────
import { useCallback, useMemo } from "react";
import { useEngineConfig } from "../contexts/EngineConfigContext";
import { useBuyPressure } from "../engine/buyPressure";
import { MKT, RS, getProcessedLeaders } from "../marketData";
import { getIhsgData, getIhsgDrawdown60 } from "../marketRegimeEngine";
import { STOCKS_DATA } from "../stocksData";
import { PF, FD } from "../marketData";
import type { StockData, PortfolioItem, WatchlistItem } from "../types";
import type { WeightProfile } from "../contexts/EngineConfigContext";
import type {
  AIToolCall,
  AIToolResult,
  AIAction,
  PendingAction,
} from "../types/ai";

/** Subset of usePortfolioManager that useAITools needs. Pass the
 *  whole pm object; the type only declares what we actually use. */
export interface PortfolioAPI {
  portfolio: PortfolioItem[];
  cash: number;
  watchlist: WatchlistItem[];
  handleAddTransaction: (ticker: string, shares: number, buyPrice: number, silent?: boolean) => Promise<void> | void;
  handleSellTransaction: (ticker: string, shares: number, silent?: boolean) => Promise<void> | void;
  handleMoveToGold: (rupiahAmount: number) => void;
  handleToggleWatchlist: (ticker: string) => Promise<void> | void;
}

export interface UseAIToolsParams {
  pm: PortfolioAPI;
  /** Optional helper to resolve dynamic stock data (e.g. with current price) */
  getDynamicStock?: (ticker: string) => StockData | undefined;
}

// ── Read-only tool implementations (Level 2) ───────────────────

type ToolHandler = (args: any) => Promise<any> | any;

function getProcessedLeadersSafe() {
  try {
    return getProcessedLeaders(STOCKS_DATA as any, "prod") as any[];
  } catch {
    return [];
  }
}

function safeNum(n: any, digits = 2): number | null {
  return typeof n === "number" && isFinite(n) ? Number(n.toFixed(digits)) : null;
}

function buildMarketHistory(days: number) {
  const ihsg = getIhsgData() || [];
  const slice = ihsg.slice(-Math.max(1, days));
  return {
    ihsg: slice.map((d) => ({ date: d.date, close: d.close })),
    last: slice.length,
    asOf: new Date().toISOString(),
  };
}

function buildTickerMetrics(ticker: string) {
  const cleanTicker = ticker.toUpperCase().replace(/\.JK$/, "");
  const stock = STOCKS_DATA.find((s) => s.ticker === cleanTicker || s.ticker === `${cleanTicker}.JK`);
  if (!stock) return { ticker: cleanTicker, found: false };
  const fund = (FD as any)[`${cleanTicker}.JK`] || (FD as any)[cleanTicker] || null;
  const profile = (PF as any)[cleanTicker] || null;
  const leaders = getProcessedLeadersSafe();
  const lead = leaders.find((l: any) => (l.ticker || "").toUpperCase().replace(/\.JK$/, "") === cleanTicker);
  return {
    ticker: stock.ticker,
    name: stock.name,
    sector: stock.sector,
    currentPrice: safeNum(stock.currentPrice),
    change: safeNum(stock.change),
    peRatio: safeNum(stock.peRatio),
    pbRatio: safeNum(stock.pbRatio),
    roe: safeNum(stock.roe),
    der: safeNum(stock.der),
    dividendYield: safeNum(stock.dividendYield),
    rank: lead?.rank ?? null,
    finalScore: lead ? safeNum(parseFloat(lead.final_score)) : null,
    profile: profile ? { name: profile.name, sector: profile.sector, summary: profile.summary } : null,
    fundamentals: fund,
  };
}

// ── Action registry (Level 3) — pure, exported for testing ────

/** Static map of action tool names → constructor returning a typed AIAction.
 *  Always normalises ticker (uppercase, strip .JK) and coerces numbers. */
export const ACTION_REGISTRY: Record<string, (args: any) => AIAction> = {
  buy_stock: ({ ticker, shares, price }: { ticker: string; shares: number; price?: number }) => ({
    type: "buy_stock", ticker: (ticker || "").toUpperCase().replace(/\.JK$/, ""), shares: Number(shares) || 0, price: price != null ? Number(price) : undefined,
  }),
  sell_stock: ({ ticker, shares }: { ticker: string; shares: number }) => ({
    type: "sell_stock", ticker: (ticker || "").toUpperCase().replace(/\.JK$/, ""), shares: Number(shares) || 0,
  }),
  move_to_gold: ({ rupiahAmount }: { rupiahAmount: number }) => ({
    type: "move_to_gold", rupiahAmount: Number(rupiahAmount) || 0,
  }),
  set_active_profile: ({ profileId }: { profileId: string }) => ({ type: "set_active_profile", profileId }),
  set_universe: ({ universe }: { universe: "all" | "idx80" | "idx30" | "lq45" }) => ({ type: "set_universe", universe }),
  set_topN: ({ n }: { n: number }) => ({ type: "set_topN", n: Number(n) || 5 }),
  toggle_dca_active: ({ active }: { active: boolean }) => ({ type: "toggle_dca_active", active: !!active }),
  add_to_watchlist: ({ ticker }: { ticker: string }) => ({ type: "add_to_watchlist", ticker: (ticker || "").toUpperCase().replace(/\.JK$/, "") }),
  remove_from_watchlist: ({ ticker }: { ticker: string }) => ({ type: "remove_from_watchlist", ticker: (ticker || "").toUpperCase().replace(/\.JK$/, "") }),
  sync_backtest_to_portfolio: () => ({ type: "sync_backtest_to_portfolio" }),
};

// ── Pure builder for PendingAction (testable) ─────────────────

export interface BuildPendingContext {
  pm: { cash: number; portfolio: PortfolioItem[]; watchlist: WatchlistItem[] };
  getDynamicStock?: (ticker: string) => StockData | undefined;
  engineConfig: { profiles: WeightProfile[]; lastBacktestProfile: WeightProfile | null };
  goldPrice: number;
}

/** Format IDR with thousand separators (no rounding). */
export const formatIDR = (n: number): string => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

/** Pure function — convert an AIAction into a PendingAction with display
 *  text + impact preview. Pass `now` for deterministic tests. */
export function buildPendingActionFromContext(
  action: AIAction,
  ctx: BuildPendingContext,
  now: number = Date.now(),
): PendingAction {
  const id = `pa_${now}_${Math.random().toString(36).slice(2, 7)}`;
  const impact: { label: string; value: string }[] = [];
  let displayText = "";

  switch (action.type) {
    case "buy_stock": {
      const cleanTicker = action.ticker.toUpperCase();
      const dyn = ctx.getDynamicStock?.(cleanTicker);
      const refPrice = action.price ?? dyn?.currentPrice ?? null;
      const estimatedCost = refPrice != null ? action.shares * refPrice : null;
      displayText = `Beli ${action.shares} lembar ${cleanTicker}${refPrice != null ? ` @ ${formatIDR(refPrice)}` : ""}`;
      if (estimatedCost != null) impact.push({ label: "Estimasi biaya", value: formatIDR(estimatedCost) });
      impact.push({ label: "Kas tersedia", value: formatIDR(ctx.pm.cash) });
      if (estimatedCost != null && estimatedCost > ctx.pm.cash) impact.push({ label: "⚠ Peringatan", value: "Biaya melebihi kas" });
      break;
    }
    case "sell_stock": {
      const cleanTicker = action.ticker.toUpperCase();
      const pos = ctx.pm.portfolio.find((p) => p.ticker === cleanTicker || p.ticker === `${cleanTicker}.JK`);
      const dyn = ctx.getDynamicStock?.(cleanTicker);
      const refPrice = dyn?.currentPrice ?? pos?.buyPrice ?? null;
      const proceeds = refPrice != null ? refPrice * action.shares : null;
      displayText = `Jual ${action.shares} lembar ${cleanTicker}${refPrice != null ? ` @ ${formatIDR(refPrice)}` : ""}`;
      if (proceeds != null) impact.push({ label: "Estimasi hasil", value: formatIDR(proceeds) });
      if (pos) impact.push({ label: "Posisi saat ini", value: `${pos.shares} lembar` });
      break;
    }
    case "move_to_gold": {
      displayText = `Pindahkan ${formatIDR(action.rupiahAmount)} ke Emas (safe haven)`;
      impact.push({ label: "Saldo kas sekarang", value: formatIDR(ctx.pm.cash) });
      if (ctx.goldPrice > 0) impact.push({ label: "Estimasi gram emas", value: `${(action.rupiahAmount / ctx.goldPrice).toFixed(4)} g` });
      break;
    }
    case "set_active_profile": {
      const p = ctx.engineConfig.profiles.find((x) => x.id === action.profileId);
      displayText = `Ganti profil ke ${p?.name || action.profileId}`;
      if (p) impact.push({ label: "Bobot", value: `Q${Math.round(p.qualityWeight * 100)} G${Math.round(p.growthWeight * 100)} V${Math.round(p.valueWeight * 100)} M${Math.round(p.momentumWeight * 100)} D${Math.round(p.dividendWeight * 100)}` });
      break;
    }
    case "set_universe":
      displayText = `Ubah universe ke ${action.universe}`;
      break;
    case "set_topN":
      displayText = `Ubah Top N menjadi ${action.n}`;
      break;
    case "toggle_dca_active":
      displayText = action.active ? "Aktifkan rekomendasi DCA" : "Nonaktifkan rekomendasi DCA";
      break;
    case "add_to_watchlist":
      displayText = `Tambah ${action.ticker} ke watchlist`;
      break;
    case "remove_from_watchlist":
      displayText = `Hapus ${action.ticker} dari watchlist`;
      break;
    case "sync_backtest_to_portfolio":
      displayText = "Sync konfigurasi backtest ke portofolio live";
      if (ctx.engineConfig.lastBacktestProfile) {
        impact.push({ label: "Profil backtest", value: ctx.engineConfig.lastBacktestProfile.name });
      }
      break;
  }

  return { id, action, displayText, impact, createdAt: now };
}

// ── Public hook ────────────────────────────────────────────────

export function useAITools({ pm, getDynamicStock }: UseAIToolsParams) {
  const { engineConfig, activeProfile, backtestConfig } = useEngineConfig();
  const bps = useBuyPressure();

  // Read-only tool registry — frozen via useMemo.
  const toolRegistry = useMemo<Record<string, ToolHandler>>(() => ({
    get_portfolio_state: async () => ({
      positions: pm.portfolio.map((p) => ({
        ticker: p.ticker,
        shares: p.shares,
        buyPrice: p.buyPrice,
      })),
      cash: pm.cash,
      watchlist: pm.watchlist.map((w) => w.ticker),
      totalPositions: pm.portfolio.length,
    }),

    get_bps_now: async ({ ticker: tickerArg }: { ticker?: string } = {}) => {
      // Per-ticker BPS is not implemented (BPS is a market-level signal);
      // return the global score plus a note about the ticker.
      const base: any = {
        score: bps.score,
        action: bps.action,
        deployPct: bps.deployPct,
        cashPct: bps.cashPct,
        valid: bps.valid,
        reason: bps.reason,
        factors: bps.factors,
      };
      if (tickerArg) {
        base.tickerRequest = tickerArg;
        base.note = "BPS is a market-level signal; per-ticker score is not implemented.";
      }
      return base;
    },

    get_regime_details: async () => ({
      status: RS.status,
      market_health: RS.market_health,
      opportunity: RS.opportunity,
      risk: RS.risk,
      confidence: RS.confidence,
      capital_deployment: RS.capital_deployment,
      action: RS.action,
      rationale: RS.rationale,
      ihsgTrend: {
        current: MKT.ihsg?.value ?? null,
        monthly: MKT.ihsg?.monthly ?? null,
        drawdown60: getIhsgDrawdown60(),
      },
      breadth: {
        above70: RS.radar_context?.breadth_above_70 ?? null,
        above60: RS.radar_context?.breadth_above_60 ?? null,
        below40: RS.radar_context?.breadth_below_40 ?? null,
        watchlist_count: RS.radar_context?.watchlist_count ?? null,
      },
    }),

    get_ticker_metrics: async ({ ticker }: { ticker: string }) => {
      if (!ticker) return { error: "ticker required" };
      return buildTickerMetrics(ticker);
    },

    get_market_history: async ({ days = 30 }: { days?: number } = {}) =>
      buildMarketHistory(days),

    get_backtest_config: async () => ({
      activeProfileId: backtestConfig.activeProfileId,
      simulationMode: backtestConfig.simulationMode,
      universe: backtestConfig.universe,
      customUniverse: backtestConfig.customUniverse,
      topNCount: backtestConfig.topNCount,
      enableCrashProtection: backtestConfig.enableCrashProtection,
      crashSensitivity: backtestConfig.crashSensitivity,
      safeHavenAsset: backtestConfig.safeHavenAsset,
      reserveBufferPct: backtestConfig.reserveBufferPct,
      enableAdaptiveWeights: backtestConfig.enableAdaptiveWeights,
      singleTicker: backtestConfig.singleTicker,
      simStartDate: backtestConfig.simStartDate,
      simEndDate: backtestConfig.simEndDate,
      algoCapital: backtestConfig.algoCapital,
    }),

    get_engine_config: async () => ({
      activeProfileId: engineConfig.activeProfileId,
      activeProfileName: activeProfile?.name,
      simulationMode: engineConfig.simulationMode,
      universe: engineConfig.universe,
      customUniverse: engineConfig.customUniverse,
      topNCount: engineConfig.topNCount,
      enableCrashProtection: engineConfig.enableCrashProtection,
      crashSensitivity: engineConfig.crashSensitivity,
      safeHavenAsset: engineConfig.safeHavenAsset,
      dcaActive: engineConfig.dcaActive,
      lastBacktestProfile: engineConfig.lastBacktestProfile,
    }),

    get_active_universe: async () => {
      if (engineConfig.simulationMode === "custom" && engineConfig.customUniverse?.length) {
        return { mode: "custom", tickers: [...engineConfig.customUniverse] };
      }
      return { mode: engineConfig.simulationMode, universeKey: engineConfig.universe };
    },
  }), [pm, bps, engineConfig, activeProfile, backtestConfig]);

  /** Execute a read-only tool call. Returns AIToolResult. */
  const executeTool = useCallback(async (call: AIToolCall): Promise<AIToolResult> => {
    const handler = toolRegistry[call.name];
    if (!handler) {
      return { toolCallId: call.id, name: call.name, result: null, error: `Unknown tool: ${call.name}` };
    }
    try {
      const result = await handler(call.args || {});
      return { toolCallId: call.id, name: call.name, result };
    } catch (e: any) {
      return { toolCallId: call.id, name: call.name, result: null, error: e?.message || String(e) };
    }
  }, [toolRegistry]);

  /** Convert an action to a PendingAction with display text + impact preview. */
  const buildPendingAction = useCallback(
    (action: AIAction): PendingAction => buildPendingActionFromContext(
      action,
      {
        pm: { cash: pm.cash, portfolio: pm.portfolio, watchlist: pm.watchlist },
        getDynamicStock,
        engineConfig: {
          profiles: engineConfig.profiles,
          lastBacktestProfile: engineConfig.lastBacktestProfile,
        },
        goldPrice: MKT.gold?.value ?? 0,
      },
    ),
    [pm, getDynamicStock, engineConfig.profiles, engineConfig.lastBacktestProfile],
  );

  return { executeTool, buildPendingAction, actionRegistry: ACTION_REGISTRY, toolRegistry };
}
