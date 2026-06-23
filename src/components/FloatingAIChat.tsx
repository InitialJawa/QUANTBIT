import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, HelpCircle, X, MessageCircle, Minus, ChevronDown } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { askAI, buildLiveContext, type AIChatMessage } from "../ai/aiClient";
import { useAICockpit } from "../contexts/AICockpitContext";
import { useEngineConfig } from "../contexts/EngineConfigContext";
import type { StockData, PortfolioItem } from "../types";

interface FloatingAIChatProps {
  selectedStock?: StockData;
  portfolio?: PortfolioItem[];
  cash?: number;
}

const WELCOME: AIChatMessage = {
  role: "assistant",
  content:
    "Halo! Saya **Quantbit AI** — analis yang tahu *isi dapur* sistem ini.\n\n" +
    "Tanya apa saja, termasuk **\"angka ini dihitung dari mana?\"** — saya jelaskan pakai rumus & angka live-mu. " +
    "Klik ikon ❓ di panel mana pun untuk minta penjelasan instan.",
};

export function FloatingAIChat({ selectedStock, portfolio, cash }: FloatingAIChatProps) {
  const { pendingExplain, clearExplain } = useAICockpit();
  const { engineConfig } = useEngineConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<AIChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isOpen && !isMinimized) setUnreadCount((c) => c + 1);
  }, [messages.length]);

  useEffect(() => {
    if (isOpen && !isMinimized) setUnreadCount(0);
  }, [isOpen, isMinimized]);

  const send = async (text: string, uiContext?: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: AIChatMessage = { role: "user", content: text };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput("");
    setIsLoading(true);
    if (!isOpen) setIsOpen(true);
    if (isMinimized) setIsMinimized(false);
    try {
      const ctx = buildLiveContext({ engineConfig, selectedStock, portfolio, cash, uiContext });
      const history = nextMsgs.filter((m, i) => !(i === 0 && m === WELCOME));
      const { content, provider: prov } = await askAI(history, ctx);
      setProvider(prov);
      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Maaf, terjadi kendala: ${e.message || "gagal menghubungi AI"}.` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!pendingExplain) return;
    const label = pendingExplain.label;
    send(
      `Jelaskan panel/angka "${label}": apa artinya dan dari mana sistem menghitungnya? Ringkas saja dulu.`,
      label
    );
    clearExplain();
  }, [pendingExplain]);

  const quickPrompts: { label: string; query: string }[] = [
    { label: "Ringkas pasar", query: "Ringkas kondisi pasar IHSG saat ini dan implikasinya buat keputusan saya. Ringkas." },
    { label: "Jelaskan regime", query: "Jelaskan status regime saat ini dan kenapa sistem memilih action ini. Ringkas." },
    ...(selectedStock
      ? [{ label: `Analisa ${selectedStock.ticker}`, query: `Analisa ringkas saham ${selectedStock.ticker} (${selectedStock.name}) berdasarkan angka live-nya.` }]
      : []),
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => { setIsOpen(true); setUnreadCount(0); }}
        className="fixed bottom-6 right-6 z-[999] w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-600 text-black shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center justify-center cursor-pointer group"
        aria-label="Buka AI Chat"
      >
        <Bot className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col" style={{ width: "380px", maxHeight: "620px" }}>
      {/* Panel */}
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
                <div key={i} className={`flex gap-2 w-full ${msg.role === "user" ? "ml-auto flex-row-reverse max-w-[88%]" : "mr-auto max-w-[96%]"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-cyan-500 text-black" : "bg-white/10"}`} style={{ color: msg.role === "user" ? "#000" : "#fff" }}>
                    {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`px-3 py-2 rounded-xl text-body leading-relaxed flex-1 overflow-hidden ${msg.role === "user" ? "bg-cyan-950/40 rounded-tr-none border border-cyan-500/20" : "bg-white/[0.03] rounded-tl-none border border-white/5"}`} style={{ color: msg.role === "user" ? "#fff" : "rgba(255,255,255,0.9)" }}>
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
            </div>

            {/* Quick prompts */}
            {messages.length === 1 && !isLoading && (
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
                placeholder="Tanya apa saja… (mis. 'Risk 85 dari mana?')"
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
