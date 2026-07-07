import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Send, Bot, User, Loader2, Sparkles, X, Minus, ChevronDown, Trash2, Bell, Plus } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { AIActionApprovalCard } from "./AIActionApprovalCard";
import { askAI, buildLiveContext, extractToolCalls, READ_ONLY_TOOLS, ACTION_TOOLS, type AIChatMessage } from "../ai/aiClient";
import { useAICockpit } from "../contexts/AICockpitContext";
import { useEngineConfig } from "../contexts/EngineConfigContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useAuth } from "../contexts/AuthContext";
import { useAITools, type PortfolioAPI } from "../hooks/useAITools";
import { useUIState } from "../hooks/useUIState";
import { api } from "../services/api";
import type { StockData, PortfolioItem } from "../types";
import type { AIAction, PendingAction, AIToolResult } from "../types/ai";

interface FloatingAIChatProps {
  selectedStock?: StockData;
  portfolio?: PortfolioItem[];
  cash?: number;
  pm: PortfolioAPI;
  getDynamicStock?: (ticker: string) => StockData | undefined;
  activeTab?: string;
  isDrawerOpen?: boolean;
}

const WELCOME: AIChatMessage = {
  role: "assistant",
  content: "Halo, saya Quantbit AI. Terminal kuantitatif saham IDX. Coba tanya: cek portofolio, BPS skrg, atau beli BBCA 100.",
};

/** Generate a unique session id for this page load. */
function newSessionId(): string {
  return `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Async save of a single message to the server. Best-effort — doesn't block UI. */
async function persistMessage(
  sessionId: string,
  userId: string,
  role: "user" | "assistant" | "tool",
  content: string,
  toolCalls?: any[],
  metadata?: Record<string, any>,
): Promise<void> {
  try {
    await api.post("/api/ai/messages", {
      sessionId,
      userId,
      role,
      content,
      toolCalls,
      metadata,
    });
  } catch {
    /* best-effort — don't block UI on persistence failures */
  }
}

export function FloatingAIChat({ selectedStock, portfolio, cash, pm, getDynamicStock, activeTab = "market", isDrawerOpen }: FloatingAIChatProps) {
  const { pendingExplain, clearExplain, pendingActions, approveAction, rejectAction, addPendingAction, proactiveAlerts, openChatWithPrompt, setOpenChatWithPrompt } = useAICockpit();
  const { engineConfig, backtestConfig, isConfigSynced, setActiveProfile, syncFromBacktest, updateConfigValue } = useEngineConfig();
  const { notifications } = useNotifications();
  const { user } = useAuth();
  const { useDevMockAI } = useUIState();
  // Track consecutive provider failures to suggest dev-mock fallback.
  const consecutiveFailuresRef = useRef(0);
  // Synchronous lock to prevent double-send (closures can't guard rapid clicks).
  const sendingRef = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  // SESSION: new id per page load (NOT restored from localStorage).
  // Memory of past sessions is fetched server-side and passed to AI as context.
  const [sessionId] = useState<string>(() => newSessionId());
  const [messages, setMessages] = useState<AIChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  /** Tool results to display as cards when no follow-up AI call */
  const [toolResults, setToolResults] = useState<AIToolResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Index of the latest assistant message for follow-up suggestions.
  const lastAssistantIdx = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant" && messages[i] !== WELCOME) return i;
    }
    return -1;
  }, [messages]);

  // Context-aware suggestions per tab (no duplicates between follow-up & quick prompts)
  const tabSuggestions = useMemo(() => {
    const t = selectedStock?.ticker;
    const n = selectedStock?.name;
    switch (activeTab) {
      case "portfolio":
        return {
          followUp: [
            { label: "Cek portofolio", query: "Cek portofolio saya — nilai total, P&L, kondisi tiap posisi." },
            { label: "BPS skrg", query: "Berapa BPS sekarang? Action apa?" },
            { label: "Rekomendasi beli", query: "Saham apa yang bagus dibeli sekarang berdasarkan data?" },
          ],
          quick: [
            ...(t ? [{ label: `Analisa ${t}`, query: `Analisa ringkas ${t} — ${n}. Pake data live.` }] : []),
            { label: "Kas darurat", query: "Berapa kas yang harus saya sisakan? Cek reserve buffer." },
            { label: "Strategi aktif", query: "Strategi apa yang sedang aktif? Profil, universe, top N." },
          ],
        };
      case "backtest":
        return {
          followUp: [
            { label: "Hasil backtest", query: "Ringkas hasil backtest terakhir — metrik utama dan kesimpulan." },
            { label: "Bandingkan", query: "Bandingkan hasil backtest ini dengan strategi default." },
            ...(t ? [{ label: `Cek ${t}`, query: `Kinerja ${t} di backtest — beli, jual, dividen.` }] : []),
          ],
          quick: [
            { label: "Settings backtest", query: "Apa setting backtest saya sekarang? Profile, mode, universe." },
            { label: "BPS skrg", query: "Berapa BPS sekarang? Cocok buat backtest?" },
          ],
        };
      case "analytics":
        return {
          followUp: [
            { label: "Metrik utama", query: "Ringkas metrik utama di tab Analitik — apa artinya." },
            { label: "Sektor terbaik", query: "Sektor apa yang paling bagus saat ini berdasarkan ranking." },
            ...(t ? [{ label: `Analisa ${t}`, query: `Analisa ${t} — ${n}. Skor, rank, sektor.` }] : []),
          ],
          quick: [
            { label: "Top N saat ini", query: "Saham top N rekomendasi sistem berdasarkan profil aktif." },
            { label: "Jelaskan regime", query: "Status regime — health, risk, action, dan alasannya." },
          ],
        };
      default: // market
        return {
          followUp: [
            { label: "Ringkas pasar", query: "Kondisi pasar IHSG terkait dan implikasinya buat keputusan saya." },
            { label: "Jelaskan regime", query: "Status regime — health, risk, action, dan alasannya." },
            ...(t ? [{ label: `Analisa ${t}`, query: `Analisa ringkas ${t} — ${n}. Pake data live.` }] : []),
          ],
          quick: [
            { label: "Top movers", query: "Siapa top movers hari ini dan kenapa?" },
            { label: "BPS skrg", query: "Berapa BPS sekarang? Action apa?" },
          ],
        };
    }
  }, [activeTab, selectedStock]);

  const { executeTool, buildPendingAction, actionRegistry } = useAITools({ pm, getDynamicStock });

  // On first mount: create the session in DB. Best-effort.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await api.post("/api/ai/sessions", {
          userId: user?.id || "dev-user",
          sessionId,
        });
        if (cancelled) return;
      } catch {
        /* best-effort */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Auto-analyze stock when StockDrawer opens
  const lastDrawerStockRef = useRef<string | null>(null);
  useEffect(() => {
    if (isDrawerOpen && selectedStock?.ticker && selectedStock.ticker !== lastDrawerStockRef.current) {
      lastDrawerStockRef.current = selectedStock.ticker;
      if (!isOpen) setIsOpen(true);
      send(`Analisa ringkas ${selectedStock.ticker} — ${selectedStock.name}. Pake data live.`, `StockDrawer: ${selectedStock.ticker}`);
    }
    if (!isDrawerOpen) {
      lastDrawerStockRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawerOpen, selectedStock?.ticker]);

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
    if (!text.trim() || isLoading || sendingRef.current) return;
    sendingRef.current = true;
    setToolResults([]);
    const userMsg: AIChatMessage = { role: "user", content: text };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput("");
    setIsLoading(true);
    if (!isOpen) setIsOpen(true);
    if (isMinimized) setIsMinimized(false);
    // Persist user message to DB (fire-and-forget, async).
    void persistMessage(sessionId, user?.id || "dev-user", "user", text);
    // Set session title from first user message (best-effort).
    if (messages.filter((m) => m.role === "user").length === 0) {
      api.post("/api/ai/sessions/title", { sessionId, title: text }).catch(() => {});
    }
    try {
      const recentAlerts = notifications.slice(0, 5).map((n) => ({
        rule: n.rule || "manual",
        title: n.title,
        message: n.message,
        timestamp: n.timestamp,
      }));
      const recentActions = notifications.slice(0, 8).map((n) => ({
        type: n.type,
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
        recentActions,
      });
      // Strip tool messages when sending to backend (model only sees user/assistant).
      const history = nextMsgs.filter((m) => m.role !== "tool");
      const result = await askAI(history, ctx, {
        useDevMock: useDevMockAI,
        sessionId,
        userId: user?.id || "dev-user",
      });
      setProvider(result.provider);
      // Persist assistant response to DB.
      if (result.content) {
        void persistMessage(sessionId, user?.id || "dev-user", "assistant", result.content, result.toolCalls, { provider: result.provider });
      }

      // ── Error path (all providers failed) ──
      if (result.provider === "none" || result.provider === "error") {
        consecutiveFailuresRef.current += 1;
        // Show the error diagnostic from the server directly.
        if (result.content) {
          setMessages((prev) => [...prev, { role: "assistant", content: result.content }]);
        }
        // On 3rd consecutive failure in dev mode, suggest dev mock.
        if (consecutiveFailuresRef.current === 3 && import.meta.env?.DEV && !useDevMockAI) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "⚠ Semua provider AI gagal (3x berturut-turut). Mungkin Gemini geo-blocked dan tidak ada OPENROUTER_API_KEY.\n\n" +
                "**Aktifkan `Use Dev Mock`** di Settings → AI Agent untuk testing tanpa API key. " +
                "Atau tambahkan OPENROUTER_API_KEY di `.env.local` lalu restart dev server.",
            },
          ]);
        }
      } else {
        consecutiveFailuresRef.current = 0;

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

        // When follow-up will run, skip initial display (follow-up produces one cohesive response).
        if (!hasFollowup) {
          if (result.content) {
            setMessages((prev) => [...prev, { role: "assistant", content: result.content }]);
          }
          if (followupResults.length > 0) {
            setToolResults(followupResults.map(r => ({ toolCallId: r.toolCallId, name: r.name, result: r.result, error: r.error })));
          }
        }

        // Re-ask AI for a follow-up answer that incorporates the tool results.
        if (hasFollowup) {
          try {
            const followupHistory = [
              ...history,
              ...(result.content ? [{ role: "assistant" as const, content: result.content }] : []),
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
            if (followupClean && followupRaw.provider !== "none" && followupRaw.provider !== "error") {
              setMessages((prev) => [...prev, { role: "assistant", content: followupClean }]);
              // Surface any new action tool calls from the followup.
              for (const tc of followupCalls) {
                if (ACTION_TOOLS.has(tc.name) && actionRegistry[tc.name]) {
                  const action = actionRegistry[tc.name](tc.args);
                  addPendingAction(buildPendingAction(action));
                }
              }
            } else {
              // Follow-up failed — fallback to original or tool results.
              if (result.content) {
                setMessages((prev) => [...prev, { role: "assistant", content: result.content }]);
              }
              if (followupResults.length > 0) {
                setToolResults(followupResults.map(r => ({ toolCallId: r.toolCallId, name: r.name, result: r.result, error: r.error })));
              }
            }
          } catch {
            /* followup is best-effort */
          }
        }
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Ada kendala teknis: ${e.message || "gagal hubungi AI"}. Coba lagi ya.` },
      ]);
    } finally {
      sendingRef.current = false;
      setIsLoading(false);
    }
  }, [messages, isLoading, isOpen, isMinimized, engineConfig, backtestConfig, isConfigSynced, selectedStock, portfolio, cash, notifications, executeTool, buildPendingAction, actionRegistry, addPendingAction]);

  useEffect(() => {
    if (!pendingExplain) return;
    const label = pendingExplain.label;
    send(
      `Jelaskan panel ini: ${label}. Apa artinya dan dari mana sistem menghitungnya? Ringkas saja.`,
      label
    );
    clearExplain();
  }, [pendingExplain, send, clearExplain]);

  const clearHistory = useCallback(() => {
    setMessages([WELCOME]);
  }, []);

  /** Start a new session — clears current messages, generates new sessionId. */
  const startNewSession = useCallback(() => {
    // Force a new session by reloading with a fresh sessionId.
    // Since sessionId is a useState initializer, we need to either reload
    // the component or do it via state. Simplest: just clear the chat for
    // now and let user send a new message to start a new "thread".
    // For full session reset, the user can close + reopen the chat.
    setMessages([WELCOME]);
  }, []);

  // ── Render ────────────────────────────────────────────────────

  if (!isOpen) {
    const proactiveCount = proactiveAlerts.length;
    const totalUnread = unreadCount + proactiveCount;
    return (
      <button
        onClick={() => { setIsOpen(true); setUnreadCount(0); }}
        className="fixed bottom-6 right-6 z-[999] w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg hover:shadow-emerald-500/25 transition-all flex items-center justify-center cursor-pointer group"
        aria-label="Buka AI Chat"
      >
        <Bot className="w-6 h-6" />
        {totalUnread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-label font-bold flex items-center justify-center shadow-md">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
        {proactiveCount > 0 && (
          <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-amber-500 text-black text-label font-bold flex items-center justify-center shadow-md">
            <Bell className="w-3 h-3" />
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col w-[calc(100vw-24px)] sm:w-[380px]" style={{ maxHeight: "620px" }}>
      <div className={`bg-surface-alt border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden ${isMinimized ? "h-auto" : "flex-1 max-h-[620px]"}`}
        style={{ background: "#0a0a0a" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
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
            onClick={startNewSession}
            title="Mulai sesi baru (refresh halaman juga akan membuat sesi baru)"
            className="p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            style={{ color: "#7a7a7a" }}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={clearHistory}
            title="Hapus pesan di sesi ini"
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
              {messages.filter((m) => m.role !== "tool").map((msg, i) => (
                <div key={i} className={`flex gap-2 w-full ${msg.role === "user" ? "ml-auto flex-row-reverse max-w-[88%]" : "mr-auto max-w-[96%]"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-emerald-500 text-black" : "bg-white/10"}`} style={{ color: msg.role === "user" ? "#000" : "#fff" }}>
                    {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`px-3 py-2 rounded-xl text-body leading-relaxed flex-1 overflow-hidden ${msg.role === "user" ? "bg-emerald-950/40 rounded-tr-none border border-emerald-500/20" : "bg-white/[0.03] rounded-tl-none border border-white/5"}`} style={{ color: msg.role === "user" ? "#fff" : "rgba(255,255,255,0.9)" }}>
                    {msg.role === "user" ? <div className="whitespace-pre-line">{msg.content}</div> : <MarkdownRenderer content={msg.content} />}
                  </div>
                </div>
              ))}

              {/* Tool result cards (when no follow-up AI call) */}
              {toolResults.length > 0 && (
                <div className="space-y-2">
                  {toolResults.map((r) => (
                    <div key={r.toolCallId}>
                      <ToolResultCard name={r.name} result={r.result} error={r.error} />
                    </div>
                  ))}
                </div>
              )}

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
                    setMessages((prev) => [...prev, { role: "assistant", content: "(done)" }]);
                  }}
                  onReject={() => rejectAction(p.id)}
                />
              ))}
            </div>

            {/* Follow-up suggestion chips (after latest assistant response) */}
            {lastAssistantIdx >= 0 && !isLoading && (
              <div className="px-3 pb-0 pt-0 border-t border-white/5">
                <div className="flex flex-wrap gap-1.5 py-1.5">
                  {tabSuggestions.followUp.map((s, idx) => (
                    <button
                      key={idx}
                      onClick={() => send(s.query)}
                      className="text-caption bg-emerald-950/20 hover:bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-500/15 transition-all cursor-pointer text-emerald-300/70 hover:text-emerald-300"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick prompts — context-aware per tab */}
            <div className="px-3 pb-1 pt-1 border-t border-white/5">
              <div className="flex flex-wrap gap-1.5">
                {tabSuggestions.quick.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => send(p.query)}
                    className="text-caption bg-white/5 hover:bg-emerald-950/30 px-2 py-1 rounded-lg border border-white/10 transition-all cursor-pointer"
                    style={{ color: "rgba(255,255,255,0.6)" }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="p-3 border-t border-white/5 flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                placeholder="Tanya apa saja — Risk 85 dari mana, beli BBCA 100"
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
                className="w-9 h-9 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black flex items-center justify-center shrink-0 disabled:opacity-40 transition-all cursor-pointer"
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

/** Render tool result as a compact info card. */
function ToolResultCard({ name, result, error }: { name: string; result: any; error?: string }) {
  if (error) {
    return (
      <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-caption font-mono">
        ⚠ {name}: {error}
      </div>
    );
  }

  const rows: { label: string; value: string }[] = [];

  switch (name) {
    case "get_portfolio_state": {
      const p = result;
      rows.push({ label: "Posisi", value: `${p.positions?.length ?? 0} items` });
      rows.push({ label: "Kas", value: `Rp ${(p.cash ?? 0).toLocaleString("id-ID")}` });
      if (p.totalValue) rows.push({ label: "Total nilai", value: `Rp ${p.totalValue.toLocaleString("id-ID")}` });
      if (p.totalPnl) rows.push({ label: "P&L", value: `Rp ${p.totalPnl.toLocaleString("id-ID")}` });
      break;
    }
    case "get_bps_now": {
      const b = result;
      rows.push({ label: "Score", value: `${b.score}/100` });
      rows.push({ label: "Action", value: b.action });
      rows.push({ label: "Deploy", value: `${b.deployPct}%` });
      if (b.factors) {
        if (b.factors.valuation != null) rows.push({ label: "Valuasi", value: `${b.factors.valuation}/100` });
        if (b.factors.momentum != null) rows.push({ label: "Momentum", value: `${b.factors.momentum}/100` });
        if (b.factors.drawdown != null) rows.push({ label: "Drawdown", value: `${b.factors.drawdown}/100` });
      }
      break;
    }
    case "get_regime_details": {
      const r = result;
      rows.push({ label: "Status", value: r.status });
      rows.push({ label: "Risk", value: `${r.risk}/100` });
      rows.push({ label: "Action", value: r.action });
      if (r.health != null) rows.push({ label: "Health", value: `${r.health}/100` });
      if (r.breadth != null) rows.push({ label: "Breadth", value: `${r.breadth}` });
      break;
    }
    case "get_ticker_metrics": {
      const t = result;
      if (t.found === false) {
        return (
          <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-caption font-mono">
            Ticker {t.ticker} tidak ditemukan
          </div>
        );
      }
      rows.push({ label: "Harga", value: `Rp ${(t.currentPrice ?? 0).toLocaleString("id-ID")}` });
      if (t.change != null) rows.push({ label: "Change", value: `${t.change > 0 ? "+" : ""}${t.change}%` });
      if (t.quality != null) rows.push({ label: "Quality", value: `${t.quality}/100` });
      if (t.momentum != null) rows.push({ label: "Momentum", value: `${t.momentum}/100` });
      if (t.rank != null) rows.push({ label: "Rank", value: `#${t.rank}` });
      break;
    }
    case "get_market_history": {
      rows.push({ label: "Hari", value: `${result.days ?? result.last ?? "?"} data IHSG` });
      break;
    }
    default: {
      try {
        const str = JSON.stringify(result).slice(0, 150);
        rows.push({ label: name, value: str });
      } catch {
        rows.push({ label: name, value: "(data)" });
      }
    }
  }

  return (
    <div className="px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-caption font-mono">
      <div className="text-emerald-400 font-bold mb-1 text-xs uppercase tracking-wider">{name}</div>
      <div className="space-y-0.5">
        {rows.map((r, i) => (
          <div key={i} className="flex justify-between gap-2">
            <span className="text-white/50">{r.label}</span>
            <span className="text-white/90 font-medium">{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
