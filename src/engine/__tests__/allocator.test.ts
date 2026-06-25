import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeInitialAllocation,
  liquidateHoldings,
  computeGoldPurchase,
  computeGoldSale,
  computeRebalanceSwap,
  computeBuyAmount,
  computeSellProceeds,
} from "../allocator.ts";
import { DEFAULT_FEES } from "../types.ts";

describe("computeInitialAllocation", () => {
  it("distributes capital equally across tickers", () => {
    const prices = { BBCA: 10000, BBRI: 5000 };
    const result = computeInitialAllocation(30_000_000, ["BBCA", "BBRI"], prices, undefined);
    assert.ok(Object.keys(result.positions).length === 2);
    assert.ok(result.positions["BBCA"] > 0);
    assert.ok(result.positions["BBRI"] > 0);
    assert.ok(result.cash >= 0);
    assert.ok(result.totalVolume > 0);
  });

  it("handles single ticker allocation", () => {
    const prices = { BBCA: 10000 };
    const result = computeInitialAllocation(10_000_000, ["BBCA"], prices, undefined);
    assert.ok(result.positions["BBCA"] > 0);
    assert.ok(result.cash < 10_000_000);
  });

  it("returns pending for missing price tickers", () => {
    const prices = { BBCA: 10000 };
    const result = computeInitialAllocation(20_000_000, ["BBCA", "TLKM"], prices, undefined);
    assert.equal(result.pendingTickers.length, 1);
    assert.equal(result.pendingTickers[0].ticker, "TLKM");
  });

  it("returns empty state when no tickers", () => {
    const result = computeInitialAllocation(10_000_000, [], {}, undefined);
    assert.deepEqual(result.positions, {});
    assert.equal(result.cash, 10_000_000);
    assert.equal(result.totalVolume, 0);
  });

  it("respects daily volume limit (5% of volume)", () => {
    const prices = { BBCA: 10000 };
    const volumes = { BBCA: 20000 };
    const result = computeInitialAllocation(100_000_000, ["BBCA"], prices, volumes);
    const maxFromVol = Math.floor((20000 * 0.05) / 100) * 100;
    assert.ok(result.positions["BBCA"] <= maxFromVol);
  });

  it("uses default fees when not provided", () => {
    const prices = { BBCA: 10000 };
    const result = computeInitialAllocation(10_000_000, ["BBCA"], prices, undefined);
    const entryPrice = 10000 * (1 + DEFAULT_FEES.slippage);
    const costPerShare = entryPrice * (1 + DEFAULT_FEES.buyFee);
    const expectedShares = Math.floor((10_000_000 / (costPerShare * 100))) * 100;
    assert.equal(result.positions["BBCA"], expectedShares);
  });
});

describe("liquidateHoldings", () => {
  it("liquidates all positions and returns proceeds", () => {
    const positions = { BBCA: 100, BBRI: 200 };
    const prices = { BBCA: 10000, BBRI: 5000 };
    const result = liquidateHoldings(positions, prices);
    assert.ok(result.proceeds > 0);
    assert.ok(result.totalVolume > 0);
  });

  it("handles empty positions", () => {
    const result = liquidateHoldings({}, {});
    assert.equal(result.proceeds, 0);
    assert.equal(result.totalVolume, 0);
  });

  it("uses default price 100 for missing ticker prices", () => {
    const positions = { BBCA: 100 };
    const result = liquidateHoldings(positions, {});
    assert.ok(result.proceeds > 0);
  });
});

describe("computeGoldPurchase", () => {
  it("converts all cash to gold grams with 1% premium", () => {
    const result = computeGoldPurchase(10_000_000, 1_000_000);
    const buyPrice = 1_000_000 * 1.01;
    assert.equal(result.goldGrams, 10_000_000 / buyPrice);
    assert.equal(result.cash, 0);
  });

  it("handles zero cash", () => {
    const result = computeGoldPurchase(0, 1_000_000);
    assert.equal(result.goldGrams, 0);
    assert.equal(result.cash, 0);
  });
});

describe("computeGoldSale", () => {
  it("converts gold to cash with 1% discount", () => {
    const result = computeGoldSale(10, 1_000_000);
    assert.equal(result.cash, 10 * 1_000_000 * 0.99);
  });

  it("handles zero grams", () => {
    const result = computeGoldSale(0, 1_000_000);
    assert.equal(result.cash, 0);
  });
});

describe("computeRebalanceSwap", () => {
  it("buys shares of swap target with proceeds", () => {
    const result = computeRebalanceSwap("BBRI", 5_000_000, { BBCA: 10000 }, undefined, "BBCA");
    assert.ok(result.shares > 0);
    assert.ok(result.cashRemainder >= 0);
    assert.ok(result.totalVolume > 0);
  });

  it("returns zero shares when proceeds are too small", () => {
    const result = computeRebalanceSwap("BBRI", 100, { BBCA: 100000 }, undefined, "BBCA");
    assert.equal(result.shares, 0);
    assert.equal(result.cashRemainder, 100);
  });
});

describe("computeBuyAmount", () => {
  it("calculates max affordable shares within cash limit", () => {
    const result = computeBuyAmount(10_000_000, "BBCA", 10000, undefined);
    assert.ok(result.shares > 0);
    assert.ok(result.cost <= 10_000_000);
  });

  it("returns zero when cash is insufficient for 1 lot", () => {
    const result = computeBuyAmount(100, "BBCA", 100000, undefined);
    assert.equal(result.shares, 0);
    assert.equal(result.cost, 0);
  });

  it("respects daily volume limit", () => {
    const volumes = { BBCA: 500 };
    const result = computeBuyAmount(100_000_000, "BBCA", 10000, volumes);
    const maxFromVol = Math.floor((500 * 0.05) / 100) * 100;
    assert.ok(result.shares <= maxFromVol);
  });
});

describe("computeSellProceeds", () => {
  it("calculates sell proceeds with fees and tax", () => {
    const result = computeSellProceeds(100, 10000);
    const exitPrice = 10000 * (1 - DEFAULT_FEES.slippage);
    const expectedProceeds = 100 * exitPrice * (1 - DEFAULT_FEES.sellFee - DEFAULT_FEES.tax);
    assert.equal(result.proceeds, expectedProceeds);
    assert.equal(result.volume, 100 * exitPrice);
  });

  it("handles zero shares", () => {
    const result = computeSellProceeds(0, 10000);
    assert.equal(result.proceeds, 0);
    assert.equal(result.volume, 0);
  });
});
