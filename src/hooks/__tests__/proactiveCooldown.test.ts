// ─────────────────────────────────────────────────────────────
// Unit tests for src/hooks/useProactiveAgent.ts — shouldFireRule()
// + markRuleFired() cooldown gate.
//
// Pattern: `node:test` + `node:assert/strict`.
// ─────────────────────────────────────────────────────────────
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { shouldFireRule, markRuleFired, COOLDOWN_MS } from "../useProactiveAgent.ts";

describe("COOLDOWN_MS", () => {
  it("is 5 minutes in ms", () => {
    assert.equal(COOLDOWN_MS, 5 * 60 * 1000);
  });
});

describe("shouldFireRule", () => {
  const now = 1_700_000_000_000;

  it("returns true when rule has never fired (undefined)", () => {
    assert.equal(shouldFireRule(undefined, now), true);
  });

  it("returns true when rule has never fired (null)", () => {
    assert.equal(shouldFireRule(null, now), true);
  });

  it("returns true when rule has never fired (0)", () => {
    assert.equal(shouldFireRule(0, now), true);
  });

  it("returns false immediately after firing", () => {
    assert.equal(shouldFireRule(now, now), false);
  });

  it("returns false within cooldown window", () => {
    const last = now - (COOLDOWN_MS - 1);
    assert.equal(shouldFireRule(last, now), false);
  });

  it("returns true exactly at cooldown boundary", () => {
    const last = now - COOLDOWN_MS;
    assert.equal(shouldFireRule(last, now), true);
  });

  it("returns true after cooldown has elapsed", () => {
    const last = now - COOLDOWN_MS - 1;
    assert.equal(shouldFireRule(last, now), true);
  });

  it("returns true long after cooldown has elapsed", () => {
    const last = now - (60 * 60 * 1000); // 1 hour ago
    assert.equal(shouldFireRule(last, now), true);
  });

  it("respects custom cooldown override", () => {
    const last = now - 5_000;
    // With default 5min cooldown, should be false
    assert.equal(shouldFireRule(last, now, 10_000), false);
    // With 1s cooldown, should be true
    assert.equal(shouldFireRule(last, now, 1_000), true);
  });

  it("handles future lastFiredAt (clock skew tolerance)", () => {
    // If lastFiredAt is in the future, `now - last < 0`, so should be false
    const last = now + 10_000;
    assert.equal(shouldFireRule(last, now), false);
  });
});

describe("markRuleFired", () => {
  const now = 1_700_000_000_000;

  it("adds new rule to empty map", () => {
    const result = markRuleFired({}, "bpsAggressive", now);
    assert.deepEqual(result, { bpsAggressive: now });
  });

  it("adds new rule without affecting existing entries", () => {
    const initial = { bpsAggressive: now - 1000 };
    const result = markRuleFired(initial, "ihsgDrop", now);
    assert.deepEqual(result, {
      bpsAggressive: now - 1000,
      ihsgDrop: now,
    });
  });

  it("overwrites existing rule timestamp", () => {
    const initial = { bpsAggressive: now - 1000 };
    const result = markRuleFired(initial, "bpsAggressive", now);
    assert.equal(result.bpsAggressive, now);
  });

  it("does not mutate input map", () => {
    const initial = { bpsAggressive: now - 1000 };
    const snapshot = { ...initial };
    markRuleFired(initial, "bpsAggressive", now);
    assert.deepEqual(initial, snapshot);
  });
});

describe("shouldFireRule + markRuleFired workflow", () => {
  const t0 = 1_700_000_000_000;

  it("first call: fires", () => {
    let map: Record<string, number> = {};
    const rule = "bpsAggressive";
    assert.equal(shouldFireRule(map[rule], t0), true);
    map = markRuleFired(map, rule, t0);
    assert.equal(map[rule], t0);
  });

  it("second call within cooldown: blocked", () => {
    let map: Record<string, number> = { bpsAggressive: t0 };
    const t1 = t0 + 60_000; // 1 min later
    assert.equal(shouldFireRule(map.bpsAggressive, t1), false);
    // Map stays unchanged
    assert.equal(map.bpsAggressive, t0);
  });

  it("third call after cooldown: fires again", () => {
    const t0 = 1_700_000_000_000;
    const map: Record<string, number> = { bpsAggressive: t0 };
    const t1 = t0 + COOLDOWN_MS + 1;
    assert.equal(shouldFireRule(map.bpsAggressive, t1), true);
    const map2 = markRuleFired(map, "bpsAggressive", t1);
    assert.equal(map2.bpsAggressive, t1);
  });

  it("rules fire independently", () => {
    const t0 = 1_700_000_000_000;
    let map: Record<string, number> = {};
    // Fire rule A
    map = markRuleFired(map, "bpsAggressive", t0);
    // Rule B should still be allowed to fire immediately
    assert.equal(shouldFireRule(map.bpsLow, t0), true);
    // Rule A should be blocked
    assert.equal(shouldFireRule(map.bpsAggressive, t0), false);
  });
});
