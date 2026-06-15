import { DataStatus } from "./types/DataStatus";
export { DataStatus };

export interface FinancialMetric {
  year: string;
  revenue: number; // in IDR Billion
  netIncome: number; // in IDR Billion
  totalAssets: number; // in IDR Billion
  totalLiabilities: number; // in IDR Billion
  totalEquity: number; // in IDR Billion
  cashFlowOperating: number; // in IDR Billion
  cashFlowInvesting: number; // in IDR Billion
  cashFlowFinancing: number; // in IDR Billion
}

export interface DataSources {
  price: DataStatus;
  fundamentals: DataStatus;
  charts: DataStatus;
  description: DataStatus;
}

export interface StockData {
  ticker: string;
  name: string;
  sector: string;
  subSector: string;
  description: string;
  logoColor: string; // Tailwind bg color class
  marketCap: number; // IDR Trillion
  currentPrice: number; // IDR per share
  change: number; // percentage
  peRatio: number;
  pbRatio: number;
  roe: number; // percentage
  der: number; // Debt to Equity ratio
  dividendYield: number; // percentage
  metrics: FinancialMetric[];
  dataSources: DataSources;
  chartDataDaily: { date: string; price: number; volume: number }[];
  chartDataWeekly: { date: string; price: number; volume: number }[];
  chartDataMonthly: { date: string; price: number; volume: number }[];
}

export interface WatchlistItem {
  ticker: string;
  addedAt: string;
}

export interface PortfolioItem {
  ticker: string;
  shares: number;
  buyPrice: number;
  addedAt: string;
}

export interface AnalysisResult {
  ticker: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  swotAnalysis: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  keyRatios: { label: string; value: string; assessment: string }[];
  fairValue: { estimatedValue: number; currentPrice: number; stance: 'UNDERVALUED' | 'FAIRLY_VALUED' | 'OVERVALUED' };
  stance: 'BULLISH' | 'CAUTIOUSLY_BULLISH' | 'NEUTRAL' | 'CAUTIOUSLY_BEARISH' | 'BEARISH';
  growthOutlook: string;
  timestamp: string;
}
