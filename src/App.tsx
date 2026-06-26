import { useEffect, lazy, Suspense } from "react";
import { STOCKS_DATA } from "./stocksData";
import { MKT } from "./marketData";
import { isCrisisMode } from "./marketRegimeEngine";
import type { StockData } from "./types";
import { api } from "./services/api";
import { StockDrawer } from "./components/StockDrawer";
import { AppSidebar } from "./components/AppSidebar";
import { AlertBanner } from "./components/AlertBanner";
import { AppHeader } from "./components/AppHeader";
import { useMarketRegimeSync } from "./hooks/useMarketRegimeSync";
import { useProactiveAgent } from "./hooks/useProactiveAgent";
import { AITestHarness } from "./components/AITestHarness";
import { useNotifications } from "./contexts/NotificationContext";

const MarketTab = lazy(() => import("./components/MarketTab").then(m => ({ default: m.MarketTab })));
const PortfolioTracker = lazy(() => import("./components/PortfolioTracker").then(m => ({ default: m.PortfolioTracker })));
const AnalyticsTab = lazy(() => import("./components/AnalyticsTab").then(m => ({ default: m.AnalyticsTab })));
const SimulationTab = lazy(() => import("./components/SimulationTab").then(m => ({ default: m.SimulationTab })));
import { LoginScreen } from "./components/LoginScreen";
import { useAuth } from "./contexts/AuthContext";
import { EngineConfigProvider, useEngineConfig } from "./contexts/EngineConfigContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { useDataFeed } from "./hooks/useDataFeed";
import { usePortfolioManager } from "./hooks/usePortfolioManager";
import { useUIState } from "./hooks/useUIState";
import { FloatingAIChat } from "./components/FloatingAIChat";
import { FloatingWallet } from "./components/FloatingWallet";
import { AICockpitProvider } from "./contexts/AICockpitContext";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster } from "sonner";

function ConfigSync() {
  const { engineConfig, setActiveProfile } = useEngineConfig();
  const { activeConfig, setActiveConfig } = useUIState();
  useEffect(() => {
    if (engineConfig.activeProfileId !== activeConfig) {
      setActiveProfile(activeConfig);
    }
  }, [activeConfig, engineConfig.activeProfileId, setActiveProfile]);
  useEffect(() => {
    if (engineConfig.activeProfileId !== activeConfig) {
      setActiveConfig(engineConfig.activeProfileId);
    }
  }, [engineConfig.activeProfileId, activeConfig, setActiveConfig]);
  return null;
}

/** A3: Centralised bridge so marketRegimeEngine stays in sync with
 *  EngineConfigContext regardless of which tab the user is viewing. */
function MarketRegimeSyncBridge() {
  useMarketRegimeSync();
}

/** AI Depth Upgrade: Level 4 — proactive agent monitor.
 *  Mounts useProactiveAgent() inside all required providers. */
function ProactiveAgentBridge() {
  useProactiveAgent();
  return null;
}

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#0d0d0d", color: "#e0e0e0" }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <EngineConfigProvider>
      <ConfigSync />
      <MarketRegimeSyncBridge />
      <NotificationProvider>
        <AICockpitProvider>
          <ProactiveAgentBridge />
          <AppContent logout={logout} />
        </AICockpitProvider>
      </NotificationProvider>
    </EngineConfigProvider>
  );
}

/** Inner component — must live inside <NotificationProvider> so it can
 *  call useNotifications() and pass the notif API into usePortfolioManager.
 *  Previously App called usePortfolioManager at the top level which threw
 *  "useNotifications must be used within NotificationProvider". */
function AppContent({ logout }: { logout: () => void }) {
  const { user } = useAuth();

  const df = useDataFeed();
  const ui = useUIState();
  const notif = useNotifications();
  const pm = usePortfolioManager(user, df.getDynamicStock, ui.setAppNotification, notif);

  useEffect(() => {
    if (!user) return;
    api
      .get<{ user: any }>("/api/auth/me")
      .then((d) => {
        if (d.user.data_feed) df.setDataFeed(d.user.data_feed);
        if (d.user.active_config) ui.setActiveConfig(d.user.active_config);
      })
      .catch(() => {});
  }, [user]);

  // Debounced profile sync — without debounce, pm.cash changes trigger a PATCH
  // per transaction and quickly exhaust the browser's 6-conn/host pool,
  // surfacing as `net::ERR_INSUFFICIENT_RESOURCES` in the console.
  useEffect(() => {
    if (!user || !pm.isDbLoaded) return;
    const timer = setTimeout(() => {
      api
        .patch("/api/user/profile", {
          cash: pm.cash,
          theme: ui.theme,
          dataFeed: df.dataFeed,
          activeConfig: ui.activeConfig,
        })
        .catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
  }, [ui.theme, df.dataFeed, ui.activeConfig, pm.cash, user, pm.isDbLoaded]);

  const activeStock = df.getDynamicStock(ui.selectedTicker) || STOCKS_DATA[0];
  const isIHSGInCrisis = isCrisisMode();
  const activeUniverseStocks = STOCKS_DATA;
  const filteredStocks = activeUniverseStocks.filter((s) => {
    const q = ui.searchQuery.toLowerCase();
    return (
      s.ticker.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      s.sector.toLowerCase().includes(q)
    );
  }).map((s) => df.getDynamicStock(s.ticker));

  const handleSearchSubmit = (q: string) => {
    const query = q.toLowerCase().trim();
    if (!query) return;
    const tabMatch: Record<string, string> = {
      backtest: "backtest",
      portfolio: "portfolio",
      market: "market",
      analitik: "analytics",
    };
    if (tabMatch[query]) {
      ui.setActiveTab(tabMatch[query]);
      ui.setSearchQuery("");
      return;
    }
    const stock = STOCKS_DATA.find((s) => {
      const t = s.ticker.toLowerCase();
      const n = s.name.toLowerCase();
      return t === query || t.includes(query) || n.includes(query);
    });
    if (stock) {
      ui.handleSelectTicker(stock.ticker);
      ui.setIsDrawerOpen(true);
      ui.setSearchQuery("");
    }
  };

  return (
    <div
      id="applet-main-canvas"
      data-theme={ui.theme}
      className="min-h-screen font-sans antialiased flex flex-col"
    >
      <AnimatePresence>
        {ui.appNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 20, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-4 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 ${
              ui.appNotification.type === "success"
                ? "bg-emerald-600 border-emerald-400 text-black"
                : ui.appNotification.type === "error"
                ? "bg-rose-600 border-rose-4 text-white"
                : "bg-blue-600 border-blue-4 text-white"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full animate-pulse ${
                ui.appNotification.type === "success" ? "bg-black" : "bg-white"
              }`}
            />
            <span className="text-sm font-black uppercase tracking-tight">
              {ui.appNotification.message}
            </span>
            <button
              onClick={() => ui.setAppNotification(null)}
              className="ml-2 hover:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AppHeader
          activeTab={ui.activeTab}
          onTabChange={ui.setActiveTab}
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
          searchQuery={ui.searchQuery}
          onSearchChange={ui.setSearchQuery}
          onSearchSubmit={handleSearchSubmit}
          proactiveAIEnabled={ui.proactiveAIEnabled}
          setProactiveAIEnabled={ui.setProactiveAIEnabled}
          useDevMockAI={ui.useDevMockAI}
          setUseDevMockAI={ui.setUseDevMockAI}
          showToasts={ui.showToasts}
          setShowToasts={ui.setShowToasts}
        />
        <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden md:min-h-0 relative">
              <AppSidebar
                activeTab={ui.activeTab}
                isMobileMenuOpen={ui.isMobileMenuOpen}
                onCloseMobile={() => ui.setIsMobileMenuOpen(false)}
                cash={pm.cash}
                portfolio={pm.portfolio}
                onClearPortfolio={pm.handleClearPortfolio}
                getDynamicStock={df.getDynamicStock}
              />

              <main
                id="main-workspace"
                className="flex-1 overflow-visible md:overflow-y-auto flex flex-col px-2"
              >
                <div className="space-y-2 flex-1 flex flex-col w-full h-full">
                  <AlertBanner
                    isIHSGInCrisis={isIHSGInCrisis}
                    hideAlertBanner={ui.hideAlertBanner}
                    portfolio={pm.portfolio}
                    onDismiss={() => ui.setHideAlertBanner(true)}
                    onGoToLedger={() => {
                      ui.setActiveTab("portfolio");
                      setTimeout(() => {
                        const element = document.getElementById("tab-ledger");
                        if (element) element.scrollIntoView({ behavior: "smooth" });
                      }, 50);
                    }}
                  />
                  <AnimatePresence mode="wait">
                    {ui.activeTab === "market" && (
                      <motion.div
                        key="market"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.15 }}
                        className="flex-1 flex flex-col"
                      >
                        <Suspense fallback={<div className="flex items-center justify-center h-32 text-label text-white/40">Memuat market...</div>}>
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
                          filteredStocks={filteredStocks}
                        />
                        </Suspense>
                      </motion.div>
                    )}

                    {ui.activeTab === "portfolio" && (
                      <motion.div
                        key="portfolio"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.15 }}
                      >
                        <Suspense fallback={<div className="flex items-center justify-center h-32 text-label text-white/40">Memuat portfolio...</div>}>
                        <PortfolioTracker
                          portfolio={pm.portfolio}
                          watchlist={pm.watchlist}
                          onAddTransaction={pm.handleAddTransaction}
                          onRemoveTransaction={pm.handleRemoveTransaction}
                          onSellTransaction={pm.handleSellTransaction}
                          onSelectStock={ui.handleSelectTicker}
                          onToggleWatchlist={pm.handleToggleWatchlist}
                          getDynamicStock={df.getDynamicStock}
                          cash={pm.cash}
                          setCash={pm.setCash}
                          tradeLogs={pm.tradeLogs}
                          setTradeLogs={pm.customSetTradeLogs}
                        />
                        </Suspense>
                      </motion.div>
                    )}

                    {ui.activeTab === "backtest" && (
                      <motion.div
                        key="backtest"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.15 }}
                        className="flex-1 flex flex-col"
                      >
                        <Suspense fallback={<div className="flex items-center justify-center h-32 text-label text-white/40">Memuat simulator...</div>}>
                        <SimulationTab
                          portfolio={pm.portfolio}
                          onAddTransaction={pm.handleAddTransaction}
                          onRemoveTransaction={pm.handleRemoveTransaction}
                          onSellTransaction={pm.handleSellTransaction}
                          onSelectTicker={ui.handleSelectTicker}
                          getDynamicStock={df.getDynamicStock}
                        />
                        </Suspense>
                      </motion.div>
                    )}

                    {ui.activeTab === "analytics" && (
                      <motion.div
                        key="analytics"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.15 }}
                        className="flex-1 flex flex-col"
                      >
                        <Suspense fallback={<div className="flex items-center justify-center h-32 text-label text-white/40">Memuat analitik...</div>}>
                        <AnalyticsTab
                          activeConfig={ui.activeConfig}
                          onSelectTicker={ui.handleSelectTicker}
                          portfolio={pm.portfolio}
                          watchlist={pm.watchlist}
                          getDynamicStock={df.getDynamicStock}
                          isIHSGInCrisis={isIHSGInCrisis}
                        />
                        </Suspense>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </main>
            </div>
          
<FloatingWallet
        isOpen={ui.isWalletOpen}
        onToggle={() => ui.setIsWalletOpen(!ui.isWalletOpen)}
        cash={pm.cash}
        goldShares={pm.getEmasShares()}
        tradeLogs={pm.tradeLogs}
        onDeposit={pm.handleDepositCash}
        onWithdraw={pm.handleWithdrawCash}
        onMoveToGold={pm.handleMoveToGold}
        onSellGold={pm.handleSellGoldToCashInput}
      />
<Toaster position="top-right" theme="dark" richColors closeButton />
<FloatingAIChat
  selectedStock={activeStock}
  portfolio={pm.portfolio}
  cash={pm.cash}
  pm={pm}
  getDynamicStock={df.getDynamicStock}
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
        onBuy={(ticker, shares, price) =>
          pm.handleAddTransaction(ticker, shares, price)
        }
        onSell={(ticker, shares) => pm.handleSellTransaction(ticker, shares)}
        onRemove={(ticker) => pm.handleRemoveTransaction(ticker)}
        onToggleWatchlist={pm.handleToggleWatchlist}
        chartTheme={ui.getChartTheme()}
      />
{import.meta.env?.DEV && <AITestHarness />}
    </div>
  );
}
