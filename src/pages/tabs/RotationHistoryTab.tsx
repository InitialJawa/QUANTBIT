import type { StockData } from "../../types";

interface RotationHistoryTabProps {
  stock: StockData;
}

export function RotationHistoryTab({ stock }: RotationHistoryTabProps) {
  const today = new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="border border-white/[0.06] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="text-caption text-white/35 uppercase tracking-wider font-medium">Rotation History</span>
        <span className="text-[10px] text-white/20 font-mono">Data per {today}</span>
      </div>
      <div className="text-center py-12">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/[0.04] flex items-center justify-center">
          <span className="text-white/20 text-lg font-mono">R</span>
        </div>
        <p className="text-white/40 text-sm">
          Data rotasi untuk <span className="font-mono text-white/60">{stock.ticker}</span> akan tersedia setelah pipeline harian berjalan.
        </p>
        {stock.chartDataDaily.length > 0 && (
          <p className="text-white/20 text-xs mt-2">
            Harga saat ini: Rp{stock.currentPrice.toLocaleString("id-ID")}
          </p>
        )}
      </div>
    </div>
  );
}
