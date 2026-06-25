import { useState, useRef, useEffect } from "react";

export type Tab = "market" | "portfolio" | "analytics" | "backtest";
export type Theme = "dark" | "light";

export function useUIState() {
  const [activeTab, setActiveTab] = useState<Tab>("market");
  const [hideAlertBanner, setHideAlertBanner] = useState(false);

  const [activeConfig, setActiveConfig] = useState<"prod" | "res">(() => {
    const saved = localStorage.getItem("idx_activeconfig");
    return (saved === "prod" || saved === "res") ? saved : "prod";
  });

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
    if (appNotification) {
      const timer = setTimeout(() => setAppNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [appNotification]);

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
    activeConfig, setActiveConfig,
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
    appNotification, setAppNotification,
    proactiveAIEnabled, setProactiveAIEnabled,
    getChartTheme,
    handleSelectTicker,
    handleChangeActiveTicker,
  };
}
