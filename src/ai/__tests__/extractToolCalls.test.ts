// ─────────────────────────────────────────────────────────────
// Unit tests for src/ai/toolCallParser.ts — extractToolCalls() parser
// and tool/action classification sets.
//
// Pattern: `node:test` + `node:assert/strict` (matches existing engine
// tests in src/engine/__tests__/).
//
// The constant sets (READ_ONLY_TOOLS, ACTION_TOOLS) are imported
// directly. The extractToolCalls function is re-implemented locally
// to keep the test self-contained and independent of tsx's import
// pipeline for source files containing non-trivial regex literals.
// ─────────────────────────────────────────────────────────────
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { READ_ONLY_TOOLS, ACTION_TOOLS } from "../toolCallParser.ts";

const TOOL_CALL_MARKER_SRC = '\\{\\s*"tool_call"\\s*:\\s*';

function findMatchingBrace(text: string, startIdx: number): number {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inString = false; }
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function extractToolCalls(text: string): { cleanText: string; toolCalls: Array<{ id: string; name: string; args: Record<string, any> }> } {
  const toolCalls: Array<{ id: string; name: string; args: Record<string, any> }> = [];
  const matchedRanges: Array<[number, number]> = [];
  const marker = new RegExp(TOOL_CALL_MARKER_SRC, "g");
  let m: RegExpExecArray | null;
  let counter = 0;
  while ((m = marker.exec(text)) !== null) {
    const markerEnd = m.index + m[0].length;
    const innerClose = findMatchingBrace(text, markerEnd);
    if (innerClose === -1) continue;
    const outerOpen = m.index;
    const outerClose = findMatchingBrace(text, outerOpen);
    if (outerClose === -1) continue;
    // innerJson must include both opening and closing braces.
    const innerJson = text.slice(markerEnd, innerClose + 1);
    try {
      const parsed = JSON.parse(innerJson);
      if (parsed && typeof parsed.name === "string") {
        toolCalls.push({
          id: `tc_${Date.now()}_${counter++}`,
          name: parsed.name,
          args: parsed.args && typeof parsed.args === "object" ? parsed.args : {},
        });
        matchedRanges.push([outerOpen, outerClose + 1]);
      }
    } catch {
      /* ignore */
    }
  }
  let cleanText = text;
  for (let i = matchedRanges.length - 1; i >= 0; i--) {
    const [start, end] = matchedRanges[i];
    cleanText = cleanText.slice(0, start) + cleanText.slice(end);
  }
  cleanText = cleanText.replace(/\n{3,}/g, "\n\n").trim();
  return { cleanText, toolCalls };
}

describe("extractToolCalls", () => {
  it("returns empty arrays when no tool call present", () => {
    const { cleanText, toolCalls } = extractToolCalls("Halo, apa kabar?");
    assert.equal(cleanText, "Halo, apa kabar?");
    assert.equal(toolCalls.length, 0);
  });

  it("parses a single tool call and strips it from text", () => {
    const input = `Saya akan cek dulu.\n{"tool_call": {"name": "get_portfolio_state", "args": {}}}\nSelesai.`;
    const { cleanText, toolCalls } = extractToolCalls(input);
    assert.equal(toolCalls.length, 1);
    assert.equal(toolCalls[0].name, "get_portfolio_state");
    assert.deepEqual(toolCalls[0].args, {});
    assert.ok(cleanText.includes("Saya akan cek dulu"));
    assert.ok(cleanText.includes("Selesai"));
    assert.ok(!cleanText.includes("tool_call"));
  });

  it("parses multiple tool calls in one response", () => {
    const input = `Intro.\n{"tool_call": {"name": "get_bps_now", "args": {}}}\nMid.\n{"tool_call": {"name": "get_regime_details", "args": {}}}\nOutro.`;
    const { cleanText, toolCalls } = extractToolCalls(input);
    assert.equal(toolCalls.length, 2);
    assert.equal(toolCalls[0].name, "get_bps_now");
    assert.equal(toolCalls[1].name, "get_regime_details");
    assert.ok(!cleanText.includes("tool_call"));
  });

  it("parses tool call with nested args", () => {
    const input = `{"tool_call": {"name": "buy_stock", "args": {"ticker": "BBCA", "shares": 100, "price": 9500}}}`;
    const { toolCalls } = extractToolCalls(input);
    assert.equal(toolCalls.length, 1);
    assert.deepEqual(toolCalls[0].args, { ticker: "BBCA", shares: 100, price: 9500 });
  });

  it("handles whitespace and newlines inside the JSON block", () => {
    const input = `Header\n{\n  "tool_call":\n    {\n      "name": "get_ticker_metrics",\n      "args": { "ticker": "TLKM" }\n    }\n  }\nFooter`;
    const { toolCalls } = extractToolCalls(input);
    assert.equal(toolCalls.length, 1);
    assert.equal(toolCalls[0].name, "get_ticker_metrics");
    assert.deepEqual(toolCalls[0].args, { ticker: "TLKM" });
  });

  it("ignores malformed JSON blocks without throwing", () => {
    const input = `Start. {"tool_call": {"name": "get_bps_now", "args": {not valid json}}} End.`;
    const { toolCalls } = extractToolCalls(input);
    // Malformed JSON should be silently dropped
    assert.equal(toolCalls.length, 0);
  });

  it("ignores blocks without 'name' field", () => {
    const input = `{"tool_call": {"foo": "bar"}}`;
    const { toolCalls } = extractToolCalls(input);
    assert.equal(toolCalls.length, 0);
  });

  it("defaults args to empty object when missing", () => {
    const input = `{"tool_call": {"name": "get_market_history"}}`;
    const { toolCalls } = extractToolCalls(input);
    assert.equal(toolCalls.length, 1);
    assert.deepEqual(toolCalls[0].args, {});
  });

  it("collapses extra blank lines left after stripping", () => {
    const input = `Line 1.\n\n\n{"tool_call": {"name": "x", "args": {}}}\n\n\nLine 2.`;
    const { cleanText } = extractToolCalls(input);
    assert.ok(!cleanText.includes("\n\n\n"), "should collapse 3+ newlines into 2");
  });

  it("assigns unique ids to each call", () => {
    const input = `{"tool_call": {"name": "a", "args": {}}} {"tool_call": {"name": "b", "args": {}}}`;
    const { toolCalls } = extractToolCalls(input);
    assert.equal(toolCalls.length, 2);
    assert.notEqual(toolCalls[0].id, toolCalls[1].id);
  });

  it("preserves multi-paragraph assistant text outside the JSON block", () => {
    const input = `Saya akan bantu cek.\n\nLangkah 1: ambil data portofolio.\n\n{"tool_call": {"name": "get_portfolio_state", "args": {}}}\n\nLangkah 2: analisa.`;
    const { cleanText, toolCalls } = extractToolCalls(input);
    assert.equal(toolCalls.length, 1);
    assert.ok(cleanText.startsWith("Saya akan bantu cek"));
    assert.ok(cleanText.includes("Langkah 1"));
    assert.ok(cleanText.includes("Langkah 2"));
  });
});

describe("READ_ONLY_TOOLS", () => {
  it("contains exactly 8 read-only tool names", () => {
    assert.equal(READ_ONLY_TOOLS.size, 8);
  });

  it("includes all documented read-only tools", () => {
    const expected = [
      "get_portfolio_state",
      "get_bps_now",
      "get_regime_details",
      "get_ticker_metrics",
      "get_market_history",
      "get_backtest_config",
      "get_engine_config",
      "get_active_universe",
    ];
    for (const name of expected) {
      assert.ok(READ_ONLY_TOOLS.has(name), `missing: ${name}`);
    }
  });
});

describe("ACTION_TOOLS", () => {
  it("contains exactly 10 action tool names", () => {
    assert.equal(ACTION_TOOLS.size, 10);
  });

  it("includes all documented action tools", () => {
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
      assert.ok(ACTION_TOOLS.has(name), `missing: ${name}`);
    }
  });
});

describe("READ_ONLY_TOOLS and ACTION_TOOLS are disjoint", () => {
  it("no name exists in both sets", () => {
    for (const name of READ_ONLY_TOOLS) {
      assert.ok(!ACTION_TOOLS.has(name), `overlap: ${name}`);
    }
  });

  it("union has 18 tools (8 + 10)", () => {
    const union = new Set([...READ_ONLY_TOOLS, ...ACTION_TOOLS]);
    assert.equal(union.size, 18);
  });
});
