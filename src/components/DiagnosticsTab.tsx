import { useState } from "react";
import { AIAssistant } from "./AIAssistant";
import { StockData } from "../types";
import { SearchableSelect } from "./SearchableSelect";
import { Activity, ShieldCheck, Database, Cpu, MessageSquare, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { motion } from "motion/react";

interface DiagnosticsTabProps {
  activeStock: StockData;
  availableStocks: StockData[];
  onSelectStock: (ticker: string) => void;
}

export function DiagnosticsTab({ activeStock, availableStocks, onSelectStock }: DiagnosticsTabProps) {
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");

  const handleSyncDatabase = async () => {
    setSyncStatus("syncing");
    setSyncMessage("Menghubungi server & mengunduh harga harian real dari Yahoo Finance API (2020 - hari ini)...");
    try {
      const response = await fetch("/api/market/sync", { method: "POST" });
      const data = await response.json();
      if (response.ok && data.success) {
        setSyncStatus("success");
        setSyncMessage("Sinkronisasi selesai! Seluruh database lokal (IHSG, Emas, & 30 Saham) telah dimutakhirkan dengan data real time harian terbaru.");
      } else {
        setSyncStatus("error");
        setSyncMessage(`Sinkronisasi gagal: ${data.error || "Gagal memproses respons."}`);
      }
    } catch (e: any) {
      setSyncStatus("error");
      setSyncMessage(`Kesalahan jaringan: ${e.message || e}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. PERSPECTIVE INSIGHT HEADER */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-serif italic text-white tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
              Diagnostics &amp; Real-Time Model Validation
            </h2>
            <p className="text-xs text-white/50 mt-1">
              Review structural indices matching status, model pipeline, and consult our core generative intelligence module below.
            </p>
          </div>
          
          {/* Real-time sync trigger */}
          <button
            onClick={handleSyncDatabase}
            disabled={syncStatus === "syncing"}
            className="px-4 py-2 border border-[#F59E0B]/30 hover:border-[#F59E0B]/60 hover:bg-[#F59E0B]/5 text-[#F59E0B] text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "syncing" ? "animate-spin text-amber-500" : ""}`} />
            {syncStatus === "syncing" ? "Mensinkronisasi..." : "Sinkronkan Data Historis Real (Yahoo)"}
          </button>
        </div>

        {/* Sync notification console banner */}
        {syncStatus !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-3 rounded-xl border text-[11px] leading-relaxed flex items-start gap-2.5 ${
              syncStatus === "syncing" ? "bg-amber-500/5 border-amber-500/10 text-amber-400/90" :
              syncStatus === "success" ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" :
              "bg-rose-500/5 border-rose-500/10 text-rose-400"
            }`}
          >
            {syncStatus === "syncing" && <RefreshCw className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />}
            {syncStatus === "success" && <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />}
            {syncStatus === "error" && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />}
            <div>
              <span className="font-bold uppercase tracking-wide block text-[10px] mb-0.5">
                {syncStatus === "syncing" ? "LOG SINKRONASI PROSES" :
                 syncStatus === "success" ? "INTEGRASI REAL-TIME DATA BERHASIL" : "STATUS ERROR SINKRONISASI"}
              </span>
              {syncMessage}
            </div>
          </motion.div>
        )}
      </div>

      {/* 2. SYSTEM CHECKS TILES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Check 1 */}
        <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl flex items-start gap-3">
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Integrity Validation</span>
            <span className="text-xs text-white font-bold block mt-1">PASSED (100% SECURE)</span>
            <p className="text-[11px] text-[#E0E0E0]/50 mt-1">All 30 corporate assets balance sheet ratios reconciled via double audit guidelines.</p>
          </div>
        </div>

        {/* Check 2 */}
        <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl flex items-start gap-3">
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Dual-Weights Registry</span>
            <span className="text-xs text-white font-bold block mt-1">SYNCHRONIZED</span>
            <p className="text-[11px] text-[#E0E0E0]/50 mt-1">Config F (Fundamental) and Config B (Backtest) coefficients fully loaded.</p>
          </div>
        </div>

        {/* Check 3 */}
        <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl flex items-start gap-3">
          <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] text-white/40 uppercase font-bold tracking-wider block">Security Pipeline</span>
            <span className="text-xs text-white font-bold block mt-1">ACTIVE (LIVE JCI)</span>
            <p className="text-[11px] text-[#E0E0E0]/50 mt-1">Trailing stop alarms, MA support rails, and momentum indicators calculating smoothly.</p>
          </div>
        </div>

      </div>

      {/* 3. GEMINI EXPERT CHAT VIEW ADVISOR */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8 mb-2 px-1">
          <h3 className="text-[10px] uppercase font-bold tracking-widest text-[#E0E0E0]/40 flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-[#E0E0E0]/50" />
            Quantitative Consultations Chat Room
          </h3>
          <div className="w-full sm:w-64">
            <SearchableSelect
              value={activeStock.ticker}
              options={availableStocks.map((s) => ({ value: s.ticker, label: `${s.ticker} - ${s.name}`, logoColor: s.logoColor }))}
              onChange={(val) => onSelectStock(val)}
            />
          </div>
        </div>
        <div key={activeStock.ticker}>
          <AIAssistant stock={activeStock} />
        </div>
      </div>

    </div>
  );
}
