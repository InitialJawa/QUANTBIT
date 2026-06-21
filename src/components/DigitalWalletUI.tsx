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
    <div className={`flex flex-col ${isMobile ? "fixed inset-0 z-[60]" : "w-full"}`} style={{ backgroundColor: '#1e222d' }}>
      <div className="px-3 py-2 border-b border-white/[0.04] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Wallet className="w-3.5 h-3.5 text-[#787b86]" />
          <h2 className="text-[10px] font-medium text-[#787b86] uppercase tracking-wider">Dompet</h2>
        </div>
        {isMobile && (
          <button onClick={onCloseMobile} className="p-1 text-[#5d6080] hover:text-[#d1d4dc] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="px-3 py-2 border-b border-white/[0.04] shrink-0">
        <div className="text-[8px] text-[#5d6080] uppercase tracking-wider mb-0.5">Total</div>
        <div className="text-sm font-medium text-[#d1d4dc]">Rp {totalBalance.toLocaleString("id-ID")}</div>
        <div className="flex items-center gap-3 mt-1 text-[9px] font-mono">
          <span className="text-[#787b86]">Kas: Rp {cash.toLocaleString("id-ID")}</span>
          <span className="text-[#787b86]">Emas: {goldShares.toFixed(4)} gr</span>
        </div>
      </div>

      <div className="flex border-b border-white/[0.04] shrink-0">
        {(["rupiah", "emas", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setNominalStr(""); }}
            className={`flex-1 py-1.5 text-[8px] font-medium uppercase tracking-wider transition-all ${
              activeTab === tab ? "text-[#089981] border-b border-[#089981]" : "text-[#5d6080] hover:text-[#787b86]"
            }`}
          >
            {tab === "rupiah" && "Kas"}
            {tab === "emas" && "Emas"}
            {tab === "history" && "Riwayat"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-3">
        <AnimatePresence mode="wait">
          {(activeTab === "rupiah" || activeTab === "emas") && (
            <motion.div
              key="transact"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-2"
            >
              <input
                type="text"
                value={nominalStr}
                onChange={(e) => setNominalStr(e.target.value)}
                placeholder={activeTab === "rupiah" ? "Rp" : "Gram"}
                className="w-full rounded px-2.5 py-1.5 text-[10px] font-mono outline-none transition-colors placeholder:text-[#5d6080]"
                style={{ backgroundColor: '#131722', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d4dc' }}
              />

              <div className="flex gap-1 flex-wrap">
                {activeTab === "rupiah" ? (
                  <>
                    {[100000, 1000000, 5000000].map((val) => (
                      <button key={val} onClick={() => setNominalStr(val.toString())}
                        className="px-2 py-1 rounded text-[8px] font-mono transition-colors"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#787b86' }}
                      >+{val.toLocaleString("id-ID")}</button>
                    ))}
                    <button onClick={() => setNominalStr(cash.toString())}
                      className="px-2 py-1 rounded text-[8px] font-mono ml-auto transition-colors"
                      style={{ backgroundColor: 'rgba(8,153,129,0.15)', color: '#089981' }}>MAX</button>
                  </>
                ) : (
                  <>
                    {[0.5, 1, 5].map((val) => (
                      <button key={val} onClick={() => setNominalStr(val.toString())}
                        className="px-2 py-1 rounded text-[8px] font-mono transition-colors"
                        style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#787b86' }}
                      >+{val}</button>
                    ))}
                    <button onClick={() => setNominalStr((cash / MKT.gold.value).toFixed(4))}
                      className="px-2 py-1 rounded text-[8px] font-mono transition-colors"
                      style={{ backgroundColor: 'rgba(8,153,129,0.15)', color: '#089981' }}>MAX BELI</button>
                    <button onClick={() => setNominalStr(goldShares.toString())}
                      className="px-2 py-1 rounded text-[8px] font-mono transition-colors"
                      style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#787b86' }}>MAX JUAL</button>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-1">
                {activeTab === "rupiah" ? (
                  <>
                    <button onClick={() => handleAction("deposit")}
                      className="py-1.5 rounded text-[8px] font-medium transition-opacity"
                      style={{ backgroundColor: '#089981', color: '#fff' }}>Deposit</button>
                    <button onClick={() => handleAction("withdraw")}
                      className="py-1.5 rounded text-[8px] font-medium transition-colors"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#787b86' }}>Tarik</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => handleAction("buyGold")}
                      className="py-1.5 rounded text-[8px] font-medium transition-opacity"
                      style={{ backgroundColor: '#089981', color: '#fff' }}>Beli</button>
                    <button onClick={() => handleAction("sellGold")}
                      className="py-1.5 rounded text-[8px] font-medium transition-colors"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: '#787b86' }}>Jual</button>
                  </>
                )}
              </div>

              {notification && (
                <div className={`px-2 py-1.5 rounded text-[8px] font-medium ${notification.type === "success" ? "text-[#089981]" : "text-[#f23645]"}`}
                  style={{ backgroundColor: notification.type === "success" ? 'rgba(8,153,129,0.1)' : 'rgba(242,54,69,0.1)' }}>
                  {notification.message}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div key="history" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>
              {recentLogs.length > 0 ? recentLogs.map((log) => (
                <div key={log.id} className="py-1.5 flex items-center justify-between border-b border-white/[0.02]">
                  <div>
                    <div className="text-[8px] text-[#787b86] font-medium">{log.type === "DEPOSIT" ? "Deposit" : log.type === "WITHDRAWAL" ? "Withdraw" : log.type === "BUY_GOLD" ? "Beli Emas" : "Jual Emas"}</div>
                    <div className="text-[7px] text-[#5d6080] font-mono">{new Date(log.timestamp).toLocaleString("id-ID", { day: "2-digit", month: "short" })}</div>
                  </div>
                  <div className="text-[9px] font-mono text-[#787b86]">{log.type.includes("GOLD") ? `${log.shares.toFixed(4)} gr` : `Rp ${log.shares.toLocaleString("id-ID")}`}</div>
                </div>
              )) : (
                <div className="py-6 text-center text-[#5d6080] text-[8px]">Kosong</div>
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
