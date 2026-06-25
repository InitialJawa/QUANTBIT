import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcStdDev, computeMetrics, type MetricsInput } from "../metrics.ts";

describe("calcStdDev", () => {
  it("returns 0 for fewer than 2 values", () => {
    assert.equal(calcStdDev([]), 0);
    assert.equal(calcStdDev([5]), 0);
  });

  it("computes sample standard deviation correctly", () => {
    const result = calcStdDev([2, 4, 4, 4, 5, 5, 7, 9]);
    assert.ok(Math.abs(result - 2.138) < 0.01);
  });

  it("returns 0 for identical values", () => {
    assert.equal(calcStdDev([3, 3, 3]), 0);
  });
});

describe("computeMetrics", () => {
  const base: MetricsInput = {
    cap: 100_000_000,
    currentPortfolioVal: 150_000_000,
    day0Date: "2021-01-04",
    lastDayDate: "2024-01-02",
    dailyReturns: [0.5, -0.3, 0.2, 0.1, -0.1],
    maxDrawdownValue: 15,
    totalTransactionVolume: 50_000_000,
    initialIhsgPrice: 6000,
    lastIhsgPrice: 7200,
    initialGoldPrice: 900_000,
    lastGoldPrice: 1_100_000,
  };

  it("calculates total return correctly", () => {
    const m = computeMetrics(base);
    assert.equal(m.totalReturnPct, 50);
  });

  it("calculates IHSG return correctly", () => {
    const m = computeMetrics(base);
    assert.equal(m.ihsgReturnPct, 20);
  });

  it("calculates gold return correctly", () => {
    const m = computeMetrics(base);
    const expected = ((1_100_000 - 900_000) / 900_000) * 100;
    assert.equal(m.goldReturnPct, expected);
  });

  it("calculates CAGR > 0 for profitable portfolio", () => {
    const m = computeMetrics(base);
    assert.ok(m.cagr > 0);
  });

  it("calculates 60/40 benchmark correctly", () => {
    const m = computeMetrics(base);
    assert.equal(m.bench6040ReturnPct, 0.6 * 20 + 0.4 * ((200_000 / 900_000) * 100));
    assert.ok(m.bench6040FinalVal > 100_000_000);
  });

  it("handles negative returns portfolio", () => {
    const neg: MetricsInput = {
      ...base,
      currentPortfolioVal: 80_000_000,
    };
    const m = computeMetrics(neg);
    assert.equal(m.totalReturnPct, -20);
    assert.ok(m.cagr < 0);
  });

  it("computes volatility, sharpe, sortino, calmar", () => {
    const m = computeMetrics(base);
    assert.ok(typeof m.volatility === "number");
    assert.ok(typeof m.sharpe === "number");
    assert.ok(typeof m.sortino === "number");
    assert.ok(typeof m.calmar === "number");
  });

  it("computes win rate from daily returns", () => {
    const m = computeMetrics(base);
    const positiveDays = base.dailyReturns.filter(r => r > 0).length;
    const expectedRate = (positiveDays / base.dailyReturns.length) * 100;
    assert.equal(m.winRatePct, expectedRate);
  });

  it("computes turnover from transaction volume", () => {
    const m = computeMetrics(base);
    const avgVal = (base.cap + base.currentPortfolioVal) / 2;
    const expected = (base.totalTransactionVolume / avgVal) * 100;
    assert.equal(m.turnoverPct, expected);
  });
});
