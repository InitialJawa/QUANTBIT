import { useEffect, useState } from "react";
import { STOCKS_DATA } from "./stocksData";
import { MKT } from "./marketData";
import type { StockData, AnalysisResult } from "./types";
import { api } from "./services/api";
import { StockDrawer } from "./components/StockDrawer";
import { AppSidebar } from "./components/AppSidebar";
import { AlertBanner } from "./components/AlertBanner";
import { AppHeader } from "./components/AppHeader";
import { NavDrawer } from "./components/NavDrawer";
import { MarketTab } from "./components/MarketTab";
import { PortfolioTracker } from "./components/PortfolioTracker";
import { LeadersTab } from "./components/LeadersTab";
import { RecoveryOpsTab } from "./components/RecoveryOpsTab";
import { CapitalProtectionTab } from "./components/CapitalProtectionTab";
import { SimulationTab } from "./components/SimulationTab";
import { DiagnosticsTab } from "./components/DiagnosticsTab";
import { LoginScreen } from "./components/LoginScreen";
import { useAuth } from "./contexts/AuthContext";
import { useDataFeed } from "./hooks/useDataFeed";
import { usePortfolioManager } from "./hooks/usePortfolioManager";
import { useUIState } from "./hooks/useUIState";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [isNavOpen, setIsNavOpen] = useState(false);

  const df = useDataFeed();
  const ui = useUIState();
  const pm = usePortfolioManager(user, df.getDynamicStock, ui.setAppNotification);

  useEffect(() => {
    if (!user) return;
    api.get<{ user: any }>("/api/auth/me").then(d => {
      if (d.user.data_feed) df.setDataFeed(d.user.data_feed);
      if (d.user.active_config) ui.setActiveConfig(d.user.active_config);
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!user || !pm.isDbLoaded) return;
    api.patch("/api/user/profile", { cash: pm.cash, theme: ui.theme, dataFeed: df.dataFeed, activeConfig: ui.activeConfig }).catch(() => {});
  }, [ui.theme, df.dataFeed, ui.activeConfig, pm.cash]);

  const activeStock = df.getDynamicStock(ui.selectedTicker) || STOCKS_DATA[0];
  const activeReport = pm.cachedReports[activeStock.ticker] || null;
  const isIHSGInCrisis = MKT.ihsg.monthly < -10;
  const activeUniverseStocks = STOCKS_DATA;
  const filteredStocks = activeUniverseStocks.filter(s => {
    const q = ui.searchQuery.toLowerCase();
    return s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q);
  }).map(s => df.getDynamicStock(s.ticker));

  const handleGenerateAIReport = (customFocus?: string) => pm.handleGenerateAIReport(activeStock, customFocus);

  if (authLoading) {
    return       <div className="min-h-screen flex items-center justify-center text-[#d1d4dc]" style={{ backgroundColor: '#131722' }}>Loading...</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div id="applet-main-canvas" data-theme={ui.theme} className={`min-h-screen text-[#d1d4dc] font-sans antialiased flex flex-col`} style={{ backgroundColor: '#131722' }}>

      <AnimatePresence>
        {ui.appNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 20, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-4 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
              ui.appNotification.type === "success" ? "bg-emerald-500/90 border-emerald-400 text-black" :
              ui.appNotification.type === "error" ? "bg-rose-500/90 border-rose-400 text-white" :
              "bg-blue-500/90 border-blue-400 text-white"
            }`}
          >
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              ui.appNotification.type === "success" ? "bg-black" : "bg-white"
            }`} />
            <span className="text-sm font-black uppercase tracking-tight">{ui.appNotification.message}</span>
            <button onClick={() => ui.setAppNotification(null)} className="ml-2 hover:opacity-50">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AppHeader
        dataFeed={df.dataFeed}
        userEmail={user?.email}
        settingsRef={ui.settingsDropdownRef}
        isSettingsOpen={ui.isSettingsOpen}
        setSettingsOpen={ui.setIsSettingsOpen}
        theme={ui.theme}
        setTheme={ui.setTheme}
        activeConfig={ui.activeConfig}
        setActiveConfig={ui.setActiveConfig}
        isMobileMenuOpen={ui.isMobileMenuOpen}
        setMobileMenuOpen={ui.setIsMobileMenuOpen}
        setDataFeed={df.setDataFeed}
        logout={logout}
        onToggleNav={() => setIsNavOpen(v => !v)}
      />

      <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden md:min-h-0 relative">

        <AppSidebar
          isMobileMenuOpen={ui.isMobileMenuOpen}
          onCloseMobile={() => ui.setIsMobileMenuOpen(false)}
          cash={pm.cash}
          goldShares={pm.getEmasShares()}
          tradeLogs={pm.tradeLogs}
          onDeposit={pm.handleDepositCash}
          onWithdraw={pm.handleWithdrawCash}
          onMoveToGold={pm.handleMoveToGold}
          onSellGold={pm.handleSellGoldToCashInput}
        />

        <main id="main-workspace" className="flex-1 overflow-visible md:overflow-y-auto flex flex-col">

          <div className="space-y-2 flex-1 flex flex-col w-full h-full">

            <AlertBanner
              isIHSGInCrisis={isIHSGInCrisis}
              hideAlertBanner={ui.hideAlertBanner}
              portfolio={pm.portfolio}
              onDismiss={() => ui.setHideAlertBanner(true)}
              onGoToLedger={() => {
                ui.setActiveTab("ledger");
                setTimeout(() => {
                  const element = document.getElementById("tab-ledger");
                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                }, 50);
              }}
            />

            <AnimatePresence mode="wait">

              {ui.activeTab === "market" && (
                <motion.div
                  key="market-perspective"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <MarketTab
                    onSelectTicker={ui.handleSelectTicker}
                    onChangeActiveTicker={ui.handleChangeActiveTicker}
                    activeStock={activeStock}
                    portfolio={pm.portfolio}
                    watchlist={pm.watchlist}
                    onAddTransaction={pm.handleAddTransaction}
                    onRemoveTransaction={pm.handleRemoveTransaction}
                    onSellTransaction={pm.handleSellTransaction}
                    onToggleWatchlist={pm.handleToggleWatchlist}
                    getDynamicStock={df.getDynamicStock}
                  />
                </motion.div>
              )}

              {ui.activeTab === "leaders" && (
                <LeadersTab activeConfig={ui.activeConfig} onSelectTicker={ui.handleSelectTicker} portfolio={pm.portfolio} watchlist={pm.watchlist} getDynamicStock={df.getDynamicStock} />
              )}

              {ui.activeTab === "turnaround" && (
                <motion.div
                  key="turnaround-perspective"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 flex flex-col"
                >
                  <RecoveryOpsTab isIHSGInCrisis={isIHSGInCrisis} onSelectTicker={ui.handleSelectTicker} portfolio={pm.portfolio} watchlist={pm.watchlist} getDynamicStock={df.getDynamicStock} />
                </motion.div>
              )}

              {ui.activeTab === "exit" && (
                <motion.div
                  key="exit-perspective"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 flex flex-col"
                >
                  <CapitalProtectionTab isIHSGInCrisis={isIHSGInCrisis} onSelectTicker={ui.handleSelectTicker} portfolio={pm.portfolio} watchlist={pm.watchlist} getDynamicStock={df.getDynamicStock} />
                </motion.div>
              )}

              {ui.activeTab === "simulation" && (
                <motion.div
                  key="simulation-perspective"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <SimulationTab
                    portfolio={pm.portfolio}
                    onAddTransaction={pm.handleAddTransaction}
                    onRemoveTransaction={pm.handleRemoveTransaction}
                    onSellTransaction={pm.handleSellTransaction}
                    onSelectTicker={ui.handleSelectTicker}
                    getDynamicStock={df.getDynamicStock}
                    theme={ui.getChartTheme()}
                    activeConfig={ui.activeConfig}
                    defaultSubTab="past"
                  />
                </motion.div>
              )}

              {ui.activeTab === "ledger" && (
                <motion.div
                  key="ledger-perspective"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <PortfolioTracker
                    portfolio={pm.portfolio}
                    watchlist={pm.watchlist}
                    onAddTransaction={pm.handleAddTransaction}
                    onRemoveTransaction={pm.handleRemoveTransaction}
                    onSellTransaction={pm.handleSellTransaction}
                    onSelectStock={ui.handleSelectTicker}
                    onToggleWatchlist={pm.handleToggleWatchlist}
                    getDynamicStock={df.getDynamicStock}
                    activeConfig={ui.activeConfig}
                    cash={pm.cash}
                    setCash={pm.setCash}
                    tradeLogs={pm.tradeLogs}
                    setTradeLogs={pm.customSetTradeLogs}
                  />
                </motion.div>
              )}

              {ui.activeTab === "diagnostics" && (
                <motion.div
                  key="diagnostics-perspective"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <DiagnosticsTab
                    activeStock={activeStock}
                    availableStocks={activeUniverseStocks.map(s => df.getDynamicStock(s.ticker) || s)}
                    onSelectStock={ui.handleChangeActiveTicker}
                  />
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </main>

      </div>

      <NavDrawer
        open={isNavOpen}
        activeTab={ui.activeTab}
        onTabChange={ui.setActiveTab}
        onClose={() => setIsNavOpen(false)}
      />

      <StockDrawer
        isOpen={ui.isDrawerOpen}
        onClose={() => ui.setIsDrawerOpen(false)}
        activeStock={activeStock}
        portfolio={pm.portfolio}
        watchlist={pm.watchlist}
        drawerTab={ui.drawerTab}
        onTabChange={ui.setDrawerTab}
        drawerLots={ui.drawerLots}
        onLotsChange={ui.setDrawerLots}
        onBuy={pm.handleAddTransaction}
        onSell={pm.handleSellTransaction}
        onRemove={pm.handleRemoveTransaction}
        onToggleWatchlist={pm.handleToggleWatchlist}
        onGenerateReport={handleGenerateAIReport}
        isGenerating={pm.isGenerating}
        generationError={pm.generationError}
        activeReport={activeReport}
        chartTheme={ui.getChartTheme()}
      />

    </div>
  );
}
