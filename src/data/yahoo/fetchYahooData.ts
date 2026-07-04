import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance();

export interface YahooStock {
  ticker: string;
  price: number;
  marketCap: number;
  peRatio: number;
  pbRatio: number;
  roe: number;
  der: number;
  dividendYield: number;
  revenue?: number;
  netIncome?: number;
}

export async function fetchYahooData(ticker: string): Promise<YahooStock | null> {
  try {
    const r = await yf.quoteSummary(`${ticker}.JK`, {
      modules: ["price", "summaryDetail", "financialData", "defaultKeyStatistics"],
    });

    const p = r.price?.regularMarketPrice;
    if (!p) return null;

    return {
      ticker,
      price: p,
      marketCap: r.price?.marketCap ?? 0,
      peRatio: r.summaryDetail?.trailingPE ?? 0,
      pbRatio: r.defaultKeyStatistics?.priceToBook ?? 0,
      roe: r.financialData?.returnOnEquity ?? 0,
      der: (r.financialData?.debtToEquity ?? 0) / 100,
      dividendYield: r.summaryDetail?.dividendYield ?? 0,
      revenue: r.financialData?.totalRevenue,
      netIncome: r.defaultKeyStatistics?.netIncomeToCommon,
    };
  } catch {
    return null;
  }
}
