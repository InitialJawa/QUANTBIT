import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeDayRankings,
  pickTopTickersByRank,
  getCleanTickerList,
} from "../ranker.ts";
import type { ProfileWeights, BacktestDayData } from "../types.ts";

describe("computeDayRankings", () => {
  const weights: ProfileWeights = { quality: 0.4, growth: 0.1, value: 0.05, momentum: 0.4, dividend: 0.05 };

  it("ranks by weighted score descending", () => {
    const scores = {
      BBCA: { quality: 90, growth: 50, value: 30, momentum: 80, dividend: 50 },
      BBRI: { quality: 70, growth: 80, value: 50, momentum: 60, dividend: 50 },
      TLKM: { quality: 50, growth: 50, value: 50, momentum: 50, dividend: 50 },
    };
    const ranks = computeDayRankings(scores, weights);
    assert.equal(ranks["BBCA"], 1);
    assert.equal(ranks["BBRI"], 2);
    assert.equal(ranks["TLKM"], 3);
  });

  it("assigns ascending rank numbers", () => {
    const scores = {
      A: { quality: 100, growth: 100, value: 100, momentum: 100, dividend: 100 },
      B: { quality: 0, growth: 0, value: 0, momentum: 0, dividend: 0 },
    };
    const ranks = computeDayRankings(scores, weights);
    assert.equal(ranks["A"], 1);
    assert.equal(ranks["B"], 2);
  });

  it("uses default 50 for missing factor scores", () => {
    const scores = {
      BBCA: { quality: 100, growth: 0, value: 0, momentum: 0 } as any,
    };
    const ranks = computeDayRankings(scores, weights);
    assert.equal(typeof ranks["BBCA"], "number");
  });

  it("handles empty input", () => {
    const ranks = computeDayRankings({}, weights);
    assert.deepEqual(ranks, {});
  });
});

describe("pickTopTickersByRank", () => {
  const ranks: Record<string, number> = { BBCA: 1, BBRI: 2, TLKM: 3, ASII: 4, ADRO: 5 };

  it("picks top N from allowed tickers with valid prices", () => {
    const prices = { BBCA: 10000, BBRI: 5000, TLKM: 3000, ASII: 6000, ADRO: 2000 };
    const result = pickTopTickersByRank(ranks, prices, ["BBCA", "BBRI", "TLKM"], 2);
    assert.deepEqual(result, ["BBCA", "BBRI"]);
  });

  it("filters out tickers not in allowed list", () => {
    const prices = { BBCA: 10000, TLKM: 3000 };
    const result = pickTopTickersByRank(ranks, prices, ["TLKM"], 5);
    assert.deepEqual(result, ["TLKM"]);
  });

  it("filters out tickers with zero/undefined prices", () => {
    const prices = { BBCA: 10000, BBRI: 0, TLKM: undefined as any };
    const result = pickTopTickersByRank(ranks, prices, ["BBCA", "BBRI", "TLKM"], 3);
    assert.deepEqual(result, ["BBCA"]);
  });

  it("returns empty when no valid tickers", () => {
    const result = pickTopTickersByRank({}, {}, ["BBCA"], 5);
    assert.deepEqual(result, []);
  });

  it("respects count parameter when more valid tickers exist", () => {
    const prices = { BBCA: 10000, BBRI: 5000, TLKM: 3000 };
    const result = pickTopTickersByRank(ranks, prices, ["BBCA", "BBRI", "TLKM"], 1);
    assert.deepEqual(result, ["BBCA"]);
  });
});

describe("getCleanTickerList", () => {
  it("removes .JK suffix from tickers", () => {
    assert.deepEqual(
      getCleanTickerList(["BBCA.JK", "BBRI.JK", "TLKM.JK"]),
      ["BBCA", "BBRI", "TLKM"]
    );
  });

  it("returns empty array for empty input", () => {
    assert.deepEqual(getCleanTickerList([]), []);
  });

  it("leaves tickers without .JK unchanged", () => {
    assert.deepEqual(
      getCleanTickerList(["BBCA", "BBRI"]),
      ["BBCA", "BBRI"]
    );
  });
});
