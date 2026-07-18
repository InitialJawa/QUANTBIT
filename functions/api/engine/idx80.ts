interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env } = context;
  try {
    const rows = await env.DB.prepare(
      "SELECT s.ticker,s.quality,s.growth,s.value,s.dividend,s.momentum,t.sector,t.industry,t.name FROM stock_scores s LEFT JOIN tickers t ON s.ticker=t.ticker WHERE s.score_date=(SELECT MAX(score_date) FROM stock_scores) ORDER BY s.ticker"
    ).all<any>();

    // Fetch latest close price per ticker from stock_daily
    const priceRows = await env.DB.prepare(
      "SELECT sd.ticker, sd.close, sd.date FROM stock_daily sd INNER JOIN (SELECT ticker, MAX(date) AS max_date FROM stock_daily GROUP BY ticker) latest ON sd.ticker = latest.ticker AND sd.date = latest.max_date"
    ).all<any>();

    // Build price lookup: ticker → { close, date }
    const priceMap: Record<string, { close: number; date: string }> = {};
    for (const pr of priceRows.results) {
      priceMap[pr.ticker] = { close: pr.close, date: pr.date };
    }

    // Fetch previous day close for changePercent calculation
    const prevPriceRows = await env.DB.prepare(
      "SELECT sd.ticker, sd.close, sd.date FROM stock_daily sd INNER JOIN (SELECT ticker, MAX(date) AS max_date FROM stock_daily WHERE date < (SELECT MAX(date) FROM stock_daily) GROUP BY ticker) prev ON sd.ticker = prev.ticker AND sd.date = prev.max_date"
    ).all<any>();

    const prevPriceMap: Record<string, number> = {};
    for (const pr of prevPriceRows.results) {
      prevPriceMap[pr.ticker] = pr.close;
    }

    // Fetch latest idx80_scans data for dividendYield and volume
    const scanRows = await env.DB.prepare(
      "SELECT ticker, dividend_yield, volume, pe_ratio, pb_ratio, week_52_high, week_52_low, market_cap FROM idx80_scans WHERE scan_date=(SELECT MAX(scan_date) FROM idx80_scans) ORDER BY ticker"
    ).all<any>();

    const scanMap: Record<string, any> = {};
    for (const sr of scanRows.results) {
      scanMap[sr.ticker] = sr;
    }

    const stocks = rows.results.map((r: any) => {
      const price = priceMap[r.ticker];
      const currentPrice = price?.close ?? 0;
      const prevClose = prevPriceMap[r.ticker] ?? 0;
      const changePercent = prevClose > 0 ? ((currentPrice - prevClose) / prevClose) * 100 : 0;
      const scan = scanMap[r.ticker];

      return {
        ticker: r.ticker + ".JK",
        quality: r.quality ?? 50,
        growth: r.growth ?? 50,
        value: r.value ?? 50,
        momentum: r.momentum ?? 50,
        dividend: r.dividend ?? 50,
        currentPrice,
        changePercent: Math.round(changePercent * 100) / 100,
        companyName: r.name || r.ticker,
        sector: r.sector,
        industry: r.industry,
        volume: scan?.volume ?? 0,
        dividendYield: scan?.dividend_yield ?? 0,
        peRatio: scan?.pe_ratio ?? 0,
        pbRatio: scan?.pb_ratio ?? 0,
        week52High: scan?.week_52_high ?? 0,
        week52Low: scan?.week_52_low ?? 0,
        marketCap: scan?.market_cap ?? 0,
      };
    });

    return Response.json({ success: true, stocks, lastUpdated: new Date().toISOString() });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
};
