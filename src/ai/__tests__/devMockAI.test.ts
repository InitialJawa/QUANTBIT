// ─────────────────────────────────────────────────────────────
// Unit tests for src/ai/devMockAI.ts — deterministic dev-mock
// AI provider used when no real provider is reachable.
// ─────────────────────────────────────────────────────────────
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateMockResponse } from "../devMockAI.ts";

describe("devMockAI — greeting & help", () => {
  it("responds to greeting with mock disclaimer", () => {
    const r = generateMockResponse("halo");
    assert.equal(r.provider, "dev-mock");
    assert.ok(r.content.includes("Quantbit AI"));
    assert.ok(r.content.includes("dev mock"));
    assert.ok(r.toolCalls.length === 0);
  });

  it("responds to help with feature overview", () => {
    const r = generateMockResponse("apa yang bisa kamu bantu?");
    assert.ok(r.content.includes("Dev Mock"));
    assert.ok(r.content.includes("Read-only tools"));
    assert.ok(r.content.includes("Action API"));
  });

  it("responds to unknown query with fallback + suggestions", () => {
    const r = generateMockResponse("xyz random");
    assert.equal(r.provider, "dev-mock");
    assert.ok(r.content.includes("Dev Mock"));
    assert.ok(r.suggestedFollowups && r.suggestedFollowups.length > 0);
  });
});

describe("devMockAI — read-only tool matching", () => {
  it("matches 'bps' / 'buy pressure' to get_bps_now", () => {
    const r = generateMockResponse("berapa BPS?");
    assert.equal(r.toolCalls.length, 1);
    assert.equal(r.toolCalls[0].name, "get_bps_now");
    assert.deepEqual(r.toolCalls[0].args, {});
  });

  it("matches 'portofolio' to get_portfolio_state", () => {
    const r = generateMockResponse("cek portofolio saya");
    assert.equal(r.toolCalls.length, 1);
    assert.equal(r.toolCalls[0].name, "get_portfolio_state");
  });

  it("matches 'regime' to get_regime_details", () => {
    const r = generateMockResponse("apa regime pasar sekarang?");
    assert.equal(r.toolCalls[0].name, "get_regime_details");
  });

  it("matches 'history' + number of days to get_market_history", () => {
    const r = generateMockResponse("tampilkan IHSG 14 hari terakhir");
    assert.equal(r.toolCalls[0].name, "get_market_history");
    assert.equal(r.toolCalls[0].args.days, 14);
  });

  it("defaults to 30 days for get_market_history when no number given", () => {
    const r = generateMockResponse("riwayat IHSG");
    assert.equal(r.toolCalls[0].name, "get_market_history");
    assert.equal(r.toolCalls[0].args.days, 30);
  });

  it("matches ticker pattern to get_ticker_metrics", () => {
    const r = generateMockResponse("BBCA skornya berapa?");
    assert.equal(r.toolCalls[0].name, "get_ticker_metrics");
    assert.equal(r.toolCalls[0].args.ticker, "BBCA");
  });

  it("strips .JK suffix from ticker", () => {
    const r = generateMockResponse("analisa TLKM.JK");
    assert.equal(r.toolCalls[0].args.ticker, "TLKM");
  });

  it("matches 'backtest config' to get_backtest_config", () => {
    const r = generateMockResponse("apa konfigurasi backtest?");
    assert.equal(r.toolCalls[0].name, "get_backtest_config");
  });

  it("matches 'engine config' to get_engine_config", () => {
    const r = generateMockResponse("engine config sekarang");
    assert.equal(r.toolCalls[0].name, "get_engine_config");
  });

  it("matches 'universe' to get_active_universe", () => {
    const r = generateMockResponse("apa universe aktif saya?");
    assert.equal(r.toolCalls[0].name, "get_active_universe");
  });
});

describe("devMockAI — action matching", () => {
  it("matches 'beli TICKER SHARES' to buy_stock", () => {
    const r = generateMockResponse("beli BBCA 100");
    assert.equal(r.toolCalls[0].name, "buy_stock");
    assert.equal(r.toolCalls[0].args.ticker, "BBCA");
    assert.equal(r.toolCalls[0].args.shares, 100);
  });

  it("matches 'beli TICKER.JK SHARES' (strips .JK)", () => {
    const r = generateMockResponse("beli BBCA.JK 100 lembar");
    assert.equal(r.toolCalls[0].args.ticker, "BBCA");
    assert.equal(r.toolCalls[0].args.shares, 100);
  });

  it("matches 'jual TICKER SHARES' to sell_stock", () => {
    const r = generateMockResponse("jual TLKM 50");
    assert.equal(r.toolCalls[0].name, "sell_stock");
    assert.equal(r.toolCalls[0].args.ticker, "TLKM");
    assert.equal(r.toolCalls[0].args.shares, 50);
  });

  it("matches 'pindahkan X juta ke emas' to move_to_gold (rupiah amount)", () => {
    const r = generateMockResponse("pindahkan 5 juta ke emas");
    assert.equal(r.toolCalls[0].name, "move_to_gold");
    assert.equal(r.toolCalls[0].args.rupiahAmount, 5_000_000);
  });

  it("matches 'profile QM/BG/prod/res' to set_active_profile", () => {
    const r1 = generateMockResponse("ganti profile ke QM");
    const r2 = generateMockResponse("profile bg");
    const r3 = generateMockResponse("set profile prod");
    assert.equal(r1.toolCalls[0].name, "set_active_profile");
    assert.equal(r1.toolCalls[0].args.profileId, "prod");
    assert.equal(r2.toolCalls[0].args.profileId, "res");
    assert.equal(r3.toolCalls[0].args.profileId, "prod");
  });

  it("matches 'universe idx30/idx80/lq45/all' to set_universe", () => {
    const r = generateMockResponse("ubah universe idx30");
    assert.equal(r.toolCalls[0].name, "set_universe");
    assert.equal(r.toolCalls[0].args.universe, "idx30");
  });

  it("matches 'top N 5' to set_topN", () => {
    const r = generateMockResponse("Top N 8");
    assert.equal(r.toolCalls[0].name, "set_topN");
    assert.equal(r.toolCalls[0].args.n, 8);
  });

  it("matches 'nonaktifkan DCA' to toggle_dca_active(false)", () => {
    const r = generateMockResponse("nonaktifkan rekomendasi DCA");
    assert.equal(r.toolCalls[0].name, "toggle_dca_active");
    assert.equal(r.toolCalls[0].args.active, false);
  });

  it("matches 'aktifkan DCA' to toggle_dca_active(true)", () => {
    const r = generateMockResponse("aktifkan rekomendasi DCA");
    assert.equal(r.toolCalls[0].name, "toggle_dca_active");
    assert.equal(r.toolCalls[0].args.active, true);
  });

  it("matches 'tambah TICKER watchlist' to add_to_watchlist", () => {
    const r = generateMockResponse("tambah ASII ke watchlist");
    assert.equal(r.toolCalls[0].name, "add_to_watchlist");
    assert.equal(r.toolCalls[0].args.ticker, "ASII");
  });

  it("matches 'hapus TICKER watchlist' to remove_from_watchlist", () => {
    const r = generateMockResponse("hapus BBCA dari watchlist");
    assert.equal(r.toolCalls[0].name, "remove_from_watchlist");
    assert.equal(r.toolCalls[0].args.ticker, "BBCA");
  });

  it("matches 'sync backtest' to sync_backtest_to_portfolio", () => {
    const r = generateMockResponse("sync backtest ke portofolio");
    assert.equal(r.toolCalls[0].name, "sync_backtest_to_portfolio");
  });
});

describe("devMockAI — tool call structure", () => {
  it("emits at most 1 tool call per message (deterministic)", () => {
    const queries = [
      "berapa BPS?",
      "cek portofolio",
      "regime pasar",
      "beli BBCA 100",
      "jual TLKM 50",
    ];
    for (const q of queries) {
      const r = generateMockResponse(q);
      assert.ok(r.toolCalls.length <= 1, `query "${q}" emitted ${r.toolCalls.length} calls`);
    }
  });

  it("each tool call has unique id", () => {
    const r1 = generateMockResponse("berapa BPS?");
    const r2 = generateMockResponse("berapa BPS?");
    assert.notEqual(r1.toolCalls[0].id, r2.toolCalls[0].id);
  });

  it("tool calls include name and args object", () => {
    const r = generateMockResponse("beli BBCA 100");
    const tc = r.toolCalls[0];
    assert.equal(typeof tc.name, "string");
    assert.equal(typeof tc.args, "object");
    assert.notEqual(tc.id, undefined);
  });
});

describe("devMockAI — context (currently unused but signature preserved)", () => {
  it("accepts undefined context without throwing", () => {
    const r = generateMockResponse("halo");
    assert.equal(r.provider, "dev-mock");
  });

  it("accepts a context object without throwing", () => {
    const r = generateMockResponse("berapa BPS?", {
      bps: { score: 85, action: "aggressive", deployPct: 75, cashPct: 25, valid: true, reason: "test", factors: { valuation: 80, momentum: 70, breadth: 60, drawdown: 90, fear: 80 } },
    });
    assert.equal(r.provider, "dev-mock");
  });
});
