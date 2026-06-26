import { useState, useRef, useEffect } from "react";

export type Tab = "market" | "portfolio" | "analytics" | "backtest";
export type Theme = "dark" | "light";

export function useUIState() {
  const [activeTab, setActiveTab] = useState<Tab>("market");
  const [hideAlertBanner, setHideAlertBanner] = useState(false);

  // FASE 2.6 — activeConfig removed. Sumber kebenaran tunggal = engineConfig.activeProfileId
  // (lihat ADR-003: Single Source of Truth untuk active profile)

  // Level 4 — proactive AI agent toggle (default ON, persisted in localStorage).
  const [proactiveAIEnabled, setProactiveAIEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("idx_proactive_ai");
      return saved === null ? true : saved === "1";
    } catch {
      return true;
    }
  });
  useEffect(() => {
    try { localStorage.setItem("idx_proactive_ai", proactiveAIEnabled ? "1" : "0"); } catch {}
  }, [proactiveAIEnabled]);

  // Dev-only — use canned AI responses when no real provider is reachable.
  // Persisted in localStorage so the user doesn't have to re-enable it.
  const [useDevMockAI, setUseDevMockAI] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("idx_ai_dev_mock");
      // Default OFF in dev (user can opt in), always OFF in production.
      if (saved === "1") return true;
      return false;
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try { localStorage.setItem("idx_ai_dev_mock", useDevMockAI ? "1" : "0"); } catch {}
  }, [useDevMockAI]);

  const [selectedTicker, setSelectedTicker] = useState("BBCA");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"chart" | "sheets" | "forecast">("chart");
  const [drawerLots, setDrawerLots] = useState<number | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  const [theme, setTheme] = useState<Theme>("dark");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  // Toast notifications default OFF — transactions still flow into the
  // persistent NotificationContext (which AI can read). Toggle in Settings.
  const [showToasts, setShowToasts] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("quantbit_show_toasts");
      return v === "1";
    } catch { return false; }
  });

  // Crisis signals (Strategy Says: Exit to EMAS / Exit Safe Haven) — default ON.
  // User can mute if they don't want the amber/green banner to take up screen space.
  // Does NOT affect the algorithm itself (engineConfig.enableCrashProtection does that).
  const [showCrisisSignals, setShowCrisisSignals] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("quantbit_show_crisis_signals");
      return v === null ? true : v === "1";
    } catch { return true; }
  });

  const [appNotification, setAppNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const getChartTheme = (): "dark" | "light" => theme === "light" ? "light" : "dark";

  const handleSelectTicker = (ticker: string) => {
    setSelectedTicker(ticker);
    setIsDrawerOpen(true);
  };

  const handleChangeActiveTicker = (ticker: string) => {
    setSelectedTicker(ticker);
  };

  useEffect(() => {
    if (appNotification && showToasts) {
      const timer = setTimeout(() => setAppNotification(null), 5000);
      return () => clearTimeout(timer);
    } else if (appNotification && !showToasts) {
      setAppNotification(null);
    }
  }, [appNotification, showToasts]);

  useEffect(() => {
    try { localStorage.setItem("quantbit_show_toasts", showToasts ? "1" : "0"); } catch {}
  }, [showToasts]);

  useEffect(() => {
    try { localStorage.setItem("quantbit_show_crisis_signals", showCrisisSignals ? "1" : "0"); } catch {}
  }, [showCrisisSignals]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return {
    activeTab, setActiveTab,
    hideAlertBanner, setHideAlertBanner,
    selectedTicker, setSelectedTicker,
    isDrawerOpen, setIsDrawerOpen,
    drawerTab, setDrawerTab,
    drawerLots, setDrawerLots,
    searchQuery, setSearchQuery,
    isMobileMenuOpen, setIsMobileMenuOpen,
    isWalletOpen, setIsWalletOpen,
    theme, setTheme,
    isSettingsOpen, setIsSettingsOpen,
    settingsDropdownRef,
    showToasts, setShowToasts,
    showCrisisSignals, setShowCrisisSignals,
    appNotification, setAppNotification,
    proactiveAIEnabled, setProactiveAIEnabled,
    useDevMockAI, setUseDevMockAI,
    getChartTheme,
    handleSelectTicker,
    handleChangeActiveTicker,
  };
}
