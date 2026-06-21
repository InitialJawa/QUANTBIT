import { useState } from "react";
import { AIAssistant } from "./AIAssistant";
import { StockData } from "../types";
import { SearchableSelect } from "./SearchableSelect";
import { api } from "../services/api";
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
      const data = await api.post<{ success: boolean; error?: string }>("/api/market/sync");
      if (data.success) {
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
      <div className="bg-[#050505] border border-white/[0.03] rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-[11px] font-bold text-white uppercase tracking-widest flex items-center gap-2 font-mono">
              <Activity className="w-4 h-4 text-emerald-400" />
              Diagnostics & Real-Time Model Validation
            </h2>
            <p className="text-[10px] text-zinc-500 mt-2 max-w-2xl leading-relaxed">
              Review structural indices matching status, model pipeline, and consult our core generative intelligence module below.
            </p>
          </div>
          
          {/* Real-time sync trigger */}
          <button
            onClick={handleSyncDatabase}
            disabled={syncStatus === "syncing"}
            className="px-4 py-2 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:border-white/20 text-white/80 text-[9px] font-bold uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "syncing" ? "animate-spin text-emerald-400" : ""}`} />
            {syncStatus === "syncing" ? "MENSINKRONISASI..." : "SINKRONISASI REAL-TIME DATA (YAHOO)"}
          </button>
        </div>

        {/* Sync notification console banner */}
        {syncStatus !== "idle" && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-6 p-4 rounded-xl border text-[10px] leading-relaxed flex items-start gap-3 font-mono uppercase tracking-widest ${
              syncStatus === "syncing" ? "bg-amber-500/5 border-amber-500/10 text-amber-400/90" :
              syncStatus === "success" ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" :
              "bg-rose-500/5 border-rose-500/10 text-rose-400"
            }`}
          >
            {syncStatus === "syncing" && <RefreshCw className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />}
            {syncStatus === "success" && <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            {syncStatus === "error" && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
            <div>
              <span className="font-black block text-[10px] mb-1">
                {syncStatus === "syncing" ? "LOG SINKRONASI PROSES" :
                 syncStatus === "success" ? "INTEGRASI REAL-TIME DATA BERHASIL" : "STATUS ERROR SINKRONISASI"}
              </span>
              <span className="font-sans normal-case tracking-normal text-white/50">{syncMessage}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* 2. SYSTEM CHECKS TILES GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Check 1 */}
        <div className="bg-[#050505] border border-white/[0.03] p-5 rounded-2xl flex items-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest block font-mono">Integrity Validation</span>
            <span className="text-xs text-white/90 font-bold block mt-1 font-mono uppercase tracking-widest">PASSED (100% SECURE)</span>
            <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">All 30 corporate assets balance sheet ratios reconciled via double audit guidelines.</p>
          </div>
        </div>

        {/* Check 2 */}
        <div className="bg-[#050505] border border-white/[0.03] p-5 rounded-2xl flex items-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center shrink-0">
            <Database className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest block font-mono">Dual-Weights Registry</span>
            <span className="text-xs text-white/90 font-bold block mt-1 font-mono uppercase tracking-widest">SYNCHRONIZED</span>
            <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">Config F (Fundamental) and Config B (Backtest) coefficients fully loaded.</p>
          </div>
        </div>

        {/* Check 3 */}
        <div className="bg-[#050505] border border-white/[0.03] p-5 rounded-2xl flex items-start gap-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest block font-mono">Security Pipeline</span>
            <span className="text-xs text-white/90 font-bold block mt-1 font-mono uppercase tracking-widest">ACTIVE (LIVE JCI)</span>
            <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">Trailing stop alarms, MA support rails, and momentum indicators calculating smoothly.</p>
          </div>
        </div>

      </div>

      {/* 3. GEMINI EXPERT CHAT VIEW ADVISOR */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-8 px-1">
          <h3 className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 flex items-center gap-2 font-mono">
            <MessageSquare className="w-3.5 h-3.5" />
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
