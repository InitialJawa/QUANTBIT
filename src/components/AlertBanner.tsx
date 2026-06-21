import { X } from "lucide-react";
import { EX, MKT } from "../marketData";
import type { PortfolioItem } from "../types";

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

  if (hideAlertBanner || (!isIHSGInCrisis && portfolioExits.length === 0)) return null;

  return (
    <div id="global-ledger-warning-banner" className="relative p-4 pr-12 bg-[#1a1015] border border-rose-800/30 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
      <button
        id="close-ledger-warning-banner"
        onClick={onDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg bg-[#2a1520] hover:bg-[#3a2028] text-rose-300 hover:text-rose-200 transition-colors cursor-pointer"
        title="Tutup banner peringatan"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      <div className="flex gap-3 items-start">
        <span className="text-xl shrink-0">⚠️</span>
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#FCA5A5] font-mono flex items-center gap-2">
            {isIHSGInCrisis ? "Sinyal Krisis Makro Terdeteksi!" : "Rekomendasi Rebalancing Aktif!"}
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
          </h4>
          <p className="text-[11px] text-[#A0A0A0] leading-relaxed font-sans">
            {isIHSGInCrisis ? (
              <>
                IHSG turun <strong className="text-rose-400 font-mono">{MKT.ihsg.monthly.toFixed(2)}%</strong> dalam sebulan. Skenario defensif: hentikan pembelian baru, alokasi ke cash atau emas hingga konfirmasi pemulihan. Skenario agresif: akumulasi jika IHSG crossing di atas MA20/MA50.
              </>
            ) : (
              <>
                Aset dalam ledger aktif Anda (<strong className="text-amber-400">{portfolioExits.map(x => x.ticker.toUpperCase().replace(".JK", "")).join(', ')}</strong>) telah memicu kriteria keluar (<strong className="text-rose-400 font-mono">EXIT / EXIT RISK</strong>) pada rotasi kuantitatif hari ini.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex gap-2 w-full md:w-auto shrink-0 md:self-center">
        <button
          id="action-btn-go-ledger"
          onClick={onGoToLedger}
          className="w-full md:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded-xl font-sans uppercase tracking-widest transition-all shadow-md hover:scale-[1.02] cursor-pointer"
        >
          Buka Live Ledger &amp; Amankan Aset
        </button>
      </div>
    </div>
  );
}
