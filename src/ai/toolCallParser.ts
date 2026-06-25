// ─────────────────────────────────────────────────────────────
// Tool call extraction & classification — pure, dependency-free.
//
// Lives in its own file so it can be unit-tested via `tsx --test`
// without dragging the React context graph (which uses
// `import.meta.env`, browser-only deps, and circular imports that
// fail under Node ESM).
//
// This file is imported by both src/ai/aiClient.ts and the tests.
// ─────────────────────────────────────────────────────────────
import type { AIToolCall } from "../types/ai.ts";

/** Marker that starts a tool-call JSON block. We find each occurrence,
 *  then walk forward counting braces to find the matching `}`. This
 *  handles nested objects (e.g. `{"args": {}}`) that a non-greedy
 *  regex would mis-parse. */
const TOOL_CALL_MARKER_SRC = '\\{\\s*"tool_call"\\s*:\\s*';

/** Find the matching close-brace for the `{` at `startIdx`, accounting
 *  for nested objects and string literals. Returns -1 if not found. */
function findMatchingBrace(text: string, startIdx: number): number {
  // startIdx should point at the opening `{` of the inner object
  // (i.e. right after the "tool_call": marker).
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

/** Extract `{"tool_call": {"name": "...", "args": {...}}}` JSON blocks
 *  from a model response. Returns the cleaned text + the parsed calls. */
export function extractToolCalls(text: string): { cleanText: string; toolCalls: AIToolCall[] } {
  const toolCalls: AIToolCall[] = [];
  const matchedRanges: Array<[number, number]> = [];

  // Build a fresh regex per call to avoid stateful `lastIndex` issues
  // when this function is called multiple times (e.g. across tests).
  const marker = new RegExp(TOOL_CALL_MARKER_SRC, "g");
  let m: RegExpExecArray | null;
  let counter = 0;
  while ((m = marker.exec(text)) !== null) {
    const markerEnd = m.index + m[0].length;
    const innerClose = findMatchingBrace(text, markerEnd);
    if (innerClose === -1) continue;
    // Find outer `{` (one char before the marker match start) and its
    // matching `}`. The outer brace closes the entire tool_call JSON.
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
      /* ignore malformed JSON */
    }
  }

  // Strip matched tool-call JSON blocks from the user-facing text.
  let cleanText = text;
  // Process ranges in reverse so earlier offsets remain valid.
  for (let i = matchedRanges.length - 1; i >= 0; i--) {
    const [start, end] = matchedRanges[i];
    cleanText = cleanText.slice(0, start) + cleanText.slice(end);
  }
  cleanText = cleanText.replace(/\n{3,}/g, "\n\n").trim();
  return { cleanText, toolCalls };
}

/** Read-only tool names — frontend executes these immediately. */
export const READ_ONLY_TOOLS: ReadonlySet<string> = new Set([
  "get_portfolio_state",
  "get_bps_now",
  "get_regime_details",
  "get_ticker_metrics",
  "get_market_history",
  "get_backtest_config",
  "get_engine_config",
  "get_active_universe",
]);

/** Action tool names — these require user [Approve] before execution. */
export const ACTION_TOOLS: ReadonlySet<string> = new Set([
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
]);
