import React, { useState, FormEvent, useEffect, useRef, useMemo } from "react";
import { StockData, PortfolioItem, WatchlistItem, DataStatus } from "../types";
import { DataBadge } from "./DataBadge";
import { getIhsgDrawdown60 } from "../marketRegimeEngine";
import { STOCKS_DATA } from "../stocksData";
import { api } from "../services/api";
import { SearchableSelect } from "./SearchableSelect";
import { TickerLogo } from "./TickerLogo";
import { ExplainButton } from "./ExplainButton";
import { IDX80_TICKERS, IDX30_TICKERS, LQ45_TICKERS } from "../constants/idx80";
import { EX, getProcessedLeaders, MKT } from "../marketData";
import { useEngineConfig } from "../contexts/EngineConfigContext";
import { useNotifications } from "../contexts/NotificationContext";
import {
  evaluateStrategy,
  rule_tickerOutOfTopN,
  rule_crashProtectionTriggered,
  rule_customUniverseBreach,
  getActiveUniverse,
} from "../engine";
import type { RuleContext } from "../engine";
import { BuyPressureDashboard } from "./BuyPressureDashboard";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Briefcase,
  Eye,
  Wallet,
  FileSpreadsheet,
  ArrowRight,
  ArrowRightLeft,
  Sparkles,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Download,
} from "lucide-react";
import { motion } from "motion/react";

type SortKey = "ticker" | "rank" | "shares" | "buyPrice" | "currentPrice" | "valueNow" | "profitOrLoss" | "percentChange" | "annualDividend" | "dividendYield";

interface PortfolioTrackerProps {
  portfolio: PortfolioItem[];
  watchlist: WatchlistItem[];
  onAddTransaction: (ticker: string, shares: number, buyPrice: number) => void;
  onRemoveTransaction: (ticker: string) => void;
  onSellTransaction: (ticker: string, shares: number) => void;
  onSelectStock: (ticker: string) => void;
  onToggleWatchlist: (ticker: string) => void;
  getDynamicStock: (ticker: string) => StockData | undefined;
  cash: number;
  setCash: React.Dispatch<React.SetStateAction<number>>;
  tradeLogs: any[];
  setTradeLogs: React.Dispatch<React.SetStateAction<any[]>>;
  /** When OFF, hide "Strategy Says: Exit..." + "Exit Safe Haven → Stock" banners. */
  showCrisisSignals?: boolean;
}

export function PortfolioTracker({
  portfolio,
  watchlist,
  onAddTransaction,
  onRemoveTransaction,
  onSellTransaction,
  onSelectStock,
  onToggleWatchlist,
  getDynamicStock,
  cash,
  setCash,
  tradeLogs,
  setTradeLogs,
  showCrisisSignals = true,
}: PortfolioTrackerProps) {
  const visibleStocks = STOCKS_DATA.map((s) => getDynamicStock(s.ticker) || s);
  const [selectedTicker, setSelectedTicker] = useState(visibleStocks[0].ticker);
  const [sharesStr, setSharesStr] = useState("1000");
  const [customPriceStr, setCustomPriceStr] = useState("");
  const [sellInputs, setSellInputs] = useState<Record<string, string>>({});
  const [watchlistTicker, setWatchlistTicker] = useState(
    visibleStocks[0]?.ticker || "",
  );
  const [isEditingCash, setIsEditingCash] = useState(false);
  const [editCashStr, setEditCashStr] = useState("");
  const { engineConfig, activeProfile } = useEngineConfig();
  const notif = useNotifications();
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // (A3 fix) Sync universe + config to regime engine is now handled by
  // useMarketRegimeSync() mounted at App.tsx level so toggling
  // enableCrashProtection in the AppSidebar reflects immediately.

  // Persist full state to backend when engine config changes
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = setTimeout(() => {
      localStorage.setItem("idx_engine_config", JSON.stringify(engineConfig));
      api.post("/api/engine/state", {
        portfolio, watchlist, cash, config: engineConfig, tradeLogs,
      }).catch(() => {});
    }, 500);
    return () => { if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current); };
  }, [engineConfig]);

  const calculateTradeDetails = (
    type: string,
    ticker: string,
    shares: number,
    price: number,
  ) => {
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
    const TAX_RATE = 0.001; // 0.10% transaction tax (Sales tax)

    if (type.startsWith("BUY")) {
      const priceWithSlippage = price * (1 + SLIPPAGE_RATE);
      const slippage = price * SLIPPAGE_RATE * shares;
      const fee = priceWithSlippage * BUY_FEE_RATE * shares;
      const tax = 0;
      const net = priceWithSlippage * shares + fee;
      return { gross, slippage, fee, tax, net };
    } else {
      const priceWithSlippage = price * (1 - SLIPPAGE_RATE);
      const slippage = price * SLIPPAGE_RATE * shares;
      const fee = priceWithSlippage * SELL_FEE_RATE * shares;
      const tax = priceWithSlippage * TAX_RATE * shares;
      const net = priceWithSlippage * shares - fee - tax;
      return { gross, slippage, fee, tax, net };
    }
  };

  const ihsgDrawdown60 = getIhsgDrawdown60();
  const isIHSGInCrisis =
    engineConfig.enableCrashProtection !== false &&
    ihsgDrawdown60 !== null &&
    ihsgDrawdown60 <= -(engineConfig.crashSensitivity ?? 10);

  const strategyEval = useMemo(() => evaluateStrategy(
    engineConfig as any,
    { ihsgPrice: MKT.ihsg.value, peak60: ihsgDrawdown60 !== null ? MKT.ihsg.value / (1 + ihsgDrawdown60 / 100) : undefined },
  ), [engineConfig.enableCrashProtection, engineConfig.crashSensitivity, engineConfig.simulationMode, engineConfig.safeHavenAsset, ihsgDrawdown60]);
  const activeUniverse = useMemo(() => getActiveUniverse(engineConfig as any), [engineConfig]);

  const currentSelectedStock =
    visibleStocks.find((s) => s.ticker === selectedTicker) || visibleStocks[0];

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    const sharesNum = parseInt(sharesStr);
    const priceNum = customPriceStr
      ? parseFloat(customPriceStr)
      : currentSelectedStock.currentPrice;

    if (isNaN(sharesNum) || sharesNum <= 0) return;

    const details = calculateTradeDetails(
      "BUY",
      selectedTicker,
      sharesNum,
      priceNum,
    );
    if (details.net > cash) {
      setNotification({
        message: `Saldo Kas tidak mencukupi! Diperlukan Rp ${Math.round(details.net).toLocaleString()} (Termasuk Admin Fee 0.15% & Spread 0.05%), Saldo Kas: Rp ${cash.toLocaleString()}`,
        type: "error",
      });
      return;
    }

    onAddTransaction(selectedTicker, sharesNum, priceNum);

    setSharesStr("1000");
    setCustomPriceStr("");
  };

  // Calculations
  let totalInvestment = 0;
  let totalCurrentValue = 0;
  let totalAnnualDividend = 0;

  // D1 fix: memoize processedLeaders so the O(n log n) sort + filter only
  // runs when active profile or universe actually change (not every render).
  const processedLeaders = useMemo(() => {
    const cleanIdx80 = IDX80_TICKERS.map((t) => t.replace(".JK", ""));
    const cleanIdx30 = IDX30_TICKERS.map((t) => t.replace(".JK", ""));
    const cleanLq45 = LQ45_TICKERS.map((t) => t.replace(".JK", ""));
    const profileWeights = activeProfile
      ? { quality: activeProfile.qualityWeight, growth: activeProfile.growthWeight, value: activeProfile.valueWeight, momentum: activeProfile.momentumWeight, dividend: activeProfile.dividendWeight }
      : engineConfig.activeProfileId;
    return getProcessedLeaders(visibleStocks, profileWeights).filter((item) => {
      const rawTicker = item.ticker.replace(".JK", "");
      if (engineConfig.universe === "idx80") return cleanIdx80.includes(rawTicker);
      if (engineConfig.universe === "idx30") return cleanIdx30.includes(rawTicker);
      if (engineConfig.universe === "lq45") return cleanLq45.includes(rawTicker);
      return true;
    });
  }, [activeProfile, engineConfig.universe, engineConfig.activeProfileId, visibleStocks]);

  // D11 fix: pre-build a Map<ticker, {rank, score}> once per render so the
  // getStockRankAndScore call becomes O(1) instead of O(leaders) per
  // portfolio item. With 50 holdings × 80 leaders this drops 4000 lookups
  // to 50 lookups per render.
  const rankMap = useMemo(() => {
    const map = new Map<string, { rank: number; score: string }>();
    processedLeaders.forEach((leader, idx) => {
      const key = leader.ticker.replace(".JK", "").toUpperCase();
      map.set(key, { rank: idx + 1, score: leader.score.toFixed(1) });
    });
    return map;
  }, [processedLeaders]);

  const peak60Price = ihsgDrawdown60 !== null ? MKT.ihsg.value / (1 + ihsgDrawdown60 / 100) : undefined;

  useEffect(() => {
    const ruleCtx: Partial<RuleContext> = {
      config: engineConfig as any,
      topN: engineConfig.topNCount,
      ihsgPrice: MKT.ihsg.value,
      peak60: peak60Price,
    };

    if (engineConfig.enableCrashProtection) {
      const crashResult = rule_crashProtectionTriggered({
        ...ruleCtx as RuleContext,
        ihsgPrice: MKT.ihsg.value,
        peak60: peak60Price,
      });
      if (crashResult.triggered) {
        notif.fireRule("crashProtectionTriggered", {
          title: crashResult.title!,
          message: crashResult.message!,
          type: "error",
        });
      }
    }

    if (engineConfig.simulationMode === "custom") {
      portfolio.forEach((item) => {
        if (item.ticker === "EMAS" || item.ticker === "GOLD") return;
        const breachResult = rule_customUniverseBreach({
          ...ruleCtx as RuleContext,
          ticker: item.ticker,
        });
        if (breachResult.triggered) {
          notif.fireRule(`customUniverseBreach_${item.ticker}`, {
            title: breachResult.title!,
            message: breachResult.message!,
            type: "warning",
          });
        }
      });
    }

    if (engineConfig.simulationMode === "algo") {
      portfolio.forEach((item) => {
        if (item.ticker === "EMAS" || item.ticker === "GOLD") return;
        const rankItem = processedLeaders.findIndex((l) => l.ticker === item.ticker) + 1;
        if (rankItem > 0) {
          const rankResult = rule_tickerOutOfTopN({
            ...ruleCtx as RuleContext,
            ticker: item.ticker,
            currentRank: rankItem,
            topN: engineConfig.topNCount,
          });
          if (rankResult.triggered) {
            notif.fireRule(`tickerOutOfTopN_${item.ticker}`, {
              title: rankResult.title!,
              message: rankResult.message!,
              type: "warning",
            });
          }
        }
      });
    }
  }, [engineConfig, portfolio, processedLeaders, notif]);

  // D11 fix: O(1) lookup via pre-built rankMap (built above with useMemo).
  const getStockRankAndScore = (ticker: string) => {
    const key = ticker.replace(".JK", "").toUpperCase();
    return rankMap.get(key) ?? { rank: 99, score: "50.0" };
  };

  const enrichedPortfolio = portfolio
    .map((item) => {
      const liveStock = visibleStocks.find((s) => s.ticker === item.ticker);
      // Guard: live stock may be missing (ticker no longer in STOCKS_DATA) and
      // item.buyPrice may be undefined/null from legacy/corrupt data. Fall back
      // to 0 so the table never crashes on .toLocaleString().
      const currentPrice =
        liveStock?.currentPrice ?? (typeof item.buyPrice === "number" ? item.buyPrice : 0);
      const safeBuyPrice = typeof item.buyPrice === "number" ? item.buyPrice : 0;
      const safeShares = typeof item.shares === "number" ? item.shares : 0;

      const originalCost = safeShares * safeBuyPrice;
      const valueNow = safeShares * currentPrice;
      const profitOrLoss = valueNow - originalCost;
      const percentChange = originalCost > 0 ? (profitOrLoss / originalCost) * 100 : 0;

      totalInvestment += originalCost;
      totalCurrentValue += valueNow;

      const rankInfo = getStockRankAndScore(item.ticker);
      // Annual dividend estimate = shares × currentPrice × dividendYield / 100
      // (dividendYield stored as percentage in scan data, e.g. 5.72 = 5.72%)
      const dividendYieldPct = (liveStock as any)?.dividendYield ?? 0;
      const annualDividend = (safeShares * currentPrice * dividendYieldPct) / 100;
      totalAnnualDividend += annualDividend;

      return {
        ...item,
        shares: safeShares,
        buyPrice: safeBuyPrice,
        companyName: liveStock ? liveStock.name : item.ticker,
        logoColor: liveStock ? liveStock.logoColor : "bg-gray-400",
        currentPrice,
        originalCost,
        valueNow,
        profitOrLoss,
        percentChange,
        rank: rankInfo.rank,
        score: rankInfo.score,
        dividendYield: dividendYieldPct,
        annualDividend,
      };
    });

  const totalReturn = totalCurrentValue - totalInvestment;
  const totalReturnPercent =
    totalInvestment > 0 ? (totalReturn / totalInvestment) * 100 : 0;

  // Pie chart calculation
  const sectorAllocation = enrichedPortfolio.reduce(
    (acc, item) => {
      const liveStock = visibleStocks.find((s) => s.ticker === item.ticker);
      const sector = liveStock ? liveStock.sector : "Lainnya";
      acc[sector] = (acc[sector] || 0) + item.valueNow;
      return acc;
    },
    {} as Record<string, number>,
  );

  const pieData = Object.entries(sectorAllocation)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // B2 — Holdings table: text filter + column sort
  const [holdingsFilter, setHoldingsFilter] = useState("");
  const [holdingsSort, setHoldingsSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({
    key: "valueNow",
    dir: "desc",
  });
  const sortedEnrichedPortfolio = useMemo(() => {
    const f = holdingsFilter.trim().toLowerCase();
    const filtered = f
      ? enrichedPortfolio.filter(
          (it) => it.ticker.toLowerCase().includes(f) || it.companyName.toLowerCase().includes(f),
        )
      : enrichedPortfolio;
    const dir = holdingsSort.dir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = a[holdingsSort.key];
      const bv = b[holdingsSort.key];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [enrichedPortfolio, holdingsFilter, holdingsSort]);

  const toggleSort = (key: SortKey) => {
    setHoldingsSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  };
  const SortHeader = ({ k, label, align = "right" }: { k: SortKey; label: string; align?: "left" | "center" | "right" }) => (
    <th
      onClick={() => toggleSort(k)}
      className={`pb-3 px-3 font-sans cursor-pointer select-none hover:text-white/60 transition-colors text-${align}`}
    >
      {label}
      {holdingsSort.key === k && (
        <span className="ml-1 text-emerald-400">{holdingsSort.dir === "asc" ? "↑" : "↓"}</span>
      )}
    </th>
  );

  const COLORS = [
    "#10B981",
    "#3B82F6",
    "#8B5CF6",
    "#F59E0B",
    "#EC4899",
    "#EF4444",
    "#14B8A6",
    "#6366F1",
  ];

  // B5 — track which warnings user has dismissed in this session
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());

  const portfolioWarnings = enrichedPortfolio.filter((item) => {
    // Safe haven assets (EMAS/GOLD) are not ranked against topN — skip crossover check.
    // (rankMap returns { rank: 99, score: "50.0" } for assets not in processedLeaders,
    //  which would always trigger outOfTop5 below.)
    const isSafeHaven = item.ticker === "EMAS" || item.ticker === "GOLD";
    const liveStock = visibleStocks.find((s) => s.ticker === item.ticker);
    const drop = liveStock ? liveStock.change : 0;
    const exData = EX.find((e) => e.ticker.split(".")[0] === item.ticker);
    const isExitStatic =
      exData &&
      (exData.exit_state === "EXIT" || exData.exit_state === "EXIT RISK");
    const isExitLive = drop <= -0.5;
    const outOfTop5 = !isSafeHaven && item.rank > engineConfig.topNCount;
    return (
      isExitStatic ||
      isExitLive ||
      (engineConfig.enableCrossover !== false && outOfTop5)
    );
  });

  // Automated Rebalancing Alerts Generator
  const topNTargetStocks = processedLeaders.slice(0, engineConfig.topNCount);

  const visibleWarnings = portfolioWarnings.filter((w) => !dismissedWarnings.has(w.ticker));

  // D2 fix: memoize the activeAlerts IIFE so the 200+ lines of alert
  // generation only re-runs when one of its inputs changes (not on every
  // render, including renders triggered by unrelated state updates).
  const activeAlerts = useMemo(() => {
    const list: {
      id: string;
      type: "BUY" | "SELL" | "EXIT_SIGNAL";
      ticker: string;
      name: string;
      price: number;
      shares: number;
      reason: string;
      badge: string;
    }[] = [];

    if (isIHSGInCrisis) {
      // 1. In crisis, recommend liquidating all stocks to Safe Haven asset
      portfolio.forEach((item) => {
        if (item.ticker === "EMAS" || item.ticker === "GOLD") return;
        const stock = visibleStocks.find((s) => s.ticker === item.ticker);
        const price = stock?.currentPrice ?? (typeof item.buyPrice === "number" ? item.buyPrice : 0);
        const shares = typeof item.shares === "number" ? item.shares : 0;
        if (price <= 0 || shares <= 0) return;
        list.push({
          id: `crisis-sell-${item.ticker}`,
          type: "SELL",
          ticker: item.ticker,
          name: stock ? stock.name : item.ticker,
          price,
          shares,
          reason: `Fase Krisis Aktif (IHSG -${Math.abs(ihsgDrawdown60 ?? 0).toFixed(1)}% dari puncak 60 hari). Segera lakukan proteksi kapital.`,
          badge: "LIQUIDATE / CASH OUT",
        });
      });

      if (engineConfig.safeHavenAsset === "emas" && cash > 10000) {
        list.push({
          id: "crisis-buy-gold",
          type: "BUY",
          ticker: "EMAS",
          name: "Logam Mulia (Safe Haven)",
          price: MKT.gold.value,
          shares: Math.floor(cash / MKT.gold.value),
          reason: `Alokasikan sisa tunai Rp ${cash.toLocaleString()} ke Safe Haven Emas untuk perlindungan nilai 10 tahun kedepan.`,
          badge: "SAFE-HAVEN PROTECT",
        });
      }
    } else if (engineConfig.simulationMode === "custom") {
      // 2. Custom mode: universe-based alerts (no rank/rotation)
      portfolio.forEach((item) => {
        if (item.ticker === "EMAS" || item.ticker === "GOLD") return;
        const stock = visibleStocks.find((s) => s.ticker === item.ticker);
        const price = stock?.currentPrice ?? (typeof item.buyPrice === "number" ? item.buyPrice : 0);
        const shares = typeof item.shares === "number" ? item.shares : 0;
        if (price <= 0 || shares <= 0) return;
        const cleanT = item.ticker.toUpperCase().replace(".JK", "");
        const inUniverse = engineConfig.customUniverse.some(
          (u) => u.toUpperCase().replace(".JK", "") === cleanT
        );
        const exData = EX.find(
          (e) => e.ticker.replace(".JK", "").toUpperCase() === cleanT,
        );
        const isExitStatic =
          exData &&
          (exData.exit_state === "EXIT" || exData.exit_state === "EXIT RISK");

        if (isExitStatic) {
          list.push({
            id: `sell-exit-custom-${item.ticker}`,
            type: "EXIT_SIGNAL",
            ticker: item.ticker,
            name: stock ? stock.name : item.ticker,
            price,
            shares,
            reason: `Exit Ops (${exData.exit_state === "EXIT" ? "Sinyal Jual Kuat" : "Risiko Tinggi"}).`,
            badge: "EXIT REBALANCING",
          });
        } else if (!inUniverse) {
          list.push({
            id: `sell-outside-universe-${item.ticker}`,
            type: "SELL",
            ticker: item.ticker,
            name: stock ? stock.name : item.ticker,
            price,
            shares,
            reason: `#${item.ticker} tidak ada di Custom Universe (${engineConfig.customUniverse.length} emiten). Likuidasi untuk selaraskan dengan strategi.`,
            badge: "LIKUIDASI ASET",
          });
        }
      });

      // Buy suggestions for custom universe tickers not owned
      engineConfig.customUniverse.forEach((ticker) => {
        const cleanT = ticker.toUpperCase().replace(".JK", "");
        const alreadyOwned = portfolio.some(
          (p) => p.ticker.toUpperCase().replace(".JK", "") === cleanT,
        );
        if (alreadyOwned) return;
        const stock = visibleStocks.find(
          (s) =>
            s.ticker === ticker ||
            s.ticker + ".JK" === ticker ||
            s.ticker.replace(".JK", "") === cleanT
        );
        if (!stock) return;
        const totalPortfolioVal = cash + totalCurrentValue;
        const bufferPct = engineConfig.reserveBufferPct ?? 10;
        const bufferCash = totalPortfolioVal * (bufferPct / 100);
        const maxInvestableCash = Math.max(0, cash - bufferCash);
        const targetBudget = totalPortfolioVal / Math.max(1, engineConfig.customUniverse.length);
        const spend = Math.min(maxInvestableCash, targetBudget);
        const countShares = Math.floor(spend / stock.currentPrice);
        const lots = Math.floor(countShares / 100);
        const finalShares = lots * 100;
        if (finalShares > 0) {
          list.push({
            id: `buy-custom-${stock.ticker}`,
            type: "BUY",
            ticker: stock.ticker,
            name: stock.name,
            price: stock.currentPrice,
            shares: finalShares,
            reason: `#${ticker} dalam Custom Universe dan belum dimiliki. Alokasikan sesuai strategi.`,
            badge: "INSTRUKSI BELI",
          });
        }
      });
    } else {
      // 3. Algo mode: rank-based alerts
      portfolio.forEach((item) => {
        if (item.ticker === "EMAS" || item.ticker === "GOLD") return;
        const cleanT = item.ticker.toUpperCase().replace(".JK", "");
        const inTargets = topNTargetStocks.some(
          (t) => t.ticker.replace(".JK", "").toUpperCase() === cleanT,
        );
        const exData = EX.find(
          (e) => e.ticker.replace(".JK", "").toUpperCase() === cleanT,
        );
        const isExitStatic =
          exData &&
          (exData.exit_state === "EXIT" || exData.exit_state === "EXIT RISK");

        const stock = visibleStocks.find((s) => s.ticker === item.ticker);
        const price = stock?.currentPrice ?? (typeof item.buyPrice === "number" ? item.buyPrice : 0);
        const shares = typeof item.shares === "number" ? item.shares : 0;
        if (price <= 0 || shares <= 0) return;

        if (isExitStatic) {
          list.push({
            id: `sell-exit-${item.ticker}`,
            type: "EXIT_SIGNAL",
            ticker: item.ticker,
            name: stock ? stock.name : item.ticker,
            price,
            shares,
            reason: `Memicu kriteria Exit Ops (${exData.exit_state === "EXIT" ? "Sinyal Jual Kuat" : "Risiko Tinggi Penurunan"}).`,
            badge: "EXIT REBALANCING",
          });
        } else if (!inTargets && engineConfig.enableCrossover !== false) {
          const rankInfo = getStockRankAndScore(item.ticker);
          list.push({
            id: `sell-rank-${item.ticker}`,
            type: "SELL",
            ticker: item.ticker,
            name: stock ? stock.name : item.ticker,
            price,
            shares,
            reason: `Kebijakan Rotasi: Peringkat turun ke #${rankInfo.rank} (Batas Target: Top ${engineConfig.topNCount}).`,
            badge: "ROTASI OUT",
          });
        }
      });

      // Check buys from target leaders
      topNTargetStocks.forEach((target) => {
        const cleanT = target.ticker.replace(".JK", "").toUpperCase();
        const alreadyOwned = portfolio.some(
          (p) => p.ticker.toUpperCase().replace(".JK", "") === cleanT,
        );

        if (!alreadyOwned) {
          const stock = visibleStocks.find(
            (s) =>
              s.ticker === target.ticker ||
              s.ticker + ".JK" === target.ticker ||
              s.ticker === cleanT,
          );
          if (stock) {
            // Allocate spending respecting the cash buffer
            const totalPortfolioVal = cash + totalCurrentValue;
            const bufferPct = engineConfig.reserveBufferPct ?? 10;
            const bufferCash = totalPortfolioVal * (bufferPct / 100);
            const maxInvestableCash = Math.max(0, cash - bufferCash);

            const targetBudget = totalPortfolioVal / engineConfig.topNCount;
            const spend = Math.min(maxInvestableCash, targetBudget);
            const countShares = Math.floor(spend / stock.currentPrice);
            const lots = Math.floor(countShares / 100);
            const finalShares = lots * 100;

            if (finalShares > 0) {
              list.push({
                id: `buy-lead-${stock.ticker}`,
                type: "BUY",
                ticker: stock.ticker,
                name: stock.name,
                price: stock.currentPrice,
                shares: finalShares,
                reason: `Berada di peringkat premium #${target.rank} dalam Model ${activeProfile?.name || (engineConfig.activeProfileId === "agresif" ? "Agresif" : engineConfig.activeProfileId === "dividen" ? "Dividen" : "Aman")}.`,
                badge: "INSTRUKSI BELI",
              });
            }
          }
        }
      });
    }

    return list;
  }, [
    isIHSGInCrisis,
    engineConfig.simulationMode,
    engineConfig.customUniverse,
    engineConfig.enableCrossover,
    engineConfig.safeHavenAsset,
    engineConfig.reserveBufferPct,
    engineConfig.topNCount,
    activeProfile,
    portfolio,
    totalCurrentValue,
    cash,
    topNTargetStocks,
    ihsgDrawdown60,
    MKT.gold.value,
  ]);

  return (
    <div id="portfolio-container" className="space-y-3">
      {/* Portfolio Tracker Content Layout */}

      {/* Active Strategy Banner */}
      <div className="bg-[#0A0A0A] border border-emerald-500/20 p-4 rounded-2xl shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-emerald-500/10 rounded-lg shrink-0">
                <Sparkles className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-caption uppercase tracking-widest text-emerald-400 font-bold mb-0.5">Active Strategy</div>
                <div className="text-base font-bold text-white truncate">{activeProfile.name}</div>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-caption font-mono shrink-0">
              <div className="text-right">
                <div className="text-white/30 text-[10px]">QUALITY</div>
                <div className="text-white font-bold">{Math.round(activeProfile.qualityWeight * 100)}%</div>
              </div>
              <div className="text-right">
                <div className="text-white/30 text-[10px]">GROWTH</div>
                <div className="text-white font-bold">{Math.round(activeProfile.growthWeight * 100)}%</div>
              </div>
              <div className="text-right">
                <div className="text-white/30 text-[10px]">VALUE</div>
                <div className="text-white font-bold">{Math.round(activeProfile.valueWeight * 100)}%</div>
              </div>
              <div className="text-right">
                <div className="text-white/30 text-[10px]">MOMENTUM</div>
                <div className="text-white font-bold">{Math.round(activeProfile.momentumWeight * 100)}%</div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/[0.05]">
            <div className="text-label font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              MODE: {engineConfig.simulationMode.toUpperCase()}
            </div>
            <div className="text-label font-mono px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/[0.06]">
              UNIVERSE: {engineConfig.simulationMode === "custom"
                ? `Custom (${engineConfig.customUniverse.length})`
                : engineConfig.universe.toUpperCase()}
            </div>
            {engineConfig.simulationMode === "algo" && (
              <div className="text-label font-mono px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/[0.06]">
                TOP {engineConfig.topNCount}
              </div>
            )}
            {engineConfig.enableCrashProtection && (
              <div className="text-label font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                CRASH ≤ {engineConfig.crashSensitivity}%
              </div>
            )}
            {engineConfig.enableCrashProtection && (
              <div className="text-label font-mono px-2 py-0.5 rounded bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
                SAFE HAVEN: {engineConfig.safeHavenAsset.toUpperCase()}
              </div>
            )}
            <div className="text-label font-mono px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/[0.06]">
              BUFFER: {engineConfig.reserveBufferPct}%
            </div>
          </div>
        </div>
      </div>

      {/* FASE 2.8 — Sticky buy CTA di top Portfolio (sebelum BPS) */}
      <div className="sticky top-9 z-20 bg-[#0A0A0A]/95 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-3 flex items-center gap-3 shadow-lg">
        <div className="flex-1 min-w-0">
          <div className="text-caption font-bold text-emerald-400 uppercase tracking-widest">Beli Cepat</div>
          <div className="text-label text-white/50 truncate">Pilih saham → set jumlah → eksekusi</div>
        </div>
        <button
          type="button"
          onClick={() => {
            const form = document.getElementById("manual-buy-form");
            form?.scrollIntoView({ behavior: "smooth", block: "center" });
            (form?.querySelector("input[type='number']") as HTMLInputElement | null)?.focus();
          }}
          className="shrink-0 px-3 py-2 text-caption font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          style={{ backgroundColor: '#00c9a5', color: '#000' }}
        >
          <Plus className="w-3.5 h-3.5" /> Buka Form
        </button>
      </div>

      {/* Adaptive DCA Recommendation — BPS-driven deploy/cash guidance */}
      {engineConfig.dcaActive ? (
        <BuyPressureDashboard />
      ) : (
        <div className="bg-[#050505] border border-white/[0.05] rounded-2xl p-5 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-white/20 shrink-0" />
          <div className="flex-1">
            <h3 className="text-caption font-bold uppercase tracking-widest text-white/40 font-mono">
              Adaptive DCA Recommendation
            </h3>
            <p className="text-caption text-white/50 font-sans mt-0.5">
              <span className="text-rose-400 font-bold">DISABLED</span> — aktifkan di
              Active Strategy banner (<span className="text-emerald-400">DCA Rekomendasi</span>)
              untuk melihat Buy Pressure Score & deploy recommendation.
            </p>
          </div>
        </div>
      )}

      {showCrisisSignals && strategyEval.shouldExit && (
        <div className="bg-[#0A0A0A] border border-amber-500/20 p-4 sm:p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
            <h3 className="text-sm uppercase font-extrabold tracking-widest font-sans flex items-center gap-1.5">
              Strategy Says: Exit ke {strategyEval.targetSafeHaven?.toUpperCase()}
              <ExplainButton label="evaluateStrategy() — IHSG drop > crashSensitivity" />
            </h3>
          </div>
          <p className="text-xs text-amber-200/70 font-sans max-w-3xl">
            {strategyEval.reason}
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-label font-mono px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/[0.06]">
              IHSG live: {MKT.ihsg.value.toLocaleString("id-ID")} ({ihsgDrawdown60 !== null ? `${ihsgDrawdown60 >= 0 ? "+" : ""}${ihsgDrawdown60.toFixed(1)}%` : "—"})
            </span>
            <div className="text-label font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
              TARGET: {strategyEval.targetSafeHaven?.toUpperCase()}
            </div>
            <div className="text-label font-mono px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/[0.06]">
              MODE: {engineConfig.simulationMode.toUpperCase()}
            </div>
            <div className="text-label font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/15">
              PROFIL: {activeProfile?.name?.toUpperCase() || engineConfig.activeProfileId.toUpperCase()}
            </div>
            {portfolio.some((p) => p.ticker === strategyEval.targetSafeHaven) && (
              <div className="text-label font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Safe Haven Aktif — Pertahankan
              </div>
            )}
          </div>
        </div>
      )}

      {/* Safe Haven Exit Signal — IHSG recovered, time to leave EMAS back to stocks */}
      {showCrisisSignals && strategyEval.shouldExitSafeHaven && !strategyEval.shouldExit && (() => {
        const hasSafeHaven = portfolio.some(
          (p) => p.ticker === "EMAS" || p.ticker === "GOLD",
        );
        if (!hasSafeHaven) return null;
        return (
          <div className="bg-[#0A0A0A] border border-emerald-500/20 p-4 sm:p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
              <h3 className="text-sm uppercase font-extrabold tracking-widest font-sans flex items-center gap-1.5">
                Strategy Says: Exit Safe Haven → Stock
                <ExplainButton label="IHSG recovered above 60d-peak by recoveryBuffer (default 5%). Waktunya jual EMAS dan rotasi kembali ke Top N saham." />
              </h3>
            </div>
            <p className="text-xs text-emerald-200/70 font-sans max-w-3xl">
              {strategyEval.reason}. Jual posisi EMAS/GOLD dan redeploy ke
              Top {engineConfig.topNCount} saham sesuai profil aktif.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <div className="text-label font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                RECOVERY: {strategyEval.recoveryBuffer ?? 5}%
              </div>
              <div className="text-label font-mono px-2 py-0.5 rounded bg-white/5 text-white/60 border border-white/[0.06]">
                MODE: {engineConfig.simulationMode.toUpperCase()}
              </div>
            </div>
          </div>
        );
      })()}

      {visibleWarnings.length > 0 && (
        <div className="bg-[#0A0A0A] border border-rose-500/20 p-4 sm:p-5 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-rose-500" />
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <h3 className="text-sm uppercase font-extrabold tracking-widest font-sans flex items-center gap-1.5">
                Peringatan Portofolio: Sinyal Keluar / Turun Peringkat
                <ExplainButton label="Rebalancing & Exit Alerts (singleSellTrigger, reserveBufferPct, Exit Ops EXIT/EXIT RISK)" />
              </h3>
            </div>
            {visibleWarnings.length > 1 && (
              <button
                onClick={() => setDismissedWarnings(new Set(visibleWarnings.map((w) => w.ticker)))}
                className="text-caption text-rose-300/60 hover:text-rose-300 font-bold uppercase tracking-widest shrink-0"
                title="Tandai semua sebagai sudah dibaca"
              >
                Tandai Dibaca
              </button>
            )}
          </div>
          <p className="text-xs text-rose-200/70 font-sans max-w-3xl">
            Sistem mendeteksi satu atau lebih saham dalam portofolio Anda telah
            memicu sinyal jual atau tidak lagi berada dalam posisi unggulan (Top
            5). Pertimbangkan untuk mengamankan keuntungan atau membatasi
            kerugian.
          </p>
          <div className="space-y-2 mt-2">
            {portfolioWarnings.map((item) => {
              const liveStock = visibleStocks.find(
                (s) => s.ticker === item.ticker,
              );
              const drop = liveStock ? liveStock.change : 0;
              const exData = EX.find(
                (e) => e.ticker.split(".")[0] === item.ticker,
              );
              const isExitStatic = exData && exData.exit_state === "EXIT";
              const isExitRiskStatic =
                exData && exData.exit_state === "EXIT RISK";

              let reason = "";
              if (drop <= -2.2)
                reason =
                  "Masuk zona EXIT secara LIVE (Penurunan Harian > -2.2%)";
              else if (drop <= -0.5)
                reason =
                  "Dalam zona EXIT RISK secara LIVE (Penurunan Harian > -0.5%)";
              else if (isExitStatic)
                reason = "Masuk zona EXIT Historis (Sinyal Jual Terkonfirmasi)";
              else if (isExitRiskStatic)
                reason =
                  "Dalam zona EXIT RISK Historis (Risiko Tinggi Penurunan)";
              else if (item.rank > 5)
                reason = `Terlempar dari Top 5 (Peringkat Saat Ini: ${item.rank})`;

              return (
                <div
                  key={item.ticker}
                  className="flex items-center gap-2.5 p-2 bg-rose-500/5 rounded-lg border border-rose-500/10"
                >
                  <div className="px-2.5 py-1 bg-black/60 text-white font-mono font-bold text-caption rounded border border-rose-500/20">
                    {item.ticker}
                  </div>
                  <span className="text-xs text-rose-300 font-semibold flex-1">
                    {reason}
                  </span>
                  <button
                    onClick={() => setDismissedWarnings((prev) => new Set(prev).add(item.ticker))}
                    className="text-rose-300/40 hover:text-rose-300 text-caption font-bold px-1.5 py-0.5 rounded transition-colors shrink-0"
                    title="Tandai sudah dibaca"
                    aria-label={`Dismiss warning for ${item.ticker}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sesi 12 — Net Wealth hero card + 5 mini-metrics (replaces 5 separate cards) */}
      <div className="space-y-2">
        {/* Hero: Total Net Wealth */}
        <div className="bg-[#050505] bg-card-gradient rounded-2xl border border-emerald-500/15 p-5 relative overflow-hidden">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span className="text-caption uppercase font-bold tracking-widest text-emerald-400/80 font-sans">
                  Net Wealth (Saham + Kas + Emas)
                </span>
                <ExplainButton label="Net Wealth = modal di saham + kas RDI + gram emas × harga spot. Sumber kebenaran tunggal untuk nilai portofolio." />
              </div>
              <h4 className="text-3xl font-black text-white font-mono flex items-baseline gap-2">
                <span className="text-xs text-white/30 font-semibold uppercase">IDR</span>
                {(totalInvestment + cash + (portfolio.find(p => p.ticker === "EMAS" || p.ticker === "GOLD")?.shares ?? 0) * (typeof MKT !== "undefined" ? MKT.gold.value : 0)).toLocaleString("id-ID")}
              </h4>
              <div className="mt-1.5 flex items-center gap-2 text-label font-mono text-white/40">
                <span>Modal: {totalInvestment.toLocaleString("id-ID", { notation: "compact" })}</span>
                <span>•</span>
                <span>Kas: {cash.toLocaleString("id-ID", { notation: "compact" })}</span>
                <span>•</span>
                <span>Emas: {((portfolio.find(p => p.ticker === "EMAS" || p.ticker === "GOLD")?.shares ?? 0) * (MKT.gold.value || 0)).toLocaleString("id-ID", { notation: "compact" })}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-caption uppercase font-bold text-white/30 tracking-widest">P&amp;L</div>
              <div className={`text-2xl font-black font-mono ${totalReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {totalReturn >= 0 ? "+" : ""}{totalReturn.toLocaleString("id-ID", { notation: "compact" })}
              </div>
              <div className={`text-caption font-mono font-bold mt-0.5 ${totalReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {totalReturn >= 0 ? "+" : ""}{totalReturnPercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>

        {/* 5 mini-metrics in 1 row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {/* Modal */}
          <div className="bg-[#050505] border border-white/[0.04] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <FileSpreadsheet className="w-3 h-3 text-white/40" />
              <span className="text-label font-mono text-white/40 uppercase tracking-widest">Modal</span>
            </div>
            <div id="portfolio-total-cost" className="text-data font-mono font-bold text-white">
              {totalInvestment.toLocaleString("id-ID", { notation: "compact" })}
            </div>
            <div className="text-label font-mono text-white/30 mt-0.5">cost basis</div>
          </div>

          {/* Nilai */}
          <div className="bg-[#050505] border border-white/[0.04] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Briefcase className="w-3 h-3 text-white/40" />
              <span className="text-label font-mono text-white/40 uppercase tracking-widest">Nilai</span>
            </div>
            <div id="portfolio-current-value" className="text-data font-mono font-bold text-white">
              {totalCurrentValue.toLocaleString("id-ID", { notation: "compact" })}
            </div>
            <div className="text-label font-mono text-white/30 mt-0.5">market live</div>
          </div>

          {/* P&L */}
          <div className="bg-[#050505] border border-white/[0.04] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              {totalReturn >= 0 ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
              <span className="text-label font-mono text-white/40 uppercase tracking-widest">P&amp;L</span>
            </div>
            <div id="portfolio-total-return" className={`text-data font-mono font-bold ${totalReturn >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {totalReturn >= 0 ? "+" : ""}{totalReturnPercent.toFixed(2)}%
            </div>
            <div className={`text-label font-mono mt-0.5 ${totalReturn >= 0 ? "text-emerald-400/70" : "text-rose-400/70"}`}>
              {totalReturn >= 0 ? "+" : ""}{totalReturn.toLocaleString("id-ID", { notation: "compact" })}
            </div>
          </div>

          {/* Dividen /thn */}
          <div className="bg-[#050505] border border-emerald-500/15 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span className="text-label font-mono text-emerald-400/70 uppercase tracking-widest">Dividen/thn</span>
            </div>
            <div id="portfolio-annual-dividend" className="text-data font-mono font-bold text-emerald-400">
              +{totalAnnualDividend.toLocaleString("id-ID", { notation: "compact", maximumFractionDigits: 0 })}
            </div>
            <div className="text-label font-mono text-emerald-400/60 mt-0.5">
              {totalCurrentValue > 0 ? `${(totalAnnualDividend / totalCurrentValue * 100).toFixed(2)}% yield` : "—"}
            </div>
          </div>

          {/* Kas */}
          <div className="bg-[#050505] border border-white/[0.04] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Wallet className="w-3 h-3 text-white/40" />
              <span className="text-label font-mono text-white/40 uppercase tracking-widest">Kas (RDI)</span>
            </div>
            <div className="text-data font-mono font-bold text-white">
              {cash.toLocaleString("id-ID", { notation: "compact" })}
            </div>
            <div className="text-label font-mono text-emerald-400/60 mt-0.5">secure</div>
          </div>
        </div>
      </div>

      {/* MERGED PORTFOLIO + INSTRUCTION CARD */}
      <div className="bg-[#050505] rounded-2xl border border-white/[0.03]">
        <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-white/[0.05]">

          {/* LEFT: HOLDING SAHAM AKTIF */}
          <div className="flex-1 min-w-0 p-4 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.05] gap-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-sans flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-white/50" />
                Holding Saham Aktif
              </h3>
              <div className="flex items-center gap-2">
                <input
                  value={holdingsFilter}
                  onChange={(e) => setHoldingsFilter(e.target.value)}
                  placeholder="Filter ticker / nama..."
                  className="w-32 sm:w-40 h-7 px-2 text-caption bg-white/[0.04] border border-white/[0.06] rounded text-white/70 placeholder:text-white/20 outline-none focus:border-white/20"
                />
                <span className="text-caption font-bold font-mono text-white/40 bg-white/5 px-2 py-1 rounded whitespace-nowrap">
                  {sortedEnrichedPortfolio.length}/{portfolio.length}
                </span>
              </div>
            </div>

            {enrichedPortfolio.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-white/[0.01] border border-dashed border-white/10 flex flex-col items-center gap-3">
                <Briefcase className="w-8 h-8 text-emerald-400/60" />
                <span className="text-xs font-bold text-white/60 uppercase tracking-widest">
                  Portofolio Kosong
                </span>
                <p className="text-white/40 text-caption font-sans max-w-sm leading-relaxed">
                  Belum ada saham yang dibeli. Mulai dengan beli pertama, atau
                  lihat rekomendasi AI di tab Analitik.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const form = document.getElementById("manual-buy-form");
                    form?.scrollIntoView({ behavior: "smooth", block: "center" });
                    (form?.querySelector("input[type='number']") as HTMLInputElement | null)?.focus();
                  }}
                  className="mt-2 px-3 py-1.5 text-caption font-bold uppercase tracking-widest rounded-lg transition-colors cursor-pointer"
                  style={{ backgroundColor: '#00c9a5', color: '#000' }}
                >
                  <Plus className="w-3.5 h-3.5 inline-block mr-1" /> Beli Pertama
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                <table className="w-full text-left min-w-max border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#050505]">
                    <tr className="border-b border-white/[0.05] text-label font-bold text-white/30 uppercase tracking-widest whitespace-nowrap">
                      <SortHeader k="ticker" label="Emiten Saham" align="left" />
                      <SortHeader k="rank" label="Model Rank" align="center" />
                      <SortHeader k="shares" label="Volume (Lembar)" align="right" />
                      <SortHeader k="currentPrice" label="Entry vs Live (Rp)" align="right" />
                      <SortHeader k="valueNow" label="Net Value (Rp) & P&L" align="right" />
                      <SortHeader k="annualDividend" label="Dividen/thn" align="right" />
                      <th className="pb-3 w-[110px]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] text-body">
                    {sortedEnrichedPortfolio.map((item, index) => {
                      const isPos = item.profitOrLoss >= 0;
                      return (
                        <tr key={index} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="py-3.5 pr-3">
                            <div className="flex items-center gap-3">
                              <TickerLogo ticker={item.ticker} size="sm" fallbackColor={item.logoColor} />
                              <div>
                                <button onClick={() => onSelectStock(item.ticker)}
                                  className="font-bold text-white hover:text-white/70 block text-left font-sans cursor-pointer flex items-center gap-1.5 group-hover:underline text-xs">
                                  {item.ticker}
                                </button>
                                <span className="text-caption text-white/40 block truncate max-w-40 font-sans mt-0.5">
                                  {item.companyName}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            {item.ticker === "EMAS" || item.ticker === "GOLD" ? (
                              <>
                                <span className="px-2 py-1 inline-block rounded text-label font-bold font-mono tracking-wider border bg-amber-500/10 border-amber-500/30 text-amber-400">
                                  Safe Haven
                                </span>
                                <span className="text-label text-amber-400/70 block mt-1.5 font-mono">
                                  {isIHSGInCrisis ? "HOLD per Strategy" : "Idle"}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className={`px-2 py-1 inline-block rounded text-label font-bold font-mono tracking-wider border ${
                                  item.rank <= engineConfig.topNCount
                                    ? "bg-white/10 border-white/20 text-white"
                                    : item.rank <= 15
                                      ? "bg-white/[0.05] border-white/10 text-white/80"
                                      : item.rank >= 40
                                        ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                        : "bg-white/[0.02] border-white/5 text-white/50"
                                }`}>Rank {item.rank}</span>
                                <span className="text-label text-white/30 block mt-1.5 font-mono">Skor {item.score}</span>
                              </>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-right font-medium text-white/90 font-mono text-xs">
                            {item.shares.toLocaleString()}{" "}
                            <span
                              title={
                                item.ticker === "EMAS" || item.ticker === "GOLD"
                                  ? "1 lot emas = 1 gram. Spread 2% untuk konversi fisik."
                                  : "1 lot = 100 lembar. Minimal transaksi = 1 lot."
                              }
                              className="cursor-help border-b border-dotted border-white/30"
                            >
                              {item.ticker === "EMAS" || item.ticker === "GOLD" ? "gr" : "lbr"}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right">
                            <div className="font-mono text-caption text-white/40 font-semibold tracking-wider">B: {item.buyPrice.toLocaleString()}</div>
                            <div className="font-mono text-xs text-white mt-1 font-bold">L: {item.currentPrice.toLocaleString()}</div>
                          </td>
                          <td className="py-3.5 pl-3 text-right">
                            <div className="font-bold text-white text-xs font-mono">{item.valueNow.toLocaleString()}</div>
                            <div className={`text-caption font-bold mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
                              isPos ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                            }`}>
                              {isPos ? "+" : ""}{item.profitOrLoss.toLocaleString()} ({isPos ? "+" : ""}{item.percentChange.toFixed(1)}%)
                            </div>
                          </td>
                          <td className="py-3.5 pl-3 text-right">
                            {item.dividendYield > 0 ? (
                              <div className="inline-flex flex-col items-end gap-0.5">
                                <span className="text-emerald-400 font-bold text-xs font-mono">
                                  +Rp {item.annualDividend.toLocaleString("id-ID", { notation: "compact", maximumFractionDigits: 0 })}
                                </span>
                                <span className="text-label text-emerald-400/60 font-mono">
                                  {item.dividendYield.toFixed(2)}% yield
                                </span>
                              </div>
                            ) : (
                              <span className="text-caption text-white/30 font-mono">—</span>
                            )}
                          </td>
                          <td className="py-3.5 pl-2 text-right">
                            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-2 sm:gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="flex items-center bg-white/[0.02] border border-white/[0.05] rounded-lg overflow-hidden">
                                <input type="number" min="1" max={item.shares} value={sellInputs[item.ticker] || ""}
                                  onChange={(e) => setSellInputs((prev) => ({ ...prev, [item.ticker]: e.target.value }))}
                                  placeholder="Lbr"
                                  className="w-16 sm:w-16 bg-transparent text-white text-caption px-2 py-1.5 outline-none text-right font-mono placeholder:text-white/20" />
                                <button onClick={() => {
                                    const toSell = parseInt(sellInputs[item.ticker] || "0");
                                    if (toSell > 0 && toSell <= item.shares) {
                                      onSellTransaction(item.ticker, toSell);
                                      setSellInputs((prev) => ({ ...prev, [item.ticker]: "" }));
                                    }
                                  }}
                                  className="px-3 py-1.5 text-label tracking-widest font-bold uppercase text-white bg-white/10 hover:bg-white/20 cursor-pointer transition-colors border-l border-white/[0.05]"
                                  title="Jual">Eks</button>
                              </div>
                              <button onClick={() => onRemoveTransaction(item.ticker)}
                                className="p-1.5 text-white/40 hover:text-white hover:bg-rose-600 rounded-lg bg-white/5 cursor-pointer border border-white/[0.05] hover:border-rose-500 transition-all flex items-center justify-center shrink-0"
                                title="Likuidasi Penuh / Hapus">
                                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT: INSTRUKSI LEDGER CERDAS */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0 p-4 space-y-3 flex flex-col">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white/50" />
              Instruksi Ledger Cerdas
            </h3>

            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin flex-1">
              {activeAlerts.length === 0 ? (
                <div className="p-6 text-center rounded-2xl bg-white/[0.02] border border-white/[0.03] flex flex-col items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-white/50" />
                  <span className="text-body text-white font-extrabold uppercase tracking-widest">Portofolio Optimal</span>
                  <p className="text-caption text-white/40 leading-relaxed max-w-xs">
                    Distribusi alokasi modal saat ini selaras 100% dengan
                    parameter kebijakan investasi & analisa kuantitatif. Tidak
                    ada transaksi yang disarankan.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeAlerts.map((alertItem, idx) => {
                    const isBuy = alertItem.type === "BUY";
                    return (
                      <div key={alertItem.id}
                        className="p-4 rounded-xl relative flex flex-col justify-between gap-4 text-left transition-all bg-white/[0.01] border hover:bg-white/[0.03] border-white/[0.03]">
                        <div className="flex justify-between items-start gap-3">
                          <div>
                            <span className="text-label font-black font-mono tracking-widest px-2 py-1 rounded uppercase bg-white/5 text-white/80 border border-white/5">
                              {alertItem.badge}
                            </span>
                            <h4 className="text-body font-black text-white mt-3 flex items-baseline gap-2">
                              {alertItem.ticker}
                              <span className="text-caption font-medium text-white/40 truncate block max-w-[160px]">{alertItem.name}</span>
                            </h4>
                          </div>
                          <div className="text-right font-mono">
                            <span className="text-label text-white/40 block font-bold uppercase tracking-widest">Pricing Spot</span>
                            <span className="text-xs font-bold text-white mt-1 block">Rp {alertItem.price.toLocaleString()}</span>
                          </div>
                        </div>

                        <p className="text-caption text-white/50 leading-relaxed font-sans border-l-2 border-white/10 pl-3 italic">
                          {alertItem.reason}
                        </p>

                        <div className="flex border-t border-white/[0.05] pt-3 items-center justify-between gap-4 mt-1">
                          <div className="font-mono">
                            <span className="text-label text-white/40 block uppercase font-bold tracking-widest">Volume Trading</span>
                            <span className="text-xs font-black text-white mt-1 block">
                              {alertItem.shares.toLocaleString()}{" "}
                              {alertItem.ticker === "EMAS" || alertItem.ticker === "GOLD" ? "Gram" : "Lembar"}
                              {!(alertItem.ticker === "EMAS" || alertItem.ticker === "GOLD") && (
                                <span className="text-caption text-white/40 font-semibold lowercase"> ({Math.round(alertItem.shares / 100)} Lot)</span>
                              )}
                            </span>
                          </div>

                          <button onClick={() => {
                              if (isBuy) {
                                const details = calculateTradeDetails("BUY", alertItem.ticker, alertItem.shares, alertItem.price);
                                if (details.net > cash) {
                                  setNotification({
                                    message: "Saldo Kas Tunai Anda tidak mencukupi untuk membeli! Diperlukan Rp " + Math.round(details.net).toLocaleString(),
                                    type: "error",
                                  });
                                  return;
                                }
                                onAddTransaction(alertItem.ticker, alertItem.shares, alertItem.price);
                              } else {
                                onSellTransaction(alertItem.ticker, alertItem.shares);
                              }
                            }}
                            className="px-4 py-2.5 rounded-xl text-caption font-bold uppercase tracking-widest cursor-pointer transition-all hover:scale-[1.02] bg-white text-black shadow-sm font-sans flex gap-2 items-center">
                            Setujui {isBuy ? "Akuisisi" : "Likuidasi"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

{/* Form and Chart Container */}
          <div className="space-y-3">
            {/* TRANSAKSI MANDIRI (PILIHAN SAHAM INDIVIDUAL) */}
            <div className="bg-[#050505] bg-card-gradient p-4 rounded-2xl border border-white/[0.03] space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-white/[0.05]">
                <h4 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-white/50" />
                  Tambah Manual
                </h4>
                <span className="text-label font-mono px-2 py-1 bg-white/[0.05] border border-white/[0.05] text-white/50 rounded uppercase font-bold tracking-widest">
                  Beli Manual
                </span>
              </div>

              <form
                id="manual-buy-form"
                onSubmit={handleAdd}
                className="flex flex-col gap-4 pt-2"
              >
                {/* Dropdown Saham Individual */}
                <div className="space-y-2">
                    <label className="text-caption uppercase font-bold text-white/40 tracking-widest block font-sans">
                      Pilih Saham
                    </label>
                  <SearchableSelect
                    value={selectedTicker}
                    options={visibleStocks.map((s) => ({
                      value: s.ticker,
                      label: `${s.ticker} (${s.name})`,
                      logoColor: s.logoColor,
                    }))}
                    onChange={(val) => setSelectedTicker(val)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Volume Lembar (Shares) */}
                  <div className="space-y-2">
                    <label className="text-caption uppercase font-bold text-white/40 tracking-widest block font-sans">
                      Jumlah (Lbr)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="100"
                        step="100"
                        value={sharesStr}
                        onChange={(e) => setSharesStr(e.target.value)}
                        className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-white/[0.05] outline-none focus:border-white/20 bg-white/[0.02] text-white transition-colors"
                      />
                    </div>
                  </div>

                  {/* Execution Price or Live Price */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-caption uppercase font-bold text-white/40 tracking-widest block font-sans">
                        Harga Beli
                      </label>
                      <button
                        type="button"
                        onClick={() => setCustomPriceStr("")}
                        className="text-label text-white/60 hover:text-white uppercase font-bold tracking-wider cursor-pointer font-sans"
                      >
                        Set Live
                      </button>
                    </div>
                    <input
                      type="number"
                      placeholder={`Live: Rp ${currentSelectedStock.currentPrice.toLocaleString()}`}
                      value={customPriceStr}
                      onChange={(e) => setCustomPriceStr(e.target.value)}
                      className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-white/[0.05] outline-none focus:border-white/20 bg-white/[0.02] text-white transition-colors"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end pt-3 border-t border-white/[0.05]">
                  <button
                    type="submit"
                    className="w-full bg-white/10 hover:bg-white/15 text-white font-bold text-caption px-6 py-2.5 rounded-xl uppercase tracking-widest cursor-pointer transition-all duration-150 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4 shrink-0" /> Beli Sekarang
                  </button>
                </div>
              </form>
              <p className="text-label text-white/30 leading-normal text-right mt-2 italic">
                * Fee broker 0.15% & spread bid/offer 0.05%.
              </p>
            </div>

            {/* Moved Sector Allocation Card */}
            <div className="bg-[#050505] bg-card-gradient p-4 rounded-2xl border border-white/[0.03] flex flex-col justify-between">
              <div className="flex items-center gap-2 pb-3 border-b border-white/[0.05]">
                <PieChart className="w-4 h-4 text-white/50" />
                <h4 className="text-xs font-bold text-white uppercase tracking-widest font-sans flex items-center gap-2">
                  Alokasi Sektor (Exposure)
                </h4>
              </div>
              <div className="flex-1 w-full relative min-h-[160px] flex items-center justify-center mt-4">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#121212",
                          borderColor: "rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                          fontSize: "10px",
                          color: "#fff",
                        }}
                        itemStyle={{ color: "#fff" }}
                        formatter={(value: number) =>
                          `Rp ${value.toLocaleString("id-ID")}`
                        }
                      />
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-white/20 text-xs uppercase tracking-widest">
                    Kosong
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* HISTORICAL TRADE LOG DATABASE */}
          <div className="bg-[#050505] bg-card-gradient rounded-2xl border border-white/[0.03] p-4 flex flex-col max-h-[420px]">
            <div className="flex justify-between items-center pb-3 mb-3 border-b border-white/[0.05] shrink-0">
              <h3 className="text-xs font-bold text-white uppercase tracking-widest font-sans flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-white/50" />
                Ledger Statement Audit
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    let csvContent = "\ufeff"; // BOM for Excel UTF-8 support
                    csvContent +=
                      "ID,Tanggal,Tipe,Sandi Saham (Ticker),Jumlah Lembar (Shares),Harga Eksekusi (Rp),Nilai Kotor (Gross Rp),Slippage/Spread (Rp),Komisi Broker (Rp),Pajak Transaksi (Rp),Nilai Bersih (Net Cash Rp)\n";

                    tradeLogs.forEach((log) => {
                      const typeLabel =
                        log.type === "BUY"
                          ? "BELI"
                          : log.type === "BUY_GOLD"
                            ? "BELI EMAS"
                            : log.type === "SELL"
                              ? "JUAL"
                              : "JUAL EMAS";
                      const dt = calculateTradeDetails(
                        log.type,
                        log.ticker,
                        log.shares,
                        log.price,
                      );
                      const dateFormatted =
                        new Date(log.timestamp).toLocaleDateString("id-ID") +
                        " " +
                        new Date(log.timestamp).toLocaleTimeString("id-ID");
                      csvContent += `"${log.id}","${dateFormatted}","${typeLabel}","${log.ticker}",${log.shares},${log.price},${dt.gross.toFixed(0)},${dt.slippage.toFixed(0)},${dt.fee.toFixed(0)},${dt.tax.toFixed(0)},${dt.net.toFixed(0)}\n`;
                    });

                    const blob = new Blob([csvContent], {
                      type: "text/csv;charset=utf-8;",
                    });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.setAttribute("href", url);
                    link.setAttribute(
                      "download",
                      `laporan_transaksi_ledger_${new Date().toISOString().slice(0, 10)}.csv`,
                    );
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                  disabled={tradeLogs.length === 0}
                  className="text-label uppercase tracking-widest font-bold text-white/80 hover:text-white disabled:opacity-20 disabled:pointer-events-none transition-colors cursor-pointer flex items-center gap-1.5 border border-white/20 bg-white/5 px-3 py-1.5 rounded-lg font-sans"
                  title="Unduh Laporan CSV"
                >
                  <Download className="w-3 h-3" /> Ekspor (CSV)
                </button>
                <button
                  onClick={() => {
                    if (isConfirmingClear) {
                      setTradeLogs([]);
                      setIsConfirmingClear(false);
                    } else {
                      setIsConfirmingClear(true);
                      setTimeout(() => setIsConfirmingClear(false), 3000); // reset after 3s
                    }
                  }}
                  className={`text-label uppercase tracking-widest font-bold transition-colors cursor-pointer ${isConfirmingClear ? "text-white bg-rose-600 px-3 py-1.5 rounded-lg" : "text-white/40 hover:text-white"}`}
                >
                  {isConfirmingClear ? "⚠️ Klik Konfirmasi" : "Hapus Riwayat"}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin space-y-3">
              {tradeLogs.length === 0 ? (
                <div className="p-6 text-center text-caption text-white/30 font-mono italic">
                  Belum ada log transaksi teraudit yang dilakukan pada sesi ini.
                </div>
              ) : (
                <div className="space-y-2">
                  {tradeLogs.map((log) => {
                    const isB =
                      log.type.includes("BUY") || log.type === "DEPOSIT";
                    const formatedDate = new Date(
                      log.timestamp,
                    ).toLocaleTimeString("id", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const dt = calculateTradeDetails(
                      log.type,
                      log.ticker,
                      log.shares,
                      log.price,
                    );

                    let typeLabel = isB ? "AKUISISI" : "LIKUIDASI";
                    let textColor = isB ? "text-white" : "text-white/60";
                    let prefixSign = isB ? "+" : "-";

                    if (log.type === "DEPOSIT") {
                      typeLabel = "TOP-UP DANA";
                      textColor = "text-white";
                      prefixSign = "+";
                    } else if (log.type === "WITHDRAWAL") {
                      typeLabel = "PENARIKAN DANA";
                      textColor = "text-white/60";
                      prefixSign = "-";
                    } else if (log.type === "BUY_GOLD") {
                      typeLabel = "AKUISISI EMAS";
                      textColor = "text-white";
                      prefixSign = "+";
                    } else if (log.type === "SELL_GOLD") {
                      typeLabel = "LIKUIDASI EMAS";
                      textColor = "text-white/60";
                      prefixSign = "-";
                    }

                    return (
                      <div
                        key={log.id}
                        className="p-3.5 bg-white/[0.01] border border-white/[0.03] rounded-xl text-caption font-mono space-y-3 transition-all hover:bg-white/[0.03]"
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-body font-black text-white px-2 py-1 bg-white/5 border border-white/5 rounded uppercase`}
                            >
                              {typeLabel}
                            </span>
                            <div>
                              <span className="font-bold text-white text-body">
                                {log.ticker}
                              </span>
                              <span className="text-white/30 text-label block tracking-wide mt-0.5">
                                {new Date(log.timestamp).toLocaleDateString(
                                  "id-ID",
                                )}{" "}
                                {formatedDate} &bull;{" "}
                                {log.shares.toLocaleString("id-ID")}{" "}
                                {log.ticker === "EMAS" || log.ticker === "GOLD"
                                  ? "gr"
                                  : log.ticker === "KAS"
                                    ? "IDR"
                                    : "lbr"}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className={`${textColor} font-bold text-body`}
                            >
                              {prefixSign} Rp {dt.net.toLocaleString("id-ID")}
                            </span>
                            <span className="text-white/40 text-label block font-semibold leading-none mt-1">
                              {log.ticker === "KAS"
                                ? "Nilai Transaksi"
                                : `Spot Rp ${log.price.toLocaleString("id-ID")}`}
                            </span>
                          </div>
                        </div>

                        {/* Transaction detailed breakdown */}
                        <div className="grid grid-cols-4 gap-3 text-label text-white/40 border-t border-white/[0.05] pt-3 leading-relaxed">
                          <div>
                            <span className="block font-bold">
                              Kotor (Gross)
                            </span>
                            <span className="text-white/70 font-bold">
                              Rp {Math.round(dt.gross).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div>
                            <span className="block font-bold">
                              Admin{" "}
                              {log.ticker === "EMAS" || log.ticker === "KAS"
                                ? "0%"
                                : isB
                                  ? "0.15%"
                                  : "0.25%"}
                            </span>
                            <span className="text-white/70">
                              Rp {Math.round(dt.fee).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div>
                            <span className="block font-bold">
                              Spread{" "}
                              {log.ticker === "EMAS"
                                ? "2.0%"
                                : log.ticker === "KAS"
                                  ? "0%"
                                  : "0.05%"}
                            </span>
                            <span className="text-white/70 font-semibold">
                              Rp{" "}
                              {Math.round(dt.slippage).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <div className="text-right font-sans">
                            <span className={`block font-bold ${textColor}`}>
                              Net Value
                            </span>
                            <span
                              className={`${textColor} font-extrabold text-label`}
                            >
                              Rp {Math.round(dt.net).toLocaleString("id-ID")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

      {/* Watchlist Strip */}
      <div className="bg-[#0A0A0A] bg-card-gradient-alt rounded-2xl border border-white/10 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h3 className="text-xs font-semibold text-white/85 uppercase tracking-widest flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-450 text-emerald-400" />
            Daftar Pantau
          </h3>
          <div className="flex items-center gap-2 max-w-sm w-full sm:w-auto">
            <SearchableSelect
              value={watchlistTicker}
              options={visibleStocks.map((s) => ({
                value: s.ticker,
                label: `${s.ticker} - ${s.name}`,
                logoColor: s.logoColor,
              }))}
              onChange={(val) => setWatchlistTicker(val)}
            />
            <button
              onClick={() => onToggleWatchlist(watchlistTicker)}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors cursor-pointer shrink-0"
              disabled={watchlist.some((w) => w.ticker === watchlistTicker)}
            >
              Tambah
            </button>
          </div>
        </div>

        {watchlist.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-white/[0.02] border border-dashed border-white/10">
            <p className="text-white/40 text-xs">
              Belum ada perusahaan dalam Daftar Pantau. Klik ikon mata pada
              saham untuk menambahkannya.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {watchlist.map((item) => {
              const liveStock = visibleStocks.find(
                (s) => s.ticker === item.ticker,
              );
              if (!liveStock) return null;
              const isPos = liveStock.change >= 0;
              return (
                <div
                  key={item.ticker}
                  className="p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-emerald-500/20 hover:shadow-xs transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <TickerLogo
                      ticker={liveStock.ticker}
                      size="md"
                      fallbackColor={liveStock.logoColor}
                    />
                    <div>
                      <button
                        onClick={() => onSelectStock(liveStock.ticker)}
                        className="font-bold text-white hover:text-emerald-400 cursor-pointer block text-left"
                      >
                        {liveStock.ticker}
                      </button>
                      <DataBadge status={liveStock.dataSources.price} />
                      <span className="text-caption text-white/40 block truncate max-w-32 mt-0.5">
                        {liveStock.name}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="text-xs font-bold text-white block font-mono">
                        Rp {liveStock.currentPrice.toLocaleString()}
                      </span>
                      <span
                        className={`text-caption font-bold ${isPos ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {isPos ? "+" : ""}
                        {liveStock.change}%
                      </span>
                    </div>
                    <button
                      onClick={() => onToggleWatchlist(liveStock.ticker)}
                      className="p-1 text-white/30 hover:text-rose-400 rounded cursor-pointer transition-colors"
                      title="Hapus Dari Daftar Pantau"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Custom Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#0d0d0d]/95 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex gap-3 items-start transition-all duration-300">
          <div className="mt-0.5 flex-shrink-0">
            {notification.type === "success" && (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            )}
            {notification.type === "error" && (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            )}
            {notification.type === "info" && (
              <HelpCircle className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <h5 className="text-body font-extrabold uppercase tracking-widest text-white">
              {notification.type === "success"
                ? "Transaksi Berhasil"
                : notification.type === "error"
                  ? "Peringatan Transaksi"
                  : "Informasi"}
            </h5>
            <p className="text-[10.5px] text-white/70 font-semibold leading-relaxed">
              {notification.message}
            </p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-white/40 hover:text-white transition-colors cursor-pointer text-xs font-bold leading-none p-1"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
