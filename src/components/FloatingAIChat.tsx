import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Send, Bot, User, Loader2, Sparkles, HelpCircle, X, MessageCircle, Minus, ChevronDown, Trash2, Bell } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { AIActionApprovalCard } from "./AIActionApprovalCard";
import { askAI, buildLiveContext, extractToolCalls, READ_ONLY_TOOLS, ACTION_TOOLS, type AIChatMessage } from "../ai/aiClient";
import { useAICockpit } from "../contexts/AICockpitContext";
import { useEngineConfig } from "../contexts/EngineConfigContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useAITools, type PortfolioAPI } from "../hooks/useAITools";
import { api } from "../services/api";
import type { StockData, PortfolioItem } from "../types";
import type { AIAction, PendingAction } from "../types/ai";

interface FloatingAIChatProps {
  selectedStock?: StockData;
  portfolio?: PortfolioItem[];
  cash?: number;
  pm: PortfolioAPI;
  getDynamicStock?: (ticker: string) => StockData | undefined;
}

const WELCOME: AIChatMessage = {
  role: "assistant",
  content:
    "Halo! Saya **Quantbit AI** — analis yang tahu *isi dapur* sistem ini.\n\n" +
    "Tanya apa saja, termasuk **\"angka ini dihitung dari mana?\"** — saya jelaskan pakai rumus & angka live-mu. " +
    "Klik ikon ❓ di panel mana pun untuk minta penjelasan instan.\n\n" +
    "💡 Coba: *\"cek portofolio saya\"*, *\"berapa BPS?\"*, *\"beli BBCA 100 lembar\"* (akan muncul kartu persetujuan).",
};

const STORAGE_KEY = "quantbit_ai_chat_history";
const MAX_HISTORY = 100;

function loadHistory(): AIChatMessage[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as AIChatMessage[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Cap to last MAX_HISTORY messages
        return parsed.slice(-MAX_HISTORY);
      }
    }
  } catch {
    /* ignore parse error */
  }
  return [WELCOME];
}

export function FloatingAIChat({ selectedStock, portfolio, cash, pm, getDynamicStock }: FloatingAIChatProps) {
  const { pendingExplain, clearExplain, pendingActions, approveAction, rejectAction, addPendingAction, proactiveAlerts, openChatWithPrompt, setOpenChatWithPrompt } = useAICockpit();
  const { engineConfig, backtestConfig, isConfigSynced, setActiveProfile, syncFromBacktest, updateConfigValue } = useEngineConfig();
  const { notifications } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>(loadHistory);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { executeTool, buildPendingAction, actionRegistry } = useAITools({ pm, getDynamicStock });

  // Persist chat history (cap to MAX_HISTORY) on every messages change.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
    } catch {
      /* storage full */
    }
  }, [messages]);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages, isLoading, pendingActions]);

  useEffect(() => {
    if (!isOpen && !isMinimized) setUnreadCount((c) => c + 1);
  }, [messages.length]);

  useEffect(() => {
    if (isOpen && !isMinimized) setUnreadCount(0);
  }, [isOpen, isMinimized]);

  // External "open with prompt" — fired by proactive agent or external buttons.
  useEffect(() => {
    if (openChatWithPrompt) {
      setIsOpen(true);
      setIsMinimized(false);
      setInput(openChatWithPrompt);
      setOpenChatWithPrompt(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [openChatWithPrompt, setOpenChatWithPrompt]);

  // Surface proactive alerts as unread chip on the chat button.
  useEffect(() => {
    if (proactiveAlerts.length > 0 && !isOpen) {
      setUnreadCount((c) => c + proactiveAlerts.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proactiveAlerts.length]);

  // Execute an approved action via the deterministic engine handlers.
  const executeAIAction = useCallback(async (pending: PendingAction): Promise<void> => {
    const a: AIAction = pending.action;
    switch (a.type) {
      case "buy_stock": {
        const cleanTicker = a.ticker.replace(/\.JK$/, "");
        const dyn = getDynamicStock?.(cleanTicker);
        const price = a.price ?? dyn?.currentPrice;
        if (price == null) throw new Error(`Harga ${cleanTicker} tidak tersedia`);
        await pm.handleAddTransaction(cleanTicker, a.shares, price);
        return;
      }
      case "sell_stock": {
        const cleanTicker = a.ticker.replace(/\.JK$/, "");
        await pm.handleSellTransaction(cleanTicker, a.shares);
        return;
      }
      case "move_to_gold": {
        pm.handleMoveToGold(a.rupiahAmount);
        return;
      }
      case "set_active_profile": {
        setActiveProfile(a.profileId);
        return;
      }
      case "set_universe": {
        updateConfigValue("universe", a.universe);
        return;
      }
      case "set_topN": {
        updateConfigValue("topNCount", a.n);
        return;
      }
      case "toggle_dca_active": {
        updateConfigValue("dcaActive", a.active);
        return;
      }
      case "add_to_watchlist": {
        const inWatchlist = pm.watchlist.some((w) => w.ticker === a.ticker || w.ticker === `${a.ticker}.JK`);
        if (!inWatchlist) await pm.handleToggleWatchlist(a.ticker);
        return;
      }
      case "remove_from_watchlist": {
        const inWatchlist = pm.watchlist.some((w) => w.ticker === a.ticker || w.ticker === `${a.ticker}.JK`);
        if (inWatchlist) await pm.handleToggleWatchlist(a.ticker);
        return;
      }
      case "sync_backtest_to_portfolio": {
        const profile = engineConfig.profiles.find((p) => p.id === backtestConfig.activeProfileId)
          || engineConfig.profiles.find((p) => p.id === "res")
          || engineConfig.profiles[0];
        syncFromBacktest({
          profile,
          simulationMode: backtestConfig.simulationMode,
          universe: backtestConfig.universe,
          customUniverse: [...backtestConfig.customUniverse],
          topNCount: backtestConfig.topNCount,
          singleTicker: backtestConfig.singleTicker,
          singleSellTrigger: backtestConfig.singleSellTrigger,
          singleBuyTrigger: backtestConfig.singleBuyTrigger,
          enableCrashProtection: backtestConfig.enableCrashProtection,
          crashSensitivity: backtestConfig.crashSensitivity,
          safeHavenAsset: backtestConfig.safeHavenAsset,
          enableCrossover: backtestConfig.enableCrossover,
          reserveBufferPct: backtestConfig.reserveBufferPct,
          enableAdaptiveWeights: backtestConfig.enableAdaptiveWeights,
        });
        return;
      }
      default: {
        const _exhaustive: never = a;
        void _exhaustive;
        return;
      }
    }
  }, [pm, getDynamicStock, engineConfig.profiles, backtestConfig, setActiveProfile, updateConfigValue, syncFromBacktest]);

  const send = useCallback(async (text: string, uiContext?: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: AIChatMessage = { role: "user", content: text };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput("");
    setIsLoading(true);
    if (!isOpen) setIsOpen(true);
    if (isMinimized) setIsMinimized(false);
    try {
      const recentAlerts = notifications.slice(0, 5).map((n) => ({
        rule: n.rule || "manual",
        title: n.title,
        message: n.message,
        timestamp: n.timestamp,
      }));
      const ctx = buildLiveContext({
        engineConfig,
        backtestConfig,
        isBacktestOutOfSync: !isConfigSynced,
        selectedStock,
        portfolio,
        cash,
        uiContext,
        alerts: recentAlerts,
      });
      // Strip tool messages when sending to backend (model only sees user/assistant).
      const history = nextMsgs.filter((m) => m.role !== "tool");
      const result = await askAI(history, ctx);
      setProvider(result.provider);

      // Level 2 — execute read-only tool calls immediately.
      // Level 3 — collect action calls into the pending queue.
      let hasFollowup = false;
      const followupResults: { toolCallId: string; name: string; result: any; error?: string }[] = [];
      for (const tc of result.toolCalls) {
        if (READ_ONLY_TOOLS.has(tc.name)) {
          const r = await executeTool(tc);
          followupResults.push(r);
          hasFollowup = true;
        } else if (ACTION_TOOLS.has(tc.name) && actionRegistry[tc.name]) {
          const action = actionRegistry[tc.name](tc.args);
          addPendingAction(buildPendingAction(action));
        }
      }

      // Display assistant text first.
      if (result.content) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.content }]);
      }

      // Append tool results inline so the user sees what was read.
      for (const r of followupResults) {
        const summary = r.error
          ? `⚠ ${r.name}: ${r.error}`
          : `📊 ${r.name} → ${summariseToolResult(r.name, r.result)}`;
        setMessages((prev) => [...prev, { role: "tool", content: summary, toolCallId: r.toolCallId }]);
      }

      // Re-ask AI for a follow-up answer that incorporates the tool results.
      if (hasFollowup && result.content) {
        try {
          const followupHistory = [
            ...history,
            { role: "assistant" as const, content: result.content },
            ...followupResults.map((r) => ({
              role: "tool" as const,
              content: r.error ? `ERROR: ${r.error}` : JSON.stringify(r.result).slice(0, 4000),
              toolCallId: r.toolCallId,
            })),
          ];
          const followupRaw = await api.post<{ content: string; provider?: string }>(
            "/api/ai/chat",
            { messages: followupHistory.map((m) => ({ role: m.role, content: m.content })), context: ctx }
          );
          const followupText = followupRaw.content || "";
          const { cleanText: followupClean, toolCalls: followupCalls } = extractToolCalls(followupText);
          setProvider(followupRaw.provider || "unknown");
          if (followupClean) {
            setMessages((prev) => [...prev, { role: "assistant", content: followupClean }]);
          }
          // Surface any new action tool calls from the followup.
          for (const tc of followupCalls) {
            if (ACTION_TOOLS.has(tc.name) && actionRegistry[tc.name]) {
              const action = actionRegistry[tc.name](tc.args);
              addPendingAction(buildPendingAction(action));
            }
          }
        } catch {
          /* followup is best-effort */
        }
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Maaf, terjadi kendala: ${e.message || "gagal menghubungi AI"}.` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, isOpen, isMinimized, engineConfig, backtestConfig, isConfigSynced, selectedStock, portfolio, cash, notifications, executeTool, buildPendingAction, actionRegistry, addPendingAction]);

  useEffect(() => {
    if (!pendingExplain) return;
    const label = pendingExplain.label;
    send(
      `Jelaskan panel/angka "${label}": apa artinya dan dari mana sistem menghitungnya? Ringkas saja dulu.`,
      label
    );
    clearExplain();
  }, [pendingExplain, send, clearExplain]);

  const clearHistory = useCallback(() => {
    setMessages([WELCOME]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const quickPrompts: { label: string; query: string }[] = useMemo(() => [
    { label: "Ringkas pasar", query: "Ringkas kondisi pasar IHSG saat ini dan implikasinya buat keputusan saya. Ringkas." },
    { label: "Jelaskan regime", query: "Jelaskan status regime saat ini dan kenapa sistem memilih action ini. Ringkas." },
    { label: "Cek portofolio", query: "Tolong cek portofolio saya sekarang — berapa nilai total, P&L, dan kondisi tiap posisi?" },
    { label: "BPS sekarang", query: "Berapa BPS (Buy Pressure Score) saya sekarang? Action apa yang disarankan?" },
    ...(selectedStock
      ? [{ label: `Analisa ${selectedStock.ticker}`, query: `Analisa ringkas saham ${selectedStock.ticker} (${selectedStock.name}) berdasarkan angka live-nya.` }]
      : []),
  ], [selectedStock]);

  // ── Render ────────────────────────────────────────────────────

  if (!isOpen) {
    const proactiveCount = proactiveAlerts.length;
    const totalUnread = unreadCount + proactiveCount;
    return (
      <button
        onClick={() => { setIsOpen(true); setUnreadCount(0); }}
        className="fixed bottom-6 right-6 z-[999] w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-600 text-black shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center justify-center cursor-pointer group"
        aria-label="Buka AI Chat"
      >
        <Bot className="w-6 h-6" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
        {proactiveCount > 0 && (
          <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-amber-500 text-black text-[10px] font-bold flex items-center justify-center shadow-md">
            <Bell className="w-3 h-3" />
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col" style={{ width: "380px", maxHeight: "620px" }}>
      <div className={`bg-surface-alt border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${isMinimized ? "h-auto" : "flex-1 max-h-[620px]"}`}
        style={{ background: "#0a0a0a" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/15 text-cyan-400 flex items-center justify-center border border-cyan-500/20 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-heading font-bold flex items-center gap-1.5" style={{ color: "#fff" }}>Quantbit AI</h4>
            <p className="text-label" style={{ color: "#7a7a7a" }}>
              {selectedStock ? `Konteks: ${selectedStock.ticker} · ` : ""}sadar-sistem & live
              {provider && provider !== "dev-mock" ? ` · ${provider}` : ""}
            </p>
          </div>
          <button
            onClick={clearHistory}
            title="Hapus riwayat chat"
            className="p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            style={{ color: "#7a7a7a" }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer" style={{ color: "#7a7a7a" }}>
            {isMinimized ? <ChevronDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer" style={{ color: "#7a7a7a" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {!isMinimized && (
          <>
            {/* Messages */}
            <div ref={containerRef} className="flex-1 overflow-y-auto space-y-3 p-3 scrollbar-thin" style={{ minHeight: "300px", maxHeight: "400px" }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 w-full ${msg.role === "user" ? "ml-auto flex-row-reverse max-w-[88%]" : msg.role === "tool" ? "mx-auto max-w-[92%]" : "mr-auto max-w-[96%]"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-cyan-500 text-black" : msg.role === "tool" ? "bg-white/5" : "bg-white/10"}`} style={{ color: msg.role === "user" ? "#000" : "#fff" }}>
                    {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : msg.role === "tool" ? <HelpCircle className="w-3 h-3 text-cyan-400" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`px-3 py-2 rounded-xl text-body leading-relaxed flex-1 overflow-hidden ${msg.role === "user" ? "bg-cyan-950/40 rounded-tr-none border border-cyan-500/20" : msg.role === "tool" ? "bg-cyan-500/5 rounded-md border border-cyan-500/10" : "bg-white/[0.03] rounded-tl-none border border-white/5"}`} style={{ color: msg.role === "user" ? "#fff" : "rgba(255,255,255,0.9)" }}>
                    {msg.role === "user" ? <div className="whitespace-pre-line">{msg.content}</div> : <MarkdownRenderer content={msg.content} />}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2 max-w-[88%] mr-auto">
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0" style={{ color: "#00c9a5" }}>
                    <Bot className="w-3.5 h-3.5 animate-pulse" />
                  </div>
                  <div className="px-3 py-2 rounded-xl rounded-tl-none bg-white/[0.02] border border-white/10 flex items-center gap-1.5" style={{ color: "#7a7a7a" }}>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#00c9a5" }} /> Menganalisis...
                  </div>
                </div>
              )}

              {/* Inline action approval cards (Level 3) */}
              {pendingActions.map((p) => (
                <AIActionApprovalCard
                  key={p.id}
                  pending={p}
                  onApprove={async (pending) => {
                    await executeAIAction(pending);
                    approveAction(p.id);
                  }}
                  onReject={() => rejectAction(p.id)}
                />
              ))}
            </div>

            {/* Quick prompts */}
            {messages.filter((m) => m.role !== "tool").length <= 1 && !isLoading && (
              <div className="px-3 pb-2 pt-1 border-t border-white/5">
                <span className="text-label uppercase font-bold tracking-widest flex items-center gap-1 mb-1.5" style={{ color: "#7a7a7a" }}>
                  <HelpCircle className="w-3 h-3" style={{ color: "#00c9a5" }} /> Cepat
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => send(p.query)}
                      className="text-caption bg-white/5 hover:bg-cyan-950/30 px-2.5 py-1.5 rounded-lg border border-white/10 transition-all cursor-pointer"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                      <span className="hover:text-cyan-300">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-white/5 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Tanya apa saja… (mis. 'Risk 85 dari mana?', 'beli BBCA 100')"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)}
                disabled={isLoading}
                className="flex-1 text-body px-3 py-2.5 bg-white/5 focus:bg-white/[0.08] rounded-lg outline-none border border-white/10 transition-all disabled:opacity-50"
                style={{ color: "#fff" }}
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || isLoading}
                aria-label="Kirim pertanyaan"
                className="w-9 h-9 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-black flex items-center justify-center shrink-0 disabled:opacity-40 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function summariseToolResult(name: string, result: any): string {
  if (result == null) return "(no data)";
  switch (name) {
    case "get_portfolio_state": {
      const positions = result.positions?.length ?? 0;
      return `${positions} posisi, kas Rp ${(result.cash ?? 0).toLocaleString("id-ID")}`;
    }
    case "get_bps_now":
      return `BPS ${result.score}/100, action=${result.action}, deploy=${result.deployPct}%`;
    case "get_regime_details":
      return `status=${result.status}, action=${result.action}, risk=${result.risk}`;
    case "get_ticker_metrics":
      return result.found === false
        ? `Ticker ${result.ticker} tidak ditemukan`
        : `${result.ticker} (${result.name}) @ Rp ${result.currentPrice?.toLocaleString("id-ID") ?? "?"}`;
    case "get_market_history":
      return `${result.last} hari IHSG`;
    case "get_backtest_config":
      return `profile=${result.activeProfileId}, mode=${result.simulationMode}, topN=${result.topNCount}`;
    case "get_engine_config":
      return `profile=${result.activeProfileId} (${result.activeProfileName}), mode=${result.simulationMode}`;
    case "get_active_universe":
      return result.mode === "custom" ? `${result.tickers?.length ?? 0} ticker custom` : `mode=${result.mode}`;
    default:
      try { return JSON.stringify(result).slice(0, 200); } catch { return "(data)"; }
  }
}
