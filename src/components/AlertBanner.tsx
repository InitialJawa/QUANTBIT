import { motion, AnimatePresence } from "motion/react";
import "./AlertBannerStyles.css";
import { EX, MKT } from "../marketData";
import type { PortfolioItem } from "../types";
import { ShieldAlert, X } from "lucide-react";

// ... (rest of file unchanged) 
                <ShieldAlert className="w-3.5 h-3.5" />


interface AlertBannerProps {
  isIHSGInCrisis: boolean;
  hideAlertBanner: boolean;
  portfolio: PortfolioItem[];
  onDismiss: () => void;
  onGoToLedger: () => void;
}

export function AlertBanner({
  isIHSGInCrisis,
  hideAlertBanner,
  portfolio,
  onDismiss,
  onGoToLedger,
}: AlertBannerProps) {
  const portfolioExits = portfolio.filter(item => {
    const cleanT = item.ticker.toUpperCase().replace(".JK", "");
    const match = EX.find(e => e.ticker.toUpperCase().replace(".JK", "") === cleanT);
    return match && (match.exit_state === "EXIT" || match.exit_state === "EXIT RISK");
  });

  const isVisible = !hideAlertBanner && (isIHSGInCrisis || portfolioExits.length > 0);
  const isCrash = isIHSGInCrisis;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[100] max-w-sm w-full"
        >
          <div
            className={`relative overflow-hidden border rounded-lg p-3 ${
              isCrash ? "alert-banner-crash border-red-900/20" : "alert-banner-warning border-[#089981]/20"
            }`}
          >
            <div className="relative flex items-start gap-2.5">
              {/* Icon */}
              <div
                className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${
                  isCrash
                    ? "bg-[#f23645]/15 text-[#f23645]"
                    : "bg-[#089981]/15 text-[#089981]"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h4
                    className={`text-caption font-black uppercase tracking-widest font-mono flex items-center gap-1.5 ${
                      isCrash ? "text-[#f23645]" : "text-[#22c55e]"
                    }`}
                  >
                    {isCrash ? "Sinyal Krisis Makro" : "Peringatan Rebalancing"}
                    <span className="flex h-1.5 w-1.5 relative">
                      <span
                        className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          isCrash ? "bg-[#f23645]" : "bg-[#22c55e]"
                        }`}
                      />
                      <span
                        className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                          isCrash ? "bg-[#f23645]" : "bg-[#089981]"
                        }`}
                      />
                    </span>
                  </h4>
                  <button
                    onClick={onDismiss}
                    className={`p-0.5 rounded transition-colors cursor-pointer ${
                      isCrash
                        ? "text-[#f23645]/50 hover:text-[#f23645]"
                        : "text-[#089981]/50 hover:text-[#089981]"
                    }`}
                    title="Tutup"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {isCrash ? (
                  <p className="text-label text-zinc-400 leading-relaxed">
                    IHSG turun <strong className="text-[#f23645] font-mono">{MKT.ihsg.monthly.toFixed(2)}%</strong> — hentikan beli baru, alokasi ke cash/emas, tunggu crossing MA.
                  </p>
                ) : (
                  <p className="text-label text-zinc-400 leading-relaxed">
                    Aset <strong className="text-[#089981]">{portfolioExits.map(x => x.ticker.toUpperCase().replace(".JK", "")).join(", ")}</strong> memicu kriteria keluar.
                  </p>
                )}

                <div className="flex justify-end pt-1.5">
                  <button
                    onClick={onGoToLedger}
                    className={`text-label font-bold uppercase tracking-widest px-3 py-1 rounded font-sans transition-all cursor-pointer ${
                      isCrash
                        ? "bg-[#f23645] hover:bg-[#d42d3d] text-white"
                        : "bg-[#089981] hover:bg-[#077f71] text-white"
                    }`}
                  >
                    Buka Ledger
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
