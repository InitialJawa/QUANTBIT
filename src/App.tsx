import { useState, useEffect, useRef } from "react";
import { getStock, STOCKS_DATA } from "./stocksData";
import { setFundamentalsData } from "./fundamentalsCache";
import { DataStatus } from "./types/DataStatus";
import { idxNews, EX, MKT, RS, setScanData } from "./marketData";
import { refreshRSFromRegime, setIhsgHistory } from "./marketRegimeEngine";
import { StockData, AnalysisResult, PortfolioItem, WatchlistItem } from "./types";
import { HistoricalChart } from "./components/HistoricalChart";
import { DeepReport } from "./components/DeepReport";
import { AIAssistant } from "./components/AIAssistant";
import { ForwardDividendsForecast } from "./components/ForwardDividendsForecast";

// Import modular Perspective Tab components
import { MarketTab } from "./components/MarketTab";
import { PortfolioTracker } from "./components/PortfolioTracker";
import { LeadersTab } from "./components/LeadersTab";
import { RecoveryOpsTab } from "./components/RecoveryOpsTab";
import { CapitalProtectionTab } from "./components/CapitalProtectionTab";
import { SimulationTab } from "./components/SimulationTab";
import { DiagnosticsTab } from "./components/DiagnosticsTab";
import { TickerLogo } from "./components/TickerLogo";
import { LoginScreen } from "./components/LoginScreen";
import { DataSourcesRow } from "./components/SourceBadge";
import { auth, db } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot, collection } from "firebase/firestore";

import { DigitalWalletUI } from "./components/DigitalWalletUI";
import { 
  Menu, 
  X, 
  Search, 
  Settings, 
  TrendingUp, 
  TrendingDown, 
  BarChart2, 
  Activity, 
  Newspaper, 
  LogOut, 
  Moon, 
  Sun,
  Wallet,
  Sparkles,
  Eye,
  Sliders,
  BookOpen,
  LineChart,
  Cpu,
  Award,
  Flame,
  ShieldAlert,
  SlidersHorizontal,
  ChevronRight,
  Maximize2,
  ExternalLink,
  Coins,
  Trash2,
  Plus,
  Minus,
  Briefcase,
  Bookmark,
  BookmarkCheck,
  Monitor,
  Hexagon,
  Palette
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // GOAPI & Yahoo Finance Live Stock prices integration
  const [goapiPrices, setGoapiPrices] = useState<Record<string, { close: number; change: number; pct: number }>>({});
  const [yahooPrices, setYahooPrices] = useState<Record<string, { close: number; change: number; pct: number }>>({});
  const [dataFeed, setDataFeed] = useState<"yahoo" | "goapi" | "simulated">("yahoo");
  const [isGoapiConnected, setIsGoapiConnected] = useState(false);
  const [isYahooConnected, setIsYahooConnected] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  // Dynamic pricing fluctuation state to support rolling real-time updates
  const [priceFluctuations, setPriceFluctuations] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchPrices = () => {
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

      // Fetch real IDX fundamentals from SQLite
      fetch("/api/fundamentals")
        .then(res => res.json())
        .then(apiRes => {
          if (apiRes.success && apiRes.data?.length > 0) {
            setFundamentalsData(apiRes.data);
            console.log(`Loaded ${apiRes.count} real fundamental records for ${new Set(apiRes.data.map((r: any) => r.ticker)).size} tickers`);
          }
        })
        .catch(err => console.warn("Fundamentals load error:", err));

      // Fetch IHSG history for MA20/MA50 computation in regime engine
      fetch("/api/backtest-data")
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setIhsgHistory(data.map((d: any) => ({ close: d.ihsgPrice, date: d.date })));
          }
          refreshRSFromRegime();
        })
        .catch(() => {
          refreshRSFromRegime();
        });

      // Fetch scan data cache for real leader scores
      fetch("/api/engine/idx80")
        .then(res => res.json())
        .then(data => {
          if (data?.stocks && data.stocks.length > 0) {
            setScanData(data);
            refreshRSFromRegime();
            console.log(`Loaded ${data.stocks.length} scanned stock records`);
          }
        })
        .catch(() => {});
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const [mktRevision, setMktRevision] = useState(0);

  // Sync real-time IHSG and USDIDR to MKT object if using Yahoo data
  useEffect(() => {
    let changed = false;
    if (dataFeed === "yahoo" && yahooPrices["IHSG"] && MKT.ihsg.value !== yahooPrices["IHSG"].close) {
      MKT.ihsg.value = yahooPrices["IHSG"].close;
      MKT.ihsg.daily_pct = Number(yahooPrices["IHSG"].pct.toFixed(2));
      changed = true;
    }
    if (dataFeed === "yahoo" && yahooPrices["USDIDR"] && MKT.usdidr.value !== yahooPrices["USDIDR"].close) {
      MKT.usdidr.value = yahooPrices["USDIDR"].close;
      MKT.usdidr.daily = Number(yahooPrices["USDIDR"].pct.toFixed(2));
      changed = true;
    }
    if (dataFeed === "yahoo" && yahooPrices["GOLD"] && yahooPrices["USDIDR"]) {
      const goldUSDPerOz = yahooPrices["GOLD"].close;
      const usdIDR = yahooPrices["USDIDR"].close;
      const idrPerGram = Math.round((goldUSDPerOz * usdIDR) / 31.1035);
      if (MKT.gold.value !== idrPerGram) {
        MKT.gold.value = idrPerGram;
        changed = true;
      }
    }
    if (changed) {
      setMktRevision(prev => prev + 1);
    }
  }, [dataFeed, yahooPrices]);

  // Refresh market regime engine whenever MKT data changes
  useEffect(() => {
    refreshRSFromRegime();
  }, [mktRevision]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const jakarta = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
      const hour = jakarta.getHours();
      const day = jakarta.getDay();
      const marketOpen = day >= 1 && day <= 5 && hour >= 9 && hour < 15;

      setPriceFluctuations(prev => {
        const next = { ...prev };
        STOCKS_DATA.forEach(stock => {
          if (!marketOpen) {
            next[stock.ticker] = 0;
            return;
          }

          let stockPriceBase = stock.currentPrice;
          if (dataFeed === "goapi" && goapiPrices[stock.ticker]) {
            stockPriceBase = goapiPrices[stock.ticker].close;
          } else if (dataFeed === "yahoo" && yahooPrices[stock.ticker]) {
            stockPriceBase = yahooPrices[stock.ticker].close;
          }

          const currentOffset = next[stock.ticker] || 0;
          const delta = 0; // removed random walk — prices stay at scan values
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
    const cleanTicker = ticker.toUpperCase().replace(".JK", "");
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
    
    const dynamicChange = parseFloat((((activePrice - basePrice) / basePrice) * 100 + baseChange).toFixed(2));

    // Regenerate chart series using the real activePrice as anchor
    const buildChart = (count: number, spread: number, labels: string[]): { date: string; price: number; volume: number }[] => {
      const openPrice = Math.round(activePrice * (1 - dynamicChange / 100 * spread));
      return Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1);
        const curve = Math.sin(t * Math.PI) * 0.005 - (1 - t) * (dynamicChange / 100 * spread) / 2;
        return {
          date: labels[i] || String(i),
          price: Math.round(openPrice + (activePrice - openPrice) * t + activePrice * curve),
          volume: Math.round(50000 + (rawStock.ticker.charCodeAt(0) * i * 777) % 100000),
        };
      });
    };

    const hasLivePrice = (dataFeed === "goapi" && goapiPrices[rawStock.ticker]) || (dataFeed === "yahoo" && yahooPrices[rawStock.ticker]);

    return {
      ...rawStock,
      currentPrice: activePrice,
      change: dynamicChange,
      dataSources: {
        ...rawStock.dataSources,
        price: hasLivePrice ? DataStatus.LIVE : rawStock.dataSources.price,
      },
      chartDataDaily: buildChart(8, 0.5, ["09:00","10:00","11:00","12:00","13:30","14:30","15:30","16:00"]),
      chartDataWeekly: buildChart(5, 1, ["Mon","Tue","Wed","Thu","Fri"]),
      chartDataMonthly: buildChart(4, 2.5, ["Week 1","Week 2","Week 3","Week 4"]),
    };
  };

  // Main app tab state (now matching target dashboard precisely!)
  const [activeTab, setActiveTab] = useState<"market" | "leaders" | "turnaround" | "exit" | "ledger" | "simulation" | "diagnostics">("market");
  const [hideAlertBanner, setHideAlertBanner] = useState(false);
  
  // Weights Config state ('prod' = Config F, 'res' = Config B)
  const [activeConfig, setActiveConfig] = useState<"prod" | "res">(() => {
    const saved = localStorage.getItem("idx_activeconfig");
    return (saved === "prod" || saved === "res") ? saved : "prod";
  });

  // Selected Stock detailed drawer variables
  const [selectedTicker, setSelectedTicker] = useState("BBCA");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<"chart" | "sheets" | "gemini-ai" | "forecast">("chart");
  const [drawerLots, setDrawerLots] = useState<number | "">("");

  const [searchQuery, setSearchQuery] = useState("");

  // Retrieve selected stock detail
  const activeStock = getDynamicStock(selectedTicker) || STOCKS_DATA[0];

  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // PERSISTENCE LOCAL STATES (Watchlist & Portfolio)
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [cash, setCash] = useState<number>(100000000);
  const [tradeLogs, setTradeLogs] = useState<{ id: string; type: string; ticker: string; shares: number; price: number; timestamp: string }[]>([]);
  const [cachedReports, setCachedReports] = useState<Record<string, AnalysisResult>>({});
  const [appNotification, setAppNotification] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  useEffect(() => {
    if (appNotification) {
      const timer = setTimeout(() => {
        setAppNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [appNotification]);
  
  // Startup Database Synchronization from Firebase
  useEffect(() => {
    if (!user) return;
    
    setIsDbLoaded(false);

    // Profile listener
    const unsubProfile = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (typeof data.cash === "number") setCash(data.cash);
        if (data.theme) setTheme(data.theme === "dark" ? "deep" : data.theme);
        if (data.dataFeed) setDataFeed(data.dataFeed);
        if (data.activeConfig) setActiveConfig(data.activeConfig);
      }
    });

    // Watchlist listener
    const unsubWatchlist = onSnapshot(collection(db, "users", user.uid, "watchlist"), (snapshot) => {
      const items: WatchlistItem[] = [];
      snapshot.forEach(doc => items.push(doc.data() as WatchlistItem));
      setWatchlist(items);
    });

    // Portfolio listener
    const unsubPortfolio = onSnapshot(collection(db, "users", user.uid, "portfolio"), (snapshot) => {
      const items: PortfolioItem[] = [];
      snapshot.forEach(doc => items.push(doc.data() as PortfolioItem));
      setPortfolio(items);
    });

    // Logs listener
    const unsubLogs = onSnapshot(collection(db, "users", user.uid, "tradeLogs"), (snapshot) => {
      const items: any[] = [];
      snapshot.forEach(doc => items.push(doc.data()));
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setTradeLogs(items);
    });

    // Reports listener
    const unsubReports = onSnapshot(collection(db, "users", user.uid, "cachedReports"), (snapshot) => {
      const reports: Record<string, AnalysisResult> = {};
      snapshot.forEach(doc => {
        reports[doc.id] = doc.data().data as AnalysisResult;
      });
      setCachedReports(reports);
    });

    setIsDbLoaded(true);

    return () => {
      unsubProfile();
      unsubWatchlist();
      unsubPortfolio();
      unsubLogs();
      unsubReports();
    };
  }, [user]);

  // Handle Syncs to Firebase instead of localStorage
  const syncProfileToFirebase = async () => {
    if (!user || !isDbLoaded) return;
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        cash,
        theme,
        dataFeed,
        activeConfig,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch(e) {
      console.error(e);
    }
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"deep" | "slate" | "nord" | "light" | "stockbit">("deep");
  const getChartTheme = (): "dark" | "light" => theme === "light" ? "light" : "dark";

  useEffect(() => {
    syncProfileToFirebase();
  }, [theme, dataFeed, activeConfig, cash]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle opening stock detail drawer
  const handleSelectTicker = (ticker: string) => {
    setSelectedTicker(ticker);
    setIsDrawerOpen(true);
  };

  const handleChangeActiveTicker = (ticker: string) => {
    setSelectedTicker(ticker);
  };

  // Watchlist quick toggle
  const handleToggleWatchlist = async (ticker: string) => {
    if (!user) return;
    const docRef = doc(db, "users", user.uid, "watchlist", ticker);
    if (watchlist.some(w => w.ticker === ticker)) {
      await import("firebase/firestore").then(m => m.deleteDoc(docRef));
    } else {
      await setDoc(docRef, { ticker, addedAt: new Date().toISOString() });
    }
  };

  // Simulated portfolio additions
  const handleAddTransaction = async (ticker: string, shares: number, buyPrice: number, silent: boolean = false) => {
    if (!user) return;
    
    if (!silent) {
      const details = calculateTradeDetails("BUY", ticker, shares, buyPrice);
      if (details.net > cash) {
        setAppNotification({ message: `Saldo kas tidak mencukupi untuk membeli ${ticker === "EMAS" ? "Emas" : ticker}!`, type: "error" });
        return;
      }
      
      setCash(prev => {
        const nextCash = prev - details.net;
        import("firebase/firestore").then(m => {
          m.setDoc(doc(db, "users", user.uid), { cash: nextCash }, { merge: true });
        });
        return nextCash;
      });
      
      const logId = "log-" + Date.now();
      const messageStr = ticker === "EMAS" 
        ? `Pembelian ${shares.toFixed(4)} Gram Emas @ Rp ${buyPrice.toLocaleString("id-ID")}`
        : `Pembelian ${shares / 100} Lot ${ticker} @ Rp ${buyPrice.toLocaleString("id-ID")}`;
        
      const nextLogs = [{
        id: logId,
        type: ticker === "EMAS" ? "BUY_GOLD" : "BUY",
        ticker,
        shares,
        price: buyPrice,
        timestamp: new Date().toISOString(),
        message: messageStr
      }, ...tradeLogs];
      customSetTradeLogs(nextLogs);
      
      const successMsg = ticker === "EMAS" 
        ? `Berhasil membeli ${shares.toFixed(4)} Gram Emas!`
        : `Berhasil membeli ${shares / 100} Lot ${ticker}!`;
      setAppNotification({ message: successMsg, type: "success" });
    }

    const docRef = doc(db, "users", user.uid, "portfolio", ticker);
    const existing = portfolio.find(p => p.ticker === ticker);
    if (existing) {
      const combinedShares = existing.shares + shares;
      const averagePrice = Math.round(((existing.shares * existing.buyPrice) + (shares * buyPrice)) / combinedShares);
      await setDoc(docRef, {
        ticker,
        shares: combinedShares,
        buyPrice: averagePrice,
        addedAt: existing.addedAt || new Date().toISOString()
      }, { merge: true });
    } else {
      await setDoc(docRef, { ticker, shares, buyPrice, addedAt: new Date().toISOString() });
    }
  };

  const handleRemoveTransaction = async (ticker: string) => {
    if (!user) return;
    await import("firebase/firestore").then(m => m.deleteDoc(doc(db, "users", user.uid, "portfolio", ticker)));
    setAppNotification({ message: `${ticker} berhasil dihapus dari portofolio.`, type: "info" });
  };

  const handleSellTransaction = async (ticker: string, sharesToSell: number, silent: boolean = false) => {
    if (!user) return;
    const docRef = doc(db, "users", user.uid, "portfolio", ticker);
    const existing = portfolio.find(p => p.ticker === ticker);
    
    if (existing) {
      if (!silent) {
        const currentPrice = ticker === "EMAS" ? MKT.gold.value : getDynamicStock(ticker).currentPrice;
        const details = calculateTradeDetails("SELL", ticker, sharesToSell, currentPrice);
        
        // Update local cash and firebase explicitly
        setCash(prev => {
          const nextCash = prev + details.net;
          import("firebase/firestore").then(m => {
            m.setDoc(doc(db, "users", user.uid), { cash: nextCash }, { merge: true });
          });
          return nextCash;
        });

        const logId = "log-" + Date.now();
        const messageStr = ticker === "EMAS"
          ? `Mencairkan ${sharesToSell.toFixed(4)} Gram Emas @ Rp ${currentPrice.toLocaleString("id-ID")}`
          : `Penjualan ${sharesToSell / 100} Lot ${ticker} @ Rp ${currentPrice.toLocaleString("id-ID")}`;

        const nextLogs = [{
          id: logId,
          type: "SELL",
          ticker,
          shares: sharesToSell,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          message: messageStr
        }, ...tradeLogs];
        customSetTradeLogs(nextLogs);
        
        const successMsg = ticker === "EMAS" 
          ? `Berhasil menjual ${sharesToSell.toFixed(4)} gram Emas!`
          : `Berhasil menjual ${sharesToSell / 100} Lot ${ticker}!`;
        setAppNotification({ message: successMsg, type: "success" });
      }

      if (existing.shares <= sharesToSell) {
        await import("firebase/firestore").then(m => m.deleteDoc(docRef));
      } else {
        await setDoc(docRef, {
          shares: existing.shares - sharesToSell,
        }, { merge: true });
      }
    }
  };

  const getEmasShares = (): number => {
    if (!portfolio || !Array.isArray(portfolio)) return 0;
    const emasItem = portfolio.find(p => p.ticker === "EMAS");
    if (!emasItem || typeof emasItem.shares !== 'number') return 0;
    return emasItem.shares;
  };

  const calculateTradeDetails = (type: string, ticker: string, shares: number, price: number) => {
    if (type === "DEPOSIT" || type === "WITHDRAWAL") {
      return { gross: shares, slippage: 0, fee: 0, tax: 0, net: shares };
    }
    const gross = shares * price;
    if (ticker === "EMAS" || ticker === "GOLD") {
      const slippage = gross * 0.02; // Standard 2% physical split
      const fee = 0;
      const tax = 0;
      const net = type.startsWith("BUY") ? gross + slippage : gross - slippage;
      return { gross, slippage, fee, tax, net };
    }
    
    const SLIPPAGE_RATE = 0.0005; // 0.05% spread / slippage
    const BUY_FEE_RATE = 0.0015; // 0.15% brokerage admin fee
    const SELL_FEE_RATE = 0.0025; // 0.25% brokerage admin fee
    const TAX_RATE = 0.0010; // 0.10% transaction tax (Sales tax)

    if (type.startsWith("BUY")) {
      const priceWithSlippage = price * (1 + SLIPPAGE_RATE);
      const slippage = price * SLIPPAGE_RATE * shares;
      const fee = priceWithSlippage * BUY_FEE_RATE * shares;
      const tax = 0;
      const net = (priceWithSlippage * shares) + fee;
      return { gross, slippage, fee, tax, net };
    } else {
      const priceWithSlippage = price * (1 - SLIPPAGE_RATE);
      const slippage = price * SLIPPAGE_RATE * shares;
      const fee = priceWithSlippage * SELL_FEE_RATE * shares;
      const tax = priceWithSlippage * TAX_RATE * shares;
      const net = (priceWithSlippage * shares) - fee - tax;
      return { gross, slippage, fee, tax, net };
    }
  };

  const customSetTradeLogs = (value: any) => {
    if (!user) return;
    const nextLogs = typeof value === 'function' ? value(tradeLogs) : value;
    
    // Determine changes
    if (nextLogs.length === 0 && tradeLogs.length > 0) {
      // Clear history
      tradeLogs.forEach(log => {
        import("firebase/firestore").then(m => m.deleteDoc(doc(db, "users", user.uid, "tradeLogs", log.id)));
      });
    } else if (nextLogs.length > tradeLogs.length) {
      // Assuming prepend new logs
      const diff = nextLogs.length - tradeLogs.length;
      for (let i = 0; i < diff; i++) {
        const newLog = nextLogs[i];
        if (newLog) {
          setDoc(doc(db, "users", user.uid, "tradeLogs", newLog.id), newLog);
        }
      }
    }
  };

  const handleDepositCash = (rupiahAmount: number) => {
    setCash(prev => {
      const nextCash = prev + rupiahAmount;
      if (user) {
        import("firebase/firestore").then(m => {
          m.setDoc(doc(db, "users", user.uid), { cash: nextCash }, { merge: true });
        });
      }
      return nextCash;
    });
    
    const logId = "log-" + Date.now();
    const nextLogs = [{
      id: logId,
      type: "DEPOSIT",
      ticker: "KAS",
      shares: rupiahAmount,
      price: 1,
      timestamp: new Date().toISOString(),
      message: `Deposit Nominal sebesar Rp ${rupiahAmount.toLocaleString("id-ID")}`
    }, ...tradeLogs];
    customSetTradeLogs(nextLogs);
  };

  const handleWithdrawCash = (rupiahAmount: number) => {
    setCash(prev => {
      const nextCash = prev - rupiahAmount;
      if (user) {
        import("firebase/firestore").then(m => {
          m.setDoc(doc(db, "users", user.uid), { cash: nextCash }, { merge: true });
        });
      }
      return nextCash;
    });
    
    const logId = "log-" + Date.now();
    const nextLogs = [{
      id: logId,
      type: "WITHDRAWAL",
      ticker: "KAS",
      shares: rupiahAmount,
      price: 1,
      timestamp: new Date().toISOString(),
      message: `Penarikan Dana sebesar Rp ${rupiahAmount.toLocaleString("id-ID")}`
    }, ...tradeLogs];
    customSetTradeLogs(nextLogs);
  };

  const handleMoveToGold = (rupiahAmount: number) => {
    const goldPrice = MKT.gold.value;
    const grams = rupiahAmount / goldPrice;
    const details = calculateTradeDetails("BUY", "EMAS", grams, goldPrice);
    
    if (details.net > cash) {
      setAppNotification({ message: "Saldo kas tidak mencukupi untuk membeli emas!", type: "error" });
      return;
    }

    setCash(prev => {
      const nextCash = prev - details.net;
      if (user) {
        import("firebase/firestore").then(m => {
          m.setDoc(doc(db, "users", user.uid), { cash: nextCash }, { merge: true });
        });
      }
      return nextCash;
    });
    
    handleAddTransaction("EMAS", grams, goldPrice, true); // true = silent/no double deduct
    
    const logId = "log-" + Date.now();
    const nextLogs = [{
      id: logId,
      type: "BUY_GOLD",
      ticker: "EMAS",
      shares: grams,
      price: goldPrice,
      timestamp: new Date().toISOString(),
      message: `Konversi Kas ke Safe Haven Emas Fisik sebesar Rp ${rupiahAmount.toLocaleString("id-ID")}`
    }, ...tradeLogs];
    customSetTradeLogs(nextLogs);
    setAppNotification({ message: `Berhasil membeli ${grams.toFixed(4)} gram Emas!`, type: "success" });
  };

  const handleSellGoldToCashInput = (enteredVal: number) => {
    const goldPrice = MKT.gold.value;
    const details = calculateTradeDetails("SELL", "EMAS", enteredVal, goldPrice);

    setCash(prev => {
      const nextCash = prev + details.net;
      if (user) {
        import("firebase/firestore").then(m => {
          m.setDoc(doc(db, "users", user.uid), { cash: nextCash }, { merge: true });
        });
      }
      return nextCash;
    });

    handleSellTransaction("EMAS", enteredVal, true); // true = silent

    const logId = "log-" + Date.now();
    const nextLogs = [{
      id: logId,
      type: "SELL_GOLD",
      ticker: "EMAS",
      shares: enteredVal,
      price: goldPrice,
      timestamp: new Date().toISOString(),
      message: `Mencairkan ${enteredVal} Gram Emas Fisik ke Kas Wallet`
    }, ...tradeLogs];
    customSetTradeLogs(nextLogs);
    setAppNotification({ message: `Berhasil mencairkan ${enteredVal} gram Emas!`, type: "success" });
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
      if (user) {
        await setDoc(doc(db, "users", user.uid, "cachedReports", activeStock.ticker), {
          ticker: activeStock.ticker,
          data: reportData,
          updatedAt: new Date().toISOString()
        });
      }
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
  const activeUniverseStocks = STOCKS_DATA;
  const filteredStocks = activeUniverseStocks.filter((s) => {
    const isMatched = s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.sector.toLowerCase().includes(searchQuery.toLowerCase());
    return isMatched;
  }).map(s => getDynamicStock(s.ticker));

  if (authLoading) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Loading...</div>;
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div id="applet-main-canvas" data-theme={theme} className={`min-h-screen bg-gradient-theme text-[#E0E0E0] font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-400 flex flex-col`}>
      
      {/* APP NOTIFICATION OVERLAY */}
      <AnimatePresence>
        {appNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 20, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-4 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${
              appNotification.type === "success" ? "bg-emerald-500/90 border-emerald-400 text-black" :
              appNotification.type === "error" ? "bg-rose-500/90 border-rose-400 text-white" :
              "bg-blue-500/90 border-blue-400 text-white"
            }`}
          >
            <div className={`w-2 h-2 rounded-full animate-pulse ${
              appNotification.type === "success" ? "bg-black" : "bg-white"
            }`} />
            <span className="text-sm font-black uppercase tracking-tight">{appNotification.message}</span>
            <button onClick={() => setAppNotification(null)} className="ml-2 hover:opacity-50">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BRAND STYLE TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-[#0A0A0A]/95 backdrop-blur-md border-b border-white/5 px-3 py-2 md:px-6 md:py-2.5 shrink-0 flex flex-col md:flex-row items-center justify-between gap-2.5 md:gap-4">
        {/* Brand Logo & Name */}
        <div className="flex items-center justify-start w-full md:w-auto gap-2.5">
          <div className="flex items-center justify-center shrink-0">
            <svg viewBox="0 0 115 100" className="w-8 h-8 text-white transition-colors duration-300 dark:text-white" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="48" cy="45" r="28" stroke="currentColor" strokeWidth="16" />
              <path d="M 61 58 L 81 78" stroke="currentColor" strokeWidth="16" strokeLinecap="square" />
              <circle cx="98" cy="70" r="10" className="fill-emerald-400" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-[13px] md:text-sm font-black text-white tracking-widest uppercase">
              Quantbit
            </h1>
            <span className="text-[8px] md:text-[9px] text-white/40 uppercase tracking-[0.2em] font-medium leading-none mt-0.5">
              Terminal
            </span>
          </div>
        </div>

        {/* Gemini-Style Rounded Pill Navigation (Fitted precisely & extremely responsive!) */}
        <div className="flex-1 max-w-4xl overflow-x-auto scrollbar-none py-0.5 md:py-0 w-full">
          <nav className="flex items-center space-x-1 bg-[#121212] border border-white/5 p-1 rounded-full w-max mx-auto">
            
            <button
              id="tab-market"
              onClick={() => setActiveTab("market")}
              title="Market"
              className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer gap-2 ${
                activeTab === "market"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <Activity className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span className="hidden lg:inline-block text-[10px] font-bold uppercase tracking-widest">Market</span>
            </button>

            <button
              id="tab-ledger"
              onClick={() => setActiveTab("ledger")}
              title="Ledger"
              className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer gap-2 ${
                activeTab === "ledger"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <Briefcase className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span className="hidden lg:inline-block text-[10px] font-bold uppercase tracking-widest">Portfolio</span>
            </button>

            <button
              id="tab-leaders"
              onClick={() => setActiveTab("leaders")}
              title="Leaders"
              className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer gap-2 ${
                activeTab === "leaders"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span className="hidden lg:inline-block text-[10px] font-bold uppercase tracking-widest">Leaders</span>
            </button>

            <button
              id="tab-turnaround"
              onClick={() => setActiveTab("turnaround")}
              title="Recovery"
              className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer gap-2 ${
                activeTab === "turnaround"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <Flame className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span className="hidden lg:inline-block text-[10px] font-bold uppercase tracking-widest">Recovery</span>
            </button>

            <button
              id="tab-exit"
              onClick={() => setActiveTab("exit")}
              title="Manajemen Resiko"
              className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer gap-2 ${
                activeTab === "exit"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <ShieldAlert className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span className="hidden lg:inline-block text-[10px] font-bold uppercase tracking-widest">Risiko</span>
            </button>

            <button
              id="tab-simulation"
              onClick={() => setActiveTab("simulation")}
              title="Simulation"
              className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer gap-2 ${
                activeTab === "simulation"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <Award className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span className="hidden lg:inline-block text-[10px] font-bold uppercase tracking-widest">Simulasi</span>
            </button>

            <button
              id="tab-diagnostics"
              onClick={() => setActiveTab("diagnostics")}
              title="AI Labs"
              className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer gap-2 ${
                activeTab === "diagnostics"
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              }`}
            >
              <Cpu className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              <span className="hidden lg:inline-block text-[10px] font-bold uppercase tracking-widest">Sistem</span>
            </button>

          </nav>
        </div>

        {/* Brand Control Utilities & Theme Toggle panel */}
        <div className="flex items-center gap-3 shrink-0 self-end md:self-center relative">
          
          {/* Active Online badge */}
          <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl">
            <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-ping" />
            <span className="text-[9px] font-bold font-mono tracking-widest text-white/80 uppercase">LIVE</span>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/5 bg-white/5" title="Data Feed Indicator">
            <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
            <span className="text-[9px] font-bold font-mono tracking-widest uppercase text-white/50">
              {dataFeed === "yahoo" ? "Yahoo" : dataFeed === "goapi" ? "GoAPI" : "Simulasi"}
            </span>
          </div>

          {/* User Account Info */}
          <div className="hidden md:flex items-center bg-white/5 border border-white/5 rounded-xl px-3 py-1 gap-3">
            <div className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center border border-white/10">
              <span className="text-[10px] text-white font-bold uppercase">{user?.email?.charAt(0) || "U"}</span>
            </div>
            <span className="text-[10px] text-white/70 font-medium truncate max-w-[120px]">{user?.email}</span>
          </div>

          <div className="relative" ref={settingsDropdownRef}>
            {/* Settings Menu Toggle */}
            <button 
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="w-8 h-8 rounded-xl border border-white/5 hover:bg-white/10 flex items-center justify-center transition-all bg-[#0A0A0A] z-50 relative"
            >
              <Settings className="w-4 h-4 text-white/70" />
            </button>

            {/* Settings Dropdown */}
            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-12 right-0 w-64 bg-[#121212] border border-white/[0.05] shadow-2xl rounded-2xl py-2 z-[60] flex flex-col font-sans max-h-screen overflow-y-auto"
                >
                  <div className="px-4 py-2 border-b border-white/[0.05] mb-1">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                        <span className="text-xs font-bold uppercase">{user.email?.charAt(0) || "U"}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] text-white font-medium truncate max-w-[150px]">{user.email}</span>
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">Signed in</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-2 py-1">
                    <div className="text-[10px] font-bold text-zinc-500 px-3 pt-2 pb-1 uppercase tracking-widest">Tema Aplikasi</div>
                    <button onClick={() => setTheme("deep")} className={`w-full flex items-center gap-3 px-3 py-2 text-xs rounded-xl transition-all ${theme === "deep" ? "text-white bg-white/10" : "text-white/70 hover:text-white hover:bg-white/[0.05]"}`}>
                      <Moon className="w-4 h-4" /> Deep
                      {theme === "deep" && <span className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                    </button>
                    <button onClick={() => setTheme("slate")} className={`w-full flex items-center gap-3 px-3 py-2 text-xs rounded-xl transition-all ${theme === "slate" ? "text-white bg-white/10" : "text-white/70 hover:text-white hover:bg-white/[0.05]"}`}>
                      <Palette className="w-4 h-4" /> Slate
                      {theme === "slate" && <span className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                    </button>
                    <button onClick={() => setTheme("nord")} className={`w-full flex items-center gap-3 px-3 py-2 text-xs rounded-xl transition-all ${theme === "nord" ? "text-white bg-white/10" : "text-white/70 hover:text-white hover:bg-white/[0.05]"}`}>
                      <Palette className="w-4 h-4" /> Nord
                      {theme === "nord" && <span className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                    </button>
                    <button onClick={() => setTheme("light")} className={`w-full flex items-center gap-3 px-3 py-2 text-xs rounded-xl transition-all ${theme === "light" ? "text-white bg-white/10" : "text-white/70 hover:text-white hover:bg-white/[0.05]"}`}>
                      <Sun className="w-4 h-4" /> Terang
                      {theme === "light" && <span className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                    </button>
                    <button onClick={() => setTheme("stockbit")} className={`w-full flex items-center gap-3 px-3 py-2 text-xs rounded-xl transition-all ${theme === "stockbit" ? "text-white bg-white/10" : "text-white/70 hover:text-white hover:bg-white/[0.05]"}`}>
                      <Monitor className="w-4 h-4" /> Stockbit
                      {theme === "stockbit" && <span className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                    </button>
                  </div>

                  <div className="h-px w-full bg-white/[0.05] my-1" />

                  <div className="px-2 py-1">
                    <div className="text-[10px] font-bold text-zinc-500 px-3 pt-2 pb-1 uppercase tracking-widest">Data Feed</div>
                    <button onClick={() => setDataFeed("yahoo")} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors">
                      Yahoo Finance
                      {dataFeed === "yahoo" && <span className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                    </button>
                    <button onClick={() => setDataFeed("goapi")} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors">
                      GoAPI.io
                      {dataFeed === "goapi" && <span className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                    </button>
                    <button onClick={() => setDataFeed("simulated")} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors">
                      Simulasi Offline
                      {dataFeed === "simulated" && <span className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                    </button>
                  </div>

                  <div className="h-px w-full bg-white/[0.05] my-1" />

                  <div className="px-2 py-1">
                    <div className="text-[10px] font-bold text-zinc-500 px-3 pt-2 pb-1 uppercase tracking-widest">Konfigurasi</div>
                    <button onClick={() => setActiveConfig("prod")} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors">
                      <Sliders className="w-4 h-4" /> Config F
                      {activeConfig === "prod" && <span className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                    </button>
                    <button onClick={() => setActiveConfig("res")} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/[0.05] rounded-xl transition-colors">
                      <Sliders className="w-4 h-4" /> Config B
                      {activeConfig === "res" && <span className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                    </button>
                  </div>

                  <div className="h-px w-full bg-white/[0.05] my-1" />

                  <div className="px-2 py-1">
                    <button onClick={() => { setIsSettingsOpen(false); signOut(auth); }} className="w-full flex items-center gap-3 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors">
                      <LogOut className="w-4 h-4" /> Keluar Akun
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Unified Mobile Menu Toggle */}
          <button 
            className="md:hidden w-8 h-8 rounded-xl border border-white/5 hover:bg-white/10 flex items-center justify-center text-white/50 hover:text-white transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

        </div>

      </header>

      <div className="flex flex-col md:flex-row flex-1 overflow-y-auto md:overflow-hidden md:min-h-0 relative">
        
        {/* Mobile Sidebar Backdrop */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* LEFT BAR NAV & QUICK ACCESS */}
        <aside id="main-sidebar" className={`${isMobileMenuOpen ? 'flex fixed inset-y-0 left-0 w-[85%] max-w-sm z-50 bg-[#0A0A0A] shadow-2xl' : 'hidden'} md:flex w-full md:static md:w-72 lg:w-80 bg-[#0A0A0A] md:border-r border-white/10 shrink-0 flex-col md:overflow-hidden transition-all duration-300`}>
          <div className="flex flex-col flex-1 overflow-y-auto md:overflow-y-auto py-4 gap-4 scrollbar-thin">
            
            {/* DIGITAL WALLET RDI - OVERHAULED */}
            <div id="rdi-digital-wallet-container" className="mx-4 overflow-hidden rounded-2xl border border-white/5 shadow-2xl">
              <DigitalWalletUI 
                cash={cash}
                goldShares={getEmasShares()}
                tradeLogs={tradeLogs}
                onDeposit={handleDepositCash}
                onWithdraw={handleWithdrawCash}
                onMoveToGold={handleMoveToGold}
                onSellGold={handleSellGoldToCashInput}
                onCloseMobile={() => setIsMobileMenuOpen(false)}
              />
            </div>
            
            {/* Curated News Column for IDX info */}
            <div id="sidebar-news-panel" className="p-4 mx-4 bg-[#050505] border border-white/[0.03] rounded-2xl space-y-4">
              <span className="text-[10px] uppercase font-bold text-white/40 block tracking-widest flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-white/50" /> Portal Berita
              </span>
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-2 scrollbar-thin">
                {idxNews.map((news, idx) => (
                  <a 
                    key={idx}
                    href={news.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    referrerPolicy="no-referrer"
                    className="block p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.02] transition-all text-left flex flex-col gap-1.5 group cursor-pointer"
                  >
                    <div className="flex justify-between items-center text-[9px] font-mono font-semibold">
                      <span className="text-white/60">{news.portal}</span>
                      <span className="text-white/30">{news.time}</span>
                    </div>
                    <h4 className="text-[11px] font-serif italic text-white/90 group-hover:text-white leading-relaxed line-clamp-2">
                      {news.title}
                    </h4>
                  </a>
                ))}
              </div>
            </div>

            {/* Macro Sentiment & Key Indicators */}
            <div id="sidebar-macro-indicators-panel" className="p-4 mx-4 bg-[#050505] border border-white/[0.03] rounded-2xl space-y-5">
              <span className="text-[10px] uppercase font-bold text-white/40 block tracking-widest flex items-center gap-2">
                <Activity className="w-4 h-4 text-white/50" /> Indikator Makro
              </span>

              {/* Overall status Pill */}
              <div className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/[0.03] rounded-xl font-mono">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-white/40 uppercase">Status Pasar</span>
                  <span className="text-xs font-black text-white">{isIHSGInCrisis ? "RISK OFF" : (RS.status === "SAFE" ? "RISK ON" : "WARNING")}</span>
                </div>
                <div className="flex flex-col text-right gap-1">
                  <span className="text-[9px] font-bold text-white/40 uppercase">Aksi Sistem</span>
                  <span className="text-[10px] font-extrabold text-white/80">{isIHSGInCrisis ? "CASH OUT" : RS.action}</span>
                </div>
              </div>

              {/* Bar stats showing core index health, opportunity, etc. */}
              <div className="space-y-4">
                {/* Market Health */}
                <div>
                  <div className="flex justify-between text-[10px] font-mono font-bold text-white/50 mb-1.5">
                    <span>Kesehatan IHSG</span>
                    <span className="text-white">{RS.market_health}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="bg-white/80 h-full transition-all duration-500" style={{ width: `${RS.market_health}%` }} />
                  </div>
                </div>

                {/* Opportunity */}
                <div>
                  <div className="flex justify-between text-[10px] font-mono font-bold text-white/50 mb-1.5">
                    <span>Setup Peluang</span>
                    <span className="text-white">{RS.opportunity}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="bg-white/60 h-full transition-all duration-500" style={{ width: `${RS.opportunity}%` }} />
                  </div>
                </div>

                {/* Risk */}
                <div>
                  <div className="flex justify-between text-[10px] font-mono font-bold text-white/50 mb-1.5">
                    <span>Skor Risiko</span>
                    <span className="text-white">{RS.risk}%</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="bg-white/40 h-full transition-all duration-500" style={{ width: `${RS.risk}%` }} />
                  </div>
                </div>
              </div>

              {/* Commodities & Forex Grid */}
              <div className="border-t border-white/[0.05] pt-4">
                <span className="text-[9px] uppercase font-bold text-white/40 block tracking-widest mb-3">Safe Haven Valuations</span>
                <div className="grid grid-cols-2 gap-3 text-left">
                  {/* USDIDR */}
                  <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.03] flex flex-col justify-between gap-1">
                    <span className="text-[10px] font-bold text-white/50 uppercase">USD/IDR</span>
                    <span className="text-xs font-mono font-extrabold text-white">Rp{MKT.usdidr.value.toLocaleString("id-ID")}</span>
                    <span className="text-[9px] font-mono font-bold text-white/40 flex items-center gap-1 mt-1">
                      {MKT.usdidr.daily <= 0 ? <TrendingDown className="w-3 h-3 shrink-0" /> : <TrendingUp className="w-3 h-3 shrink-0" />}
                      {MKT.usdidr.daily}%
                    </span>
                  </div>

                  {/* Gold */}
                  <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.03] flex flex-col justify-between gap-1">
                    <span className="text-[10px] font-bold text-white/50 uppercase">Emas (gr)</span>
                    <span className="text-xs font-mono font-extrabold text-white">Rp{MKT.gold.value.toLocaleString("id-ID")}</span>
                    <span className="text-[9px] font-mono font-bold text-white/40 flex items-center gap-1 mt-1">
                      <TrendingDown className="w-3 h-3 shrink-0" /> {MKT.gold.monthly}% MoM
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* WORKSPACE AREA */}
        <main id="main-workspace" className="flex-1 p-6 sm:p-8 lg:p-10 overflow-visible md:overflow-y-auto pb-24 md:pb-10 flex flex-col">
          
          <div className="max-w-5xl mx-auto space-y-8 flex-1 flex flex-col w-full h-full">
            
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
                            IHSG turun <strong className="text-rose-400 font-mono">{MKT.ihsg.monthly.toFixed(2)}%</strong> dalam sebulan. Skenario defensif: hentikan pembelian baru, alokasi ke cash atau emas hingga konfirmasi pemulihan. Skenario agresif: akumulasi jika IHSG crossing di atas MA20/MA50.
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
                        setActiveTab("ledger");
                        // Scroll to tab block smoothly
                        setTimeout(() => {
                          const element = document.getElementById("tab-ledger");
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
                    onChangeActiveTicker={handleChangeActiveTicker} 
                    activeStock={activeStock} 
                    portfolio={portfolio}
                    watchlist={watchlist}
                    onAddTransaction={handleAddTransaction}
                    onRemoveTransaction={handleRemoveTransaction}
                    onSellTransaction={handleSellTransaction}
                    onToggleWatchlist={handleToggleWatchlist}
                    getDynamicStock={getDynamicStock}
                  />
                </motion.div>
              )}

              {/* Perspective 2: Leaders Tab */}
              {activeTab === "leaders" && (
                <LeadersTab activeConfig={activeConfig} onSelectTicker={handleSelectTicker} portfolio={portfolio} watchlist={watchlist} getDynamicStock={getDynamicStock} />
              )}

              {/* Perspective 3: Recovery Ops Tab */}
              {activeTab === "turnaround" && (
                <motion.div
                  key="turnaround-perspective"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                  className="flex-1 flex flex-col"
                >
                  <RecoveryOpsTab isIHSGInCrisis={isIHSGInCrisis} onSelectTicker={handleSelectTicker} portfolio={portfolio} watchlist={watchlist} getDynamicStock={getDynamicStock} />
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
                  className="flex-1 flex flex-col"
                >
                  <CapitalProtectionTab isIHSGInCrisis={isIHSGInCrisis} onSelectTicker={handleSelectTicker} portfolio={portfolio} watchlist={watchlist} getDynamicStock={getDynamicStock} />
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
                    onSellTransaction={handleSellTransaction}
                    onSelectTicker={handleSelectTicker}
                    getDynamicStock={getDynamicStock}
                    theme={getChartTheme()}
                    activeConfig={activeConfig}
                    defaultSubTab="past"
                  />
                </motion.div>
              )}

              {/* Perspective NEW: Live Ledger Isolated Tab */}
              {activeTab === "ledger" && (
                <motion.div
                  key="ledger-perspective"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.15 }}
                >
                  <PortfolioTracker
                    portfolio={portfolio}
                    watchlist={watchlist}
                    onAddTransaction={handleAddTransaction}
                    onRemoveTransaction={handleRemoveTransaction}
                    onSellTransaction={handleSellTransaction}
                    onSelectStock={handleSelectTicker}
                    onToggleWatchlist={handleToggleWatchlist}
                    getDynamicStock={getDynamicStock}
                    activeConfig={activeConfig}
                    cash={cash}
                    setCash={setCash}
                    tradeLogs={tradeLogs}
                    setTradeLogs={customSetTradeLogs}
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
                  <DiagnosticsTab 
                    activeStock={activeStock} 
                    availableStocks={activeUniverseStocks.map(s => getDynamicStock(s.ticker) || s)} 
                    onSelectStock={handleChangeActiveTicker} 
                  />
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
                <div className="p-6 border-b border-white/5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <TickerLogo ticker={activeStock.ticker} size="lg" fallbackColor={activeStock.logoColor || "bg-[#3b82f6]"} />
                      <div>
                        <h3 className="text-base font-serif italic text-white flex items-center gap-2">
                          PT {activeStock.name} <span className="text-emerald-400">({activeStock.ticker})</span>
                        </h3>
                        <p className="text-[10px] text-[#E0E0E0]/50 mt-1 uppercase tracking-widest">{activeStock.sector}</p>
                        <div className="mt-1.5">
                          <DataSourcesRow dataSources={activeStock.dataSources} />
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsDrawerOpen(false)}
                      className="p-1 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white cursor-pointer transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Quick Portfolio Actions */}
                  <div className="pt-4 border-t border-white/5 flex items-center gap-3 flex-wrap">
                    {(() => {
                      const inPorto = portfolio.find(p => p.ticker === activeStock.ticker);
                      return (
                        <div className="flex items-center gap-2">
                          {inPorto && (
                            <div className="flex flex-col gap-0.5 mr-2 text-xs font-mono">
                              <span className="text-white/50 text-[10px]">Dimiliki:</span>
                              <span className="text-emerald-400 font-bold">{(inPorto.shares / 100).toLocaleString('id-ID')} Lot</span>
                            </div>
                          )}
                          <input
                            type="number"
                            min="1"
                            value={drawerLots}
                            onChange={(e) => setDrawerLots(e.target.value ? parseInt(e.target.value) : "")}
                            placeholder="Jml Lot"
                            className="w-24 px-3 py-2 bg-black border border-white/10 focus:border-emerald-500 outline-none text-white text-xs font-mono font-bold rounded-xl text-center"
                          />
                          <button
                            onClick={() => {
                              if (drawerLots && drawerLots > 0) {
                                handleAddTransaction(activeStock.ticker, drawerLots * 100, activeStock.currentPrice);
                                setDrawerLots("");
                              }
                            }}
                            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all font-mono flex items-center gap-2 ${drawerLots && drawerLots > 0 ? "bg-emerald-500 hover:bg-emerald-600 text-black cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-white/5 text-white/30 cursor-not-allowed"}`}
                          >
                            <Plus className="w-4 h-4 stroke-[3px]" /> Beli
                          </button>
                          
                          {inPorto && (
                            <>
                              <button
                                onClick={() => {
                                  if (drawerLots && drawerLots > 0) {
                                    handleSellTransaction(activeStock.ticker, drawerLots * 100);
                                    setDrawerLots("");
                                  }
                                }}
                                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all font-mono flex items-center gap-2 ${drawerLots && drawerLots > 0 ? "bg-rose-500 hover:bg-rose-600 text-white cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.3)]" : "bg-white/5 text-white/30 cursor-not-allowed"}`}
                              >
                                <Minus className="w-4 h-4 stroke-[3px]" /> Jual
                              </button>
                              <button
                                onClick={() => handleRemoveTransaction(activeStock.ticker)}
                                className="px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer font-mono flex items-center gap-2"
                                title="Hapus Semua dari Portofolio"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          <button
                            onClick={() => handleToggleWatchlist(activeStock.ticker)}
                            className={`px-3 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer font-mono flex items-center gap-2 border ${
                              watchlist.some(w => w.ticker === activeStock.ticker)
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                                : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
                            }`}
                            title="Tambah/Hapus dari Daftar Pantau"
                          >
                            {watchlist.some(w => w.ticker === activeStock.ticker) ? (
                              <BookmarkCheck className="w-4 h-4" />
                            ) : (
                              <Bookmark className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
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
                        <HistoricalChart stock={activeStock} theme={getChartTheme()} />
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
                          theme={getChartTheme()}
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
                Click elsewhere to dismiss • Quantbit
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER credit and legal disclaimer strip */}
      <footer id="credits-footer" className="py-8 bg-[#070707] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 text-center space-y-2">
          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
            Quantbit • Terminal Version
          </p>
          <p className="text-[10px] text-white/35 max-w-xl mx-auto leading-relaxed">
            Legal Disclaimer: Any simulated trading portfolios, historical backtests, or factor scoring calculations provided within this workspace do not represent formal investment pathways in Bursa Efek Indonesia. Always review with licensed securities advisors before trading real investment funds.
          </p>
        </div>
      </footer>

    </div>
  );
}
