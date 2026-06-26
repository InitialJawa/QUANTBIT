// ─────────────────────────────────────────────────────────────
// Unit tests for src/ai/systemKnowledge.ts — formatLiveContext()
// formatter. This function renders a live context snapshot to text
// that the AI provider sees in its system prompt.
//
// Pattern: `node:test` + `node:assert/strict` (matches existing engine
// tests in src/engine/__tests__/).
// ─────────────────────────────────────────────────────────────
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatLiveContext, type AILiveContext } from "../systemKnowledge.ts";

describe("formatLiveContext", () => {
  it("returns fallback message when ctx is undefined", () => {
    const out = formatLiveContext(undefined);
    assert.equal(out, "Tidak ada konteks live.");
  });

  it("returns fallback message for empty ctx", () => {
    const out = formatLiveContext({});
    assert.equal(out, "Tidak ada konteks live.");
  });

  it("includes uiContext label when provided", () => {
    const out = formatLiveContext({ uiContext: "Market Regime panel" });
    assert.ok(out.includes("Panel: Market Regime panel"));
  });

  it("renders config block with profile name and weights", () => {
    const ctx: AILiveContext = {
      config: {
        activeConfig: "prod",
        activeProfileId: "prod",
        activeProfileName: "Quality Momentum (QM)",
        universe: "idx80",
        topNCount: 5,
        crashSensitivity: 10,
        qualityWeight: 0.45,
        growthWeight: 0.10,
        valueWeight: 0.05,
        momentumWeight: 0.40,
      },
    };
    const out = formatLiveContext(ctx);
    assert.ok(out.includes("Config: prod (Quality Momentum (QM))"));
    assert.ok(out.includes("W:[Q45/G10/V5/M40/D0]"));
    assert.ok(out.includes("universe=idx80"));
  });

  it("includes lastBacktestProfile block when present", () => {
    const out = formatLiveContext({
      config: {
        lastBacktestProfile: {
          id: "res",
          name: "Balanced Growth (BG)",
          qualityWeight: 0.4,
          growthWeight: 0.25,
          valueWeight: 0.05,
          momentumWeight: 0.30,
        },
      } as any,
    });
    assert.ok(out.includes("Last BT: Balanced Growth (BG)"));
    assert.ok(out.includes("Q40/G25/V5/M30"));
  });

  it("renders strategyEvaluation with shouldExit + reason + target", () => {
    const out = formatLiveContext({
      strategyEvaluation: {
        shouldExit: true,
        reason: "IHSG dropped 12.0% from 60d peak (threshold: 10%)",
        targetSafeHaven: "emas",
      },
    });
    assert.ok(out.includes("EXIT → emas"));
    assert.ok(out.includes("IHSG dropped 12.0%"));
  });

  it("renders regime block with all scores", () => {
    const out = formatLiveContext({
      regime: {
        status: "RISK_OFF",
        market_health: 42,
        opportunity: 35,
        risk: 70,
        confidence: 50,
        capital_deployment: 15,
        action: "WAIT",
      },
    });
    assert.ok(out.includes("Regime: RISK_OFF"));
    assert.ok(out.includes("health=42"));
    assert.ok(out.includes("risk=70"));
    assert.ok(out.includes("action=WAIT"));
  });

  it("renders market block with IHSG, USDIDR, gold", () => {
    const out = formatLiveContext({
      market: { ihsg: 6800, ihsgMonthly: -5.2, usdidr: 16100, gold: 1300000 },
    });
    assert.ok(out.includes("IHSG=6800"));
    assert.ok(out.includes("(-5.2%)"));
    assert.ok(out.includes("USD=16100"));
    assert.ok(out.includes("Gold=1300000"));
  });

  it("renders selectedStock block with all fields", () => {
    const out = formatLiveContext({
      selectedStock: {
        ticker: "BBCA.JK",
        name: "Bank Central Asia",
        sector: "Banking",
        currentPrice: 9500,
        change: 1.2,
        peRatio: 25.5,
        pbRatio: 4.5,
        roe: 22,
        der: 0.5,
        dividendYield: 2.5,
      },
    });
    assert.ok(out.includes("BBCA.JK"));
    assert.ok(out.includes("@9500"));
    assert.ok(out.includes("PE=25.5"));
    assert.ok(out.includes("ROE=22%"));
  });

  it("renders portfolio + cash", () => {
    const out = formatLiveContext({
      portfolio: [
        { ticker: "BBCA.JK", shares: 100, buyPrice: 9000 },
        { ticker: "TLKM.JK", shares: 500, buyPrice: 3500 },
      ],
      cash: 50000000,
    });
    assert.ok(out.includes("BBCA.JK 100@9000"));
    assert.ok(out.includes("TLKM.JK 500@3500"));
    assert.ok(out.includes("Cash: 50000000"));
  });

  it("renders cash alone when portfolio empty", () => {
    const out = formatLiveContext({ cash: 25000000 });
    assert.ok(out.includes("Cash: 25000000"));
  });

  it("renders BPS block when present", () => {
    const out = formatLiveContext({
      bps: {
        score: 78,
        action: "aggressive",
        deployPct: 75,
        cashPct: 25,
        valid: true,
        reason: "Drawdown tinggi + valuasi murah",
        factors: { valuation: 80, momentum: 60, breadth: 70, drawdown: 100, fear: 65 },
      },
    });
    assert.ok(out.includes("BPS: 78/100 aggressive"));
    assert.ok(out.includes("deploy=75%"));
  });

  it("marks BPS as CASH DEFENSE when invalid", () => {
    const out = formatLiveContext({
      bps: { score: 0, action: "none", deployPct: 0, cashPct: 100, valid: false, reason: "x", factors: { valuation: 0, momentum: 0, breadth: 0, drawdown: 0, fear: 0 } },
    });
    assert.ok(out.includes("CASH_DEFENSE"));
  });

  it("renders backtest draft snapshot", () => {
    const out = formatLiveContext({
      backtestConfigSnapshot: {
        activeProfileId: "custom_1",
        simulationMode: "adaptive_dca",
        universe: "idx30",
        topNCount: 7,
        enableCrashProtection: true,
        crashSensitivity: 12,
        dcaActive: true,
      },
      isBacktestOutOfSync: true,
    });
    assert.ok(out.includes("Backtest: custom_1 adaptive_dca"));
    assert.ok(out.includes("topN=7"));
    assert.ok(out.includes("[OUT OF SYNC]"));
  });

  it("renders backtest synced state", () => {
    const out = formatLiveContext({
      backtestConfigSnapshot: {
        activeProfileId: "prod",
        simulationMode: "algo",
        universe: "idx80",
        topNCount: 5,
        enableCrashProtection: true,
        crashSensitivity: 10,
        dcaActive: true,
      },
      isBacktestOutOfSync: false,
    });
    assert.ok(out.includes("[synced]"));
    assert.ok(!out.includes("OUT OF SYNC"));
  });

  it("renders alerts list with rule tags", () => {
    const out = formatLiveContext({
      alerts: [
        { rule: "bpsAggressive", title: "Peluang beli agresif", message: "BPS 78", timestamp: Date.now() },
        { rule: "ihsgDrop", title: "IHSG turun", message: "-12%", timestamp: Date.now() },
      ],
    });
    assert.ok(out.includes("Alerts: Peluang beli agresif | IHSG turun"));
  });

  it("does not render alerts section when alerts array is empty", () => {
    const out = formatLiveContext({ alerts: [] });
    assert.ok(!out.includes("Alerts:"));
  });

  it("renders activeUniverse when present", () => {
    const out = formatLiveContext({ activeUniverse: ["BBCA", "BBRI", "BMRI"] });
    assert.ok(out.includes("Universe: BBCA, BBRI, BMRI"));
  });

  it("combines multiple sections with newlines", () => {
    const out = formatLiveContext({
      uiContext: "Portfolio",
      cash: 1000000,
      market: { ihsg: 7000 },
    });
    const lines = out.split("\n");
    assert.ok(lines.length >= 3);
    assert.ok(out.includes("Panel: Portfolio"));
    assert.ok(out.includes("Market:"));
    assert.ok(out.includes("Cash:"));
  });
});
