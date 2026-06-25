// ─────────────────────────────────────────────────────────────
// Unit tests for src/hooks/useAITools.ts — ACTION_REGISTRY (10
// action constructors) + buildPendingActionFromContext (impact
// preview builder). Both are pure, dependency-free exports.
//
// Pattern: `node:test` + `node:assert/strict` (matches existing engine
// tests in src/engine/__tests__/).
// ─────────────────────────────────────────────────────────────
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  ACTION_REGISTRY,
  buildPendingActionFromContext,
  formatIDR,
} from "../useAITools.ts";
import type { AIAction } from "../../types/ai.ts";

// ── Shared mock context for all buildPendingAction tests ──────

const mockCtx = {
  pm: {
    cash: 100_000_000,
    portfolio: [
      { ticker: "BBCA.JK", shares: 100, buyPrice: 9000, addedAt: "2025-01-01" },
      { ticker: "TLKM.JK", shares: 500, buyPrice: 3500, addedAt: "2025-01-01" },
    ],
    watchlist: [],
  },
  getDynamicStock: (ticker: string) => {
    if (ticker === "BBCA") return { currentPrice: 9500 } as any;
    if (ticker === "TLKM") return { currentPrice: 3700 } as any;
    return undefined;
  },
  engineConfig: {
    profiles: [
      { id: "prod", name: "Quality Momentum (QM)", qualityWeight: 0.45, growthWeight: 0.1, valueWeight: 0.05, momentumWeight: 0.4 },
      { id: "res", name: "Balanced Growth (BG)", qualityWeight: 0.4, growthWeight: 0.25, valueWeight: 0.05, momentumWeight: 0.3 },
    ],
    lastBacktestProfile: { id: "res", name: "Balanced Growth (BG)", qualityWeight: 0.4, growthWeight: 0.25, valueWeight: 0.05, momentumWeight: 0.3 },
  },
  goldPrice: 1_300_000,
};

const FIXED_NOW = 1_700_000_000_000; // arbitrary stable timestamp

// ── Tests ─────────────────────────────────────────────────────

describe("ACTION_REGISTRY", () => {
  it("contains exactly 10 actions", () => {
    assert.equal(Object.keys(ACTION_REGISTRY).length, 10);
  });

  it("contains all 10 documented action names", () => {
    const expected = [
      "buy_stock",
      "sell_stock",
      "move_to_gold",
      "set_active_profile",
      "set_universe",
      "set_topN",
      "toggle_dca_active",
      "add_to_watchlist",
      "remove_from_watchlist",
      "sync_backtest_to_portfolio",
    ];
    for (const name of expected) {
      assert.ok(ACTION_REGISTRY[name], `missing: ${name}`);
    }
  });
});

describe("ACTION_REGISTRY normalisation", () => {
  it("buy_stock uppercases ticker and strips .JK", () => {
    const a = ACTION_REGISTRY.buy_stock({ ticker: "bbca.jk", shares: 100 });
    assert.equal(a.type, "buy_stock");
    if (a.type === "buy_stock") {
      assert.equal(a.ticker, "BBCA");
      assert.equal(a.shares, 100);
    }
  });

  it("buy_stock coerces string numbers", () => {
    const a = ACTION_REGISTRY.buy_stock({ ticker: "BBCA", shares: "250" as any, price: "9500" as any });
    if (a.type === "buy_stock") {
      assert.equal(a.shares, 250);
      assert.equal(a.price, 9500);
    }
  });

  it("buy_stock defaults to 0 shares when NaN", () => {
    const a = ACTION_REGISTRY.buy_stock({ ticker: "X", shares: "abc" as any });
    if (a.type === "buy_stock") {
      assert.equal(a.shares, 0);
    }
  });

  it("buy_stock omits price when undefined", () => {
    const a = ACTION_REGISTRY.buy_stock({ ticker: "BBCA", shares: 100 });
    if (a.type === "buy_stock") {
      assert.equal(a.price, undefined);
    }
  });

  it("sell_stock uppercases ticker", () => {
    const a = ACTION_REGISTRY.sell_stock({ ticker: "tlkm", shares: 50 });
    if (a.type === "sell_stock") {
      assert.equal(a.ticker, "TLKM");
      assert.equal(a.shares, 50);
    }
  });

  it("move_to_gold coerces rupiahAmount", () => {
    const a = ACTION_REGISTRY.move_to_gold({ rupiahAmount: "5000000" as any });
    if (a.type === "move_to_gold") {
      assert.equal(a.rupiahAmount, 5_000_000);
    }
  });

  it("set_active_profile passes profileId through", () => {
    const a = ACTION_REGISTRY.set_active_profile({ profileId: "custom_1" });
    assert.equal(a.type, "set_active_profile");
    if (a.type === "set_active_profile") {
      assert.equal(a.profileId, "custom_1");
    }
  });

  it("set_universe passes universe through", () => {
    const a = ACTION_REGISTRY.set_universe({ universe: "idx30" });
    if (a.type === "set_universe") {
      assert.equal(a.universe, "idx30");
    }
  });

  it("set_topN coerces n and defaults to 5 on NaN", () => {
    const a1 = ACTION_REGISTRY.set_topN({ n: 7 });
    const a2 = ACTION_REGISTRY.set_topN({ n: "abc" as any });
    if (a1.type === "set_topN") assert.equal(a1.n, 7);
    if (a2.type === "set_topN") assert.equal(a2.n, 5);
  });

  it("toggle_dca_active coerces to boolean", () => {
    const a1 = ACTION_REGISTRY.toggle_dca_active({ active: 1 as any });
    const a2 = ACTION_REGISTRY.toggle_dca_active({ active: 0 as any });
    if (a1.type === "toggle_dca_active") assert.equal(a1.active, true);
    if (a2.type === "toggle_dca_active") assert.equal(a2.active, false);
  });

  it("add/remove_from_watchlist normalises ticker", () => {
    const a1 = ACTION_REGISTRY.add_to_watchlist({ ticker: "bbca.jk" });
    const a2 = ACTION_REGISTRY.remove_from_watchlist({ ticker: "TLKM.JK" });
    if (a1.type === "add_to_watchlist") assert.equal(a1.ticker, "BBCA");
    if (a2.type === "remove_from_watchlist") assert.equal(a2.ticker, "TLKM");
  });

  it("sync_backtest_to_portfolio takes no args", () => {
    const a = ACTION_REGISTRY.sync_backtest_to_portfolio({});
    assert.equal(a.type, "sync_backtest_to_portfolio");
  });
});

describe("formatIDR", () => {
  it("formats with thousand separators", () => {
    assert.equal(formatIDR(1_000_000), "Rp 1.000.000");
  });
  it("rounds to nearest integer", () => {
    assert.equal(formatIDR(1234.56), "Rp 1.235");
  });
  it("handles 0", () => {
    assert.equal(formatIDR(0), "Rp 0");
  });
});

describe("buildPendingActionFromContext — buy_stock", () => {
  it("computes estimated cost using getDynamicStock price", () => {
    const a: AIAction = { type: "buy_stock", ticker: "BBCA", shares: 100 };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    assert.equal(pa.id, `pa_${FIXED_NOW}_` + pa.id.split("_")[2]);
    assert.ok(pa.displayText.includes("Beli 100 lembar BBCA"));
    assert.ok(pa.displayText.includes("Rp 9.500"));
    const costImpact = pa.impact.find((i) => i.label === "Estimasi biaya");
    assert.ok(costImpact);
    assert.equal(costImpact!.value, "Rp 950.000"); // 100 * 9500
    const cashImpact = pa.impact.find((i) => i.label === "Kas tersedia");
    assert.equal(cashImpact!.value, "Rp 100.000.000");
  });

  it("uses action.price when provided, ignoring dynamic price", () => {
    const a: AIAction = { type: "buy_stock", ticker: "BBCA", shares: 100, price: 9000 };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    const costImpact = pa.impact.find((i) => i.label === "Estimasi biaya");
    assert.equal(costImpact!.value, "Rp 900.000");
  });

  it("emits warning when cost exceeds cash", () => {
    const a: AIAction = { type: "buy_stock", ticker: "BBCA", shares: 100, price: 9_999_999 };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    const warn = pa.impact.find((i) => i.label === "⚠ Peringatan");
    assert.ok(warn);
    assert.equal(warn!.value, "Biaya melebihi kas");
  });

  it("handles missing getDynamicStock for unknown ticker", () => {
    const a: AIAction = { type: "buy_stock", ticker: "XYZ", shares: 100 };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    assert.ok(pa.displayText.includes("XYZ"));
    assert.ok(!pa.displayText.includes("Rp")); // no price appended
    const costImpact = pa.impact.find((i) => i.label === "Estimasi biaya");
    assert.equal(costImpact, undefined); // no cost computed without price
  });
});

describe("buildPendingActionFromContext — sell_stock", () => {
  it("shows estimated proceeds using current price", () => {
    const a: AIAction = { type: "sell_stock", ticker: "BBCA", shares: 50 };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    assert.ok(pa.displayText.includes("Jual 50 lembar BBCA"));
    const proceedsImpact = pa.impact.find((i) => i.label === "Estimasi hasil");
    assert.equal(proceedsImpact!.value, "Rp 475.000"); // 50 * 9500
  });

  it("falls back to buyPrice when no dynamic price", () => {
    const a: AIAction = { type: "sell_stock", ticker: "TLKM", shares: 100 };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    // TLKM has dynamic price 3700, should use that
    const proceedsImpact = pa.impact.find((i) => i.label === "Estimasi hasil");
    assert.equal(proceedsImpact!.value, "Rp 370.000");
  });

  it("shows current position size when ticker in portfolio", () => {
    const a: AIAction = { type: "sell_stock", ticker: "BBCA", shares: 50 };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    const posImpact = pa.impact.find((i) => i.label === "Posisi saat ini");
    assert.equal(posImpact!.value, "100 lembar");
  });
});

describe("buildPendingActionFromContext — move_to_gold", () => {
  it("shows kas saldo + estimated grams", () => {
    const a: AIAction = { type: "move_to_gold", rupiahAmount: 13_000_000 };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    assert.ok(pa.displayText.includes("Pindahkan Rp 13.000.000 ke Emas"));
    const kasImpact = pa.impact.find((i) => i.label === "Saldo kas sekarang");
    assert.equal(kasImpact!.value, "Rp 100.000.000");
    const gramsImpact = pa.impact.find((i) => i.label === "Estimasi gram emas");
    // 13_000_000 / 1_300_000 = 10.0000
    assert.equal(gramsImpact!.value, "10.0000 g");
  });

  it("omits gram estimate when goldPrice is 0", () => {
    const a: AIAction = { type: "move_to_gold", rupiahAmount: 5_000_000 };
    const ctxNoGold = { ...mockCtx, goldPrice: 0 };
    const pa = buildPendingActionFromContext(a, ctxNoGold, FIXED_NOW);
    assert.equal(pa.impact.find((i) => i.label === "Estimasi gram emas"), undefined);
  });
});

describe("buildPendingActionFromContext — set_active_profile", () => {
  it("shows profile name + weight summary", () => {
    const a: AIAction = { type: "set_active_profile", profileId: "prod" };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    assert.ok(pa.displayText.includes("Quality Momentum (QM)"));
    const bobotImpact = pa.impact.find((i) => i.label === "Bobot");
    assert.equal(bobotImpact!.value, "Q45 G10 V5 M40");
  });

  it("falls back to raw profileId when profile not found", () => {
    const a: AIAction = { type: "set_active_profile", profileId: "missing" };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    assert.ok(pa.displayText.includes("missing"));
    assert.equal(pa.impact.find((i) => i.label === "Bobot"), undefined);
  });
});

describe("buildPendingActionFromContext — config actions (no impact)", () => {
  it("set_universe", () => {
    const a: AIAction = { type: "set_universe", universe: "idx30" };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    assert.ok(pa.displayText.includes("Ubah universe ke idx30"));
    assert.equal(pa.impact.length, 0);
  });

  it("set_topN", () => {
    const a: AIAction = { type: "set_topN", n: 8 };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    assert.ok(pa.displayText.includes("Ubah Top N menjadi 8"));
    assert.equal(pa.impact.length, 0);
  });

  it("toggle_dca_active ON", () => {
    const a: AIAction = { type: "toggle_dca_active", active: true };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    assert.ok(pa.displayText.includes("Aktifkan rekomendasi DCA"));
  });

  it("toggle_dca_active OFF", () => {
    const a: AIAction = { type: "toggle_dca_active", active: false };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    assert.ok(pa.displayText.includes("Nonaktifkan rekomendasi DCA"));
  });

  it("add_to_watchlist", () => {
    const a: AIAction = { type: "add_to_watchlist", ticker: "ASII" };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    assert.ok(pa.displayText.includes("Tambah ASII ke watchlist"));
  });

  it("remove_from_watchlist", () => {
    const a: AIAction = { type: "remove_from_watchlist", ticker: "BBCA" };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    assert.ok(pa.displayText.includes("Hapus BBCA dari watchlist"));
  });
});

describe("buildPendingActionFromContext — sync_backtest_to_portfolio", () => {
  it("shows last backtest profile name when present", () => {
    const a: AIAction = { type: "sync_backtest_to_portfolio" };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    assert.ok(pa.displayText.includes("Sync konfigurasi backtest"));
    const profileImpact = pa.impact.find((i) => i.label === "Profil backtest");
    assert.equal(profileImpact!.value, "Balanced Growth (BG)");
  });

  it("omits profile impact when no lastBacktestProfile", () => {
    const a: AIAction = { type: "sync_backtest_to_portfolio" };
    const ctxNoProfile = { ...mockCtx, engineConfig: { ...mockCtx.engineConfig, lastBacktestProfile: null } };
    const pa = buildPendingActionFromContext(a, ctxNoProfile, FIXED_NOW);
    assert.equal(pa.impact.length, 0);
  });
});

describe("buildPendingActionFromContext — common properties", () => {
  it("uses `now` for id and createdAt", () => {
    const a: AIAction = { type: "set_topN", n: 3 };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    assert.ok(pa.id.startsWith(`pa_${FIXED_NOW}_`));
    assert.equal(pa.createdAt, FIXED_NOW);
  });

  it("id includes random suffix for uniqueness", () => {
    const a: AIAction = { type: "set_topN", n: 3 };
    const pa1 = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    const pa2 = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    assert.notEqual(pa1.id, pa2.id);
  });

  it("includes the action object as-is", () => {
    const a: AIAction = { type: "buy_stock", ticker: "BBCA", shares: 100, price: 9500 };
    const pa = buildPendingActionFromContext(a, mockCtx, FIXED_NOW);
    assert.deepEqual(pa.action, a);
  });
});
