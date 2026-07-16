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
    const isLight = url.searchParams.has("light");

    const marketRows = await env.DB.prepare(
      "SELECT date,ihsg_close,gold_close,usdidr_rate FROM market_daily WHERE date >= ? AND date <= ? ORDER BY date"
    ).bind(`${yearStart}-01-01`, `${yearEnd}-12-31`).all<any>();

    if (marketRows.results.length === 0) {
      return Response.json({ success: false, error: "No historical data available" }, { status: 503 });
    }

    if (isLight) {
      const data = marketRows.results.map((m: any) => ({
        date: m.date, ihsgPrice: m.ihsg_close, goldPrice: m.gold_close, usdidrRate: m.usdidr_rate,
      }));
      return Response.json({ success: true, count: data.length, configType, data });
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

    const allScoreRows = await env.DB.prepare(
      "SELECT score_date, ticker, quality, growth, value, dividend, momentum FROM stock_scores ORDER BY score_date, ticker"
    ).all<any>();

    const scoresByDate: Record<string, Record<string, any>> = {};
    for (const sr of allScoreRows.results) {
      if (!scoresByDate[sr.score_date]) scoresByDate[sr.score_date] = {};
      scoresByDate[sr.score_date][sr.ticker] = {
        quality: sr.quality ?? 50,
        growth: sr.growth ?? 50,
        value: sr.value ?? 50,
        momentum: sr.momentum ?? 50,
        dividend: sr.dividend ?? 50,
      };
    }
    const scoreDates = Object.keys(scoresByDate).sort();

    const getScoresForDate = (date: string): Record<string, any> | undefined => {
      if (scoreDates.length === 0) return undefined;
      let lo = 0, hi = scoreDates.length - 1, best = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (scoreDates[mid] <= date) { best = mid; lo = mid + 1; } else hi = mid - 1;
      }
      return best >= 0 ? scoresByDate[scoreDates[best]] : undefined;
    };

    const data = marketRows.results.map((m: any) => {
      const stockPrices = stockByDate[m.date] || {};
      const stockAdj = stockAdjByDate[m.date] || {};
      const dayScores = getScoresForDate(m.date);

      return {
        date: m.date,
        ihsgPrice: m.ihsg_close,
        goldPrice: m.gold_close,
        usdidrRate: m.usdidr_rate,
        stockAdjPrices: stockAdj,
        stockPrices,
        stockNormScores: dayScores && Object.keys(dayScores).length > 0 ? dayScores : undefined,
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
      prod: { quality: 0.45, growth: 0.1, value: 0.05, momentum: 0.40, dividend: 0 },
      res: { quality: 0.40, growth: 0.25, value: 0.05, momentum: 0.30, dividend: 0 },
    };

    return Response.json({ success: true, count: data.length, configType, weights: defaultWeights, data });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
};
