import { useState, useRef, useEffect } from "react";
import { StockData } from "../types";
import { Send, Sparkles, User, HelpCircle, Bot, CornerDownLeft, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIAssistantProps {
  stock: StockData;
}

export function AIAssistant({ stock }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Selamat datang! I am your Indonesia Stock Intelligence analyst. I specialize in IDX company analysis, financial statements audits, and macroeconomic trends. 
      
How can I assist you with **PT ${stock.name} (${stock.ticker})** today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const presets = [
    { label: "Analyze Debt Margin", query: `Analyze PT ${stock.name}'s balance sheet safety and its Debt to Equity pattern over 2023-2026.` },
    { label: "BI Interest Rate Impact", query: `How do changes in the BI-Rate (Bank Indonesia interest rate) and inflation affect PT ${stock.name} or general ${stock.sector} sector?` },
    { label: "Audit Profit Trend", query: `Evaluate PT ${stock.name}'s profit margins (such as Net income vs Revenue conversion) from the recent financial report metrics.` },
  ];

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          selectedStock: stock,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get response from Gemini advisor");
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch (error: any) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Maaf, I encountered an issue: ${error.message || "Failed to process question. Please verify your GEMINI_API_KEY in Settings."}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="ai-assistant-card" className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 flex flex-col h-[550px] shadow-sm">
      {/* Header */}
      <div id="ai-assistant-heading" className="flex items-center gap-3 pb-4 border-b border-white/5 mb-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-emerald-400 border border-white/10">
          <Bot className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5 font-sans">
            Gemini Securities Analyst
            <span className="text-[10px] bg-emerald-950/40 text-emerald-450 text-emerald-400 border border-emerald-900/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
              Advising
            </span>
          </h4>
          <p className="text-xs text-white/40">Consulting on {stock.ticker} & IDX Macro trends</p>
        </div>
      </div>

      {/* Message Stream */}
      <div 
        id="messages-viewport"
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin"
      >
        {messages.map((msg, index) => (
          <div
            key={index}
            id={`chat-msg-${index}`}
            className={`flex gap-3 max-w-[85%] ${
              msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              msg.role === "user" ? "bg-emerald-500 text-black" : "bg-white/10 text-white"
            }`}>
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
              msg.role === "user" 
                ? "bg-emerald-950/40 text-white rounded-tr-none border border-emerald-500/20" 
                : "bg-white/[0.03] text-white/90 rounded-tl-none border border-white/5"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 max-w-[85%] mr-auto">
            <div className="w-8 h-8 rounded-full bg-white/5 text-emerald-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-emerald-450 animate-pulse" />
            </div>
            <div className="p-4 rounded-2xl rounded-tl-none bg-white/[0.02] text-white/50 text-xs flex items-center gap-1.5 border border-white/10 select-none">
              <Loader2 className="w-4 h-4 text-emerald-455 animate-spin" /> Inquiring Gemini reasoning model...
            </div>
          </div>
        )}
      </div>

      {/* Preset / Suggestions */}
      {messages.length === 1 && !isLoading && (
        <div id="ai-presets-box" className="mt-4 pt-3 border-t border-white/5">
          <span className="text-[10px] uppercase font-bold text-white/40 tracking-widest block mb-2 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-emerald-400" /> Frequent Inquiries
          </span>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset, idx) => (
              <button
                key={idx}
                id={`preset-btn-${idx}`}
                onClick={() => handleSend(preset.query)}
                className="text-xs bg-white/5 hover:bg-emerald-950/30 hover:border-emerald-555 hover:text-emerald-300 px-3 py-2 rounded-xl text-left border border-white/10 text-white/70 transition-all font-medium cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <div id="prompt-input" className="mt-4 pt-3 border-t border-white/5 flex items-center gap-2">
        <input
          type="text"
          placeholder={`Ask about PT ${stock.ticker}'s cash flows, market outlook, valuation ratio safety...`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
          disabled={isLoading}
          className="flex-1 text-sm px-4 py-3.5 bg-white/5 focus:bg-white/[0.08] rounded-xl outline-none focus:ring-1 focus:ring-emerald-500 border border-white/10 transition-all text-white disabled:opacity-50"
        />
        <button
          onClick={() => handleSend(input)}
          disabled={!input.trim() || isLoading}
          className="w-11 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black flex items-center justify-center shrink-0 disabled:opacity-40 transition-all cursor-pointer shadow-sm font-semibold"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
