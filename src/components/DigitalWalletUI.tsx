import React, { useState } from "react";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  History,
  X,
  CreditCard,
  Coins,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MKT } from "../marketData";

interface DigitalWalletUIProps {
  cash: number;
  goldShares: number;
  tradeLogs: any[];
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number) => void;
  onMoveToGold: (amount: number) => void;
  onSellGold: (grams: number) => void;
  isMobile?: boolean;
  onCloseMobile?: () => void;
}

export function DigitalWalletUI({
  cash,
  goldShares,
  tradeLogs,
  onDeposit,
  onWithdraw,
  onMoveToGold,
  onSellGold,
  isMobile,
  onCloseMobile,
}: DigitalWalletUIProps) {
  const [activeTab, setActiveTab] = useState<"rupiah" | "emas" | "history">("rupiah");
  const [nominalStr, setNominalStr] = useState("");
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const goldValue = Math.round(goldShares * MKT.gold.value);
  const totalBalance = cash + goldValue;

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAction = (action: "deposit" | "withdraw" | "buyGold" | "sellGold") => {
    const val = nominalStr.replace(/[^0-9,.]/g, "").replace(",", ".");
    const numVal = parseFloat(val);

    if (isNaN(numVal) || numVal <= 0) {
      showNotification("Masukkan jumlah yang valid!", "error");
      return;
    }

    try {
      if (action === "deposit") onDeposit(numVal);
      else if (action === "withdraw") {
        if (numVal > cash) throw new Error("Saldo kas tidak mencukupi.");
        onWithdraw(numVal);
      } else if (action === "buyGold") {
        const requiredCash = numVal * MKT.gold.value;
        if (requiredCash > cash) {
          throw new Error(`Kas tidak cukup. Butuh Rp ${Math.round(requiredCash).toLocaleString("id-ID")} untuk ${numVal} gr.`);
        }
        onMoveToGold(requiredCash);
      } else if (action === "sellGold") {
        if (numVal > goldShares) throw new Error("Simpanan emas tidak mencukupi.");
        onSellGold(numVal);
      }
      setNominalStr("");
      showNotification("Transaksi diproses.", "success");
    } catch (err: any) {
      showNotification(err.message, "error");
    }
  };

  const recentLogs = tradeLogs
    .filter((log) => ["DEPOSIT", "WITHDRAWAL", "BUY_GOLD", "SELL_GOLD"].includes(log.type))
    .slice(0, 8);

  return (
    <div className={`flex flex-col h-full bg-[#050505] text-[#E0E0E0] ${isMobile ? "fixed inset-0 z-[60]" : "w-full"}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Wallet className="w-5 h-5 text-white/70" />
          <h2 className="text-sm font-semibold tracking-wide uppercase">Dompet RDI</h2>
        </div>
        {isMobile && (
          <button onClick={onCloseMobile} className="p-1 text-white/40 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Global Balance overview (Always visible) */}
      <div className="px-5 py-6 flex flex-col items-center justify-center border-b border-white/5 shrink-0">
        <span className="text-[10px] text-white/40 uppercase tracking-widest mb-1">Total Nilai Aset</span>
        <h3 className="text-3xl font-light tracking-tight text-white flex items-baseline gap-1">
          <span className="text-sm text-white/40">Rp</span>
          {totalBalance.toLocaleString("id-ID")}
        </h3>
        <div className="flex items-center gap-4 mt-3 text-[10px] font-mono whitespace-nowrap">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.02] rounded text-white/60">
            <CreditCard className="w-3 h-3 opacity-50" /> Rp {cash.toLocaleString("id-ID")}
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.02] rounded text-white/60">
            <Coins className="w-3 h-3 opacity-50 text-amber-500" /> {goldShares.toFixed(4)} gr
          </div>
        </div>
      </div>

      {/* Modern minimal tabs */}
      <div className="flex border-b border-white/5 bg-black/20 shrink-0">
        {(["rupiah", "emas", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setNominalStr("");
            }}
            className={`flex-1 py-3 text-[10px] font-semibold uppercase tracking-widest transition-all ${
              activeTab === tab ? "bg-white/5 text-white border-b-2 border-white/40" : "text-white/30 hover:text-white/60"
            }`}
          >
            {tab === "rupiah" && "Kas Tunai"}
            {tab === "emas" && "Emas Fisik"}
            {tab === "history" && "Riwayat"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-5 space-y-6">
        <AnimatePresence mode="wait">
          {(activeTab === "rupiah" || activeTab === "emas") && (
            <motion.div
              key="transact"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-medium text-white/50 uppercase tracking-widest block pl-1">
                  {activeTab === "rupiah" ? "Nominal Transaksi (Rp)" : "Jumlah Gram (gr)"}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={nominalStr}
                    onChange={(e) => setNominalStr(e.target.value)}
                    placeholder={activeTab === "rupiah" ? "Contoh: 1000000" : "Contoh: 1.5"}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3.5 text-sm font-mono text-white outline-none focus:border-white/40 transition-colors placeholder:text-white/20"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
                    {activeTab === "rupiah" ? "IDR" : "Gram"}
                  </div>
                </div>
              </div>

              {/* Quick Input Helpers */}
              <div className="flex gap-2 flex-wrap">
                {activeTab === "rupiah" && (
                  <>
                    {[100000, 1000000, 5000000].map((val) => (
                      <button
                        key={val}
                        onClick={() => setNominalStr(val.toString())}
                        className="px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/5 hover:bg-white/10 text-[10px] font-mono text-white/60 transition-colors"
                      >
                        +{val.toLocaleString("id-ID")}
                      </button>
                    ))}
                    <button
                      onClick={() => setNominalStr(cash.toString())}
                      className="px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/5 hover:bg-white/10 text-[10px] font-mono text-white transition-colors ml-auto"
                    >
                      MAX KAS
                    </button>
                  </>
                )}
                {activeTab === "emas" && (
                  <>
                    {[0.5, 1, 5].map((val) => (
                      <button
                        key={val}
                        onClick={() => setNominalStr(val.toString())}
                        className="px-3 py-1.5 rounded-md bg-white/[0.03] border border-white/5 hover:bg-white/10 text-[10px] font-mono text-white/60 transition-colors"
                      >
                        +{val} gr
                      </button>
                    ))}
                    <button
                      onClick={() => setNominalStr((cash / MKT.gold.value).toFixed(4))}
                      className="px-3 py-1.5 rounded-md bg-white/[0.08] hover:bg-white/20 border border-white/10 text-[10px] font-mono text-white transition-colors ml-auto"
                    >
                      MAX BELI
                    </button>
                    <button
                      onClick={() => setNominalStr(goldShares.toString())}
                      className="px-3 py-1.5 rounded-md bg-white/[0.03] hover:bg-white/10 border border-white/5 text-[10px] font-mono text-white transition-colors"
                    >
                      MAX JUAL
                    </button>
                  </>
                )}
              </div>

              {/* Estimate for Gold */}
              {activeTab === "emas" && !!parseFloat(nominalStr) && (
                <div className="px-4 py-3 bg-[#0A0A0A] border border-dashed border-white/10 rounded-lg text-xs flex justify-between items-center opacity-80">
                  <span className="text-white/50 text-[10px] uppercase tracking-widest">Estimasi Nilai Rupiah</span>
                  <span className="font-mono text-white tracking-widest">
                    Rp {Math.round(parseFloat(nominalStr) * MKT.gold.value).toLocaleString("id-ID")}
                  </span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {activeTab === "rupiah" ? (
                  <>
                    <button
                      onClick={() => handleAction("deposit")}
                      className="py-3 rounded-md bg-white text-black font-semibold text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-colors"
                    >
                      Deposit Kas
                    </button>
                    <button
                      onClick={() => handleAction("withdraw")}
                      className="py-3 rounded-md bg-black border border-white/10 text-white font-semibold text-[10px] uppercase tracking-widest hover:bg-white/5 transition-colors"
                    >
                      Tarik Tunai
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleAction("buyGold")}
                      className="py-3 rounded-md bg-amber-500/90 text-black font-semibold text-[10px] uppercase tracking-widest hover:bg-amber-500 transition-colors"
                    >
                      Beli Emas
                    </button>
                    <button
                      onClick={() => handleAction("sellGold")}
                      className="py-3 rounded-md bg-black border border-white/10 text-white font-semibold text-[10px] uppercase tracking-widest hover:bg-white/5 transition-colors"
                    >
                      Jual Emas
                    </button>
                  </>
                )}
              </div>

              {notification && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`px-4 py-3 rounded-md text-[11px] font-medium tracking-wide flex items-center gap-2 ${notification.type === "success" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${notification.type === "success" ? "bg-emerald-400" : "bg-rose-400"}`} />
                  {notification.message}
                </motion.div>
              )}
              
              <div className="pt-6">
                <p className="text-[10px] text-white/30 text-center leading-relaxed font-mono">
                  Transaksi disimulasikan secara real-time berdasarkan harga acuan pasar saat ini. Saldo Emas dikonversi dalam ukuran gram.
                </p>
              </div>

            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {recentLogs.length > 0 ? (
                recentLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-[#0A0A0A] border border-white/5 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-md ${log.type.includes("BUY") || log.type === "DEPOSIT" ? "bg-white/10 text-white" : "bg-white/[0.03] text-white/40 border border-white/5"}`}>
                        {log.type === "DEPOSIT" ? <ArrowDownRight className="w-3.5 h-3.5" /> : null}
                        {log.type === "WITHDRAWAL" ? <ArrowUpRight className="w-3.5 h-3.5" /> : null}
                        {log.type === "BUY_GOLD" ? <Coins className="w-3.5 h-3.5" /> : null}
                        {log.type === "SELL_GOLD" ? <ArrowUpRight className="w-3.5 h-3.5" /> : null}
                      </div>
                      <div>
                        <h4 className="text-[10px] font-medium uppercase tracking-widest text-white/80">
                          {log.type === "DEPOSIT" && "Deposit Kas"}
                          {log.type === "WITHDRAWAL" && "Withdrawal"}
                          {log.type === "BUY_GOLD" && "Beli Emas"}
                          {log.type === "SELL_GOLD" && "Jual Emas"}
                        </h4>
                        <p className="text-[8px] text-white/30 mt-0.5 font-mono uppercase tracking-widest">
                          {new Date(log.timestamp).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-[11px] font-mono ${log.type.includes("BUY") || log.type === "DEPOSIT" ? "text-white" : "text-white/50"}`}>
                        {log.type.includes("GOLD") ? `${log.shares.toFixed(4)} gr` : `Rp ${log.shares.toLocaleString("id-ID")}`}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-white/20">
                  <History className="w-8 h-8 mb-3 opacity-50" />
                  <p className="text-[10px] uppercase tracking-widest">Data Riwayat Kosong</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}

// Re-export specific sub-icons that weren't in lucide-react standard imports or might be needed
function ShoppingBag(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}
