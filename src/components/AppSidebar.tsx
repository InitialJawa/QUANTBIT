import { motion, AnimatePresence } from "motion/react";
import { Newspaper, TrendingUp, TrendingDown, Wallet, PieChart, BarChart3, Layers, Clock, FileSpreadsheet, ChevronLeft, PanelLeftClose, PanelLeftOpen, Play, Download, Award, Calendar, Settings } from "lucide-react";
import { DigitalWalletUI } from "./DigitalWalletUI";
import { idxNews, MKT, RS } from "../marketData";
import type { PortfolioItem, StockData } from "../types";
import { useState } from "react";
import { useBacktest } from "../contexts/BacktestContext";
import { useEngineConfig } from "../contexts/EngineConfigContext";

interface AppSidebarProps {
  activeTab: string;
  isMobileMenuOpen: boolean;
  onCloseMobile: () => void;
  cash: number;
  goldShares: number;
  tradeLogs: any[];
  portfolio: PortfolioItem[];
  onDeposit: (amount: number) => void;
  onWithdraw: (amount: number) => void;
  onMoveToGold: (amount: number) => void;
  onSellGold: (shares: number) => void;
  getDynamicStock: (ticker: string) => StockData;
}

function formatRupiah(val: number) {
  return "Rp " + Math.round(val).toLocaleString("id-ID");
}

export function AppSidebar({
  activeTab,
  isMobileMenuOpen,
  onCloseMobile,
  cash,
  goldShares,
  tradeLogs,
  portfolio,
  onDeposit,
  onWithdraw,
  onMoveToGold,
  onSellGold,
  getDynamicStock,
}: AppSidebarProps) {
  const isIHSGInCrisis = MKT.ihsg.monthly < -10;

  const totalInvestment = portfolio.reduce((sum, p) => sum + p.shares * p.avgPrice, 0);
  const totalCurrentValue = portfolio.reduce((sum, p) => {
    const stock = getDynamicStock(p.ticker);
    return sum + p.shares * (stock?.price || p.avgPrice);
  }, 0);
  const totalReturn = totalCurrentValue - totalInvestment;
  const totalReturnPct = totalInvestment > 0 ? (totalReturn / totalInvestment) * 100 : 0;

  const renderMarketContent = () => (
    <>
      <div id="rdi-digital-wallet-container" className="mx-2">
        <DigitalWalletUI
          cash={cash}
          goldShares={goldShares}
          tradeLogs={tradeLogs}
          onDeposit={onDeposit}
          onWithdraw={onWithdraw}
          onMoveToGold={onMoveToGold}
          onSellGold={onSellGold}
          onCloseMobile={onCloseMobile}
        />
      </div>

      <div id="sidebar-news-panel" className="mx-2">
        <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
          <Newspaper className="w-3 h-3 text-tertiary" />
          <span className="text-label font-medium text-tertiary uppercase tracking-wider">Berita</span>
        </div>
        <div className="pt-1 space-y-0.5 max-h-[120px] overflow-y-auto scrollbar-thin">
          {idxNews.slice(0, 4).map((news, idx) => (
            <a
              key={idx}
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="block px-2 py-1.5 rounded hover:bg-white/[0.03] transition-colors text-left group"
            >
              <div className="flex justify-between items-center text-label text-tertiary font-mono">
                <span>{news.portal}</span>
                <span>{news.time}</span>
              </div>
              <h4 className="text-caption text-secondary group-hover:text-primary leading-snug line-clamp-2 mt-0">
                {news.title}
              </h4>
            </a>
          ))}
        </div>
      </div>

      <div id="sidebar-macro-indicators-panel" className="mx-2">
        <div className="px-2 py-1.5 border-b border-white/[0.04]">
          <span className="text-label font-medium text-tertiary uppercase tracking-wider">Makro</span>
        </div>
        <div className="px-2 py-2 space-y-2">
          <div className="flex items-center justify-between py-1">
            <span className="text-label text-tertiary">Market</span>
            <span className={`text-caption font-medium ${isIHSGInCrisis ? "text-rose-400" : RS.status === "SAFE" ? "text-emerald-400" : "text-amber-400"}`}>
              {isIHSGInCrisis ? "RISK OFF" : RS.status === "SAFE" ? "RISK ON" : "WARNING"}
            </span>
          </div>

          <div className="space-y-1.5">
            <div>
              <div className="flex justify-between text-label text-tertiary mb-0.5">
                <span>Health</span>
                <span className="text-secondary">{RS.market_health}%</span>
              </div>
              <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="bg-[#d1d4dc] h-full rounded-full" style={{ width: `${RS.market_health}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-label text-tertiary mb-0.5">
                <span>Opp.</span>
                <span className="text-secondary">{RS.opportunity}%</span>
              </div>
              <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="bg-[#089981] h-full rounded-full" style={{ width: `${RS.opportunity}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-label text-tertiary mb-0.5">
                <span>Risk</span>
                <span className="text-secondary">{RS.risk}%</span>
              </div>
              <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="bg-[#f23645] h-full rounded-full" style={{ width: `${RS.risk}%` }} />
              </div>
            </div>
          </div>

          <div className="border-t border-white/[0.04] pt-2 space-y-1.5">
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">USD/IDR</span>
              <span className="text-caption text-secondary font-mono">Rp{MKT.usdidr.value.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Gold/gr</span>
              <span className="text-caption text-secondary font-mono">Rp{MKT.gold.value.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const renderPortfolioContent = () => {
    const sectorMap: Record<string, number> = {};
    portfolio.forEach(p => {
      const stock = getDynamicStock(p.ticker);
      const sector = stock?.sector || "Unknown";
      sectorMap[sector] = (sectorMap[sector] || 0) + p.shares * (stock?.price || p.avgPrice);
    });
    const sectorEntries = Object.entries(sectorMap).sort((a, b) => b[1] - a[1]);

    return (
      <>
        <div className="mx-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Wallet className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-tertiary uppercase tracking-wider">Ringkasan</span>
          </div>
          <div className="px-2 py-2 space-y-2">
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Investasi</span>
              <span className="text-caption text-secondary font-mono">{formatRupiah(totalInvestment)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Nilai Saat Ini</span>
              <span className="text-caption text-secondary font-mono">{formatRupiah(totalCurrentValue)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Return</span>
              <span className={`text-caption font-mono ${totalReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {totalReturn >= 0 ? "+" : ""}{formatRupiah(totalReturn)} ({totalReturnPct >= 0 ? "+" : ""}{totalReturnPct.toFixed(1)}%)
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Kas</span>
              <span className="text-caption text-secondary font-mono">{formatRupiah(cash)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Total Aset</span>
              <span className="text-caption text-secondary font-mono">{formatRupiah(totalCurrentValue + cash)}</span>
            </div>
          </div>
        </div>

        <div className="mx-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <PieChart className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-tertiary uppercase tracking-wider">Sektor</span>
          </div>
          <div className="px-2 py-2 space-y-1.5">
            {sectorEntries.length === 0 ? (
              <span className="text-label text-tertiary italic">Belum ada posisi</span>
            ) : (
              sectorEntries.slice(0, 6).map(([sector, value]) => (
                <div key={sector}>
                  <div className="flex justify-between text-label text-tertiary mb-0.5">
                    <span>{sector}</span>
                    <span className="text-secondary font-mono">{formatRupiah(value)}</span>
                  </div>
                  <div className="h-0.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400/60"
                      style={{ width: `${(value / (totalCurrentValue || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mx-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Layers className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-tertiary uppercase tracking-wider">Posisi Terbuka</span>
          </div>
          <div className="px-2 py-1 space-y-0.5 max-h-[240px] overflow-y-auto scrollbar-thin">
            {portfolio.length === 0 ? (
              <span className="text-label text-tertiary italic">Kosong</span>
            ) : (
              portfolio.map(p => {
                const stock = getDynamicStock(p.ticker);
                const currentPrice = stock?.price || p.avgPrice;
                const gainPct = ((currentPrice - p.avgPrice) / p.avgPrice) * 100;
                return (
                  <div key={p.ticker} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-caption font-bold text-primary">{p.ticker}</span>
                      <span className="text-label text-tertiary">{p.shares} lbr</span>
                    </div>
                    <span className={`text-caption font-mono ${gainPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Mobile-friendly config section header - only in sidebar */}
        <div className="mx-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Settings className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-primary uppercase tracking-wider">Mesin Kuantitatif</span>
          </div>
          <EngineConfigSidebarContent />
        </div>
      </>
    );
  };

  const renderAnalyticsContent = () => {
    const totalStocks = portfolio.length;
    const winners = portfolio.filter(p => {
      const stock = getDynamicStock(p.ticker);
      return (stock?.price || p.avgPrice) > p.avgPrice;
    }).length;
    const losers = totalStocks - winners;

    return (
      <>
        <div className="mx-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <BarChart3 className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-tertiary uppercase tracking-wider">Analitik</span>
          </div>
          <div className="px-2 py-2 space-y-2">
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Portofolio</span>
              <span className="text-caption text-secondary">{totalStocks} saham</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Profit</span>
              <span className="text-caption text-emerald-400">{winners} saham</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Loss</span>
              <span className="text-caption text-rose-400">{losers} saham</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Win Rate</span>
              <span className="text-caption text-secondary">{totalStocks > 0 ? ((winners / totalStocks) * 100).toFixed(0) : 0}%</span>
            </div>
          </div>
        </div>

        <div className="mx-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <TrendingUp className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-tertiary uppercase tracking-wider">Market Context</span>
          </div>
          <div className="px-2 py-2 space-y-1.5">
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">IHSG</span>
              <span className="text-caption text-secondary font-mono">{MKT.ihsg.value.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">MoM</span>
              <span className={`text-caption font-mono ${MKT.ihsg.monthly >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {MKT.ihsg.monthly >= 0 ? "+" : ""}{MKT.ihsg.monthly.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">RS Status</span>
              <span className={`text-caption font-medium ${RS.status === "SAFE" ? "text-emerald-400" : RS.status === "WARNING" ? "text-amber-400" : "text-rose-400"}`}>
                {RS.status}
              </span>
            </div>
            <div className="flex items-center justify-between py-1">
              <span className="text-label text-tertiary">Health</span>
              <span className="text-caption text-secondary">{RS.market_health}%</span>
            </div>
          </div>
        </div>

        <div className="mx-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Clock className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-tertiary uppercase tracking-wider">Quick Filters</span>
          </div>
          <div className="px-2 py-2 space-y-1">
            <div className="text-label text-tertiary leading-relaxed">
              Gunakan sub-tab <span className="text-secondary font-medium">Leaders</span>, <span className="text-secondary font-medium">Recovery</span>, dan <span className="text-secondary font-medium">Risk</span> untuk analisis lebih dalam.
            </div>
          </div>
        </div>
      </>
    );
  };

  function EngineConfigSidebarContent() {
    const { engineConfig, updateConfigValue, isSettingsLocked, setIsSettingsLocked } = useEngineConfig();
    return (
      <div className="px-2 py-2 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-label text-tertiary">Status</span>
          <button onClick={() => setIsSettingsLocked(!isSettingsLocked)}
            className={`text-label font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
              isSettingsLocked
                ? "bg-white/[0.04] text-tertiary"
                : "bg-white/10 text-primary"
            }`}>
            {isSettingsLocked ? "Terkunci" : "Terbuka"}
          </button>
        </div>

        <div className={`space-y-2 ${isSettingsLocked ? "opacity-50 pointer-events-none" : ""}`}>
          <span className="text-label text-tertiary block">Mode</span>
          <div className="flex gap-1">
            <button onClick={() => updateConfigValue("simulationMode", "algo")}
              className="flex-1 py-1 text-caption font-medium rounded transition-colors cursor-pointer"
              style={{ backgroundColor: engineConfig.simulationMode !== "single" ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.simulationMode !== "single" ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
              Algo
            </button>
            <button onClick={() => updateConfigValue("simulationMode", "single")}
              className="flex-1 py-1 text-caption font-medium rounded transition-colors cursor-pointer"
              style={{ backgroundColor: engineConfig.simulationMode === "single" ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.simulationMode === "single" ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
              Single
            </button>
          </div>
        </div>

        {engineConfig.simulationMode === "single" ? (
          <div className={`space-y-2 ${isSettingsLocked ? "opacity-50 pointer-events-none" : ""}`}>
            <span className="text-label text-tertiary block">Saham</span>
            <input type="text" value={engineConfig.singleTicker || "BBCA"}
              onChange={e => updateConfigValue("singleTicker", e.target.value.toUpperCase())}
              className="w-full text-caption p-1 bg-black border border-white/[0.08] rounded outline-none text-white font-mono" />
            <div>
              <div className="flex justify-between text-label mb-0.5">
                <span className="text-tertiary">Jual Turun</span>
                <span className="text-accent font-bold">{engineConfig.singleSellTrigger ?? 8}%</span>
              </div>
              <input type="range" min="1" max="25" value={engineConfig.singleSellTrigger ?? 8}
                onChange={e => updateConfigValue("singleSellTrigger", Number(e.target.value))}
                className="w-full accent-emerald-500 h-1" />
            </div>
            <div>
              <div className="flex justify-between text-label mb-0.5">
                <span className="text-tertiary">Beli Naik</span>
                <span className="text-accent font-bold">{engineConfig.singleBuyTrigger ?? 5}%</span>
              </div>
              <input type="range" min="1" max="25" value={engineConfig.singleBuyTrigger ?? 5}
                onChange={e => updateConfigValue("singleBuyTrigger", Number(e.target.value))}
                className="w-full accent-emerald-500 h-1" />
            </div>
          </div>
        ) : (
          <div className={`space-y-2 ${isSettingsLocked ? "opacity-50 pointer-events-none" : ""}`}>
            <div>
              <span className="text-label text-tertiary block mb-1">Konfigurasi</span>
              <div className="flex gap-1">
                <button onClick={() => updateConfigValue("activeConfig", "prod")}
                  className="flex-1 py-1 text-caption font-medium rounded transition-colors cursor-pointer"
                  style={{ backgroundColor: engineConfig.activeConfig === "prod" ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.activeConfig === "prod" ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Config F
                </button>
                <button onClick={() => updateConfigValue("activeConfig", "res")}
                  className="flex-1 py-1 text-caption font-medium rounded transition-colors cursor-pointer"
                  style={{ backgroundColor: engineConfig.activeConfig === "res" ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.activeConfig === "res" ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Config B
                </button>
              </div>
            </div>
            <div>
              <span className="text-label text-tertiary block mb-1">Universe</span>
              <div className="flex gap-1 flex-wrap">
                {([["all","All"],["idx80","IDX80"],["idx30","IDX30"],["lq45","LQ45"]] as const).map(([k, label]) => (
                  <button key={k} onClick={() => updateConfigValue("universe", k)}
                    className="flex-1 py-0.5 text-caption font-medium rounded transition-colors cursor-pointer"
                    style={{ backgroundColor: engineConfig.universe === k ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.universe === k ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="flex justify-between text-label mb-0.5">
                <span className="text-tertiary">Top N</span>
                <span className="text-accent font-bold">{engineConfig.topNCount}</span>
              </div>
              <input type="range" min="3" max="7" step="1" value={engineConfig.topNCount}
                onChange={e => updateConfigValue("topNCount", parseInt(e.target.value))}
                className="w-full accent-emerald-500 h-1" />
            </div>
            <div>
              <span className="text-label text-tertiary block mb-1">Rotasi Saham</span>
              <div className="flex gap-1">
                <button onClick={() => updateConfigValue("enableCrossover", true)}
                  className="flex-1 py-1 text-caption font-medium rounded transition-colors cursor-pointer"
                  style={{ backgroundColor: engineConfig.enableCrossover !== false ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.enableCrossover !== false ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Aktif
                </button>
                <button onClick={() => updateConfigValue("enableCrossover", false)}
                  className="flex-1 py-1 text-caption font-medium rounded transition-colors cursor-pointer"
                  style={{ backgroundColor: engineConfig.enableCrossover === false ? 'rgba(255,71,87,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.enableCrossover === false ? '#ff4757' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Tanpa
                </button>
              </div>
            </div>
            <div className="border-t border-white/[0.04] pt-2">
              <span className="text-label text-tertiary block mb-2">Fine-Tune Rasio</span>
              {[
                ["qualityWeight", "Quality (Q)", engineConfig.qualityWeight * 100],
                ["growthWeight", "Growth (G)", engineConfig.growthWeight * 100],
                ["valueWeight", "Value (V)", engineConfig.valueWeight * 100],
                ["momentumWeight", "Momentum (M)", engineConfig.momentumWeight * 100],
              ].map(([key, label, val]) => (
                <div key={key} className="mb-1.5">
                  <div className="flex justify-between text-label mb-0.5">
                    <span className="text-tertiary">{label as string}</span>
                    <span className="text-accent font-bold">{Math.round(val as number)}%</span>
                  </div>
                  <input type="range" min="0" max="1" step="0.05"
                    value={(engineConfig as any)[key as string]}
                    onChange={e => updateConfigValue(key as string, parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`border-t border-white/[0.04] pt-2 space-y-2 ${isSettingsLocked ? "opacity-50 pointer-events-none" : ""}`}>
          <div>
            <span className="text-label text-tertiary block mb-1">Safeguard</span>
            <div className="flex gap-1">
              <button onClick={() => updateConfigValue("safeHavenAsset", "emas")}
                className="flex-1 py-1 text-caption font-medium rounded transition-colors cursor-pointer"
                style={{ backgroundColor: engineConfig.safeHavenAsset === "emas" ? 'rgba(240,165,0,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.safeHavenAsset === "emas" ? '#f0a500' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                Emas
              </button>
              <button onClick={() => updateConfigValue("safeHavenAsset", "kas")}
                className="flex-1 py-1 text-caption font-medium rounded transition-colors cursor-pointer"
                style={{ backgroundColor: engineConfig.safeHavenAsset === "kas" ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.safeHavenAsset === "kas" ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                Kas
              </button>
            </div>
          </div>
          <div>
            <span className="text-label text-tertiary block mb-1">Proteksi Crash</span>
            <div className="flex gap-1 items-center">
              <button onClick={() => updateConfigValue("enableCrashProtection", engineConfig.enableCrashProtection === false ? true : false)}
                className="px-2 py-1 text-caption font-medium rounded transition-colors cursor-pointer"
                style={{ backgroundColor: engineConfig.enableCrashProtection !== false ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: engineConfig.enableCrashProtection !== false ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                {engineConfig.enableCrashProtection !== false ? "AKTIF" : "NONAKTIF"}
              </button>
              <select value={engineConfig.crashSensitivity ?? 10}
                onChange={e => updateConfigValue("crashSensitivity", Number(e.target.value))}
                disabled={engineConfig.enableCrashProtection === false}
                className="flex-1 text-caption p-1 bg-black border border-white/[0.08] rounded outline-none text-white disabled:opacity-40">
                <option value={3}>-3% / 5D</option>
                <option value={5}>-5% / 5D</option>
                <option value={8}>-8% / 5D</option>
                <option value={10}>-10% / 5D</option>
              </select>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-label mb-0.5">
              <span className="text-tertiary">Buffer Kas</span>
              <span className="text-accent font-bold">{engineConfig.reserveBufferPct ?? 10}%</span>
            </div>
            <input type="range" min="0" max="30" step="5" value={engineConfig.reserveBufferPct ?? 10}
              onChange={e => updateConfigValue("reserveBufferPct", Number(e.target.value))}
              className="w-full accent-emerald-500 h-1" />
          </div>
        </div>
      </div>
    );
  }

  const renderBacktestContent = () => {
    const bt = useBacktest();
    return (
      <>
        <div className="mx-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Clock className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-primary uppercase tracking-wider">Mode</span>
          </div>
          <div className="px-2 py-2 space-y-2">
            <div className="flex gap-1">
              <button onClick={() => bt.setSimulationMode("algo")}
                className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                style={{ backgroundColor: bt.simulationMode === "algo" ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: bt.simulationMode === "algo" ? '#00c9a5' : '#7a7a7a', border: bt.simulationMode === "algo" ? '1px solid rgba(0,201,165,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                Algo
              </button>
              <button onClick={() => bt.setSimulationMode("single")}
                className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                style={{ backgroundColor: bt.simulationMode === "single" ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: bt.simulationMode === "single" ? '#00c9a5' : '#7a7a7a', border: bt.simulationMode === "single" ? '1px solid rgba(0,201,165,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                Single
              </button>
            </div>
          </div>
        </div>

        {bt.simulationMode === "algo" ? (
          <>
            <div className="mx-2">
              <div className="px-2 py-1.5 border-b border-white/[0.04]">
                <span className="text-label font-medium text-tertiary uppercase tracking-wider">Jumlah Saham</span>
              </div>
              <div className="px-2 py-2">
                <div className="flex gap-1">
                  {[1, 3, 5].map((n) => (
                    <button key={n} onClick={() => bt.setNumStocks(n as 1|3|5)}
                      className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                      style={{ backgroundColor: bt.numStocks === n ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: bt.numStocks === n ? '#00c9a5' : '#7a7a7a', border: bt.numStocks === n ? '1px solid rgba(0,201,165,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                      Top {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mx-2">
              <div className="px-2 py-1.5 border-b border-white/[0.04]">
                <span className="text-label font-medium text-tertiary uppercase tracking-wider">Universe</span>
              </div>
              <div className="px-2 py-2">
                <div className="flex gap-1 flex-wrap">
                  {([["all","Semua"],["idx80","IDX80"],["idx30","IDX30"],["lq45","LQ45"]] as const).map(([k, label]) => (
                    <button key={k} onClick={() => bt.setSimUniverse(k)}
                      className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                      style={{ backgroundColor: bt.simUniverse === k ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: bt.simUniverse === k ? '#00c9a5' : '#7a7a7a', border: bt.simUniverse === k ? '1px solid rgba(0,201,165,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mx-2">
              <div className="px-2 py-1.5 border-b border-white/[0.04]">
                <span className="text-label font-medium text-tertiary uppercase tracking-wider">Konfigurasi</span>
              </div>
              <div className="px-2 py-2">
                <div className="flex gap-1">
                  <button onClick={() => bt.setBacktestConfigType("prod")}
                    className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                    style={{ backgroundColor: bt.backtestConfigType === "prod" ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: bt.backtestConfigType === "prod" ? '#00c9a5' : '#7a7a7a', border: bt.backtestConfigType === "prod" ? '1px solid rgba(0,201,165,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                    Config F
                  </button>
                  <button onClick={() => bt.setBacktestConfigType("res")}
                    className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                    style={{ backgroundColor: bt.backtestConfigType === "res" ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: bt.backtestConfigType === "res" ? '#00c9a5' : '#7a7a7a', border: bt.backtestConfigType === "res" ? '1px solid rgba(0,201,165,0.3)' : '1px solid rgba(255,255,255,0.06)' }}>
                    Config B
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="mx-2">
            <div className="px-2 py-1.5 border-b border-white/[0.04]">
              <span className="text-label font-medium text-tertiary uppercase tracking-wider">Saham</span>
            </div>
            <div className="px-2 py-2 space-y-2">
              <input type="text" value={bt.simTicker}
                onChange={e => bt.setSimTicker(e.target.value.toUpperCase())}
                placeholder="BBCA"
                className="w-full text-caption p-1.5 bg-black border border-white/[0.08] rounded-md outline-none text-white font-mono" />
              <div>
                <div className="flex justify-between text-label mb-1">
                  <span className="text-tertiary">Jual Turun</span>
                  <span className="text-accent">{bt.singleSellTrigger}%</span>
                </div>
                <input type="range" min="1" max="25" value={bt.singleSellTrigger}
                  onChange={e => bt.setSingleSellTrigger(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5" />
              </div>
              <div>
                <div className="flex justify-between text-label mb-1">
                  <span className="text-tertiary">Beli Naik</span>
                  <span className="text-accent">{bt.singleBuyTrigger}%</span>
                </div>
                <input type="range" min="1" max="25" value={bt.singleBuyTrigger}
                  onChange={e => bt.setSingleBuyTrigger(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5" />
              </div>
            </div>
          </div>
        )}

        <div className="mx-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Calendar className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-primary uppercase tracking-wider">Waktu & Modal</span>
          </div>
          <div className="px-2 py-2 space-y-2">
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="text-label text-tertiary block mb-0.5">Mulai</label>
                <input type="date" value={bt.simStartDate} min="2000-01-03" max={bt.simEndDate}
                  onChange={e => bt.setSimStartDate(e.target.value)}
                  className="w-full text-caption p-1 bg-black border border-white/[0.08] rounded outline-none text-white font-mono" />
              </div>
              <div>
                <label className="text-label text-tertiary block mb-0.5">Sampai</label>
                <input type="date" value={bt.simEndDate} min={bt.simStartDate} max={bt.todayWIBStr}
                  onChange={e => bt.setSimEndDate(e.target.value)}
                  className="w-full text-caption p-1 bg-black border border-white/[0.08] rounded outline-none text-white font-mono" />
              </div>
            </div>
            <div>
              <label className="text-label text-tertiary block mb-1">Modal (IDR)</label>
              <input type="text" value={bt.algoCapital.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                onChange={e => bt.setAlgoCapital(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="Rp 100.000.000"
                className="w-full text-caption p-1.5 bg-black border border-white/[0.08] rounded outline-none text-white font-mono" />
              <div className="flex gap-1 mt-1">
                {["10000000", "50000000", "100000000"].map((preset) => (
                  <button key={preset} onClick={() => bt.setAlgoCapital(preset)}
                    className={`text-label px-1.5 py-0.5 font-medium rounded transition-colors cursor-pointer ${
                      bt.algoCapital === preset
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-white/5 border border-white/[0.06] text-tertiary hover:text-secondary"
                    }`}>
                    Rp {(parseInt(preset) / 1000000).toLocaleString("id-ID")}Jt
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mx-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Layers className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-primary uppercase tracking-wider">Strategi</span>
          </div>
          <div className="px-2 py-2 space-y-2">
            <div>
              <span className="text-label text-tertiary block mb-1">Rotasi Saham</span>
              <div className="flex gap-1">
                <button onClick={() => bt.setEnableCrossover(true)}
                  className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                  style={{ backgroundColor: bt.enableCrossover ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: bt.enableCrossover ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Rank &lt; 7
                </button>
                <button onClick={() => bt.setEnableCrossover(false)}
                  className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                  style={{ backgroundColor: !bt.enableCrossover ? 'rgba(255,71,87,0.15)' : 'rgba(255,255,255,0.04)', color: !bt.enableCrossover ? '#ff4757' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Tanpa
                </button>
              </div>
            </div>

            <div>
              <span className="text-label text-tertiary block mb-1">Proteksi Crash</span>
              <div className="flex gap-1 items-center">
                <button onClick={() => bt.setEnableCrashProtection(!bt.enableCrashProtection)}
                  className="px-2 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer"
                  style={{ backgroundColor: bt.enableCrashProtection ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: bt.enableCrashProtection ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {bt.enableCrashProtection ? "ON" : "OFF"}
                </button>
                <select value={bt.crashSensitivity} onChange={e => bt.setCrashSensitivity(Number(e.target.value))}
                  disabled={!bt.enableCrashProtection}
                  className="flex-1 text-caption p-1 bg-black border border-white/[0.08] rounded outline-none text-white disabled:opacity-40">
                  <option value="3">Sensitif (3%)</option>
                  <option value="5">Normal (5%)</option>
                  <option value="8">Moderat (8%)</option>
                  <option value="10">Konservatif (10%)</option>
                </select>
              </div>
            </div>

            <div>
              <span className="text-label text-tertiary block mb-1">Safe Haven</span>
              <div className="flex gap-1">
                <button onClick={() => bt.setSafeHavenAsset("emas")} disabled={!bt.enableCrashProtection}
                  className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer disabled:opacity-40"
                  style={{ backgroundColor: bt.safeHavenAsset === "emas" ? 'rgba(240,165,0,0.15)' : 'rgba(255,255,255,0.04)', color: bt.safeHavenAsset === "emas" ? '#f0a500' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Emas
                </button>
                <button onClick={() => bt.setSafeHavenAsset("kas")} disabled={!bt.enableCrashProtection}
                  className="flex-1 py-1 text-caption font-medium rounded-md transition-colors cursor-pointer disabled:opacity-40"
                  style={{ backgroundColor: bt.safeHavenAsset === "kas" ? 'rgba(0,201,165,0.15)' : 'rgba(255,255,255,0.04)', color: bt.safeHavenAsset === "kas" ? '#00c9a5' : '#7a7a7a', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Kas
                </button>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-label mb-1">
                <span className="text-tertiary">Buffer Kas</span>
                <span className="text-accent">{bt.reserveBufferPct}%</span>
              </div>
              <input type="range" min="0" max="30" step="5" value={bt.reserveBufferPct}
                onChange={e => bt.setReserveBufferPct(Number(e.target.value))}
                className="w-full accent-emerald-500 h-1.5" />
            </div>
          </div>
        </div>

        <div className="mx-2">
          <div className="px-2 py-1.5 flex items-center gap-1.5 border-b border-white/[0.04]">
            <Play className="w-3 h-3 text-tertiary" />
            <span className="text-label font-medium text-primary uppercase tracking-wider">Eksekusi</span>
          </div>
          <div className="px-2 py-2 space-y-2">
            <button onClick={() => bt.triggerBacktest()}
              disabled={bt.isBacktesting}
              className="w-full py-1.5 text-caption font-bold rounded-md transition-opacity cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: '#00c9a5', color: '#000' }}>
              {bt.isBacktesting ? "Memproses..." : "Jalankan Backtest"}
            </button>
            {bt.backtestResult && (
              <button onClick={() => document.dispatchEvent(new CustomEvent("download-csv-backtest"))}
                className="w-full py-1.5 text-caption font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: '#b0b0b0', border: '1px solid rgba(255,255,255,0.06)' }}>
                <Download className="w-3 h-3 text-accent" />
                Unduh CSV
              </button>
            )}
          </div>
        </div>
      </>
    );
  };

  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
            onClick={onCloseMobile}
          />
        )}
      </AnimatePresence>

      <aside id="main-sidebar" className={`${isMobileMenuOpen ? 'flex fixed inset-y-0 left-0 w-[85%] max-w-sm z-50 shadow-2xl' : 'hidden'} md:flex w-full md:static ${collapsed ? 'md:w-12' : 'md:w-56 lg:w-64'} md:border-r border-white/[0.06] shrink-0 flex-col md:overflow-hidden relative transition-all duration-200`}>
        <div className="flex flex-col flex-1 overflow-y-auto md:overflow-y-auto py-2 gap-2 scrollbar-thin">
          {collapsed ? (
            <div className="flex flex-col items-center gap-2 px-1">
              <button
                onClick={() => setCollapsed(false)}
                className="w-8 h-8 rounded-md flex items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors cursor-pointer"
                title="Expand sidebar"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
              <div className="w-full h-px bg-white/[0.04]" />
              <div className="flex flex-col items-center gap-1 text-label text-tertiary">
                <Wallet className="w-4 h-4" />
                <span className="mt-1">Q</span>
              </div>
            </div>
          ) : (
            <>
              {activeTab === "market" && renderMarketContent()}
              {activeTab === "portfolio" && renderPortfolioContent()}
              {activeTab === "analytics" && renderAnalyticsContent()}
              {activeTab === "backtest" && renderBacktestContent()}
            </>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="hidden md:flex absolute right-1.5 top-1.5 w-5 h-5 rounded bg-white/[0.04] border border-white/[0.06] items-center justify-center text-white/30 hover:text-white/60 hover:bg-white/[0.08] transition-colors cursor-pointer z-10"
            title="Collapse sidebar"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
      </aside>
    </>
  );
}
