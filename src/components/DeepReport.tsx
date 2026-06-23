import { useState, useMemo } from "react";
import { StockData, AnalysisResult } from "../types";
import { 
  Sparkles, 
  ShieldCheck,
  Target,
  BarChart2,
  Users,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { TickerLogo } from "./TickerLogo";
import { STOCKS_DATA } from "../stocksData";

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
        return "bg-[#00c9a5] text-white";
      case "CAUTIOUSLY_BULLISH":
        return "bg-cyan-600/80 text-white";
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
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-body";
    }
    if (text.includes("elevated") || text.includes("fairly") || text.includes("average")) {
      return "bg-amber-500/10 text-amber-400 border-amber-500/20 text-body";
    }
    return "bg-rose-500/10 text-rose-400 border-rose-500/20 text-body";
  };

  const priceHistory = useMemo(() => {
    const data = stock.chartDataDaily?.slice(-90) || [];
    if (data.length < 2) return null;
    const prices = data.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;
    return { data, prices, min, max, range };
  }, [stock.chartDataDaily]);

  const sectorPeers = useMemo(() => {
    const peerSector = stock.sector;
    return STOCKS_DATA
      .filter(s => s.sector === peerSector && s.ticker !== stock.ticker)
      .sort((a, b) => b.marketCap - a.marketCap)
      .slice(0, 5);
  }, [stock.sector, stock.ticker]);

  return (
    <div id="deep-report-container" className="space-y-5">
      {/* Search customization or trigger */}
      {!report && !isGenerating && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-foreground/[0.04] p-6 text-center"
        >
          <div className="w-12 h-12 bg-foreground/5 text-accent rounded-xl flex items-center justify-center mx-auto mb-4 border border-foreground/[0.06]">
            <TickerLogo ticker={stock.ticker.replace(".JK", "")} size="lg" fallbackColor={stock.logoColor} />
          </div>
          <h3 className="text-body font-bold text-foreground mb-2">Belum Ada Analisis</h3>
          <p className="text-caption text-foreground/50 mb-6">
            Analisis kondisi lengkap dari {stock.ticker} menggunakan kecerdasan buatan Gemini.
          </p>

          <div className="space-y-3 mb-6 text-left">
            <label className="block text-label font-bold text-foreground/40 uppercase tracking-widest">
              Tambahkan Fokus Analisis (Opsional)
            </label>
            <input
              type="text"
              placeholder="cth. keberlanjutan dividen, arus kas..."
              value={customFocus}
              onChange={(e) => setCustomFocus(e.target.value)}
              className="w-full text-caption px-4 py-3 rounded-xl border border-foreground/[0.06] outline-none focus:ring-1 focus:ring-accent transition-all bg-muted text-foreground placeholder:text-foreground/30"
            />
          </div>

          <button
            onClick={handleGenerateClick}
            className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-background font-bold px-6 py-3 rounded-xl text-caption uppercase tracking-wider transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Buat Analisis Saham Gemini AI
          </button>
          
          {error && (
            <div className="mt-4 p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl text-label text-rose-400">
              {error}
            </div>
          )}
        </motion.div>
      )}

      {/* Generating Loader */}
      {isGenerating && (
        <div className="bg-card rounded-2xl border border-foreground/[0.04] p-12 text-center flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-foreground/[0.06] border-t-accent rounded-full animate-spin"></div>
            <Sparkles className="w-6 h-6 text-accent absolute top-3 left-3 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-foreground text-caption">Memproses Data Finansial</h4>
            <p className="text-label text-foreground/40 mt-1 animate-pulse">
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
          className="space-y-5"
        >
          {/* Executive Summary Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Recommendation Card */}
            <div className="bg-card rounded-2xl border border-foreground/[0.04] p-5 flex flex-col justify-between">
              <div>
                <span className="text-label uppercase font-bold text-foreground/40 tracking-widest">
                  Analisis Skenario
                </span>
                <h4 className="text-caption font-semibold text-foreground/80 mt-1">Sikap Pasar</h4>
              </div>
              <div className="my-4">
                <span className={"inline-flex px-3 py-1.5 rounded-lg text-caption font-bold uppercase " + getStanceBadgeColor(report.stance)}>
                  {report.stance.replace("_", " ")}
                </span>
              </div>
              <div className="text-label text-foreground/40 flex items-center gap-1.5 pt-3 border-t border-foreground/[0.04]">
                <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                Prediksi data terkalkulasi
              </div>
            </div>

            {/* Fair Value Pricing */}
            <div className="bg-card rounded-2xl border border-foreground/[0.04] p-5 flex flex-col justify-between">
              <div>
                <span className="text-label uppercase font-bold text-foreground/40 tracking-widest">
                  Valuasi Harga
                </span>
                <h4 className="text-caption font-semibold text-foreground/80 mt-1">Harga Wajar Saham</h4>
              </div>
              <div className="my-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-label text-foreground/40">Harga Wajar:</span>
                  <span className="text-body font-bold text-accent font-mono">
                    Rp {report.fairValue.estimatedValue?.toLocaleString("id-ID") || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-baseline mt-1.5">
                  <span className="text-label text-foreground/40">Harga Saat Ini:</span>
                  <span className="text-label font-semibold text-foreground/80 font-mono">
                    Rp {stock.currentPrice.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-foreground/[0.04] flex items-center justify-between">
                <span className="text-label text-foreground/40 font-medium uppercase tracking-wider">
                  Status Valuasi:
                </span>
                <span className={"text-label font-bold px-2 py-0.5 rounded-full " + (
                  report.fairValue.stance === "UNDERVALUED"
                    ? "bg-cyan-500/10 text-cyan-400"
                    : report.fairValue.stance === "OVERVALUED"
                    ? "bg-rose-500/10 text-rose-400"
                    : "bg-amber-500/10 text-amber-400"
                )}>
                  {report.fairValue.stance?.replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Safety margin indicator */}
            <div className="bg-card rounded-2xl border border-foreground/[0.04] p-5 flex flex-col justify-between">
              <div>
                <span className="text-label uppercase font-bold text-foreground/40 tracking-widest">
                  Margin Valuasi
                </span>
                <h4 className="text-caption font-semibold text-foreground/80 mt-1">Batas Aman Harga</h4>
              </div>
              <div className="my-2">
                {(() => {
                  const est = report.fairValue.estimatedValue || 1;
                  const cur = stock.currentPrice;
                  const discount = ((est - cur) / est) * 100;
                  const isUnder = discount > 0;
                  return (
                    <div>
                      <div className={"text-xl font-bold font-mono " + (isUnder ? "text-cyan-400" : "text-amber-400")}>
                        {isUnder ? "+" + Math.round(discount) + "%" : Math.round(discount) + "%"}
                      </div>
                      <p className="text-label text-foreground/40 mt-1">
                        {isUnder 
                          ? "Harga wajar lebih tinggi dari harga saat ini" 
                          : "Harga lebih mahal dari perhitungan fundamental nilai perusahaan"}
                      </p>
                    </div>
                  );
                })()}
              </div>
              <div className="text-label text-foreground/40 flex items-center gap-1.5 pt-2 border-t border-foreground/[0.04]">
                <Target className="w-3.5 h-3.5 text-accent" />
                Sinyal probabilitas ketepatan AI
              </div>
            </div>

          </div>

          {/* Core Analysis Paragraph */}
          <div className="bg-card rounded-2xl border border-foreground/[0.04] p-5">
            <h4 className="text-label uppercase font-bold text-foreground/40 tracking-widest mb-2.5">
              Rangkuman Laporan Singkat
            </h4>
            <div className="text-caption leading-relaxed text-foreground/70 whitespace-pre-line">
              {report.summary}
            </div>
          </div>

          {/* SWOT Grid */}
          <div>
            <h4 className="text-caption font-bold text-foreground/70 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              Matriks Strategi dan Kondisi (SWOT)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              
              <div className="bg-card rounded-xl border border-accent/20 p-4 space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00c9a5]" />
                  <span className="text-label font-bold text-accent uppercase tracking-wide">
                    Kekuatan (S)
                  </span>
                </div>
                <ul className="text-label text-foreground/70 space-y-1.5 list-disc pl-4 leading-relaxed">
                  {report.swotAnalysis.strengths?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-card rounded-xl border border-rose-500/20 p-4 space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span className="text-label font-bold text-rose-400 uppercase tracking-wide">
                    Kelemahan (W)
                  </span>
                </div>
                <ul className="text-label text-foreground/70 space-y-1.5 list-disc pl-4 leading-relaxed">
                  {report.swotAnalysis.weaknesses?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-card rounded-xl border border-blue-500/20 p-4 space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span className="text-label font-bold text-blue-400 uppercase tracking-wide">
                    Peluang (O)
                  </span>
                </div>
                <ul className="text-label text-foreground/70 space-y-1.5 list-disc pl-4 leading-relaxed">
                  {report.swotAnalysis.opportunities?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-card rounded-xl border border-purple-500/20 p-4 space-y-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                  <span className="text-label font-bold text-purple-400 uppercase tracking-wide">
                    Ancaman (T)
                  </span>
                </div>
                <ul className="text-label text-foreground/70 space-y-1.5 list-disc pl-4 leading-relaxed">
                  {report.swotAnalysis.threats?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

            </div>
          </div>

          {/* Price History Chart */}
          {priceHistory && (
            <div className="bg-card rounded-2xl border border-foreground/[0.04] p-5">
              <h4 className="text-label uppercase font-bold text-foreground/40 tracking-widest mb-3 flex items-center gap-2">
                <BarChart2 className="w-3.5 h-3.5 text-accent" />
                Harga 90 Hari Terakhir
              </h4>
              <div className="relative h-32">
                <svg width="100%" height="100%" viewBox={`0 0 ${priceHistory.prices.length} 100`} preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00c9a5" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#00c9a5" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points={priceHistory.prices.map((p, i) => {
                      const x = (i / (priceHistory.prices.length - 1)) * 100;
                      const y = 100 - ((p - priceHistory.min) / priceHistory.range) * 100;
                      return `${x},${y}`;
                    }).join(" ") + ` 100,100 0,100`}
                    fill="url(#priceGrad)"
                  />
                  <polyline
                    points={priceHistory.prices.map((p, i) => {
                      const x = (i / (priceHistory.prices.length - 1)) * 100;
                      const y = 100 - ((p - priceHistory.min) / priceHistory.range) * 100;
                      return `${x},${y}`;
                    }).join(" ")}
                    fill="none"
                    stroke="#00c9a5"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div className="absolute top-0 left-0 text-label text-foreground/30 font-mono">
                  Rp {priceHistory.max.toLocaleString("id-ID")}
                </div>
                <div className="absolute bottom-0 left-0 text-label text-foreground/30 font-mono">
                  Rp {priceHistory.min.toLocaleString("id-ID")}
                </div>
              </div>
            </div>
          )}

          {/* Peer Comparison */}
          {sectorPeers.length > 0 && (
            <div className="bg-card rounded-2xl border border-foreground/[0.04] p-5 overflow-hidden">
              <h4 className="text-label uppercase font-bold text-foreground/40 tracking-widest mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-accent" />
                Perbandingan Sektor ({stock.sector})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-foreground/[0.04] text-label font-bold text-foreground/40 uppercase tracking-widest">
                      <th className="pb-2 pr-3">Saham</th>
                      <th className="pb-2 px-3 text-right">Harga</th>
                      <th className="pb-2 px-3 text-right">Chg%</th>
                      <th className="pb-2 px-3 text-right">PE</th>
                      <th className="pb-2 px-3 text-right">PBV</th>
                      <th className="pb-2 pl-3 text-right">MCap</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-foreground/[0.03] text-label">
                    <tr className="bg-accent/5">
                      <td className="py-2 pr-3 font-bold text-accent">{stock.ticker.replace(".JK", "")}</td>
                      <td className="py-2 px-3 text-right font-mono text-foreground/80">{stock.currentPrice.toLocaleString("id-ID")}</td>
                      <td className={`py-2 px-3 text-right font-mono font-bold ${stock.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {stock.change >= 0 ? "+" : ""}{stock.change.toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-foreground/70">{stock.peRatio?.toFixed(1) || "-"}</td>
                      <td className="py-2 px-3 text-right font-mono text-foreground/70">{stock.pbRatio?.toFixed(1) || "-"}</td>
                      <td className="py-2 pl-3 text-right font-mono text-foreground/60">{stock.marketCap?.toLocaleString("id-ID") || "-"}</td>
                    </tr>
                    {sectorPeers.map(peer => (
                      <tr key={peer.ticker} className="hover:bg-foreground/[0.02] transition-colors">
                        <td className="py-2 pr-3 font-medium text-foreground/80">{peer.ticker.replace(".JK", "")}</td>
                        <td className="py-2 px-3 text-right font-mono text-foreground/70">{peer.currentPrice.toLocaleString("id-ID")}</td>
                        <td className={`py-2 px-3 text-right font-mono font-bold ${peer.change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {peer.change >= 0 ? "+" : ""}{peer.change.toFixed(1)}%
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-foreground/60">{peer.peRatio?.toFixed(1) || "-"}</td>
                        <td className="py-2 px-3 text-right font-mono text-foreground/60">{peer.pbRatio?.toFixed(1) || "-"}</td>
                        <td className="py-2 pl-3 text-right font-mono text-foreground/50">{peer.marketCap?.toLocaleString("id-ID") || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Key ratio Audit Table */}
          <div className="bg-card rounded-2xl border border-foreground/[0.04] p-5 overflow-hidden">
            <h4 className="text-label uppercase font-bold text-foreground/40 tracking-widest mb-4">
              Rincian Rasio Valuasi Indikator
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-foreground/[0.04] text-label font-bold text-foreground/40 uppercase tracking-widest">
                    <th className="pb-3 pr-4">Nama Rasio/Indikator</th>
                    <th className="pb-3 px-4">Nilai Indikator (Hasil AI)</th>
                    <th className="pb-3 pl-4">Keputusan Analis AI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-foreground/[0.03] text-label">
                  {report.keyRatios?.map((ratio, index) => (
                    <tr key={index} className="hover:bg-foreground/[0.02] transition-colors">
                      <td className="py-3 px-1 font-medium text-foreground/90">{ratio.label}</td>
                      <td className="py-3 px-4 font-mono font-bold text-accent">{ratio.value}</td>
                      <td className="py-3 pl-4">
                        <span className={"inline-flex px-2 py-0.5 rounded-full text-label font-bold border " + getAssessmentBadge(ratio.assessment)}>
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
          <div className="bg-card border border-foreground/[0.04] rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-5 translate-x-12 translate-y-12 pointer-events-none">
              <Target className="w-72 h-72" />
            </div>
            <div className="relative z-10 space-y-2">
              <span className="inline-flex items-center gap-1.5 bg-accent/10 border border-accent/20 text-accent text-label px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">
                <Target className="w-3 h-3" />
                Pandangan AI Kedepan
              </span>
              <h4 className="text-body font-bold text-foreground pt-1">Pertumbuhan & Potensi Saham</h4>
              <p className="text-caption text-foreground/60 leading-relaxed">
                {report.growthOutlook}
              </p>
            </div>
          </div>

          {/* Generate again button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-accent/20 bg-accent/5">
            <p className="text-label text-foreground/50">
              Analisis di-generate AI pada: <strong className="text-foreground/70">{new Date(report.timestamp).toLocaleString("id-ID")}</strong>.
            </p>
            <button
              onClick={() => onGenerateReport(customFocus || undefined)}
              className="px-4 py-2 bg-accent hover:bg-accent-hover text-background rounded-lg text-label font-bold flex items-center gap-1.5 cursor-pointer uppercase tracking-wider transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Periksa Ulang Laporan Ini
            </button>
          </div>

        </motion.div>
      )}
    </div>
  );
}
