import { useState, useEffect } from "react";
import { api } from "../services/api";
import { MKT } from "../marketData";
import type { StockData, AnalysisResult, PortfolioItem, WatchlistItem } from "../types";
import type { NotificationContextType } from "../contexts/NotificationContext";

interface TradeLog {
  id: string;
  type: string;
  ticker: string;
  shares: number;
  price: number;
  timestamp: string;
  message?: string;
}

export function usePortfolioManager(
  user: any | null,
  getDynamicStock: (ticker: string) => StockData | undefined,
  setAppNotification?: (n: { message: string; type: "success" | "error" | "info" } | null) => void,
  notif?: NotificationContextType,
) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [cash, setCash] = useState<number>(100000000);
  const [tradeLogs, setTradeLogs] = useState<TradeLog[]>([]);
  const [cachedReports, setCachedReports] = useState<Record<string, AnalysisResult>>({});
  const [isDbLoaded, setIsDbLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setIsDbLoaded(false);

    Promise.all([
      api.get<{ user: any }>("/api/auth/me").then(d => {
        if (d.user.cash) setCash(d.user.cash);
      }).catch(() => {}),
      api.get<{ watchlist: WatchlistItem[] }>("/api/watchlist").then(d => {
        setWatchlist(d.watchlist || []);
      }).catch(() => {}),
      api.get<{ portfolio: PortfolioItem[] }>("/api/portfolio").then(d => {
        setPortfolio(d.portfolio || []);
      }).catch(() => {}),
      api.get<{ tradeLogs: any[] }>("/api/trade-logs").then(d => {
        const items = (d.tradeLogs || []).sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setTradeLogs(items);
      }).catch(() => {}),
      api.get<{ reports: Record<string, any> }>("/api/cached-reports").then(d => {
        const reports: Record<string, AnalysisResult> = {};
        Object.entries(d.reports || {}).forEach(([ticker, r]: [string, any]) => {
          reports[ticker] = r.data;
        });
        setCachedReports(reports);
      }).catch(() => {}),
    ]).then(() => setIsDbLoaded(true));
  }, [user]);

  const calculateTradeDetails = (type: string, ticker: string, shares: number, price: number) => {
    if (type === "DEPOSIT" || type === "WITHDRAWAL") {
      return { gross: shares, slippage: 0, fee: 0, tax: 0, net: shares };
    }
    const gross = shares * price;
    if (ticker === "EMAS" || ticker === "GOLD") {
      const slippage = gross * 0.02;
      const fee = 0;
      const tax = 0;
      const net = type.startsWith("BUY") ? gross + slippage : gross - slippage;
      return { gross, slippage, fee, tax, net };
    }
    const SLIPPAGE_RATE = 0.0005;
    const BUY_FEE_RATE = 0.0015;
    const SELL_FEE_RATE = 0.0025;
    const TAX_RATE = 0.0010;

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

  const getEmasShares = (): number => {
    if (!portfolio || !Array.isArray(portfolio)) return 0;
    const emasItem = portfolio.find(p => p.ticker === "EMAS");
    if (!emasItem || typeof emasItem.shares !== 'number') return 0;
    return emasItem.shares;
  };

  const handleToggleWatchlist = async (ticker: string) => {
    if (!user) return;
    if (watchlist.some(w => w.ticker === ticker)) {
      await api.del("/api/watchlist", { ticker });
      setWatchlist(prev => prev.filter(w => w.ticker !== ticker));
    } else {
      await api.post("/api/watchlist", { ticker });
      setWatchlist(prev => [...prev, { ticker, addedAt: new Date().toISOString() }]);
    }
  };

  const handleAddTransaction = async (ticker: string, shares: number, buyPrice: number, silent: boolean = false) => {
    if (!user) return;

    if (!silent) {
      const details = calculateTradeDetails("BUY", ticker, shares, buyPrice);
      if (details.net > cash) {
        setAppNotification?.({ message: `Saldo kas tidak mencukupi untuk membeli ${ticker === "EMAS" ? "Emas" : ticker}!`, type: "error" });
        notif?.addNotification({ title: "Saldo Kurang", message: `Saldo kas tidak mencukupi untuk membeli ${ticker === "EMAS" ? "Emas" : ticker}!`, type: "error" });
        return;
      }

      const nextCash = cash - details.net;
      setCash(nextCash);
      api.patch("/api/user/profile", { cash: nextCash }).catch(() => {});

      const logId = "log-" + Date.now();
      const messageStr = ticker === "EMAS"
        ? `Pembelian ${shares.toFixed(4)} Gram Emas @ Rp ${buyPrice.toLocaleString("id-ID")}`
        : `Pembelian ${shares / 100} Lot ${ticker} @ Rp ${buyPrice.toLocaleString("id-ID")}`;

      const newLog: TradeLog = {
        id: logId,
        type: ticker === "EMAS" ? "BUY_GOLD" : "BUY",
        ticker,
        shares,
        price: buyPrice,
        timestamp: new Date().toISOString(),
        message: messageStr,
      };
      api.post("/api/trade-logs", newLog).catch(() => {});
      setTradeLogs(prev => [newLog, ...prev]);

      const successMsg = ticker === "EMAS"
        ? `Berhasil membeli ${shares.toFixed(4)} Gram Emas!`
        : `Berhasil membeli ${shares / 100} Lot ${ticker}!`;
      setAppNotification?.({ message: successMsg, type: "success" });
      notif?.addNotification({ title: ticker === "EMAS" ? "Beli Emas" : `Beli ${ticker}`, message: successMsg, type: "success" });
    }

    const existing = portfolio.find(p => p.ticker === ticker);
    if (existing) {
      const combinedShares = existing.shares + shares;
      const averagePrice = Math.round(((existing.shares * existing.buyPrice) + (shares * buyPrice)) / combinedShares);
      api.post("/api/portfolio", { ticker, shares: combinedShares, buyPrice: averagePrice }).catch(() => {});
    } else {
      api.post("/api/portfolio", { ticker, shares, buyPrice }).catch(() => {});
    }
    setPortfolio(prev => {
      const filtered = prev.filter(p => p.ticker !== ticker);
      const combinedShares = (existing?.shares || 0) + shares;
      const avgPrice = existing ? Math.round(((existing.shares * existing.buyPrice) + (shares * buyPrice)) / combinedShares) : buyPrice;
      return [...filtered, { ticker, shares: combinedShares, buyPrice: avgPrice, addedAt: existing?.addedAt || new Date().toISOString() }];
    });
  };

  const handleRemoveTransaction = async (ticker: string) => {
    if (!user) return;
    try { await api.del("/api/portfolio", { ticker }); } catch { /* ignore */ }
    setPortfolio(prev => prev.filter(p => p.ticker !== ticker));
    setAppNotification?.({ message: `${ticker} berhasil dihapus dari portofolio.`, type: "info" });
    notif?.addNotification({ title: `Hapus ${ticker}`, message: `${ticker} berhasil dihapus dari portofolio.`, type: "info" });
  };

  const handleClearPortfolio = async () => {
    if (!user || portfolio.length === 0) return;
    const tickers = [...portfolio.map(p => p.ticker)];
    for (const ticker of tickers) {
      try { await api.del("/api/portfolio", { ticker }); } catch { /* ignore */ }
    }
    setPortfolio([]);
    setAppNotification?.({ message: `Semua ${tickers.length} posisi portofolio berhasil dihapus.`, type: "info" });
    notif?.addNotification({ title: "Clear Portfolio", message: `Semua ${tickers.length} posisi portofolio berhasil dihapus.`, type: "info" });
  };

  const handleSellTransaction = async (ticker: string, sharesToSell: number, silent: boolean = false) => {
    if (!user) return;
    const existing = portfolio.find(p => p.ticker === ticker);

    if (existing) {
      if (!silent) {
        const currentPrice = ticker === "EMAS" ? MKT.gold.value : (getDynamicStock(ticker)?.currentPrice ?? existing.buyPrice);
        const details = calculateTradeDetails("SELL", ticker, sharesToSell, currentPrice);

        const nextCash = cash + details.net;
        setCash(nextCash);
        api.patch("/api/user/profile", { cash: nextCash }).catch(() => {});

        const logId = "log-" + Date.now();
        const newLog: TradeLog = {
          id: logId,
          type: "SELL",
          ticker,
          shares: sharesToSell,
          price: currentPrice,
          timestamp: new Date().toISOString(),
          message: ticker === "EMAS"
            ? `Mencairkan ${sharesToSell.toFixed(4)} Gram Emas @ Rp ${currentPrice.toLocaleString("id-ID")}`
            : `Penjualan ${sharesToSell / 100} Lot ${ticker} @ Rp ${currentPrice.toLocaleString("id-ID")}`,
        };
        api.post("/api/trade-logs", newLog).catch(() => {});
        setTradeLogs(prev => [newLog, ...prev]);

        const successMsg = ticker === "EMAS"
          ? `Berhasil menjual ${sharesToSell.toFixed(4)} gram Emas!`
          : `Berhasil menjual ${sharesToSell / 100} Lot ${ticker}!`;
        setAppNotification?.({ message: successMsg, type: "success" });
        notif?.addNotification({ title: ticker === "EMAS" ? `Jual Emas` : `Jual ${ticker}`, message: successMsg, type: "success" });
      }

      if (existing.shares <= sharesToSell) {
        await api.del("/api/portfolio", { ticker });
        setPortfolio(prev => prev.filter(p => p.ticker !== ticker));
      } else {
        const remaining = existing.shares - sharesToSell;
        api.post("/api/portfolio", { ticker, shares: remaining, buyPrice: existing.buyPrice }).catch(() => {});
        setPortfolio(prev => prev.map(p => p.ticker === ticker ? { ...p, shares: remaining } : p));
      }
    }
  };

  const handleDepositCash = (rupiahAmount: number) => {
    const nextCash = cash + rupiahAmount;
    setCash(nextCash);
    api.patch("/api/user/profile", { cash: nextCash }).catch(() => {});

    const logId = "log-" + Date.now();
    const newLog: TradeLog = {
      id: logId,
      type: "DEPOSIT",
      ticker: "KAS",
      shares: rupiahAmount,
      price: 1,
      timestamp: new Date().toISOString(),
      message: `Deposit Nominal sebesar Rp ${rupiahAmount.toLocaleString("id-ID")}`,
    };
    api.post("/api/trade-logs", newLog).catch(() => {});
    setTradeLogs(prev => [newLog, ...prev]);
  };

  const handleWithdrawCash = (rupiahAmount: number) => {
    const nextCash = cash - rupiahAmount;
    setCash(nextCash);
    api.patch("/api/user/profile", { cash: nextCash }).catch(() => {});

    const logId = "log-" + Date.now();
    const newLog: TradeLog = {
      id: logId,
      type: "WITHDRAWAL",
      ticker: "KAS",
      shares: rupiahAmount,
      price: 1,
      timestamp: new Date().toISOString(),
      message: `Penarikan Dana sebesar Rp ${rupiahAmount.toLocaleString("id-ID")}`,
    };
    api.post("/api/trade-logs", newLog).catch(() => {});
    setTradeLogs(prev => [newLog, ...prev]);
  };

  const handleMoveToGold = (rupiahAmount: number) => {
    const goldPrice = MKT.gold.value;
    // Gold has 2% slippage — cap amount so net cost doesn't exceed cash.
    const GOLD_SLIPPAGE = 0.02;
    const maxSpend = cash / (1 + GOLD_SLIPPAGE);
    const spend = Math.min(rupiahAmount, maxSpend);
    const grams = spend / goldPrice;
    const details = calculateTradeDetails("BUY", "EMAS", grams, goldPrice);

    if (details.net > cash) {
      setAppNotification?.({ message: "Saldo kas tidak mencukupi untuk membeli emas!", type: "error" });
      notif?.addNotification({ title: "Saldo Kurang", message: "Saldo kas tidak mencukupi untuk membeli emas!", type: "error" });
      return;
    }

    const nextCash = cash - details.net;
    setCash(nextCash);
    api.patch("/api/user/profile", { cash: nextCash }).catch(() => {});

    handleAddTransaction("EMAS", grams, goldPrice, true);

    const logId = "log-" + Date.now();
    const newLog: TradeLog = {
      id: logId,
      type: "BUY_GOLD",
      ticker: "EMAS",
      shares: grams,
      price: goldPrice,
      timestamp: new Date().toISOString(),
      message: `Konversi Kas ke Safe Haven Emas Fisik sebesar Rp ${spend.toLocaleString("id-ID")}`,
    };
    api.post("/api/trade-logs", newLog).catch(() => {});
    setTradeLogs(prev => [newLog, ...prev]);
    setAppNotification?.({ message: `Berhasil membeli ${grams.toFixed(4)} gram Emas!`, type: "success" });
    notif?.addNotification({ title: "Beli Emas", message: `Berhasil membeli ${grams.toFixed(4)} gram Emas!`, type: "success" });
  };

  const handleSellGoldToCashInput = (enteredVal: number) => {
    const goldPrice = MKT.gold.value;
    const details = calculateTradeDetails("SELL", "EMAS", enteredVal, goldPrice);

    const nextCash = cash + details.net;
    setCash(nextCash);
    api.patch("/api/user/profile", { cash: nextCash }).catch(() => {});

    handleSellTransaction("EMAS", enteredVal, true);

    const logId = "log-" + Date.now();
    const newLog: TradeLog = {
      id: logId,
      type: "SELL_GOLD",
      ticker: "EMAS",
      shares: enteredVal,
      price: goldPrice,
      timestamp: new Date().toISOString(),
      message: `Mencairkan ${enteredVal} Gram Emas Fisik ke Kas Wallet`,
    };
    api.post("/api/trade-logs", newLog).catch(() => {});
    setTradeLogs(prev => [newLog, ...prev]);
    setAppNotification?.({ message: `Berhasil mencairkan ${enteredVal} gram Emas!`, type: "success" });
    notif?.addNotification({ title: "Jual Emas", message: `Berhasil mencairkan ${enteredVal} gram Emas!`, type: "success" });
  };

  const handleGenerateAIReport = async (stock: StockData, customFocus?: string) => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const reportData: AnalysisResult = await api.post("/api/gemini/analyze", { stock, customFocus });
      if (user) {
        await api.post("/api/cached-reports", { ticker: stock.ticker, data: reportData }).catch(() => {});
      }
      setCachedReports(prev => ({ ...prev, [stock.ticker]: reportData }));
    } catch (err: any) {
      setGenerationError(err.message || "Failed in generative analysis pipeline.");
    } finally {
      setIsGenerating(false);
    }
  };

  const customSetTradeLogs = (value: any) => {
    if (!user) return;
    const nextLogs = typeof value === 'function' ? value(tradeLogs) : value;

    if (nextLogs.length === 0 && tradeLogs.length > 0) {
      Promise.all(tradeLogs.map(log => api.del("/api/trade-logs", { id: log.id }).catch(() => {})));
    } else if (nextLogs.length > tradeLogs.length) {
      const diff = nextLogs.length - tradeLogs.length;
      for (let i = 0; i < diff; i++) {
        const newLog = nextLogs[i];
        if (newLog) api.post("/api/trade-logs", newLog).catch(() => {});
      }
    }
    setTradeLogs(nextLogs);
  };

  return {
    portfolio, setPortfolio,
    watchlist, setWatchlist,
    cash, setCash,
    tradeLogs,
    cachedReports,
    isDbLoaded,
    isGenerating,
    generationError,
    handleAddTransaction,
    handleRemoveTransaction,
    handleClearPortfolio,
    handleSellTransaction,
    handleToggleWatchlist,
    handleDepositCash,
    handleWithdrawCash,
    handleMoveToGold,
    handleSellGoldToCashInput,
    handleGenerateAIReport,
    calculateTradeDetails,
    getEmasShares,
    customSetTradeLogs,
  };
}
