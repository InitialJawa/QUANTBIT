interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env } = context;
  try {
    const rows = await env.DB.prepare(
      "SELECT s.ticker,s.quality,s.growth,s.value,s.dividend,s.momentum,t.sector,t.industry,t.name FROM stock_scores s LEFT JOIN tickers t ON s.ticker=t.ticker WHERE s.score_date=(SELECT MAX(score_date) FROM stock_scores) ORDER BY s.ticker"
    ).all<any>();

    const stocks = rows.results.map((r: any) => ({
      ticker: r.ticker + ".JK",
      quality: r.quality ?? 50,
      growth: r.growth ?? 50,
      value: r.value ?? 50,
      momentum: r.momentum ?? 50,
      dividend: r.dividend ?? 50,
      currentPrice: 0,
      changePercent: 0,
      companyName: r.name || r.ticker,
      sector: r.sector,
      industry: r.industry,
    }));

    return Response.json({ success: true, stocks, lastUpdated: new Date().toISOString() });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
};
