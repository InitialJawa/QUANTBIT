import { useState, useEffect } from "react";
import { getStock, STOCKS_DATA } from "../stocksData";
import { setFundamentalsData } from "../fundamentalsCache";
import { DataStatus } from "../types/DataStatus";
import { MKT, setScanData } from "../marketData";
import { refreshRSFromRegime, setIhsgHistory } from "../marketRegimeEngine";
import { api } from "../services/api";
import type { StockData } from "../types";

export function useDataFeed() {
  const [goapiPrices, setGoapiPrices] = useState<Record<string, { close: number; change: number; pct: number }>>({});
  const [yahooPrices, setYahooPrices] = useState<Record<string, { close: number; change: number; pct: number }>>({});
  const [dataFeed, setDataFeed] = useState<"yahoo" | "goapi" | "simulated">("yahoo");
  const [isGoapiConnected, setIsGoapiConnected] = useState(false);
  const [isYahooConnected, setIsYahooConnected] = useState(false);
  const [priceFluctuations, setPriceFluctuations] = useState<Record<string, number>>({});
  const [mktRevision, setMktRevision] = useState(0);

  useEffect(() => {
    const fetchPrices = () => {
      api.get<{ success: boolean; prices: any }>("/api/goapi/live-prices")
        .then(apiRes => {
          if (apiRes.success && apiRes.prices) {
            setGoapiPrices(apiRes.prices);
            setIsGoapiConnected(true);
          }
        })
        .catch(() => {});

      api.get<{ success: boolean; prices: any }>("/api/yahoo/live-prices")
        .then(apiRes => {
          if (apiRes.success && apiRes.prices) {
            setYahooPrices(apiRes.prices);
            setIsYahooConnected(true);
          }
        })
        .catch(() => {});

      api.get<{ success: boolean; data: any[]; count: number }>("/api/fundamentals")
        .then(apiRes => {
          if (apiRes.success && apiRes.data?.length > 0) {
            setFundamentalsData(apiRes.data);
          }
        })
        .catch(() => {});

      api.get<{ success: boolean; data: any[] }>("/api/backtest-data")
        .then(apiRes => {
          if (apiRes.success && Array.isArray(apiRes.data)) {
            setIhsgHistory(apiRes.data.map((d: any) => ({ close: d.ihsgPrice, date: d.date })));
          }
          refreshRSFromRegime();
        })
        .catch(() => {
          refreshRSFromRegime();
        });

      api.get<{ stocks: any[]; lastUpdated?: string }>("/api/engine/idx80")
        .then(data => {
          if (data?.stocks && data.stocks.length > 0) {
            setScanData({ stocks: data.stocks, lastUpdated: data.lastUpdated || new Date().toISOString() });
            refreshRSFromRegime();
          }
        })
        .catch(() => {});
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

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
    if (changed) setMktRevision(prev => prev + 1);
  }, [dataFeed, yahooPrices]);

  useEffect(() => { refreshRSFromRegime(); }, [mktRevision]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const jakarta = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
      const day = jakarta.getDay();
      const hour = jakarta.getHours();
      const marketOpen = day >= 1 && day <= 5 && hour >= 9 && hour < 15;
      setPriceFluctuations(prev => {
        const next = { ...prev };
        STOCKS_DATA.forEach(stock => {
          if (!marketOpen) { next[stock.ticker] = 0; return; }
          let base = stock.currentPrice;
          if (dataFeed === "goapi" && goapiPrices[stock.ticker]) base = goapiPrices[stock.ticker].close;
          else if (dataFeed === "yahoo" && yahooPrices[stock.ticker]) base = yahooPrices[stock.ticker].close;
          const offset = next[stock.ticker] || 0;
          const newOffset = offset + 0;
          const cap = base * 0.05;
          next[stock.ticker] = Math.max(-cap, Math.min(cap, newOffset));
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [goapiPrices, yahooPrices, dataFeed]);

  const getDynamicStock = (ticker: string): StockData | undefined => {
    const rawStock = getStock(ticker);
    if (!rawStock) return undefined;

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

    const buildChart = (count: number, spread: number, labels: string[]) => {
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

  return {
    dataFeed, setDataFeed,
    goapiPrices, yahooPrices,
    isGoapiConnected, isYahooConnected,
    priceFluctuations, mktRevision,
    getDynamicStock,
  };
}
