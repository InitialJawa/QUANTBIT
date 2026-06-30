import type { PortfolioItem } from "../types";

interface RawDay {
  date: string;
  stockAdjPrices?: Record<string, number>;
}

export interface PortfolioHistoryPoint {
  date: string;
  portfolioValue: number | null;
}

export function reconstructPortfolioHistory(
  portfolio: PortfolioItem[],
  rawData: RawDay[],
): PortfolioHistoryPoint[] {
  if (portfolio.length === 0 || rawData.length === 0) return [];

  const activeHoldings = portfolio.filter(p => p.shares > 0);
  if (activeHoldings.length === 0) return [];

  const totalCost = activeHoldings.reduce((sum, p) => sum + p.shares * p.buyPrice, 0);
  if (totalCost === 0) return [];

  const cashReserve = 0;
  return rawData.map(day => {
    const prices = day.stockAdjPrices || {};
    let value = cashReserve;
    for (const h of activeHoldings) {
      const price = prices[h.ticker];
      if (price != null && price > 0) {
        value += h.shares * price;
      }
    }
    return {
      date: day.date,
      portfolioValue: value > 0 ? value : null,
    };
  });
}

export function portfolioIndexedHistory(
  portfolio: PortfolioItem[],
  rawData: RawDay[],
): PortfolioHistoryPoint[] {
  const history = reconstructPortfolioHistory(portfolio, rawData);
  const firstValid = history.find(h => h.portfolioValue !== null);
  if (!firstValid || firstValid.portfolioValue === null) return [];

  const base = firstValid.portfolioValue;
  return history.map(h => ({
    date: h.date,
    portfolioValue: h.portfolioValue !== null
      ? (h.portfolioValue / base) * 100
      : null,
  }));
}
