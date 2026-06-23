import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { EX, MKT } from "../marketData";
import type { PortfolioItem } from "../types";
import { ShieldAlert, X, ExternalLink } from "lucide-react";

const DISMISS_MS = 8000;

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
  const portfolioExits = portfolio.filter((item) => {
    const cleanT = item.ticker.toUpperCase().replace(".JK", "");
    const match = EX.find(
      (e) => e.ticker.toUpperCase().replace(".JK", "") === cleanT,
    );
    return match && (match.exit_state === "EXIT" || match.exit_state === "EXIT RISK");
  });

  const isVisible = !hideAlertBanner && (isIHSGInCrisis || portfolioExits.length > 0);
  const isCrash = isIHSGInCrisis;

  const [remaining, setRemaining] = useState(DISMISS_MS);
  const [paused, setPaused] = useState(false);
  const startTimeRef = useRef(Date.now());
  const pausedRemainingRef = useRef(DISMISS_MS);
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    const elapsed = Date.now() - startTimeRef.current;
    const left = pausedRemainingRef.current - elapsed;
    if (left <= 0) {
      onDismiss();
      return;
    }
    setRemaining(left);
    rafRef.current = requestAnimationFrame(tick);
  }, [onDismiss]);

  useEffect(() => {
    if (!isVisible) return;
    startTimeRef.current = Date.now();
    pausedRemainingRef.current = DISMISS_MS;
    setRemaining(DISMISS_MS);
    setPaused(false);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isVisible, tick]);

  useEffect(() => {
    if (paused) {
      cancelAnimationFrame(rafRef.current);
      pausedRemainingRef.current = remaining;
    } else if (isVisible) {
      startTimeRef.current = Date.now();
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [paused, isVisible, tick, remaining]);

  const progress = (remaining / DISMISS_MS) * 100;

  const crashTickers = isCrash
    ? ""
    : portfolioExits.map((x) => x.ticker.toUpperCase().replace(".JK", "")).join(", ");

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: 80, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 80, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed top-6 right-6 z-[100] w-[340px]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div
            className={`relative overflow-hidden rounded-xl border shadow-2xl ${
              isCrash
                ? "border-[#f23645]/20 bg-gradient-to-br from-[#f23645]/[0.08] via-[#0a0a0a] to-[#0a0a0a]"
                : "border-[#089981]/20 bg-gradient-to-br from-[#089981]/[0.08] via-[#0a0a0a] to-[#0a0a0a]"
            }`}
          >
            {/* Content */}
            <div className="p-3.5">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isCrash
                      ? "bg-[#f23645]/15 text-[#f23645]"
                      : "bg-[#089981]/15 text-[#089981]"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4
                      className={`text-[11px] font-black uppercase tracking-widest font-mono flex items-center gap-1.5 ${
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
                      className="p-0.5 rounded text-white/30 hover:text-white/70 transition-colors cursor-pointer"
                      title="Tutup"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {isCrash ? (
                    <p className="text-[11px] text-white/35 leading-relaxed">
                      IHSG turun{" "}
                      <strong className="text-[#f23645] font-mono">
                        {MKT.ihsg.monthly.toFixed(2)}%
                      </strong>{" "}
                      — hentikan beli baru, alokasi ke cash/emas, tunggu
                      crossing MA.
                    </p>
                  ) : (
                    <p className="text-[11px] text-white/35 leading-relaxed">
                      Aset{" "}
                      <strong className="text-[#089981]">{crashTickers}</strong>{" "}
                      memicu kriteria keluar.
                    </p>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={onGoToLedger}
                      className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md font-sans transition-all cursor-pointer ${
                        isCrash
                          ? "bg-[#f23645]/15 hover:bg-[#f23645]/25 text-[#f23645]"
                          : "bg-[#089981]/15 hover:bg-[#089981]/25 text-[#089981]"
                      }`}
                    >
                      Buka Ledger <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-0.5 w-full bg-white/5">
              <div
                className={`h-full transition-all ease-linear ${
                  isCrash ? "bg-[#f23645]" : "bg-[#089981]"
                }`}
                style={{
                  width: `${progress}%`,
                  transitionDuration: paused ? "0ms" : "100ms",
                }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
