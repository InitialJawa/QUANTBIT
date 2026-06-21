// ─────────────────────────────────────────────────────────────
// AICockpit — SATU kolom live-chat AI yang menggantikan 3 AI tercerai.
// Context-aware (tahu config, regime, pasar, saham aktif, portfolio).
// Mendengarkan tombol "Jelaskan ini" via AICockpitContext.
// ─────────────────────────────────────────────────────────────
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, Sparkles, HelpCircle } from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { askAI, buildLiveContext, type AIChatMessage } from "../ai/aiClient";
import { useAICockpit } from "../contexts/AICockpitContext";
import { useEngineConfig } from "../contexts/EngineConfigContext";
import type { StockData, PortfolioItem } from "../types";

interface AICockpitProps {
  selectedStock?: StockData;
  portfolio?: PortfolioItem[];
  cash?: number;
  className?: string;
}

const WELCOME: AIChatMessage = {
  role: "assistant",
  content:
    "Halo! Saya **Quantbit AI** — analis yang tahu *isi dapur* sistem ini.\n\n" +
    "Tanya apa saja, termasuk **\"angka ini dihitung dari mana?\"** — saya jelaskan pakai rumus & angka live-mu. " +
    "Klik ikon ❓ di panel mana pun untuk minta penjelasan instan.",
};

export function AICockpit({ selectedStock, portfolio, cash, className }: AICockpitProps) {
  const { pendingExplain, clearExplain } = useAICockpit();
  const { engineConfig } = useEngineConfig();
  const [messages, setMessages] = useState<AIChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [messages, isLoading]);

  const send = async (text: string, uiContext?: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: AIChatMessage = { role: "user", content: text };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput("");
    setIsLoading(true);
    try {
      const ctx = buildLiveContext({ engineConfig, selectedStock, portfolio, cash, uiContext });
      // Kirim tanpa pesan welcome (role assistant pertama) agar history bersih.
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

  // Dengarkan permintaan "Jelaskan ini" dari panel mana pun.
  useEffect(() => {
    if (!pendingExplain) return;
    const label = pendingExplain.label;
    send(
      `Jelaskan panel/angka "${label}": apa artinya dan dari mana sistem menghitungnya? Ringkas saja dulu.`,
      label
    );
    clearExplain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingExplain]);

  const quickPrompts: { label: string; query: string }[] = [
    { label: "Ringkas pasar", query: "Ringkas kondisi pasar IHSG saat ini dan implikasinya buat keputusan saya. Ringkas." },
    { label: "Jelaskan regime", query: "Jelaskan status regime saat ini dan kenapa sistem memilih action ini. Ringkas." },
    ...(selectedStock
      ? [{ label: `Analisa ${selectedStock.ticker}`, query: `Analisa ringkas saham ${selectedStock.ticker} (${selectedStock.name}) berdasarkan angka live-nya.` }]
      : []),
  ];

  return (
    <div className={className ?? "bg-[#0A0A0A] bg-card-gradient-alt rounded-2xl border border-white/10 flex flex-col h-full min-h-[400px]"}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <h4 className="text-heading font-bold text-primary flex items-center gap-1.5">Quantbit AI</h4>
          <p className="text-label text-tertiary truncate">
            {selectedStock ? `Konteks: ${selectedStock.ticker} · ` : ""}sadar-sistem & live
            {provider && provider !== "dev-mock" ? ` · ${provider}` : ""}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto space-y-3 p-3 scrollbar-thin">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 w-full ${msg.role === "user" ? "ml-auto flex-row-reverse max-w-[88%]" : "mr-auto max-w-[96%]"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-emerald-500 text-black" : "bg-white/10 text-white"}`}>
              {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div className={`px-3 py-2 rounded-xl text-body leading-relaxed flex-1 overflow-hidden ${msg.role === "user" ? "bg-emerald-950/40 text-white rounded-tr-none border border-emerald-500/20" : "bg-white/[0.03] text-white/90 rounded-tl-none border border-white/5"}`}>
              {msg.role === "user" ? <div className="whitespace-pre-line">{msg.content}</div> : <MarkdownRenderer content={msg.content} />}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-2 max-w-[88%] mr-auto">
            <div className="w-6 h-6 rounded-full bg-white/5 text-emerald-400 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="px-3 py-2 rounded-xl rounded-tl-none bg-white/[0.02] text-tertiary text-caption flex items-center gap-1.5 border border-white/10">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menganalisis...
            </div>
          </div>
        )}
      </div>

      {/* Quick prompts (hanya saat awal) */}
      {messages.length === 1 && !isLoading && (
        <div className="px-3 pb-2 pt-1 border-t border-white/5">
          <span className="text-label uppercase font-bold text-tertiary tracking-widest flex items-center gap-1 mb-1.5">
            <HelpCircle className="w-3 h-3 text-emerald-400" /> Cepat
          </span>
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => send(p.query)}
                className="text-caption bg-white/5 hover:bg-emerald-950/30 hover:text-emerald-300 px-2.5 py-1.5 rounded-lg border border-white/10 text-white/70 transition-all cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-white/5 flex items-center gap-2">
        <input
          type="text"
          placeholder="Tanya apa saja… (mis. 'Risk 85 dari mana?')"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          disabled={isLoading}
          className="flex-1 text-body px-3 py-2.5 bg-white/5 focus:bg-white/[0.08] rounded-lg outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 border border-white/10 transition-all text-white disabled:opacity-50"
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
    </div>
  );
}
