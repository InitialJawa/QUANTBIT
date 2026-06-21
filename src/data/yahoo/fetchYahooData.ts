import YahooFinance from "yahoo-finance2";

// yahoo-finance2 v3 exports a class that must be instantiated.
const yahooFinance = new YahooFinance();

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

/**
 * Fetch complete quote data for an Indonesian ticker (without the ".JK" suffix).
 * Returns null on failure so callers can fall back to synthetic data.
 */
export async function fetchYahooData(ticker: string): Promise<YahooStock | null> {
  try {
    const summary = await yahooFinance.quoteSummary(ticker + ".JK", {
      modules: [
        "price",
        "summaryDetail",
        "financialData",
        "defaultKeyStatistics",
      ],
    });

    // yahoo-finance2 normalizes numeric fields to plain numbers (no `.raw` wrapper).
    const price = summary.price?.regularMarketPrice ?? 0;
    const marketCap = summary.price?.marketCap ?? 0;
    const peRatio = summary.summaryDetail?.trailingPE ?? 0;
    const pbRatio = summary.defaultKeyStatistics?.priceToBook ?? 0;
    const roeRaw = summary.financialData?.returnOnEquity;
    const roe = typeof roeRaw === "number" ? roeRaw * 100 : 0;
    const der = summary.financialData?.debtToEquity ?? 0;
    const dividendYield = summary.summaryDetail?.dividendYield ?? 0;
    const revenue = summary.financialData?.totalRevenue;
    const netIncome = summary.defaultKeyStatistics?.netIncomeToCommon;

    return {
      ticker,
      price,
      marketCap,
      peRatio,
      pbRatio,
      roe,
      der,
      dividendYield,
      revenue,
      netIncome,
    };
  } catch (e) {
    console.warn(`Yahoo fetch failed for ${ticker}:`, e);
    return null;
  }
}
