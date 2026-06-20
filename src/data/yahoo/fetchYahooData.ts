import yahooFinance from "yahoo-finance2";

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
    const quote = await yahooFinance.quote(ticker + ".JK", {
      modules: [
        "price",
        "summaryDetail",
        "financialData",
        "defaultKeyStatistics",
      ],
    });

    const price = quote.price?.regularMarketPrice ?? 0;
    const marketCap = quote.price?.marketCap ?? 0;
    const peRatio = quote.summaryDetail?.trailingPE ?? 0;
    const pbRatio = quote.defaultKeyStatistics?.priceToBook ?? 0;
    const roeRaw = quote.financialData?.returnOnEquity?.raw;
    const roe = typeof roeRaw === "number" ? roeRaw * 100 : 0;
    const der = quote.financialData?.debtToEquity?.raw ?? 0;
    const dividendYield = quote.summaryDetail?.dividendYield?.raw ?? 0;
    const revenue = quote.financialData?.totalRevenue?.raw;
    const netIncome = quote.financialData?.netIncome?.raw;

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
