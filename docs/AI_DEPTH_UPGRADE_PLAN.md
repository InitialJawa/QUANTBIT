# NEXT TASK: Quantbit AI Depth Upgrade (Levels 1+2+3+4)

> **Status**: Plan sudah disetujui user (sesi 2026-06-25). **DO NOT RE-ASK QUESTIONS — langsung eksekusi.**
> Semua keputusan sudah dikunci. Pattern, schema, dan order sudah spesifik di bawah.
> File ini adalah self-contained execution spec untuk AI session berikutnya.

## TL;DR (30 detik)

Ubah **`Quantbit AI`** (tombol `MessageCircle` di bottom-right `FloatingAIChat.tsx`) dari "Q&A only" jadi **fully integrated agent** dengan 4 layers:

| Level | Apa | Effort |
|-------|-----|--------|
| **1. Smarter Q&A** | Chat history persist (localStorage) + live context lebih kaya | ~3 jam |
| **2. Tool use** | AI bisa panggil 8 read-only tools via function calling | ~5 jam |
| **3. Action API** | AI bisa suggest 10 actions, **inline card approval** sebelum eksekusi | ~8 jam |
| **4. Proactive agent** | Monitor BPS, fire notification saat threshold crossed. **Default ON**, toggleable | ~6 jam |

**Total**: ~22 jam, 12 file (4 new, 8 modified), 1 backend endpoint update.

---

## Locked Decisions (JANGAN TANYA ULANG)

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **AI = interface only**, math stays in `engine/`. Tetap comply dengan "No AI for financial math". | BPS, regime, scoring semua deterministic. |
| 2 | **Every action requires [Approve] click** — AI never executes autonomously. | Risk mitigation. |
| 3 | **Inline approval card** in chat (seperti ChatGPT tool calls). | User sudah confirmed ini. |
| 4 | **Proactive default ON**, ada toggle di Settings menu. | User confirmed. |
| 5 | **5-min cooldown per rule** (untuk prevent spam proactive). | Hardcoded, bukan setting. |
| 6 | **localStorage only** (no cross-device sync). | Cukup untuk MVP. |
| 7 | **Provider chain**: OpenRouter (qwen3-next-80b) → Groq (llama-3.3-70b) → Gemini 2.5 Flash. Existing. | Tidak perlu ubah. |
| 8 | **No autonomous trading** (Level 5). **OUT OF SCOPE**. | Bentrok "No AI for financial math". |

---

## Execution Order (sequential, satu sesi)

WAJIB ikuti urutan ini. Setiap level di-test (`tsc + build`) sebelum lanjut.

1. **Level 1** — Smarter Q&A foundation
2. **Level 2** — Read-only tool use
3. **Level 3** — Action API with inline card
4. **Level 4** — Proactive agent
5. **Docs + handover**

---

## File-by-File Spec

### 1. `src/types/ai.ts` (NEW, ~120 lines)

```ts
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

export interface AIToolResult {
  toolCallId: string;
  name: string;
  result: any;
  error?: string;
}

/** Pending action waiting for user [Approve] / [Reject] */
export interface PendingAction {
  id: string;
  action: AIAction;
  /** Human-readable summary, e.g. "Beli 100 lembar BBCA @ Rp 10.500" */
  displayText: string;
  /** Estimated impact preview (cost for buy, freed cash for sell, etc.) */
  impact: { label: string; value: string }[];
  createdAt: number;
}
```

### 2. `src/ai/aiClient.ts` (MODIFIED)

**Changes**:
- Extend `AILiveContext` to include `backtestConfig`, full `bpsResult`, `alerts` array
- `askAI()` returns `{ content, toolCalls, requiresApproval }` instead of just `{ content, provider }`
- Add `buildLiveContext()` to include backtestConfig snapshot

```ts
// BEFORE:
export async function askAI(messages, context?): Promise<{ content, provider }>

// AFTER:
export interface AskAIResult {
  content: string;
  provider: string;
  toolCalls: AIToolCall[];        // tools AI wants to call
  requiresApproval: AIAction[];   // actions needing user approval
}
```

### 3. `src/hooks/useAITools.ts` (NEW, ~80 lines)

```ts
// ─────────────────────────────────────────────────────────────
// useAITools — frontend tool registry. Maps AIToolCall → actual
// function call. Read-only tools run immediately; actions emit
// pendingAction via context for user approval.
// ─────────────────────────────────────────────────────────────
import { useEngineConfig } from "../contexts/EngineConfigContext";
import { useAICockpit } from "../contexts/AICockpitContext";
import { useBuyPressure } from "./useBuyPressure";
import { MKT, RS, getProcessedLeaders } from "../marketData";
// ... usePortfolioManager, useUIState as needed

export function useAITools() {
  // return executeTool(toolCall) — switches on name, runs handler,
  // returns AIToolResult. Actions return { requiresApproval: true }
  // and emit pendingAction for the chat UI to render.
}
```

**Tool registry** (mirror these exactly):

```ts
const TOOL_REGISTRY: Record<string, (args: any) => Promise<any>> = {
  // ── Read-only (Level 2) — run immediately ──
  get_portfolio_state: async () => {
    const pm = usePortfolioManager();
    return { positions: pm.portfolio, cash: pm.cash, totalValue: ... };
  },
  get_bps_now: async ({ ticker }) => {
    if (ticker) {
      // Per-ticker BPS not implemented yet — return global BPS
      // + note about ticker-specific score
    }
    return useBuyPressure();
  },
  get_regime_details: async () => ({
    regime: RS,
    ihsgTrend: { current: MKT.ihsg.value, monthly: MKT.ihsg.monthly },
    breadth: { above60: RS.radar_context?.breadth_above_60, ... },
  }),
  get_ticker_metrics: async ({ ticker }) => {
    const stock = STOCKS_DATA.find(s => s.ticker === ticker);
    return { ticker, currentPrice: stock?.currentPrice, ... };
  },
  get_market_history: async ({ days = 30 }) => {
    // Read from RS historical (cached) or compute from MKT
    return { ihsg: [...], usdidr: [...], gold: [...], last: days };
  },
  get_backtest_config: async () => {
    const { backtestConfig } = useEngineConfig();
    return backtestConfig;
  },
  get_engine_config: async () => {
    const { engineConfig } = useEngineConfig();
    return engineConfig;
  },
  // ... 1 more if needed (e.g., get_bps_history)
};
```

**Action dispatch** (Level 3):

```ts
// All actions return { requiresApproval: true, action: <AIAction> }
// and emit via AICockpitContext.pendingAction for UI rendering.

const ACTION_REGISTRY: Record<string, (args: any) => AIAction> = {
  buy_stock: ({ ticker, shares, price }) => ({ type: "buy_stock", ticker, shares, price }),
  sell_stock: ({ ticker, shares }) => ({ type: "sell_stock", ticker, shares }),
  move_to_gold: ({ rupiahAmount }) => ({ type: "move_to_gold", rupiahAmount }),
  set_active_profile: ({ profileId }) => ({ type: "set_active_profile", profileId }),
  set_universe: ({ universe }) => ({ type: "set_universe", universe }),
  set_topN: ({ n }) => ({ type: "set_topN", n }),
  toggle_dca_active: ({ active }) => ({ type: "toggle_dca_active", active }),
  add_to_watchlist: ({ ticker }) => ({ type: "add_to_watchlist", ticker }),
  remove_from_watchlist: ({ ticker }) => ({ type: "remove_from_watchlist", ticker }),
  sync_backtest_to_portfolio: () => ({ type: "sync_backtest_to_portfolio" }),
};
```

### 4. `src/components/AIActionApprovalCard.tsx` (NEW, ~180 lines)

```tsx
// ─────────────────────────────────────────────────────────────
// AIActionApprovalCard — inline card in chat showing AI's
// proposed action. User must click [Approve] or [Reject].
// ─────────────────────────────────────────────────────────────
import { Check, X, Loader2 } from "lucide-react";
import { useAICockpit } from "../contexts/AICockpitContext";
import { useEngineConfig } from "../contexts/EngineConfigContext";
// ... usePortfolioManager for action execution

export function AIActionApprovalCard({ pending }: { pending: PendingAction }) {
  const { approveAction, rejectAction } = useAICockpit();
  const pm = usePortfolioManager();
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<"approved" | "rejected" | null>(null);

  const handleApprove = async () => {
    setIsExecuting(true);
    try {
      // Dispatch to existing handlers
      switch (pending.action.type) {
        case "buy_stock":
          await pm.handleAddTransaction(pending.action.ticker, pending.action.shares, pending.action.price);
          break;
        case "sell_stock":
          await pm.handleSellTransaction(pending.action.ticker, pending.action.shares);
          break;
        case "move_to_gold":
          pm.handleMoveToGold(pending.action.rupiahAmount);
          break;
        case "set_active_profile":
          setActiveProfile(pending.action.profileId);
          break;
        // ... etc
      }
      approveAction(pending.id);
      setResult("approved");
    } catch (err) {
      // Show error
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 my-2 space-y-2">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-caption text-cyan-300 font-bold uppercase tracking-widest font-mono">
            AI suggests
          </p>
          <p className="text-caption text-white/90 font-sans mt-1">
            {pending.displayText}
          </p>
          {pending.impact.length > 0 && (
            <ul className="text-label text-white/60 font-mono mt-1 space-y-0.5">
              {pending.impact.map((i, idx) => (
                <li key={idx}>• {i.label}: {i.value}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {result === null && (
        <div className="flex gap-2 pt-1">
          <button onClick={handleApprove} disabled={isExecuting}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-md text-caption font-bold uppercase tracking-widest transition-colors disabled:opacity-50">
            {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Approve
          </button>
          <button onClick={() => { rejectAction(pending.id); setResult("rejected"); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-md text-caption font-bold uppercase tracking-widest transition-colors">
            <X className="w-3 h-3" />
            Reject
          </button>
        </div>
      )}
      {result === "approved" && (
        <p className="text-label text-emerald-400 font-bold font-mono">✓ Executed</p>
      )}
      {result === "rejected" && (
        <p className="text-label text-white/40 font-bold font-mono">✗ Rejected</p>
      )}
    </div>
  );
}
```

### 5. `src/contexts/AICockpitContext.tsx` (MODIFIED)

Add to context:
- `pendingActions: PendingAction[]` (queue, FIFO)
- `proactiveAlerts: ProactiveAlert[]`
- `approveAction(id: string)` — marks approved, removes from queue
- `rejectAction(id: string)` — marks rejected
- `addPendingAction(action: PendingAction)`
- `proactiveAIEnabled: boolean` (or sync to useUIState)

```ts
// Pseudocode for new methods:
const approveAction = (id: string) => {
  setPendingActions(prev => prev.filter(p => p.id !== id));
};
const rejectAction = (id: string) => {
  setPendingActions(prev => prev.filter(p => p.id !== id));
};
const addPendingAction = (action: PendingAction) => {
  setPendingActions(prev => [...prev, action]);
};
```

### 6. `src/hooks/useProactiveAgent.ts` (NEW, ~100 lines)

```ts
// ─────────────────────────────────────────────────────────────
// useProactiveAgent — monitors BPS, fires notifications on
// threshold cross. Default ON, hardcoded 5-min cooldown per rule.
// ─────────────────────────────────────────────────────────────
import { useEffect, useRef } from "react";
import { useBuyPressure } from "../engine/buyPressure";
import { useUIState } from "./useUIState";
import { useNotification } from "../contexts/NotificationContext";

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const lastFiredRef = useRef<Record<string, number>>({});

export function useProactiveAgent() {
  const bps = useBuyPressure();
  const { proactiveAIEnabled } = useUIState();
  const { fireRule } = useNotification();

  useEffect(() => {
    if (!proactiveAIEnabled || !bps.valid) return;

    const now = Date.now();
    const checkAndFire = (rule: string, condition: boolean) => {
      if (!condition) return;
      const last = lastFiredRef.current[rule] || 0;
      if (now - last < COOLDOWN_MS) return;
      lastFiredRef.current[rule] = now;
      fireRule(rule, { title: ..., message: ..., type: "info" });
    };

    // Rule 1: BPS cross-aggressive (enters [70, 100])
    checkAndFire("bpsAggressive", bps.score >= 70 && bps.score < 100);
    // Rule 2: BPS low (exit aggressive)
    checkAndFire("bpsLow", bps.score < 30);
    // Rule 3: DCA disabled but BPS high
    checkAndFire("dcaDisabledHighBps", !engineConfig.dcaActive && bps.score >= 80);
  }, [bps.score, bps.valid, proactiveAIEnabled]);
}
```

Mounted in `PortfolioTracker.tsx` (since it has BuyPressureDashboard and live engineConfig).

### 7. `src/hooks/useUIState.ts` (MODIFIED)

Add:
- `proactiveAIEnabled: boolean` (default `true`)
- `setProactiveAIEnabled: (v: boolean) => void`
- Persist in `useUIState` state (already persisted via localStorage theme? verify)

If `useUIState` doesn't already persist arbitrary state, extend it to do so. Or store in localStorage directly.

### 8. `src/components/PortfolioTracker.tsx` (MODIFIED)

Add at top of function (after hooks):

```tsx
import { useProactiveAgent } from "../hooks/useProactiveAgent";
// ...
useProactiveAgent();  // mount the proactive monitor
```

### 9. `src/components/FloatingAIChat.tsx` (MODIFIED)

Three changes:
1. **History persist**: load from localStorage on mount, save on message change (cap 100)
2. **Tool call rendering**: after `askAI` returns, if `toolCalls.length > 0`, call `executeTool` for each, append results, send follow-up to AI
3. **Inline approval card**: render `AIActionApprovalCard` for each item in `pendingActions` queue

```tsx
// Pseudo-changes:

// A. History load/save
const STORAGE_KEY = "quantbit_ai_chat_history";
const [messages, setMessages] = useState<AIChatMessage[]>(() => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved).slice(-100);
  } catch {}
  return [WELCOME];
});
useEffect(() => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-100))); } catch {}
}, [messages]);

// B. Tool call execution in handleSend
const handleSend = async (text: string) => {
  setMessages(prev => [...prev, { role: "user", content: text }]);
  setIsLoading(true);
  try {
    const { content, toolCalls, requiresApproval } = await askAI(messages, context);
    // For read-only tools: execute, append results, re-call AI
    if (toolCalls.length > 0) {
      for (const tc of toolCalls) {
        if (TOOL_REGISTRY[tc.name]) {
          const result = await TOOL_REGISTRY[tc.name](tc.args);
          setMessages(prev => [...prev, { role: "tool", content: JSON.stringify(result), toolCallId: tc.id }]);
        }
      }
      // Re-call AI with tool results
      const final = await askAI(messages, context);
      setMessages(prev => [...prev, { role: "assistant", content: final.content }]);
    } else {
      setMessages(prev => [...prev, { role: "assistant", content }]);
    }
    // For actions: emit pendingAction
    requiresApproval.forEach(action => {
      const pending = buildPendingAction(action);
      addPendingAction(pending);
    });
  } finally { setIsLoading(false); }
};

// C. Render approval cards
const { pendingActions } = useAICockpit();
return (
  <div className="chat-container">
    {messages.map(m => <MessageBubble key={...} msg={m} />)}
    {pendingActions.map(p => <AIActionApprovalCard key={p.id} pending={p} />)}
  </div>
);
```

### 10. `src/ai/systemKnowledge.ts` (MODIFIED)

Add new sections to the system knowledge:

```ts
// Append to SYSTEM_KNOWLEDGE string:

// Section 13: TOOL CATALOG
`
## TOOL CATALOG (you can call these)
You have 8 read-only tools and 10 actions available. ALWAYS prefer
calling a tool over guessing when data is available.

Read-only tools (call immediately, no approval):
- get_portfolio_state() — return current positions, cash, P&L
- get_bps_now({ticker?}) — current Buy Pressure Score
- get_regime_details() — regime status, breadth, exit risk
- get_ticker_metrics({ticker}) — live price, scores, rank
- get_market_history({days?}) — last N days IHSG/USDIDR/Gold
- get_backtest_config() — current backtest settings
- get_engine_config() — current live strategy settings

Action tools (REQUIRE user [Approve] before execution):
- buy_stock({ticker, shares, price?}) — execute buy
- sell_stock({ticker, shares}) — execute sell
- move_to_gold({rupiahAmount}) — convert cash to gold
- set_active_profile({profileId}) — change active weight profile
- set_universe({universe}) — change universe filter
- set_topN({n}) — change Top N
- toggle_dca_active({active}) — toggle DCA recommendations
- add_to_watchlist({ticker}) / remove_from_watchlist({ticker})
- sync_backtest_to_portfolio() — push backtest config to live

When you want to call a tool, emit a JSON block:
{"tool_call": {"name": "buy_stock", "args": {"ticker": "BBCA", "shares": 100}}}

The system will execute the tool and append the result to context.
You will then see the result and can continue the conversation.
For actions, the system will show an approval card to the user.
ONLY actions the user explicitly approves will be executed.
`

// Section 14: PROACTIVE RULES (read-only, do not call out)
`
## PROACTIVE AGENT RULES
The system can notify the user about market opportunities.
Do not attempt to call proactive notifications yourself.
If the user asks "what should I do?" or "any opportunity?" — call
get_bps_now() and get_regime_details() and respond with analysis.
Recommend actions, but let the user initiate them through the
chat (which will show the approval card automatically).
`
```

### 11. `functions/api/[[path]].ts` (MODIFIED)

Update `handleAiChat` to support function calling. For Gemini:

```ts
async function handleAiChat(request, env) {
  const body = await request.json() as { messages, context };
  const messages = body.messages || [];
  const context = body.context || {};
  
  const system = buildSystemPrompt(context);
  
  // Tool declarations in Gemini format
  const tools = [{
    function_declarations: [
      { name: "get_portfolio_state", description: "Get current portfolio positions, cash, and P&L" },
      { name: "get_bps_now", description: "Get current Buy Pressure Score", parameters: { type: "object", properties: { ticker: { type: "string" } } } },
      // ... 6 more
    ],
  }];
  
  // Call Gemini with tools
  const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: messages.map(m => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] })),
      systemInstruction: { role: "user", parts: [{ text: system }] },
      tools,
    }),
  });
  
  // Parse response, extract function calls
  const data = await resp.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.find(p => p.text)?.text || "";
  const functionCalls = parts.filter(p => p.functionCall).map(p => ({
    name: p.functionCall.name,
    args: p.functionCall.args,
  }));
  
  return json({ content: text, toolCalls: functionCalls, provider: "gemini" });
}
```

Similar update for OpenAI-compatible providers (Groq, OpenRouter) — use `tools: [{ type: "function", function: { name, description, parameters } }]`.

### 12. `docs/AI_DEPTH_UPGRADE_PLAN.md` (NEW — this file)

(Already exists. Don't recreate.)

---

## Pre-Implementation Checklist (BEFORE coding)

1. ✅ Read this entire file
2. ✅ Read `docs/AI_ONBOARDING.md`, `docs/PROJECT_MASTER.md`, `docs/CURRENT_STATE.md`
3. ✅ Read `docs/audit/AUDIT-2026-06-25-CODE-HEALTH.md` (last audit, may be relevant)
4. ✅ Skim `src/components/FloatingAIChat.tsx` (current state)
5. ✅ Skim `src/ai/aiClient.ts` (current `buildLiveContext`)
6. ✅ Skim `src/contexts/AICockpitContext.tsx` (current shape)
7. ✅ Read `src/hooks/useUIState.ts` (persistence pattern)

---

## Execution Steps (precise order)

### Step 1: Types foundation
- Create `src/types/ai.ts` (all interfaces, no React)

### Step 2: Tool registry
- Create `src/hooks/useAITools.ts` (read-only registry first, actions later)

### Step 3: AICockpitContext update
- Add `pendingActions`, `proactiveAlerts`, action methods to `AICockpitContext.tsx`
- Export new types

### Step 4: FloatingAIChat - Level 1
- Add history persist (localStorage, cap 100)
- Add richer live context
- Test: refresh page, history preserved

### Step 5: Backend tool calling
- Update `functions/api/[[path]].ts` `handleAiChat` to support function declarations
- Test: ask "cek portofolio saya" → AI calls `get_portfolio_state` → returns data

### Step 6: Frontend tool execution
- Update `FloatingAIChat.tsx` to handle `toolCalls` in response
- Render tool results inline in chat

### Step 7: useUIState - proactive toggle
- Add `proactiveAIEnabled: boolean` to `useUIState`
- Add to AppHeader Settings menu (toggle row)

### Step 8: useProactiveAgent
- Create hook with BPS threshold monitor
- 5-min cooldown
- Mount in PortfolioTracker

### Step 9: AICockpitContext - proactive alerts
- Add `proactiveAlerts` and `dismissAlert` to context
- Hook into `useProactiveAgent` to add alerts

### Step 10: NotificationContext - rule_proactiveBPS
- Add new rule that fires on BPS threshold cross
- Use existing `fireRule` mechanism

### Step 11: Level 3 - Action API
- Add action registry to `useAITools.ts` (10 actions)
- Build `buildPendingAction()` helper (displayText + impact preview)
- Update `FloatingAIChat` to call `addPendingAction` for each action
- Create `AIActionApprovalCard.tsx` (inline card with [Approve] [Reject])
- Mount `AIActionApprovalCard` in `FloatingAIChat`
- Wire `approveAction` to existing deterministic handlers

### Step 12: System knowledge update
- Add Section 13 (tool catalog) and Section 14 (proactive rules) to `systemKnowledge.ts`

### Step 13: Verification per level
- After each level: `npx tsc --noEmit` + `npx vite build` MUST pass
- If fails, fix before proceeding

### Step 14: Final docs + handover
- Update `docs/DECISIONS.md` (append "Quantbit AI Depth Upgrade")
- Update `docs/MASTER_CHRONICLE.md` (milestone)
- Create `handover/HANDOVER_2026_06_25_S6.md` (session 6 handover)
- Update `docs/NEXT_ACTION.md` (mark this task done)

---

## Verification (per level)

After each level:
```bash
npx tsc --noEmit   # MUST pass with 0 errors
npx vite build     # MUST pass
```

Manual test:
- **Level 1**: Open chat, send "halo", refresh page → history preserved.
- **Level 2**: Send "berapa BPS saya?" → AI calls `get_bps_now`, shows score.
- **Level 3**: Send "beli BBCA 100" → approval card appears → click [Approve] → portfolio updates.
- **Level 4**: Use dev tools to set `MKT.ihsg.monthly = -25` → proactive notification fires.

---

## Common Pitfalls (avoid these)

1. ❌ **Don't auto-execute actions** — always require [Approve].
2. ❌ **Don't modify engine math** — AI is interface only, math stays in `engine/`.
3. ❌ **Don't skip the level sequence** — each level builds on the previous.
4. ❌ **Don't use `useState` for pending actions** — must use AICockpitContext (cross-component).
5. ❌ **Don't store chat history in `useUIState`** — use separate `localStorage` key.
6. ❌ **Don't forget to handle the `tool_calls` flow** in OpenAI-compatible providers (different schema from Gemini).
7. ❌ **Don't expose `sync_backtest_to_portfolio` without approval** — it changes live config.

---

## Risk Mitigations (mandatory)

- **Financial safety**: All actions go through existing deterministic handlers (handleAddTransaction, etc.). AI is just the trigger.
- **Schema validation**: Server-side validation of tool args before execution.
- **Cooldown**: 5-min per proactive rule (no spam).
- **User control**: Settings toggle to disable proactive entirely.
- **Error handling**: Wrap each tool call in try/catch, show user-friendly error.
- **localStorage cap**: 100 messages max for chat history.

---

## Out of Scope (DO NOT IMPLEMENT)

- ❌ Autonomous trading (Level 5) — violates "No AI for financial math"
- ❌ Cross-device chat sync — localStorage only
- ❌ Voice input — text only
- ❌ Image/screenshot understanding — text only
- ❌ Multi-language AI (Bahasa Indonesia vs English) — keep existing
- ❌ Re-training system knowledge via AI — manual update only

---

## Out-of-Scope Decisions Recorded

- **VIX-like fear indicator** (was discussed in earlier session) — still not implemented. Use `RS.risk` as BPS fear proxy.
- **BPS re-calibration** (was discussed earlier) — NOT part of this task. Keep current scoring.
- **Auto-deploy DCA on/off** (Level 5 in earlier plan) — DEFERRED.

---

## If You Get Stuck

1. **Re-read this file** — answers to most questions are here.
2. **Check `docs/AI_ONBOARDING.md`** for project-level rules.
3. **Check `docs/CURRENT_STATE.md`** for current state.
4. **Check `handover/HANDOVER_2026_06_25_S4.md` and `_S5.md`** for prior session context.
5. **DO NOT ask the user** — all decisions are locked.

---

## Commit Strategy (recommended)

After all 4 levels done:
```bash
git add src/types/ai.ts
git commit -m "feat(ai): type definitions for tool calls and action approval"
# Then for each level:
git add <files>
git commit -m "feat(ai): level 1 - chat history persistence + richer live context"
git commit -m "feat(ai): level 2 - read-only tool use via function calling"
git commit -m "feat(ai): level 3 - action API with inline card approval"
git commit -m "feat(ai): level 4 - proactive BPS threshold monitoring"
# Then docs:
git commit -m "docs: AI depth upgrade decision + session 6 handover"
```

After each commit:
```bash
git push origin main
```

After all pushed, **update `docs/NEXT_ACTION.md`** to remove this task (it's done).

---

## Manual Test Plan (full integration)

After all 4 levels shipped:

1. **Level 1 (history)**: Open chat, send "halo", refresh → message persisted.
2. **Level 1 (richer context)**: Ask "apa strategi terbaik sekarang?" → AI references live BPS + regime.
3. **Level 2 (read tool)**: Ask "cek portofolio saya" → AI calls `get_portfolio_state`, shows summary.
4. **Level 2 (ticker tool)**: Ask "berapa skor BBCA?" → AI calls `get_ticker_metrics` (or `get_bps_now`).
5. **Level 3 (config action)**: Ask "ganti profile ke BG" → AI shows approval card → click [Approve] → profile changes.
6. **Level 3 (buy action)**: Ask "beli BBCA 100" → approval card with cost preview → [Approve] → transaction in portfolio.
7. **Level 3 (reject)**: Ask "beli BBCA 100" → click [Reject] → no action, AI acknowledges.
8. **Level 4 (proactive ON)**: Manually override `MKT.ihsg.monthly = -25` in dev → notification "BPS baru 85, mau deploy?" → click → opens chat with prefilled action.
9. **Level 4 (proactive OFF)**: Settings menu → toggle off → manually trigger scenario → no notification.
10. **Level 4 (cooldown)**: Trigger notification, wait 1 min, trigger again → second one suppressed.

---

## Final Notes

- This plan is **complete and locked**. No clarification needed.
- Execute sequentially. Each level tested before next.
- All decisions are documented inline in code as comments.
- After completion, update this file's status to "✅ DONE" with commit hash.
