import { useState } from "react";
import { StockData, AnalysisResult } from "../types";
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Plus, 
  HelpCircle,
  Clock,
  ShieldCheck,
  Target,
  ArrowRightLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TickerLogo } from "./TickerLogo";

interface DeepReportProps {
  stock: StockData;
  report: AnalysisResult | null;
  onGenerateReport: (customFocus?: string) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
}

export function DeepReport({ stock, report, onGenerateReport, isGenerating, error }: DeepReportProps) {
  const [customFocus, setCustomFocus] = useState("");

  const handleGenerateClick = () => {
    onGenerateReport(customFocus.trim() || undefined);
  };

  const getStanceBadgeColor = (stance: string) => {
    switch (stance) {
      case "BULLISH":
        return "bg-emerald-600 text-white";
      case "CAUTIOUSLY_BULLISH":
        return "bg-emerald-500/80 text-white";
      case "NEUTRAL":
        return "bg-amber-500 text-white";
      case "CAUTIOUSLY_BEARISH":
        return "bg-orange-500 text-white";
      case "BEARISH":
        return "bg-rose-600 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getAssessmentBadge = (assessment: string) => {
    const text = assessment.toLowerCase();
    if (text.includes("healthy") || text.includes("strong") || text.includes("undervalued") || text.includes("underpriced") || text.includes("good")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[11px]";
    }
    if (text.includes("elevated") || text.includes("fairly") || text.includes("average")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20 text-[11px]";
    }
    return "bg-rose-500/10 text-rose-400 border-rose-500/20 text-[11px]";
  };

  return (
    <div id="deep-report-container" className="space-y-6">
      {/* Search customization or trigger */}
      {!report && !isGenerating && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#070707] rounded-2xl border border-white/5 p-6 md:p-8 text-center max-w-2xl mx-auto"
        >
          <div className="w-12 h-12 bg-white/5 text-emerald-400 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/10">
            <TickerLogo ticker={stock.ticker.replace(".JK", "")} size="lg" fallbackColor={stock.logoColor} />
          </div>
          <h3 className="text-lg font-serif italic text-white mb-2">Belum Ada Analisis</h3>
          <p className="text-sm text-white/50 mb-6 max-w-md mx-auto">
            Analisis kondisi lengkap dari {stock.ticker} menggunakan kecerdasan buatan Gemini.
          </p>

          <div className="space-y-3 mb-6 text-left max-w-md mx-auto">
            <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest">
              Tambahkan Fokus Analisis (Opsional)
            </label>
            <input
              type="text"
              placeholder="cth. keberlanjutan dividen, arus kas..."
              value={customFocus}
              onChange={(e) => setCustomFocus(e.target.value)}
              className="w-full text-sm px-4 py-3.5 rounded-xl border border-white/10 outline-none focus:ring-1 focus:ring-emerald-500 transition-all bg-white/5 text-white"
            />
          </div>

          <button
            onClick={handleGenerateClick}
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-black px-6 py-3 rounded-xl font-semibold shadow-sm transition-all text-sm cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Buat Analisis Saham Gemini AI
          </button>
          
          {error && (
            <div className="mt-4 p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl text-xs text-rose-400">
              {error}
            </div>
          )}
        </motion.div>
      )}

      {/* Generating Loader */}
      {isGenerating && (
        <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-white/10 border-t-emerald-500 rounded-full animate-spin"></div>
            <Sparkles className="w-6 h-6 text-emerald-400 absolute top-3 left-3 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-white">Memproses Data Finansial</h4>
            <p className="text-xs text-white/40 mt-1 animate-pulse">
              Gemini sedang meninjau fundamental, sentimen pasar, margin, dan valuasi potensial saham ini...
            </p>
          </div>
        </div>
      )}

      {/* Deep Report Display */}
      {report && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Executive Summary Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Recommendation Card */}
            <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest">
                  Analisis Skenario
                </span>
                <h4 className="text-sm font-semibold text-white/80 mt-1">Sikap Pasar</h4>
              </div>
              <div className="my-4">
                <span className={`inline-flex px-4 py-2 rounded-xl text-base font-bold uppercase ${getStanceBadgeColor(report.stance)}`}>
                  {report.stance.replace("_", " ")}
                </span>
              </div>
              <div className="text-xs text-[#E0E0E0]/60 flex items-center gap-1.5 pt-3 border-t border-white/5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Prediksi data terkalkulasi
              </div>
            </div>

            {/* Fair Value Pricing */}
            <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest">
                  Valuasi Harga
                </span>
                <h4 className="text-sm font-semibold text-white/80 mt-1">Harga Wajar Saham</h4>
              </div>
              <div className="my-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-white/40">Harga Wajar:</span>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    Rp {report.fairValue.estimatedValue?.toLocaleString("id-ID") || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-baseline mt-1.5">
                  <span className="text-xs text-white/40">Harga Saat Ini:</span>
                  <span className="text-xs font-semibold text-white/80 font-mono">
                    Rp {stock.currentPrice.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">
                  Status Valuasi:
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  report.fairValue.stance === "UNDERVALUED"
                    ? "bg-emerald-500/10 text-emerald-400"
                    : report.fairValue.stance === "OVERVALUED"
                    ? "bg-rose-500/10 text-rose-400"
                    : "bg-amber-500/10 text-amber-400"
                }`}>
                  {report.fairValue.stance?.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Safety margin indicator */}
            <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 flex flex-col justify-between shadow-sm">
              <div>
                <span className="text-[9px] uppercase font-bold text-white/40 tracking-widest">
                  Margin Valuasi
                </span>
                <h4 className="text-sm font-semibold text-white/80 mt-1">Batas Aman Harga</h4>
              </div>
              <div className="my-2">
                {(() => {
                  const est = report.fairValue.estimatedValue || 1;
                  const cur = stock.currentPrice;
                  const discount = ((est - cur) / est) * 100;
                  const isUnder = discount > 0;
                  return (
                    <div>
                      <div className={`text-2xl font-bold font-mono ${isUnder ? "text-emerald-450 text-emerald-400" : "text-amber-400"}`}>
                        {isUnder ? `+${Math.round(discount)}%` : `${Math.round(discount)}%`}
                      </div>
                      <p className="text-xs text-white/40 mt-1">
                        {isUnder 
                          ? "Harga wajar lebih tinggi dari harga saat ini" 
                          : "Harga lebih mahal dari perhitungan fundamental nilai perusahaan"}
                      </p>
                    </div>
                  );
                })()}
              </div>
              <div className="text-xs text-[#E0E0E0]/65 flex items-center gap-1.5 pt-2 border-t border-white/5">
                <Target className="w-4 h-4 text-emerald-500" />
                Sinyal probabilitas ketepatan AI
              </div>
            </div>

          </div>

          {/* Core Analysis Paragraph */}
          <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 shadow-sm">
            <h4 className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-2.5">
              Rangkuman Laporan Singkat
            </h4>
            <div className="text-sm leading-relaxed text-[#E0E0E0]/80 whitespace-pre-line font-serif">
              {report.summary}
            </div>
          </div>

          {/* SWOT Grid */}
          <div>
            <h4 className="text-sm font-bold text-white/70 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Matriks Strategi dan Kondisi (SWOT)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/20 p-5 space-y-2">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
                  Kekuatan (S)
                </span>
                <ul className="text-xs text-[#E0E0E0]/85 space-y-1.5 list-disc pl-4 leading-relaxed">
                  {report.swotAnalysis.strengths?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-rose-500/5 rounded-xl border border-rose-500/20 p-5 space-y-2">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wide">
                  Kelemahan (W)
                </span>
                <ul className="text-xs text-[#E0E0E0]/85 space-y-1.5 list-disc pl-4 leading-relaxed">
                  {report.swotAnalysis.weaknesses?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-blue-500/5 rounded-xl border border-blue-500/20 p-5 space-y-2">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wide">
                  Peluang (O)
                </span>
                <ul className="text-xs text-[#E0E0E0]/85 space-y-1.5 list-disc pl-4 leading-relaxed">
                  {report.swotAnalysis.opportunities?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-purple-500/5 rounded-xl border border-purple-500/20 p-5 space-y-2">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wide">
                  Ancaman (T)
                </span>
                <ul className="text-xs text-[#E0E0E0]/85 space-y-1.5 list-disc pl-4 leading-relaxed">
                  {report.swotAnalysis.threats?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

            </div>
          </div>

          {/* Key ratio Audit Table */}
          <div className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 shadow-sm overflow-hidden">
            <h4 className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-4">
              Rincian Rasio Valuasi Indikator
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-bold text-white/40 uppercase tracking-widest">
                    <th className="pb-3 pr-4">Nama Rasio/Indikator</th>
                    <th className="pb-3 px-4">Nilai Indikator (Hasil AI)</th>
                    <th className="pb-3 pl-4">Keputusan Analis AI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {report.keyRatios?.map((ratio, index) => (
                    <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-1 font-medium text-white/95">{ratio.label}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">{ratio.value}</td>
                      <td className="py-3 pl-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getAssessmentBadge(ratio.assessment)}`}>
                          {ratio.assessment}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Growth Outlook box */}
          <div className="bg-gradient-to-br from-[#0F0F0F] to-[#050505] border border-white/10 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5 translate-x-12 translate-y-12">
              <Target className="w-72 h-72" />
            </div>
            <div className="relative z-10 space-y-2">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">
                <Target className="w-3.5 h-3.5" />
                Pandangan AI Kedepan
              </span>
              <h4 className="text-lg font-serif italic text-white pt-1">Pertumbuhan & Potensi Saham</h4>
              <p className="text-sm text-white/70 leading-relaxed font-sans">
                {report.growthOutlook}
              </p>
            </div>
          </div>

          {/* Generate again button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10">
            <p className="text-xs text-[#E0E0E0]/60">
              Analisis di-generate AI pada: <strong>{new Date(report.timestamp).toLocaleString("id-ID")}</strong>.
            </p>
            <button
              onClick={() => onGenerateReport(customFocus || undefined)}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-black rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-4" />
              Periksa Ulang Laporan Ini
            </button>
          </div>

        </motion.div>
      )}
    </div>
  );
}
