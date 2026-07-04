interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  try {
    const url = new URL(request.url);
    const configType = url.searchParams.get("configType") === "res" ? "res" : "prod";
    const yearStart = parseInt(url.searchParams.get("from") as string) || 2021;
    const yearEnd = parseInt(url.searchParams.get("to") as string) || 2026;

    const marketRows = await env.DB.prepare(
      "SELECT date,ihsg_close,gold_close,usdidr_rate FROM market_daily WHERE date >= ? AND date <= ? ORDER BY date"
    ).bind(`${yearStart}-01-01`, `${yearEnd}-12-31`).all<any>();

    if (marketRows.results.length === 0) {
      return Response.json({ success: false, error: "No historical data available" }, { status: 503 });
    }

    const stockRows = await env.DB.prepare(
      "SELECT date,ticker,close,adj_close FROM stock_daily WHERE date >= (SELECT MIN(date) FROM market_daily) ORDER BY date,ticker"
    ).all<any>();

    const stockByDate: Record<string, Record<string, number>> = {};
    const stockAdjByDate: Record<string, Record<string, number>> = {};
    for (const sr of stockRows.results) {
      if (!stockByDate[sr.date]) stockByDate[sr.date] = {};
      stockByDate[sr.date][sr.ticker] = sr.close;
      if (!stockAdjByDate[sr.date]) stockAdjByDate[sr.date] = {};
      stockAdjByDate[sr.date][sr.ticker] = sr.adj_close ?? sr.close;
    }

    const scoreDateRow = await env.DB.prepare("SELECT MAX(score_date) as sd FROM stock_scores").first<any>();
    let scoreMap: Record<string, any> = {};
    if (scoreDateRow?.sd) {
      const scoreRows = await env.DB.prepare("SELECT ticker,quality,growth,value,dividend,momentum FROM stock_scores WHERE score_date=?").bind(scoreDateRow.sd).all<any>();
      for (const sr of scoreRows.results) {
        scoreMap[sr.ticker] = sr;
      }
    }

    const data = marketRows.results.map((m: any) => {
      const stockPrices = stockByDate[m.date] || {};
      const stockAdj = stockAdjByDate[m.date] || {};
      const stockNormScores: Record<string, any> = {};
      for (const [tkr, close] of Object.entries(stockAdj)) {
        const sc = scoreMap[tkr];
        if (sc) {
          stockNormScores[tkr + ".JK"] = {
            quality: sc.quality ?? 50,
            growth: sc.growth ?? 50,
            value: sc.value ?? 50,
            momentum: sc.momentum ?? 50,
            dividend: sc.dividend ?? 50,
          };
        }
      }

      return {
        date: m.date,
        ihsgPrice: m.ihsg_close,
        goldPrice: m.gold_close,
        usdidrRate: m.usdidr_rate,
        stockAdjPrices: stockAdj,
        stockPrices,
        stockNormScores: Object.keys(stockNormScores).length > 0 ? stockNormScores : undefined,
      };
    });

    const last = data[data.length - 1];
    const lastDate = new Date(last.date);
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const todayStr = now.toISOString().slice(0, 10);
    if (last.date < todayStr) {
      const curr = new Date(lastDate.getTime() + 86400000);
      while (curr <= now) {
        const dow = curr.getDay();
        if (dow !== 0 && dow !== 6) {
          const ds = curr.toISOString().slice(0, 10);
          if (ds <= todayStr) data.push({ ...last, date: ds, isCarriedForward: true } as any);
        }
        curr.setDate(curr.getDate() + 1);
      }
    }

    const defaultWeights = {
      prod: { quality: 0.45, growth: 0.1, value: 0.05, momentum: 0.40 },
      res: { quality: 0.40, growth: 0.25, value: 0.05, momentum: 0.30 },
    };

    return Response.json({ success: true, count: data.length, configType, weights: defaultWeights, data });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
};
