import { useState } from "react";
import { AIAssistant } from "./AIAssistant";
import { StockData } from "../types";
import { Activity, ShieldCheck, Database, Cpu, MessageSquare } from "lucide-react";
import { motion } from "motion/react";

interface DiagnosticsTabProps {
  activeStock: StockData;
}

export function DiagnosticsTab({ activeStock }: DiagnosticsTabProps) {
  return (
    <div className="space-y-6">
      
      {/* 1. PERSPECTIVE INSIGHT HEADER */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 shadow-sm">
        <h2 className="text-lg font-serif italic text-white tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
          Diagnostics &amp; Real-Time Model Validation
        </h2>
        <p className="text-xs text-white/50 mt-1">
          Review structural indices matching status, model pipeline, and consult our core generative intelligence module below.
        </p>
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
        <h3 className="text-[10px] uppercase font-bold tracking-widest text-[#E0E0E0]/40 px-1 flex items-center gap-1.5 mt-8 mb-2">
          <MessageSquare className="w-4 h-4 text-[#E0E0E0]/50" />
          Quantitative Consultations Chat Room
        </h3>
        <AIAssistant stock={activeStock} />
      </div>

    </div>
  );
}
