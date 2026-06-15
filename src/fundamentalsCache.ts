import { FinancialMetric } from "./types";

export interface RealFundamentals {
  ticker: string;
  year: number;
  roe: number;
  der: number;
  roa: number;
  net_margin: number;
  eps: number;
  book_value_per_share: number;
  per: number;
  price_bv: number;
  total_equity: number;
  total_assets: number;
  total_sales: number;
  ebt: number;
  net_income: number;
  shares_outstanding: number | null;
}

const fundamentalsMap = new Map<string, Map<number, RealFundamentals>>();
let loaded = false;

export function isFundamentalsLoaded(): boolean {
  return loaded;
}

export function setFundamentalsData(data: RealFundamentals[]): void {
  fundamentalsMap.clear();
  for (const row of data) {
    if (!fundamentalsMap.has(row.ticker)) {
      fundamentalsMap.set(row.ticker, new Map());
    }
    fundamentalsMap.get(row.ticker)!.set(row.year, row);
  }
  loaded = true;
}

export function getFundamentals(ticker: string, year?: number): RealFundamentals | Map<number, RealFundamentals> | undefined {
  const byTicker = fundamentalsMap.get(ticker.toUpperCase());
  if (!byTicker) return undefined;
  if (year !== undefined) return byTicker.get(year);
  return byTicker;
}

export function buildMetricsFromFundamentals(f: Map<number, RealFundamentals>): FinancialMetric[] {
  const years = Array.from(f.keys()).sort();
  return years.map((year) => {
    const d = f.get(year)!;
    const liabilities = d.total_assets - d.total_equity;
    return {
      year: String(year),
      revenue: d.total_sales,
      netIncome: d.net_income >= 0 ? d.net_income : d.net_income,
      totalAssets: d.total_assets,
      totalLiabilities: liabilities >= 0 ? liabilities : 0,
      totalEquity: d.total_equity,
      cashFlowOperating: 0,
      cashFlowInvesting: 0,
      cashFlowFinancing: 0,
    };
  });
}

export function getLatestFundamentals(ticker: string): RealFundamentals | undefined {
  const byTicker = fundamentalsMap.get(ticker.toUpperCase()) as Map<number, RealFundamentals> | undefined;
  if (!byTicker || byTicker.size === 0) return undefined;
  const maxYear = Math.max(...Array.from(byTicker.keys()));
  return byTicker.get(maxYear);
}
