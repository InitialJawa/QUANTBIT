import { AnimatePresence, motion } from "motion/react";
import { Wallet, X } from "lucide-react";
import { DigitalWalletUI } from "./DigitalWalletUI";

interface FloatingWalletProps {
  isOpen: boolean;
  onToggle: () => void;
  cash: number;
  goldShares: number;
  tradeLogs: any[];
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number) => void;
  onMoveToGold: (amount: number) => void;
  onSellGold: (shares: number) => void;
}

export function FloatingWallet({
  isOpen,
  onToggle,
  cash,
  goldShares,
  tradeLogs,
  onDeposit,
  onWithdraw,
  onMoveToGold,
  onSellGold,
}: FloatingWalletProps) {
  return (
    <>
      <button
        onClick={onToggle}
        className="fixed bottom-24 right-6 z-[999] w-14 h-14 rounded-full bg-cyan-500 hover:bg-cyan-600 text-black shadow-lg hover:shadow-cyan-500/25 transition-all flex items-center justify-center cursor-pointer group"
        aria-label="Buka Dompet"
      >
        <Wallet className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[998] bg-black/40"
              onClick={onToggle}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 z-[999] h-full w-[380px] border-l border-white/10 shadow-2xl overflow-y-auto"
              style={{ backgroundColor: "#0a0a0a" }}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-white/5" style={{ backgroundColor: "#0a0a0a" }}>
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-body font-bold text-white">Dompet</h3>
                </div>
                <button
                  onClick={onToggle}
                  className="p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3">
                <DigitalWalletUI
                  cash={cash}
                  goldShares={goldShares}
                  tradeLogs={tradeLogs}
                  onDeposit={onDeposit}
                  onWithdraw={onWithdraw}
                  onMoveToGold={onMoveToGold}
                  onSellGold={onSellGold}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
