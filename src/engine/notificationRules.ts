import { BacktestConfig } from "./types";

export interface RuleContext {
  config: BacktestConfig;
  ticker?: string;
  currentRank?: number;
  topN: number;
  currentPrice?: number;
  peak60?: number;
  ihsgPrice?: number;
}

export interface RuleResult {
  triggered: boolean;
  title?: string;
  message?: string;
  type?: "info" | "success" | "warning" | "error";
}

export function rule_tickerOutOfTopN(ctx: RuleContext): RuleResult {
  if (ctx.ticker === undefined || ctx.currentRank === undefined) {
    return { triggered: false };
  }
  if (ctx.currentRank > ctx.topN) {
    return {
      triggered: true,
      title: "Ticker Out of Top N",
      message: `${ctx.ticker} fell to rank ${ctx.currentRank} (Top ${ctx.topN})`,
      type: "warning",
    };
  }
  return { triggered: false };
}

export function rule_crashProtectionTriggered(ctx: RuleContext): RuleResult {
  if (!ctx.config.enableCrashProtection) {
    return { triggered: false };
  }
  if (ctx.ihsgPrice === undefined || ctx.peak60 === undefined) {
    return { triggered: false };
  }
  const drop = ((ctx.ihsgPrice - ctx.peak60) / ctx.peak60) * 100;
  if (drop <= -ctx.config.crashSensitivity) {
    return {
      triggered: true,
      title: "Crash Protection Triggered",
      message: `IHSG dropped ${Math.abs(drop).toFixed(1)}% from 60d peak (threshold: ${ctx.config.crashSensitivity}%)`,
      type: "error",
    };
  }
  return { triggered: false };
}

export function rule_customUniverseBreach(ctx: RuleContext): RuleResult {
  if (ctx.config.simulationMode !== "custom") {
    return { triggered: false };
  }
  if (ctx.ticker === undefined) {
    return { triggered: false };
  }
  if (!ctx.config.customUniverse.includes(ctx.ticker)) {
    return {
      triggered: true,
      title: "Ticker Not in Custom Universe",
      message: `${ctx.ticker} is not in your custom universe (${ctx.config.customUniverse.length} tickers)`,
      type: "warning",
    };
  }
  return { triggered: false };
}

export function rule_singleModeTrigger(ctx: RuleContext): RuleResult {
  if (ctx.config.simulationMode !== "custom") {
    return { triggered: false };
  }
  return { triggered: false };
}
