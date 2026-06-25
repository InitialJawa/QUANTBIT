import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  detectCrashAlgo,
  detectCrashSingle,
  detectRecoveryAlgo,
  detectRecoverySingle,
} from "../crashDetector.ts";

describe("detectCrashAlgo", () => {
  it("signals fast crash when IHSG drops below sensitivity threshold", () => {
    const prices = Array(60).fill(7000);
    const result = detectCrashAlgo(prices, 5950, 10);
    assert.equal(result.signaled, true);
    assert.ok(result.reason.includes("anjlok"));
  });

  it("does not signal crash when IHSG is stable", () => {
    const prices = Array(60).fill(7000);
    const result = detectCrashAlgo(prices, 6950, 10);
    assert.equal(result.signaled, false);
    assert.equal(result.reason, "");
  });

  it("does not signal crash with insufficient history", () => {
    const prices = [7000];
    const result = detectCrashAlgo(prices, 7000, 10);
    assert.equal(result.signaled, false);
  });

  it("signals slow grind when price below MA50 and MA20 < MA50", () => {
    const prices = [
      ...Array(50).fill(5000),
      ...Array(10).fill(4200),
    ];
    const result = detectCrashAlgo(prices, 4100, 20);
    assert.equal(result.signaled, true);
    assert.ok(result.reason.includes("bearish"));
  });
});

describe("detectCrashSingle", () => {
  it("signals when price drops below sell trigger from peak", () => {
    const window = [1000, 1020, 1010, 990, 980];
    const result = detectCrashSingle(window, 850, 10);
    assert.equal(result.signaled, true);
    assert.ok(result.reason.includes("turun"));
  });

  it("does not signal when price is stable", () => {
    const window = [1000, 1010, 1005, 995];
    const result = detectCrashSingle(window, 1000, 10);
    assert.equal(result.signaled, false);
  });

  it("handles empty price window gracefully", () => {
    const result = detectCrashSingle([], 1000, 10);
    assert.equal(result.signaled, false);
  });
});

describe("detectRecoveryAlgo", () => {
  it("signals recovery when IHSG is above SMA20", () => {
    const prices = [6000, 6100, 6200, 6300, 6400, 6500, 6600, 6700, 6800, 6900, 7000, 7100, 7200, 7300, 7400, 7500, 7600, 7700, 7800, 7900];
    const result = detectRecoveryAlgo(prices, 8000);
    assert.equal(result.signaled, true);
    assert.ok(result.reason.includes("pulih"));
  });

  it("does not signal recovery when IHSG is below SMA20", () => {
    const prices = [7000, 6950, 6900, 6850, 6800, 6750, 6700, 6650, 6600, 6550, 6500, 6450, 6400, 6350, 6300, 6250, 6200, 6150, 6100, 6050];
    const result = detectRecoveryAlgo(prices, 6000);
    assert.equal(result.signaled, false);
  });

  it("does not signal recovery with insufficient data", () => {
    const result = detectRecoveryAlgo([7000], 7000);
    assert.equal(result.signaled, false);
  });
});

describe("detectRecoverySingle", () => {
  it("signals when price rises above buy trigger from trough", () => {
    const result = detectRecoverySingle(500, 600, 15);
    assert.equal(result.signaled, true);
    assert.ok(result.reason.includes("pulih"));
  });

  it("does not signal when rise is below trigger", () => {
    const result = detectRecoverySingle(500, 530, 15);
    assert.equal(result.signaled, false);
  });

  it("tracks new lower trough", () => {
    const result = detectRecoverySingle(500, 450, 15);
    assert.equal(result.signaled, false);
  });
});
