import { useState, useRef, useEffect } from "react";

export type Tab = "market" | "portfolio" | "analytics" | "simulasi";
export type Theme = "dark" | "light";

export function useUIState() {
  const [activeTab, setActiveTab] = useState<Tab>("market");
  const [hideAlertBanner, setHideAlertBanner] = useState(false);

  const [activeConfig, setActiveConfig] = useState<"prod" | "res">(() => {
    const saved = localStorage.getItem("idx_activeconfig");
    return (saved === "prod" || saved === "res") ? saved : "prod";
  });

  const [selectedTicker, setSelectedTicker] = useState("BBCA");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"chart" | "sheets" | "gemini-ai" | "forecast">("chart");
  const [drawerLots, setDrawerLots] = useState<number | "">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    theme, setTheme,
    isSettingsOpen, setIsSettingsOpen,
    settingsDropdownRef,
    appNotification, setAppNotification,
    getChartTheme,
    handleSelectTicker,
    handleChangeActiveTicker,
  };
}
