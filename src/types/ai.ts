// ─────────────────────────────────────────────────────────────
// AI tool + action type definitions
// Used by: aiClient.ts, FloatingAIChat.tsx, useAITools.ts,
//          useProactiveAgent.ts, AIActionApprovalCard.tsx
// ─────────────────────────────────────────────────────────────

/** Tool call returned by the model — execute locally or via API */
export interface AIToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

/** Result of executing a tool on the frontend */
export interface AIToolResult {
  toolCallId: string;
  name: string;
  result: any;
  error?: string;
}

/** Action that needs user approval before execution */
export type AIAction =
  | { type: "buy_stock"; ticker: string; shares: number; price?: number }
  | { type: "sell_stock"; ticker: string; shares: number }
  | { type: "move_to_gold"; rupiahAmount: number }
  | { type: "set_active_profile"; profileId: string }
  | { type: "set_universe"; universe: "all" | "idx80" | "idx30" | "lq45" }
  | { type: "set_topN"; n: number }
  | { type: "toggle_dca_active"; active: boolean }
  | { type: "add_to_watchlist"; ticker: string }
  | { type: "remove_from_watchlist"; ticker: string }
  | { type: "sync_backtest_to_portfolio" };

/** Pending action waiting for user [Approve] / [Reject] in chat */
export interface PendingAction {
  id: string;
  action: AIAction;
  /** Human-readable summary, e.g. "Beli 100 lembar BBCA @ Rp 10.500" */
  displayText: string;
  /** Estimated impact preview (cost for buy, freed cash for sell, etc.) */
  impact: { label: string; value: string }[];
  createdAt: number;
}

/** Proactive agent alert (Level 4) — surfaces a notification chip */
export interface ProactiveAlert {
  id: string;
  rule: string;
  title: string;
  message: string;
  /** Optional suggested action that opens chat with prefilled prompt */
  suggestedAction?: AIAction;
  createdAt: number;
}
