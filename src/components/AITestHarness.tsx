// ─────────────────────────────────────────────────────────────
// AITestHarness — DEV-ONLY test panel for Quantbit AI.
//
// Mount via App.tsx under `import.meta.env.DEV` guard. Provides
// buttons to:
// - Trigger each of the 8 read-only tools
// - Trigger each of the 10 action calls (with mock ctx)
// - Inspect localStorage state (chat history, fired rules, etc.)
// - Clear all AI-related localStorage keys
//
// NEVER include this in production builds (guarded by import.meta.env).
// ─────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";
import { Beaker, Wrench, Zap, Database, Trash2, Copy, Check } from "lucide-react";
import { extractToolCalls, READ_ONLY_TOOLS, ACTION_TOOLS } from "../ai/toolCallParser";
import { shouldFireRule, markRuleFired, COOLDOWN_MS } from "../hooks/useProactiveAgent";
import { ACTION_REGISTRY, buildPendingActionFromContext } from "../hooks/useAITools";
import type { AIAction } from "../types/ai";

const STORAGE_KEYS = [
  "quantbit_ai_chat_history",
  "quantbit_notifications",
  "quantbit_fired_rules",
  "idx_proactive_ai",
  "idx_engine_config",
  // FASE 2.6 — idx_activeconfig DIHAPUS. Sumber kebenaran: idx_engine_config.activeProfileId
];

export function AITestHarness() {
  const [activePanel, setActivePanel] = useState<"tools" | "actions" | "cooldown" | "history">("tools");
  const [storage, setStorage] = useState<Record<string, any>>({});
  const [testResult, setTestResult] = useState<string>("");
  const [bypassCooldown, setBypassCooldown] = useState(false);
  const [firedLog, setFiredLog] = useState<{ rule: string; at: number }[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    refreshStorage();
  }, []);

  function refreshStorage() {
    const next: Record<string, any> = {};
    for (const key of STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          next[key] = JSON.parse(raw);
        } catch {
          next[key] = raw;
        }
      } else {
        next[key] = null;
      }
    }
    setStorage(next);
  }

  function clearAll() {
    for (const key of STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    refreshStorage();
    setTestResult("✅ Cleared all AI-related localStorage keys");
  }

  function copyStorage() {
    navigator.clipboard.writeText(JSON.stringify(storage, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // ── Panel: Tools ────────────────────────────────────────────
  function testExtractToolCalls() {
    const sample = `Saya akan cek portofolio dulu.
{"tool_call": {"name": "get_portfolio_state", "args": {}}}
{"tool_call": {"name": "get_bps_now", "args": {}}}
Setelah itu saya akan kasih rekomendasi.`;
    const { cleanText, toolCalls } = extractToolCalls(sample);
    setTestResult(JSON.stringify({ toolCalls, cleanTextLength: cleanText.length }, null, 2));
  }

  // ── Panel: Actions ──────────────────────────────────────────
  function testAction(actionType: AIAction["type"]) {
    const mockArgs: Record<string, any> = {
      buy_stock: { ticker: "BBCA", shares: 100, price: 9500 },
      sell_stock: { ticker: "BBCA", shares: 50 },
      move_to_gold: { rupiahAmount: 5_000_000 },
      set_active_profile: { profileId: "res" },
      set_universe: { universe: "idx30" },
      set_topN: { n: 8 },
      toggle_dca_active: { active: false },
      add_to_watchlist: { ticker: "ASII" },
      remove_from_watchlist: { ticker: "BBCA" },
      sync_backtest_to_portfolio: {},
    };
    const args = mockArgs[actionType] || {};
    const action = ACTION_REGISTRY[actionType](args);
    const mockCtx = {
      pm: { cash: 100_000_000, portfolio: [{ ticker: "BBCA.JK", shares: 100, buyPrice: 9000, addedAt: "2025-01-01" }], watchlist: [] },
      engineConfig: {
        profiles: [
          { id: "aman", name: "Aman", qualityWeight: 0.20, growthWeight: 0.20, valueWeight: 0.20, momentumWeight: 0.20, dividendWeight: 0.20 },
          { id: "dividen", name: "Dividen", qualityWeight: 0.20, growthWeight: 0.20, valueWeight: 0.20, momentumWeight: 0.20, dividendWeight: 0.20 },
        ],
        lastBacktestProfile: { id: "dividen", name: "Dividen", qualityWeight: 0.20, growthWeight: 0.20, valueWeight: 0.20, momentumWeight: 0.20, dividendWeight: 0.20 },
      },
      goldPrice: 1_300_000,
    };
    const pending = buildPendingActionFromContext(action, mockCtx, Date.now());
    setTestResult(JSON.stringify(pending, null, 2));
  }

  // ── Panel: Cooldown ─────────────────────────────────────────
  function testCooldown(ruleId: string, lastFiredAt: number | null) {
    const now = Date.now();
    const shouldFire = shouldFireRule(lastFiredAt || undefined, now, bypassCooldown ? 0 : COOLDOWN_MS);
    setTestResult(JSON.stringify({
      rule: ruleId,
      lastFiredAt,
      now,
      elapsed: lastFiredAt ? now - lastFiredAt : null,
      cooldown: bypassCooldown ? 0 : COOLDOWN_MS,
      shouldFire,
      bypassCooldown,
    }, null, 2));
  }

  function simulateFire(ruleId: string) {
    const at = Date.now();
    setFiredLog((prev) => [{ rule: ruleId, at }, ...prev].slice(0, 20));
  }

  return (
    <div
      className="fixed bottom-6 left-6 z-[998] w-[420px] max-h-[600px] bg-black/95 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-xs"
      data-testid="ai-test-harness"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-emerald-500/5">
        <Beaker className="w-4 h-4 text-emerald-400" />
        <span className="font-bold text-emerald-300 uppercase tracking-widest">AI Test Harness</span>
        <span className="ml-auto text-label text-white/30 font-mono">DEV ONLY</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10">
        {([
          { id: "tools", label: "Tools", icon: Wrench },
          { id: "actions", label: "Actions", icon: Zap },
          { id: "cooldown", label: "Cooldown", icon: Beaker },
          { id: "history", label: "Storage", icon: Database },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-label uppercase tracking-wider font-bold transition-colors ${
              activePanel === tab.id
                ? "bg-emerald-500/10 text-emerald-300"
                : "text-white/50 hover:text-white/80 hover:bg-white/[0.03]"
            }`}
          >
            <tab.icon className="w-3 h-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {activePanel === "tools" && (
          <>
            <p className="text-label text-white/60 leading-relaxed">
              Test the <code>extractToolCalls()</code> regex parser with a sample model response.
            </p>
            <button
              onClick={testExtractToolCalls}
              className="w-full py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-md font-bold uppercase tracking-wider text-label"
            >
              Run extractToolCalls test
            </button>
            <div className="pt-2 border-t border-white/5">
              <p className="text-label text-white/40 mb-1">Sets registered ({READ_ONLY_TOOLS.size} read-only + {ACTION_TOOLS.size} actions):</p>
              <div className="flex flex-wrap gap-1">
                {[...READ_ONLY_TOOLS, ...ACTION_TOOLS].sort().map((name) => (
                  <code key={name} className="text-[10px] px-1.5 py-0.5 bg-white/5 text-white/70 rounded">
                    {name}
                  </code>
                ))}
              </div>
            </div>
          </>
        )}

        {activePanel === "actions" && (
          <>
            <p className="text-label text-white/60 leading-relaxed">
              Generate a PendingAction for each action type. Result is the same as what the chat renders.
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.keys(ACTION_REGISTRY).sort().map((name) => (
                <button
                  key={name}
                  onClick={() => testAction(name as AIAction["type"])}
                  className="py-1.5 px-2 bg-white/5 hover:bg-emerald-500/15 text-white/80 hover:text-emerald-300 border border-white/10 hover:border-emerald-500/30 rounded text-label font-mono text-left transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          </>
        )}

        {activePanel === "cooldown" && (
          <>
            <p className="text-label text-white/60 leading-relaxed">
              Test the 5-min cooldown gate. Toggle bypass to force-fire any rule.
            </p>
            <label className="flex items-center gap-2 py-1">
              <input
                type="checkbox"
                checked={bypassCooldown}
                onChange={(e) => setBypassCooldown(e.target.checked)}
                className="accent-emerald-500"
              />
              <span className="text-label text-white/80">Bypass cooldown (testing only)</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {["bpsAggressive", "bpsLow", "ihsgDrop", "crisisOverride"].map((rule) => (
                <button
                  key={rule}
                  onClick={() => {
                    const lastFired = firedLog.find((f) => f.rule === rule)?.at;
                    testCooldown(rule, lastFired ?? null);
                    simulateFire(rule);
                  }}
                  className="py-1.5 px-2 bg-white/5 hover:bg-amber-500/15 text-white/80 hover:text-amber-300 border border-white/10 hover:border-amber-500/30 rounded text-label font-mono text-left"
                >
                  Fire {rule}
                </button>
              ))}
            </div>
            <p className="text-label text-white/40 pt-2">
              Note: This is a UI simulation only. The real <code>useProactiveAgent</code> reads live BPS + IHSG from MKT, which you can override in DevTools:
            </p>
            <pre className="text-[10px] bg-black/40 p-2 rounded text-emerald-200/80 font-mono overflow-x-auto">
{`import("/src/marketData.ts").then(m => {
  m.MKT.ihsg.monthly = -20;  // bearish
  // or
  m.MKT.ihsg.monthly = +15;  // bullish
});`}
            </pre>
          </>
        )}

        {activePanel === "history" && (
          <>
            <p className="text-label text-white/60 leading-relaxed">
              Inspect localStorage state. Use this to verify history persistence and clear test data.
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={refreshStorage}
                className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 rounded text-label font-bold uppercase tracking-wider"
              >
                Refresh
              </button>
              <button
                onClick={copyStorage}
                className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 rounded text-label font-bold uppercase tracking-wider flex items-center justify-center gap-1"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                onClick={clearAll}
                className="flex-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded text-label font-bold uppercase tracking-wider flex items-center justify-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
            <pre className="text-[10px] bg-black/40 p-2 rounded text-white/80 font-mono overflow-x-auto max-h-64 overflow-y-auto">
{JSON.stringify(storage, null, 2)}
            </pre>
          </>
        )}

        {/* Result panel */}
        {testResult && (
          <div className="mt-2 p-2 bg-black/40 border border-white/10 rounded">
            <p className="text-label text-white/40 mb-1 font-bold uppercase tracking-wider">Result:</p>
            <pre className="text-[10px] text-emerald-200/80 font-mono overflow-x-auto max-h-40 overflow-y-auto">
{testResult}
            </pre>
            <button
              onClick={() => setTestResult("")}
              className="mt-1 text-label text-white/40 hover:text-white/80"
            >
              Clear
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
