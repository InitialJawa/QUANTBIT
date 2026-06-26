import { MKT } from "../marketData";
import type { PortfolioItem, StockData } from "../types";

/** Hitung nilai terkini satu posisi (share × harga). EMAS/GOLD fallback ke buyPrice
 *  karena tidak ada live price di STOCKS_DATA. */
export function positionValue(item: PortfolioItem, getDynamicStock: (ticker: string) => StockData | undefined): number {
  const stock = getDynamicStock(item.ticker);
  const price = stock?.currentPrice ?? item.buyPrice;
  return item.shares * price;
}

/** Total value semua saham (emas dihitung @ buyPrice karena tidak live). */
export function stocksValue(portfolio: PortfolioItem[], getDynamicStock: (ticker: string) => StockData | undefined): number {
  return portfolio.reduce((sum, p) => sum + positionValue(p, getDynamicStock), 0);
}

/** Total modal investasi (sum shares × buyPrice). */
export function totalCost(portfolio: PortfolioItem[]): number {
  return portfolio.reduce((sum, p) => sum + p.shares * p.buyPrice, 0);
}

/** Total return % terhadap modal. Positif = profit, negatif = rugi. */
export function totalReturnPercent(portfolio: PortfolioItem[], getDynamicStock: (ticker: string) => StockData | undefined): number {
  const cost = totalCost(portfolio);
  if (cost <= 0) return 0;
  return ((stocksValue(portfolio, getDynamicStock) - cost) / cost) * 100;
}

/** Nilai emas dalam portfolio (grams × MKT.gold.value). */
export function goldValue(portfolio: PortfolioItem[]): number {
  const emas = portfolio.find(p => p.ticker === "EMAS" || p.ticker === "GOLD");
  if (!emas) return 0;
  return emas.shares * MKT.gold.value;
}

/** Total Wealth = stocks + cash + gold. Single source of truth across tabs. */
export function totalWealth(portfolio: PortfolioItem[], cash: number, getDynamicStock: (ticker: string) => StockData | undefined): number {
  return stocksValue(portfolio, getDynamicStock) + cash + goldValue(portfolio);
}

/** Format rupiah shorthand. */
export function formatRupiahShort(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `Rp ${(n / 1e9).toFixed(2)}M`;
  if (abs >= 1e6) return `Rp ${(n / 1e6).toFixed(2)}jt`;
  if (abs >= 1e3) return `Rp ${(n / 1e3).toFixed(1)}rb`;
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}
