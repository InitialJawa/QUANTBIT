import { X, Award, FileSpreadsheet } from "lucide-react";
import { SearchableSelect } from "./SearchableSelect";
import { StockData } from "../types";

interface BacktestParamsModalProps {
  open: boolean;
  onClose: () => void;
  simulationMode: "algo" | "single";
  setSimulationMode: (m: "algo" | "single") => void;
  numStocks: 1 | 3 | 5;
  setNumStocks: (n: 1 | 3 | 5) => void;
  simUniverse: "all" | "idx80" | "idx30" | "lq45";
  setSimUniverse: (u: "all" | "idx80" | "idx30" | "lq45") => void;
  backtestConfigType: "prod" | "res";
  setBacktestConfigType: (c: "prod" | "res") => void;
  simTicker: string;
  setSimTicker: (t: string) => void;
  visibleStocks: StockData[];
  singleSellTrigger: number;
  setSingleSellTrigger: (v: number) => void;
  singleBuyTrigger: number;
  setSingleBuyTrigger: (v: number) => void;
  simStartDate: string;
  setSimStartDate: (d: string) => void;
  simEndDate: string;
  setSimEndDate: (d: string) => void;
  todayWIBStr: string;
  isMarketClosedDate: (d: string) => "weekend" | "holiday" | null;
  algoCapital: string;
  setAlgoCapital: (c: string) => void;
  formatRupiah: (v: number) => string;
  reserveBufferPct: number;
  setReserveBufferPct: (v: number) => void;
  enableCrossover: boolean;
  setEnableCrossover: (v: boolean) => void;
  enableCrashProtection: boolean;
  setEnableCrashProtection: (v: boolean) => void;
  crashSensitivity: number;
  setCrashSensitivity: (v: number) => void;
  safeHavenAsset: "emas" | "kas";
  setSafeHavenAsset: (a: "emas" | "kas") => void;
  isBacktesting: boolean;
  handleRunAlgoBacktest: () => void;
  handleDownloadCSV: () => void;
}

export function BacktestParamsModal({
  open, onClose,
  simulationMode, setSimulationMode,
  numStocks, setNumStocks,
  simUniverse, setSimUniverse,
  backtestConfigType, setBacktestConfigType,
  simTicker, setSimTicker,
  visibleStocks,
  singleSellTrigger, setSingleSellTrigger,
  singleBuyTrigger, setSingleBuyTrigger,
  simStartDate, setSimStartDate,
  simEndDate, setSimEndDate,
  todayWIBStr,
  isMarketClosedDate,
  algoCapital, setAlgoCapital,
  formatRupiah,
  reserveBufferPct, setReserveBufferPct,
  enableCrossover, setEnableCrossover,
  enableCrashProtection, setEnableCrashProtection,
  crashSensitivity, setCrashSensitivity,
  safeHavenAsset, setSafeHavenAsset,
  isBacktesting,
  handleRunAlgoBacktest,
  handleDownloadCSV,
}: BacktestParamsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-12" style={{ backgroundColor: '#000000' }}>
      <div className="w-full max-w-md mx-2 max-h-[85vh] overflow-y-auto" style={{ backgroundColor: '#1e222d', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2 border-b border-white/[0.06]" style={{ backgroundColor: '#1e222d' }}>
          <div className="flex items-center gap-2">
            <Award className="w-3.5 h-3.5" style={{ color: '#089981' }} />
            <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#d1d4dc' }}>Parameter Backtest</span>
          </div>
          <button onClick={onClose} className="p-1 transition-colors" style={{ color: '#5d6080' }}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="p-3 space-y-3">
          <div className="space-y-1.5">
            <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#5d6080' }}>Mode Simulasi</span>
            <div className="flex gap-1.5">
              <button onClick={() => setSimulationMode("algo")}
                className="flex-1 py-1.5 text-[10px] font-medium transition-colors"
                style={{ backgroundColor: simulationMode === "algo" ? 'rgba(8,153,129,0.15)' : 'rgba(255,255,255,0.04)', color: simulationMode === "algo" ? '#089981' : '#787b86', border: simulationMode === "algo" ? '1px solid rgba(8,153,129,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                Algo
              </button>
              <button onClick={() => setSimulationMode("single")}
                className="flex-1 py-1.5 text-[10px] font-medium transition-colors"
                style={{ backgroundColor: simulationMode === "single" ? 'rgba(8,153,129,0.15)' : 'rgba(255,255,255,0.04)', color: simulationMode === "single" ? '#089981' : '#787b86', border: simulationMode === "single" ? '1px solid rgba(8,153,129,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                Single
              </button>
            </div>
          </div>

          {simulationMode === "algo" ? (
            <>
              <div className="space-y-1.5">
                <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#5d6080' }}>Jumlah Saham</span>
                <div className="flex gap-1.5">
                  {[1, 3, 5].map((n) => (
                    <button key={n} onClick={() => setNumStocks(n as 1|3|5)}
                      className="flex-1 py-1.5 text-[10px] font-medium transition-colors"
                      style={{ backgroundColor: numStocks === n ? 'rgba(8,153,129,0.15)' : 'rgba(255,255,255,0.04)', color: numStocks === n ? '#089981' : '#787b86', border: numStocks === n ? '1px solid rgba(8,153,129,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                      Top {n}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#5d6080' }}>Universe</span>
                <div className="flex gap-1.5 flex-wrap">
                  {([["all","Semua"],["idx80","IDX80"],["idx30","IDX30"],["lq45","LQ45"]] as const).map(([k, label]) => (
                    <button key={k} onClick={() => setSimUniverse(k)}
                      className="flex-1 py-1.5 text-[10px] font-medium transition-colors"
                      style={{ backgroundColor: simUniverse === k ? 'rgba(8,153,129,0.15)' : 'rgba(255,255,255,0.04)', color: simUniverse === k ? '#089981' : '#787b86', border: simUniverse === k ? '1px solid rgba(8,153,129,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#5d6080' }}>Strategi</span>
                <div className="flex gap-1.5">
                  <button onClick={() => setBacktestConfigType("prod")}
                    className="flex-1 py-1.5 text-[10px] font-medium transition-colors"
                    style={{ backgroundColor: backtestConfigType === "prod" ? 'rgba(8,153,129,0.15)' : 'rgba(255,255,255,0.04)', color: backtestConfigType === "prod" ? '#089981' : '#787b86', border: backtestConfigType === "prod" ? '1px solid rgba(8,153,129,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                    Config F
                  </button>
                  <button onClick={() => setBacktestConfigType("res")}
                    className="flex-1 py-1.5 text-[10px] font-medium transition-colors"
                    style={{ backgroundColor: backtestConfigType === "res" ? 'rgba(8,153,129,0.15)' : 'rgba(255,255,255,0.04)', color: backtestConfigType === "res" ? '#089981' : '#787b86', border: backtestConfigType === "res" ? '1px solid rgba(8,153,129,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                    Config B
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#5d6080' }}>Pilih Saham</span>
                <SearchableSelect
                  options={visibleStocks.map(s => ({ value: s.ticker, label: `${s.ticker} - ${s.name}` }))}
                  value={simTicker}
                  onChange={setSimTicker}
                  theme="emerald"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#5d6080' }}>Jual Turun {singleSellTrigger}%</span>
                <input type="range" min="1" max="25" value={singleSellTrigger}
                  onChange={e => setSingleSellTrigger(Number(e.target.value))}
                  className="w-full accent-emerald-500" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#5d6080' }}>Beli Naik {singleBuyTrigger}%</span>
                <input type="range" min="1" max="25" value={singleBuyTrigger}
                  onChange={e => setSingleBuyTrigger(Number(e.target.value))}
                  className="w-full accent-emerald-500" />
              </div>
            </>
          )}

          <div className="space-y-1.5 pt-1 border-t border-white/[0.04]">
            <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#5d6080' }}>Rentang Waktu</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[8px] font-medium block mb-0.5" style={{ color: '#5d6080' }}>Mulai</label>
                <input type="date" value={simStartDate} min="2000-01-03" max={simEndDate}
                  onChange={e => setSimStartDate(e.target.value)}
                  className="w-full text-[10px] p-1.5 outline-none font-mono"
                  style={{ backgroundColor: '#131722', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d4dc' }} />
              </div>
              <div>
                <label className="text-[8px] font-medium block mb-0.5" style={{ color: '#5d6080' }}>Sampai</label>
                <input type="date" value={simEndDate} min={simStartDate} max={todayWIBStr}
                  onChange={e => setSimEndDate(e.target.value)}
                  className="w-full text-[10px] p-1.5 outline-none font-mono"
                  style={{ backgroundColor: '#131722', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d4dc' }} />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] font-medium uppercase tracking-wider block" style={{ color: '#5d6080' }}>Modal Awal</label>
            <input type="text" value={algoCapital.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
              onChange={e => { const n = e.target.value.replace(/[^0-9]/g, ""); setAlgoCapital(n); }}
              className="w-full text-[10px] p-1.5 outline-none font-mono"
              style={{ backgroundColor: '#131722', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d4dc' }} />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[9px]">
              <span className="font-medium uppercase tracking-wider" style={{ color: '#5d6080' }}>Buffer Kas</span>
              <span style={{ color: '#089981' }}>{reserveBufferPct}%</span>
            </div>
            <input type="range" min="0" max="30" step="5" value={reserveBufferPct}
              onChange={e => setReserveBufferPct(Number(e.target.value))}
              className="w-full accent-emerald-500" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#5d6080' }}>Rotasi Saham Jelek</span>
            <div className="flex gap-1.5">
              <button onClick={() => setEnableCrossover(true)}
                className="flex-1 py-1.5 text-[10px] font-medium transition-colors"
                style={{ backgroundColor: enableCrossover ? 'rgba(8,153,129,0.15)' : 'rgba(255,255,255,0.04)', color: enableCrossover ? '#089981' : '#787b86', border: enableCrossover ? '1px solid rgba(8,153,129,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                Rank &lt; 7
              </button>
              <button onClick={() => setEnableCrossover(false)}
                className="flex-1 py-1.5 text-[10px] font-medium transition-colors"
                style={{ backgroundColor: !enableCrossover ? 'rgba(242,54,69,0.15)' : 'rgba(255,255,255,0.04)', color: !enableCrossover ? '#f23645' : '#787b86', border: !enableCrossover ? '1px solid rgba(242,54,69,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                Tanpa
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#5d6080' }}>Proteksi Crash</span>
            <div className="flex gap-1.5">
              <button onClick={() => setEnableCrashProtection(!enableCrashProtection)}
                className="px-2 py-1 text-[9px] font-medium transition-colors"
                style={{ backgroundColor: enableCrashProtection ? 'rgba(8,153,129,0.15)' : 'rgba(255,255,255,0.04)', color: enableCrashProtection ? '#089981' : '#787b86', border: '1px solid rgba(255,255,255,0.06)' }}>
                {enableCrashProtection ? "ON" : "OFF"}
              </button>
              <select value={crashSensitivity} onChange={e => setCrashSensitivity(Number(e.target.value))}
                disabled={!enableCrashProtection}
                className="flex-1 text-[10px] p-1 outline-none disabled:opacity-40"
                style={{ backgroundColor: '#131722', border: '1px solid rgba(255,255,255,0.08)', color: '#d1d4dc' }}>
                <option value="3">Sensitif (3% / 5 hari)</option>
                <option value="5">Normal (5% / 5 hari)</option>
                <option value="8">Moderat (8% / 5 hari)</option>
                <option value="10">Konservatif (10% / 5 hari)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[9px] font-medium uppercase tracking-wider" style={{ color: '#5d6080' }}>Safe Haven</span>
            <div className="flex gap-1.5">
              <button onClick={() => setSafeHavenAsset("emas")} disabled={!enableCrashProtection}
                className="flex-1 py-1.5 text-[10px] font-medium transition-colors disabled:opacity-40"
                style={{ backgroundColor: safeHavenAsset === "emas" ? 'rgba(240,165,0,0.15)' : 'rgba(255,255,255,0.04)', color: safeHavenAsset === "emas" ? '#f0a500' : '#787b86', border: '1px solid rgba(255,255,255,0.06)' }}>
                Emas
              </button>
              <button onClick={() => setSafeHavenAsset("kas")} disabled={!enableCrashProtection}
                className="flex-1 py-1.5 text-[10px] font-medium transition-colors disabled:opacity-40"
                style={{ backgroundColor: safeHavenAsset === "kas" ? 'rgba(8,153,129,0.15)' : 'rgba(255,255,255,0.04)', color: safeHavenAsset === "kas" ? '#089981' : '#787b86', border: '1px solid rgba(255,255,255,0.06)' }}>
                Kas
              </button>
            </div>
          </div>

          <div className="pt-1 space-y-1.5">
            <button onClick={handleRunAlgoBacktest} disabled={isBacktesting}
              className="w-full py-2 text-[10px] font-medium transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#089981', color: '#fff' }}>
              {isBacktesting ? "Processing..." : "Jalankan Backtest"}
            </button>
            <button onClick={handleDownloadCSV}
              className="w-full py-2 text-[10px] font-medium transition-colors flex items-center justify-center gap-1.5"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#787b86', border: '1px solid rgba(255,255,255,0.06)' }}>
              <FileSpreadsheet className="w-3 h-3" style={{ color: '#089981' }} />
              Unduh CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
