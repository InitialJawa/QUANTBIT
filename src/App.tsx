import { useState, useEffect } from "react";
import { getStock, STOCKS_DATA } from "./stocksData";
import { idxNews, EX, MKT, RS } from "./marketData";
import { StockData, AnalysisResult, PortfolioItem, WatchlistItem } from "./types";
import { HistoricalChart } from "./components/HistoricalChart";
import { DeepReport } from "./components/DeepReport";
import { AIAssistant } from "./components/AIAssistant";
import { ForwardDividendsForecast } from "./components/ForwardDividendsForecast";

// Import modular Perspective Tab components
import { MarketTab } from "./components/MarketTab";
import { LeadersTab } from "./components/LeadersTab";
import { RecoveryOpsTab } from "./components/RecoveryOpsTab";
import { CapitalProtectionTab } from "./components/CapitalProtectionTab";
import { SimulationTab } from "./components/SimulationTab";
import { DiagnosticsTab } from "./components/DiagnosticsTab";

import { 
  Sparkles, 
  Search,
  Eye, 
  Sliders, 
  X, 
  BookOpen, 
  LineChart, 
  Cpu, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Award, 
  Flame, 
  ShieldAlert,
  SlidersHorizontal,
  ChevronRight,
  Maximize2,
  Newspaper,
  ExternalLink,
  Sun,
  Moon,
  Coins
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // GOAPI & Yahoo Finance Live Stock prices integration
  const [goapiPrices, setGoapiPrices] = useState<Record<string, { close: number; change: number; pct: number }>>({});
  const [yahooPrices, setYahooPrices] = useState<Record<string, { close: number; change: number; pct: number }>>({});
  const [dataFeed, setDataFeed] = useState<"yahoo" | "goapi" | "simulated">("yahoo");
  const [isGoapiConnected, setIsGoapiConnected] = useState(false);
  const [isYahooConnected, setIsYahooConnected] = useState(false);

  // Dynamic pricing fluctuation state to support rolling real-time updates
  const [priceFluctuations, setPriceFluctuations] = useState<Record<string, number>>({});

  useEffect(() => {
    // Fetch GoAPI Price Feed
    fetch("/api/goapi/live-prices")
      .then(res => res.json())
      .then(apiRes => {
        if (apiRes.success && apiRes.prices) {
          setGoapiPrices(apiRes.prices);
          setIsGoapiConnected(true);
        }
      })
      .catch(err => console.warn("GoAPI Integration error, fallback active:", err));

    // Fetch Yahoo Finance Price Feed
    fetch("/api/yahoo/live-prices")
      .then(res => res.json())
      .then(apiRes => {
        if (apiRes.success && apiRes.prices) {
          setYahooPrices(apiRes.prices);
          setIsYahooConnected(true);
        }
      })
      .catch(err => console.warn("Yahoo Finance Integration error, fallback active:", err));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPriceFluctuations(prev => {
        const next = { ...prev };
        STOCKS_DATA.forEach(stock => {
          let stockPriceBase = stock.currentPrice;
          if (dataFeed === "goapi" && goapiPrices[stock.ticker]) {
            stockPriceBase = goapiPrices[stock.ticker].close;
          } else if (dataFeed === "yahoo" && yahooPrices[stock.ticker]) {
            stockPriceBase = yahooPrices[stock.ticker].close;
          }

          const currentOffset = next[stock.ticker] || 0;
          // minor random walk tick: +/- 0.15% of stock price
          const driftLimit = stockPriceBase * 0.003;
          const delta = (Math.random() - 0.5) * driftLimit;
          const newOffset = currentOffset + delta;
          // cap fluctuation at +/- 5% of base price
          const cap = stockPriceBase * 0.05;
          next[stock.ticker] = Math.max(-cap, Math.min(cap, newOffset));
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [goapiPrices, yahooPrices, dataFeed]);

  const getDynamicStock = (ticker: string): StockData => {
    const rawStock = getStock(ticker);
    if (!rawStock) return rawStock;

    let basePrice = rawStock.currentPrice;
    let baseChange = rawStock.change;

    if (dataFeed === "goapi" && goapiPrices[rawStock.ticker]) {
      basePrice = goapiPrices[rawStock.ticker].close;
      baseChange = goapiPrices[rawStock.ticker].pct;
    } else if (dataFeed === "yahoo" && yahooPrices[rawStock.ticker]) {
      basePrice = yahooPrices[rawStock.ticker].close;
      baseChange = yahooPrices[rawStock.ticker].pct;
    }

    const offset = priceFluctuations[rawStock.ticker] || 0;
    const activePrice = Math.max(10, Math.round(basePrice + offset));
    
    // calculate dynamic change percentage from base
    const dynamicChange = parseFloat((((activePrice - basePrice) / basePrice) * 100 + baseChange).toFixed(2));
    return {
      ...rawStock,
      currentPrice: activePrice,
      change: dynamicChange
    };
  };

  // Main app tab state (now matching target dashboard precisely!)
  const [activeTab, setActiveTab] = useState<"market" | "leaders" | "turnaround" | "exit" | "simulation" | "diagnostics">("market");
  const [hideAlertBanner, setHideAlertBanner] = useState(false);
  
  // Weights Config state ('prod' = Config F, 'res' = Config B)
  const [activeConfig, setActiveConfig] = useState<"prod" | "res">("prod");

  // Stock universe limit state ('idx30' or 'idx80')
  const [idxUniverse, setIdxUniverse] = useState<"idx30" | "idx80">("idx80");

  // Selected Stock detailed drawer variables
  const [selectedTicker, setSelectedTicker] = useState("BBCA");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"chart" | "sheets" | "gemini-ai" | "forecast">("chart");

  const [searchQuery, setSearchQuery] = useState("");

  // Retrieve selected stock detail
  const activeStock = getDynamicStock(selectedTicker) || STOCKS_DATA[0];

  // PERSISTENCE LOCAL STATES (Watchlist & Portfolio)
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>(() => {
    const saved = localStorage.getItem("idx_watchlist");
    return saved ? JSON.parse(saved) : [{ ticker: "BBCA", addedAt: new Date().toISOString() }];
  });

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(() => {
    const saved = localStorage.getItem("idx_portfolio");
    return saved ? JSON.parse(saved) : [
      { ticker: "BBCA", shares: 500, buyPrice: 9900, addedAt: new Date().toISOString() },
      { ticker: "BBRI", shares: 1000, buyPrice: 4900, addedAt: new Date().toISOString() }
    ];
  });

  const [cachedReports, setCachedReports] = useState<Record<string, AnalysisResult>>(() => {
    const saved = localStorage.getItem("idx_cached_reports");
    return saved ? JSON.parse(saved) : {};
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("idx_theme");
    return (saved === "light" || saved === "dark") ? saved : "dark";
  });

  // Sync state loops
  useEffect(() => {
    localStorage.setItem("idx_theme", theme);
  }, [theme]);

  // Sync state loops for database lists
  useEffect(() => {
    localStorage.setItem("idx_watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    localStorage.setItem("idx_portfolio", JSON.stringify(portfolio));
  }, [portfolio]);

  useEffect(() => {
    localStorage.setItem("idx_cached_reports", JSON.stringify(cachedReports));
  }, [cachedReports]);

  // Handle opening stock detail drawer
  const handleSelectTicker = (ticker: string) => {
    setSelectedTicker(ticker);
    setIsDrawerOpen(true);
  };

  // Watchlist quick toggle
  const handleToggleWatchlist = (ticker: string) => {
    if (watchlist.some(w => w.ticker === ticker)) {
      setWatchlist(prev => prev.filter(w => w.ticker !== ticker));
    } else {
      setWatchlist(prev => [...prev, { ticker, addedAt: new Date().toISOString() }]);
    }
  };

  // Simulated portfolio additions
  const handleAddTransaction = (ticker: string, shares: number, buyPrice: number) => {
    setPortfolio(prev => {
      const existingIdx = prev.findIndex(p => p.ticker === ticker);
      if (existingIdx > -1) {
        const item = prev[existingIdx];
        const combinedShares = item.shares + shares;
        const averagePrice = Math.round(((item.shares * item.buyPrice) + (shares * buyPrice)) / combinedShares);
        
        const updated = [...prev];
        updated[existingIdx] = {
          ...item,
          shares: combinedShares,
          buyPrice: averagePrice,
        };
        return updated;
      } else {
        return [...prev, { ticker, shares, buyPrice, addedAt: new Date().toISOString() }];
      }
    });
  };

  const handleRemoveTransaction = (ticker: string) => {
    setPortfolio(prev => prev.filter(p => p.ticker !== ticker));
  };

  // Call Gemini deep analyzer
  const handleGenerateAIReport = async (customFocus?: string) => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock: activeStock,
          customFocus,
        }),
      });

      if (!response.ok) {
        const errObj = await response.json();
        throw new Error(errObj.error || "Failed to parse. Is GEMINI_API_KEY declared?");
      }

      const reportData: AnalysisResult = await response.json();
      setCachedReports((prev) => ({
        ...prev,
        [activeStock.ticker]: reportData,
      }));
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || "Failed in generative analysis pipeline.");
    } finally {
      setIsGenerating(false);
    }
  };

  const activeReport = cachedReports[activeStock.ticker] || null;

  // Crisis override flag based on IHSG monthly drawdown (-17.96% < -10%)
  const isIHSGInCrisis = MKT.ihsg.monthly < -10;

  // Search filter listings
  const activeUniverseStocks = idxUniverse === "idx30" ? STOCKS_DATA.slice(0, 30) : STOCKS_DATA;
  const filteredStocks = activeUniverseStocks.filter((s) => {
    const isMatched = s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.sector.toLowerCase().includes(searchQuery.toLowerCase());
    return isMatched;
  }).map(s => getDynamicStock(s.ticker));

  return (
    <div id="applet-main-canvas" className={`min-h-screen bg-[#050505] text-[#E0E0E0] ${theme} font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-400 flex flex-col`}>
      
      {/* BRAND STYLE TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-white/5 px-3 py-2 md:px-6 md:py-2.5 shrink-0 flex flex-col md:flex-row items-center justify-between gap-2.5 md:gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shadow-lg shrink-0">
            <svg 
              className="w-4 h-4 text-white" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              {/* Candlestick 1 (Bearish solid) */}
              <path d="M6 3v18" />
              <rect x="4" y="7" width="4" height="10" rx="0.5" fill="currentColor" className="fill-white" />
              {/* Candlestick 2 (Bullish hollow) */}
              <path d="M12 1v22" />
              <rect x="10" y="5" width="4" height="12" rx="0.5" fill="none" className="stroke-white" />
              {/* Candlestick 3 (Bullish solid) */}
              <path d="M18 5v14" />
              <rect x="16" y="9" width="4" height="6" rx="0.5" fill="currentColor" className="fill-white" />
            </svg>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs md:text-sm font-black uppercase tracking-[0.16em] text-white">
                CANDLE TRADE
              </h1>
              <span className="text-[7px] md:text-[7.5px] font-mono border border-white/20 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-widest leading-none bg-white/5">
                ISI
              </span>
            </div>
            <span className="text-[7px] md:text-[7.5px] font-mono uppercase tracking-[0.18em] text-white font-semibold block mt-0.5">
              Indonesia Stock Intelligence
            </span>
          </div>
        </div>

        {/* Gemini-Style Rounded Pill Navigation (Fitted precisely & extremely responsive!) */}
        <div className="flex-1 max-w-4xl overflow-x-auto scrollbar-none py-0.5 md:py-0 w-full">
          <nav className="flex items-center space-x-1 bg-[#121212] border border-white/5 p-1 rounded-full w-max mx-auto">
            
            <button
              id="tab-market"
              onClick={() => setActiveTab("market")}
              className={`px-2.5 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10.5px] font-semibold uppercase tracking-wider flex items-center gap-1 sm:gap-2 transition-all duration-300 cursor-pointer ${
                activeTab === "market"
                  ? "bg-[#2A2A2A] text-emerald-400 font-extrabold shadow-sm border border-white/5"
                  : "text-white/45 hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              <Activity className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Market
            </button>

            <button
              id="tab-leaders"
              onClick={() => setActiveTab("leaders")}
              className={`px-2.5 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10.5px] font-semibold uppercase tracking-wider flex items-center gap-1 sm:gap-2 transition-all duration-300 cursor-pointer ${
                activeTab === "leaders"
                  ? "bg-[#2A2A2A] text-emerald-400 font-extrabold shadow-sm border border-white/5"
                  : "text-white/45 hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              <SlidersHorizontal className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Leaders
            </button>

            <button
              id="tab-turnaround"
              onClick={() => setActiveTab("turnaround")}
              className={`px-2.5 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10.5px] font-semibold uppercase tracking-wider flex items-center gap-1 sm:gap-2 transition-all duration-300 cursor-pointer ${
                activeTab === "turnaround"
                  ? "bg-[#2A2A2A] text-emerald-400 font-extrabold shadow-sm border border-white/5"
                  : "text-white/45 hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-current" /> Recovery
            </button>

            <button
              id="tab-exit"
              onClick={() => setActiveTab("exit")}
              className={`px-2.5 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10.5px] font-semibold uppercase tracking-wider flex items-center gap-1 sm:gap-2 transition-all duration-300 cursor-pointer ${
                activeTab === "exit"
                  ? "bg-[#2A2A2A] text-[#FCA5A5] font-extrabold shadow-sm border border-white/5"
                  : "text-white/45 hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              <ShieldAlert className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500" /> Exit Ops
            </button>

            <button
              id="tab-simulation"
              onClick={() => setActiveTab("simulation")}
              className={`px-2.5 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10.5px] font-semibold uppercase tracking-wider flex items-center gap-1 sm:gap-2 transition-all duration-300 cursor-pointer ${
                activeTab === "simulation"
                  ? "bg-[#2A2A2A] text-emerald-400 font-extrabold shadow-sm border border-white/5"
                  : "text-white/45 hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              <Award className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-pulse" /> Simulation
            </button>

            <button
              id="tab-diagnostics"
              onClick={() => setActiveTab("diagnostics")}
              className={`px-2.5 sm:px-4 py-1.5 rounded-full text-[9px] sm:text-[10.5px] font-semibold uppercase tracking-wider flex items-center gap-1 sm:gap-2 transition-all duration-300 cursor-pointer ${
                activeTab === "diagnostics"
                  ? "bg-[#2A2A2A] text-emerald-400 font-extrabold shadow-sm border border-white/5"
                  : "text-white/45 hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              <Cpu className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Chat Labs
            </button>

          </nav>
        </div>

        {/* Brand Control Utilities & Theme Toggle panel */}
        <div className="flex items-center gap-2.5 shrink-0 self-end md:self-center">
          
          {/* Elegant theme toggle button */}
          <button
            onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
            className={`w-7 h-7 md:w-8 md:h-8 rounded-full ${
              theme === "dark" ? "bg-white/5 hover:bg-white/10 border-white/10 text-amber-400" : "bg-black/5 hover:bg-black/10 border-black/10 text-indigo-600"
            } border flex items-center justify-center transition-all duration-300 cursor-pointer shadow-sm active:scale-95`}
            title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
          >
            {theme === "dark" ? (
              <Sun className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin-slow" />
            ) : (
              <Moon className="w-3.5 h-3.5 md:w-4 md:h-4" />
            )}
          </button>

          {/* Feed Status Badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all duration-300 ${
            dataFeed === "yahoo" && isYahooConnected ? "bg-sky-500/10 border-sky-500/20 text-sky-400" :
            dataFeed === "goapi" && isGoapiConnected ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
            "bg-amber-500/10 border-amber-500/20 text-amber-300"
          }`} title={dataFeed === "yahoo" ? "Terkoneksi ke Yahoo Finance (Live IDX)" : dataFeed === "goapi" ? "Terkoneksi ke GoAPI.id" : "Menggunakan Simulasi Harga"}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              dataFeed === "yahoo" && isYahooConnected ? "bg-sky-500 animate-pulse" :
              dataFeed === "goapi" && isGoapiConnected ? "bg-emerald-500 animate-pulse" :
              "bg-amber-400"
            }`} />
            <span className="text-[8px] md:text-[9px] font-black font-mono tracking-wider uppercase">
              {dataFeed === "yahoo" ? "Yahoo Live" : dataFeed === "goapi" ? "GoAPI Live" : "Simulasi"}
            </span>
          </div>

          {/* Active Online badge */}
          <div className="flex items-center gap-1.5 bg-[#34A853]/10 border border-[#34A853]/20 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853] animate-ping" />
            <span className="text-[8px] md:text-[9px] font-black font-mono tracking-wider text-emerald-400 whitespace-nowrap">LIVE</span>
          </div>

        </div>

      </header>

      <div className="flex flex-col lg:flex-row flex-1 min-h-0">
        
        {/* LEFT BAR NAV & QUICK ACCESS */}
        <aside id="main-sidebar" className="w-full lg:w-80 bg-[#0A0A0A] border-r border-white/10 shrink-0 flex flex-col justify-between overflow-hidden">
          <div className="flex flex-col flex-1 overflow-y-auto py-4 gap-4 scrollbar-thin">
            
            {/* Universe selector */}
            <div id="universe-panel" className="p-4 mx-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
              <span className="text-[9px] uppercase font-bold text-white/35 block tracking-widest">Saham Universe</span>
              <div className="grid grid-cols-2 gap-2 bg-black/30 p-1 rounded-xl">
                <button
                  onClick={() => setIdxUniverse("idx80")}
                  className={`py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                    idxUniverse === "idx80" ? "bg-white/10 text-emerald-400 font-extrabold" : "text-[#E0E0E0]/35 hover:text-white"
                  }`}
                >
                  IDX80 (Default)
                </button>
                <button
                  onClick={() => setIdxUniverse("idx30")}
                  className={`py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                    idxUniverse === "idx30" ? "bg-white/10 text-emerald-400 font-extrabold" : "text-[#E0E0E0]/35 hover:text-white"
                  }`}
                >
                  IDX30
                </button>
              </div>
            </div>

            {/* Config selectors exactly as in target HTML aside footer */}
            <div id="config-panel" className="p-4 mx-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
              <span className="text-[9px] uppercase font-bold text-white/35 block tracking-widest">Weights Configuration</span>
              <div className="grid grid-cols-2 gap-2 bg-black/30 p-1 rounded-xl">
                <button
                  onClick={() => setActiveConfig("prod")}
                  className={`py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                    activeConfig === "prod" ? "bg-white/10 text-emerald-400 font-extrabold" : "text-[#E0E0E0]/35 hover:text-white"
                  }`}
                >
                  Config F
                </button>
                <button
                  onClick={() => setActiveConfig("res")}
                  className={`py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                    activeConfig === "res" ? "bg-white/10 text-emerald-400 font-extrabold" : "text-[#E0E0E0]/35 hover:text-white"
                  }`}
                >
                  Config B
                </button>
              </div>
            </div>

            {/* Live Price Feed Source Selector */}
            <div id="feed-panel" className="p-4 mx-4 bg-gradient-to-br from-emerald-950/10 to-indigo-950/10 border border-white/5 rounded-2xl space-y-3">
              <span className="text-[9px] uppercase font-bold text-white/35 block tracking-widest">Live Price Feed Source</span>
              <div className="grid grid-cols-3 gap-1 bg-black/30 p-1 rounded-xl">
                <button
                  onClick={() => setDataFeed("yahoo")}
                  className={`py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                    dataFeed === "yahoo" ? "bg-sky-500/10 text-sky-400 font-black border border-sky-500/15" : "text-[#E0E0E0]/35 hover:text-white"
                  }`}
                  title={isYahooConnected ? "Yahoo Finance Terhubung" : "Memuat data..."}
                >
                  Yahoo
                </button>
                <button
                  onClick={() => setDataFeed("goapi")}
                  className={`py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                    dataFeed === "goapi" ? "bg-emerald-500/10 text-emerald-400 font-black border border-emerald-500/15" : "text-[#E0E0E0]/35 hover:text-white"
                  }`}
                  title={isGoapiConnected ? "GoAPI Terhubung" : "GoAPI Belum Terhubung"}
                >
                  GoAPI
                </button>
                <button
                  onClick={() => setDataFeed("simulated")}
                  className={`py-1.5 text-[9px] font-bold uppercase rounded-lg transition-all cursor-pointer ${
                    dataFeed === "simulated" ? "bg-white/10 text-white font-black" : "text-[#E0E0E0]/35 hover:text-white"
                  }`}
                  title="Gunakan simulasi harga"
                >
                  Simulasi
                </button>
              </div>
              <div className="text-[8px] font-mono text-white/40 text-center leading-normal">
                {dataFeed === "yahoo" && "✓ Real-time Yahoo Finance (Tanpa API Key)"}
                {dataFeed === "goapi" && "✓ Menggunakan API Key GoAPI.id Anda"}
                {dataFeed === "simulated" && "✓ Mode Simulasi Tanpa Koneksi Server"}
              </div>
            </div>

            {/* Curated News Column for IDX info */}
            <div id="sidebar-news-panel" className="p-4 mx-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
              <span className="text-[9px] uppercase font-bold text-white/35 block tracking-widest flex items-center gap-1.5">
                <Newspaper className="w-3.5 h-3.5 text-emerald-400" /> Berita Terkini
              </span>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                {idxNews.map((news, idx) => (
                  <a 
                    key={idx}
                    href={news.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className="block p-2 rounded-xl bg-black/30 hover:bg-black/60 border border-white/5 hover:border-emerald-500/20 transition-all text-left group"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[8px] font-mono font-bold text-emerald-400/80">{news.portal}</span>
                      <span className="text-[8px] font-mono text-white/30">{news.time}</span>
                    </div>
                    <h4 className="text-[10px] font-serif italic text-white/95 group-hover:text-emerald-400 leading-snug line-clamp-2">
                      {news.title}
                    </h4>
                  </a>
                ))}
              </div>
            </div>

            {/* Macro Sentiment & Key Indicators (Filling the empty sidebar space beautifully) */}
            <div id="sidebar-macro-indicators-panel" className="p-4 mx-4 bg-white/5 border border-white/10 rounded-2xl space-y-3.5">
              <span className="text-[9px] uppercase font-bold text-white/35 block tracking-widest flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-sky-400 animate-pulse" /> Sinyal Rezim & Makro
              </span>

              {/* Overall status Pill */}
              <div className="flex items-center justify-between p-2 bg-black/30 border border-white/5 rounded-xl">
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono font-bold text-white/30 uppercase">Status Pasar</span>
                  <span className={`text-[11px] font-mono font-black ${
                    isIHSGInCrisis ? "text-rose-400" : (RS.status === "SAFE" ? "text-emerald-400" : "text-amber-400")
                  }`}>{isIHSGInCrisis ? "⚠️ RISK OFF" : (RS.status === "SAFE" ? "✓ RISK ON" : "⚠️ WARNING")}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-[8px] font-mono font-bold text-white/30 uppercase">Aksi Sistem</span>
                  <span className={`text-[10px] font-extrabold font-mono tracking-wide ${
                    isIHSGInCrisis ? "text-rose-450 text-rose-400" : "text-[#D1FAE5]"
                  }`}>{isIHSGInCrisis ? "LIQUIDATE / CASH OUT" : RS.action}</span>
                </div>
              </div>

              {/* Bar stats showing core index health, opportunity, etc. */}
              <div className="space-y-2.5">
                {/* Market Health */}
                <div>
                  <div className="flex justify-between text-[8.5px] font-mono font-bold text-white/50 mb-1">
                    <span>Kesehatan IHSG</span>
                    <span className="text-white/80">{RS.market_health}%</span>
                  </div>
                  <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-emerald-400 h-full transition-all duration-500" style={{ width: `${RS.market_health}%` }} />
                  </div>
                </div>

                {/* Opportunity */}
                <div>
                  <div className="flex justify-between text-[8.5px] font-mono font-bold text-white/50 mb-1">
                    <span>Peluang Transaksi</span>
                    <span className="text-emerald-400">{RS.opportunity}%</span>
                  </div>
                  <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500" style={{ width: `${RS.opportunity}%` }} />
                  </div>
                </div>

                {/* Risk */}
                <div>
                  <div className="flex justify-between text-[8.5px] font-mono font-bold text-white/50 mb-1">
                    <span>Tingkat Risiko</span>
                    <span className="text-rose-400">{RS.risk}%</span>
                  </div>
                  <div className="h-1 bg-black/40 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-rose-600 to-rose-400 h-full transition-all duration-500" style={{ width: `${RS.risk}%` }} />
                  </div>
                </div>
              </div>

              {/* Commodities & Forex Grid */}
              <div className="border-t border-white/5 pt-3">
                <span className="text-[8px] uppercase font-bold text-white/25 block tracking-wider mb-2">Aset Safe Haven / Valas</span>
                <div className="grid grid-cols-2 gap-2 text-left">
                  {/* USDIDR */}
                  <div className="p-2 bg-black/25 rounded-xl border border-white/5 flex flex-col justify-between">
                    <span className="text-[8.5px] font-medium text-white/40">USD / IDR</span>
                    <span className="text-[10px] font-mono font-extrabold text-[#E0E0E0] mt-0.5 font-mono">Rp{MKT.usdidr.value.toLocaleString("id-ID")}</span>
                    <span className="text-[7.5px] font-mono font-bold text-emerald-400 flex items-center gap-0.5 mt-1">
                      <TrendingDown className="w-2.5 h-2.5 shrink-0" /> Rupiah Menguat
                    </span>
                  </div>

                  {/* Gold */}
                  <div className="p-2 bg-black/25 rounded-xl border border-white/5 flex flex-col justify-between">
                    <span className="text-[8.5px] font-medium text-white/40">Emas (gr)</span>
                    <span className="text-[10px] font-mono font-extrabold text-amber-400 mt-0.5 font-mono">Rp{MKT.gold.value.toLocaleString("id-ID")}</span>
                    <span className="text-[7.5px] font-mono font-bold text-rose-400 flex items-center gap-0.5 mt-1">
                      <TrendingDown className="w-2.5 h-2.5 shrink-0" /> MoM {MKT.gold.monthly}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Listings Directory in Sidebar Footer for fast lookups */}
          <div className="p-4 border-t border-white/5 shrink-0 max-h-[300px] flex flex-col">
            <span className="text-[10px] uppercase font-bold text-[#E0E0E0]/30 tracking-widest block mb-2 px-1">Ticker Directory</span>
            <div className="relative mb-2 shrink-0">
              <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search quick tickers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-[11px] pl-8.5 pr-3 py-2 bg-white/5 border border-white/5 rounded-lg outline-none focus:border-white/20 text-white font-mono"
              />
            </div>
            <div className="overflow-y-auto space-y-1 pr-1 flex-1 scrollbar-thin max-h-[140px]">
              {filteredStocks.map(s => {
                const isSaved = watchlist.some(w => w.ticker === s.ticker);
                return (
                  <div
                    key={s.ticker}
                    onClick={() => handleSelectTicker(s.ticker)}
                    className="flex justify-between items-center text-[11px] p-2 bg-[#050505] hover:bg-white/5 border border-white/5 rounded-lg cursor-pointer transition-all font-mono"
                  >
                    <span className="font-bold text-white/95">{s.ticker}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white/40">Rp{s.currentPrice}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleWatchlist(s.ticker);
                        }}
                        className={`transition-colors cursor-pointer ${isSaved ? "text-amber-400" : "text-white/20 hover:text-white"}`}
                      >
                        <Eye className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* WORKSPACE AREA */}
        <main id="main-workspace" className="flex-1 p-6 sm:p-8 lg:p-10 overflow-y-auto">
          
          <div className="max-w-5xl mx-auto space-y-8">
            
            {/* GLOBAL SYSTEM ALERTS & ROTATION WARNER */}
            {(() => {
              const portfolioExits = portfolio.filter(item => {
                const cleanT = item.ticker.toUpperCase().replace(".JK", "");
                const match = EX.find(e => e.ticker.toUpperCase().replace(".JK", "") === cleanT);
                return match && (match.exit_state === "EXIT" || match.exit_state === "EXIT RISK");
              });

              if (hideAlertBanner || (!isIHSGInCrisis && portfolioExits.length === 0)) return null;

              return (
                <div id="global-ledger-warning-banner" className="relative p-4 pr-12 bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-rose-500/5 border border-rose-500/20 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg">
                  {/* Close button */}
                  <button
                    id="close-ledger-warning-banner"
                    onClick={() => setHideAlertBanner(true)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
                    title="Tutup banner peringatan"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex gap-3 items-start">
                    <span className="text-xl shrink-0">⚠️</span>
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#FCA5A5] font-mono flex items-center gap-2">
                        {isIHSGInCrisis ? "Sinyal Krisis Makro Terdeteksi!" : "Rekomendasi Rebalancing Aktif!"}
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                        </span>
                      </h4>
                      <p className="text-[11px] text-[#A0A0A0] leading-relaxed font-sans">
                        {isIHSGInCrisis ? (
                          <>
                            IHSG melemah signifikan sebesar <strong className="text-rose-400 font-mono">{MKT.ihsg.monthly.toFixed(2)}%</strong> dalam sebulan terakhir. Sistem merekomendasikan menghentikan pembelian, melakukan <strong className="text-amber-400">Cashout</strong> segera, atau mengamankan tabungan aset Anda ke <strong className="text-amber-400 font-bold">Emas Fisik</strong>.
                          </>
                        ) : (
                          <>
                            Aset dalam ledger aktif Anda (<strong className="text-amber-400">{portfolioExits.map(x => x.ticker.toUpperCase().replace(".JK", "")).join(', ')}</strong>) telah memicu kriteria keluar (<strong className="text-rose-400 font-mono">EXIT / EXIT RISK</strong>) pada rotasi kuantitatif hari ini.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 w-full md:w-auto shrink-0 md:self-center">
                    <button
                      id="action-btn-go-ledger"
                      onClick={() => {
                        setActiveTab("simulation");
                        // Scroll to tab block smoothly
                        setTimeout(() => {
                          const element = document.getElementById("tab-simulation");
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth' });
                          }
                        }, 50);
                      }}
                      className="w-full md:w-auto px-4 py-2 bg-rose-600/95 hover:bg-rose-600 text-white font-bold text-[10px] rounded-xl font-sans uppercase tracking-widest transition-all shadow-md hover:scale-[1.02] cursor-pointer"
                    >
                      Buka Live Ledger &amp; Amankan Aset
                    </button>
                  </div>
                </div>
              );
            })()}

            <AnimatePresence mode="wait">
              
              {/* Perspective 1: Market Tab */}
              {activeTab === "market" && (
                <motion.div
                  key="market-perspective"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <MarketTab 
                    onSelectTicker={handleSelectTicker} 
                    activeStock={activeStock} 
                    portfolio={portfolio}
                    watchlist={watchlist}
                    onAddTransaction={handleAddTransaction}
                    onRemoveTransaction={handleRemoveTransaction}
                    onToggleWatchlist={handleToggleWatchlist}
                    idxUniverse={idxUniverse}
                  />
                </motion.div>
              )}

              {/* Perspective 2: Leaders Tab */}
              {activeTab === "leaders" && (
                <motion.div
                  key="leaders-perspective"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <LeadersTab activeConfig={activeConfig} onSelectTicker={handleSelectTicker} idxUniverse={idxUniverse} />
                </motion.div>
              )}

              {/* Perspective 3: Recovery Ops Tab */}
              {activeTab === "turnaround" && (
                <motion.div
                  key="turnaround-perspective"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <RecoveryOpsTab onSelectTicker={handleSelectTicker} idxUniverse={idxUniverse} />
                </motion.div>
              )}

              {/* Perspective 4: Exit Protection Tab */}
              {activeTab === "exit" && (
                <motion.div
                  key="exit-perspective"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <CapitalProtectionTab onSelectTicker={handleSelectTicker} idxUniverse={idxUniverse} />
                </motion.div>
              )}

              {/* Perspective 5: Simulation Lab */}
              {activeTab === "simulation" && (
                <motion.div
                  key="simulation-perspective"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <SimulationTab
                    portfolio={portfolio}
                    onAddTransaction={handleAddTransaction}
                    onRemoveTransaction={handleRemoveTransaction}
                    onSelectTicker={handleSelectTicker}
                    getDynamicStock={getDynamicStock}
                    theme={theme}
                    activeConfig={activeConfig}
                    idxUniverse={idxUniverse}
                  />
                </motion.div>
              )}

              {/* Perspective 6: Diagnostics & AI Chat */}
              {activeTab === "diagnostics" && (
                <motion.div
                  key="diagnostics-perspective"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <DiagnosticsTab activeStock={activeStock} />
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </main>

      </div>

      {/* FLOATING INTEL DRAWER: For detailed single stock statistics */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div id="drawer-backdrop" className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop filter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-black"
            />

            {/* Sliding cabinet body */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-2xl bg-[#080808] border-l border-white/10 h-full flex flex-col justify-between shadow-2xl z-10"
            >
              {/* Drawer Content */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Header highlighting ticker */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${activeStock.logoColor || "bg-[#3b82f6]"} flex items-center justify-center font-black text-xs text-white`}>
                      {activeStock.ticker}
                    </div>
                    <div>
                      <h3 className="text-base font-serif italic text-white flex items-center gap-2">
                        PT {activeStock.name} <span className="text-emerald-400">({activeStock.ticker})</span>
                      </h3>
                      <p className="text-[10px] text-[#E0E0E0]/50 mt-1 uppercase tracking-widest">{activeStock.sector}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Scopes Navigation inside Drawer */}
                <div className="flex border-b border-white/5 bg-black/20 p-2 gap-1.5 shrink-0">
                  <button
                    onClick={() => setDrawerTab("chart")}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      drawerTab === "chart" ? "bg-white/5 text-emerald-400 font-extrabold border border-white/10" : "text-[#E0E0E0]/45 hover:text-white"
                    }`}
                  >
                    <LineChart className="w-3.5 h-3.5" /> Trend Graph
                  </button>
                  <button
                    onClick={() => setDrawerTab("sheets")}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      drawerTab === "sheets" ? "bg-white/5 text-emerald-400 font-extrabold border border-white/10" : "text-[#E0E0E0]/45 hover:text-white"
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Balance Sheet
                  </button>
                  <button
                    onClick={() => setDrawerTab("gemini-ai")}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      drawerTab === "gemini-ai" ? "bg-white/5 text-emerald-400 mt-0 font-extrabold border border-white/10" : "text-[#E0E0E0]/45 hover:text-white"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Gemini Intel
                  </button>
                  <button
                    onClick={() => setDrawerTab("forecast")}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      drawerTab === "forecast" ? "bg-white/5 text-emerald-400 mt-0 font-extrabold border border-white/10" : "text-[#E0E0E0]/45 hover:text-white"
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5 text-emerald-400" /> Proyeksi Dividen
                  </button>
                </div>

                {/* Subview Render Context scrolling area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {/* General company financials summary */}
                  <div className="grid grid-cols-4 gap-4 p-4.5 bg-white/5 border border-white/5 rounded-xl font-mono text-center shrink-0">
                    <div>
                      <span className="text-[9px] text-[#E0E0E0]/30 block font-sans">P/E Ratio</span>
                      <span className="text-white font-bold block mt-1">{activeStock.peRatio < 0 ? "Loss" : `${activeStock.peRatio}x`}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#E0E0E0]/30 block font-sans">P/B Ratio</span>
                      <span className="text-white font-bold block mt-1">{activeStock.pbRatio}x</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#E0E0E0]/30 block font-sans">ROE %</span>
                      <span className="text-white font-bold block mt-1">{activeStock.roe}%</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#E0E0E0]/30 block font-sans">Div Yield</span>
                      <span className="text-emerald-400 font-bold block mt-1">{activeStock.dividendYield}%</span>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    
                    {/* View A: Interactive Graph */}
                    {drawerTab === "chart" && (
                      <motion.div
                        key="drawer-chart"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <HistoricalChart stock={activeStock} theme={theme} />
                      </motion.div>
                    )}

                    {/* View B: Tabular Audited sheet statement */}
                    {drawerTab === "sheets" && (
                      <motion.div
                        key="drawer-sheets"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                      >
                        <div className="bg-[#0A0A0A] border border-white/5 rounded-xl p-4.5">
                          <span className="text-[10px] text-white/45 uppercase tracking-widest font-bold">Audited Financial Statement (IDR Billion)</span>
                          <table className="w-full text-left mt-4 text-[11px] font-mono">
                            <thead>
                              <tr className="border-b border-white/5 text-white/30 uppercase text-[9px] tracking-wider">
                                <th className="pb-2">Metric Label</th>
                                {activeStock.metrics.map(m => (
                                  <th key={m.year} className="pb-2 text-right">FY {m.year}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              <tr className="hover:bg-white/5">
                                <td className="py-2.5 text-white/80">Revenue sales</td>
                                {activeStock.metrics.map(m => (
                                  <td key={m.year} className="py-2.5 text-right text-white font-bold">Rp {m.revenue.toLocaleString()} B</td>
                                ))}
                              </tr>
                              <tr className="hover:bg-white/5">
                                <td className="py-2.5 text-emerald-450 text-emerald-400">Net Profit Margin</td>
                                {activeStock.metrics.map(m => (
                                  <td key={m.year} className="py-2.5 text-right text-emerald-400 font-bold">Rp {m.netIncome.toLocaleString()} B</td>
                                ))}
                              </tr>
                              <tr className="hover:bg-white/5">
                                <td className="py-2.5 text-white/80">Total Assets</td>
                                {activeStock.metrics.map(m => (
                                  <td key={m.year} className="py-2.5 text-right text-white font-semibold">Rp {m.totalAssets.toLocaleString()} B</td>
                                ))}
                              </tr>
                              <tr className="hover:bg-white/5">
                                <td className="py-2.5 text-white/80">Total Liabilities</td>
                                {activeStock.metrics.map(m => (
                                  <td key={m.year} className="py-2.5 text-right text-[#E0E0E0]/55">Rp {m.totalLiabilities.toLocaleString()} B</td>
                                ))}
                              </tr>
                              <tr className="hover:bg-white/5">
                                <td className="py-2.5 text-teal-400">Total Equities</td>
                                {activeStock.metrics.map(m => (
                                  <td key={m.year} className="py-2.5 text-right text-teal-400 font-bold">Rp {m.totalEquity.toLocaleString()} B</td>
                                ))}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}

                    {/* View C: Deep AI Report Generator */}
                    {drawerTab === "gemini-ai" && (
                      <motion.div
                        key="drawer-gemini-ai"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <DeepReport
                          stock={activeStock}
                          report={activeReport}
                          onGenerateReport={handleGenerateAIReport}
                          isGenerating={isGenerating}
                          error={generationError}
                        />
                      </motion.div>
                    )}

                    {/* View D: Forward Dividends Forecast Compounder */}
                    {drawerTab === "forecast" && (
                      <motion.div
                        key="drawer-forecast"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                      >
                        <ForwardDividendsForecast
                          stock={activeStock}
                          theme={theme}
                        />
                      </motion.div>
                    )}

                  </AnimatePresence>

                  {/* Dynamic context descriptions */}
                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl">
                    <span className="text-[10px] text-[#E0E0E0]/30 font-bold uppercase tracking-wider block">Corporate Profile</span>
                    <p className="text-xs text-[#E0E0E0]/70 mt-2 leading-relaxed italic">{activeStock.description}</p>
                  </div>

                </div>
              </div>

              {/* Collapsed Drawer footer */}
              <div className="p-4 bg-black border-t border-white/5 text-[10px] text-white/30 text-center shrink-0">
                Click elsewhere to dismiss • Indonesia Stock Intelligence V4
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER credit and legal disclaimer strip */}
      <footer id="credits-footer" className="py-8 bg-[#070707] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 text-center space-y-2">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
            Indonesia Stock Intelligence • Terminal Version V4.1
          </p>
          <p className="text-[10px] text-white/35 max-w-xl mx-auto leading-relaxed">
            Legal Disclaimer: Any simulated trading portfolios, historical backtests, or factor scoring calculations provided within this workspace do not represent formal investment pathways in Bursa Efek Indonesia. Always review with licensed securities advisors before trading real investment funds.
          </p>
        </div>
      </footer>

    </div>
  );
}
