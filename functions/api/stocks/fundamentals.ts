interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env } = context;
  try {
    const rows = await env.DB.prepare(
      "SELECT s.ticker,s.quality,s.growth,s.value,s.dividend,s.momentum,t.sector,t.industry FROM stock_scores s LEFT JOIN tickers t ON s.ticker=t.ticker WHERE s.score_date=(SELECT MAX(score_date) FROM stock_scores) ORDER BY s.ticker"
    ).all<any>();

    const data: Record<string, any> = {};
    for (const r of rows.results) {
      data[r.ticker + ".JK"] = {
        roe: null, net_margin: null, operating_margin: null,
        debt_to_equity: null, free_cash_flow: null,
        pe_ratio: null, pb_ratio: null, dividend_yield: null,
        roa: null, market_cap: null, revenue_growth: null, earnings_growth: null,
        quality_score: r.quality, growth_score: r.growth,
        value_score: r.value, momentum_score: r.momentum, dividend_score: r.dividend,
        sector: r.sector, industry: r.industry,
      };
    }

    return Response.json({ success: true, data, count: Object.keys(data).length });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
};
