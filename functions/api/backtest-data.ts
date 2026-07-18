interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  try {
    const url = new URL(request.url);
    const rawConfigType = (url.searchParams.get("configType") || "prod").toLowerCase();
    const configType = (rawConfigType === "res" || rawConfigType === "agresif" || rawConfigType === "growth-heavy") ? "res" : "prod";
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
      "SELECT date,ticker,close,adj_close,volume FROM stock_daily WHERE date >= (SELECT MIN(date) FROM market_daily) ORDER BY date,ticker"
    ).all<any>();

    const stockByDate: Record<string, Record<string, number>> = {};
    const stockAdjByDate: Record<string, Record<string, number>> = {};
    const stockVolByDate: Record<string, Record<string, number>> = {};
    for (const sr of stockRows.results) {
      if (!stockByDate[sr.date]) stockByDate[sr.date] = {};
      stockByDate[sr.date][sr.ticker] = sr.close;
      if (!stockAdjByDate[sr.date]) stockAdjByDate[sr.date] = {};
      stockAdjByDate[sr.date][sr.ticker] = sr.adj_close ?? sr.close;
      if (sr.volume && sr.volume > 0) {
        if (!stockVolByDate[sr.date]) stockVolByDate[sr.date] = {};
        stockVolByDate[sr.date][sr.ticker] = sr.volume;
      }
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

    const data = marketRows.results.map((m: any) => {
      const stockPrices = stockByDate[m.date] || {};
      const stockAdj = stockAdjByDate[m.date] || {};
      const stockVol = stockVolByDate[m.date] || {};

      return {
        date: m.date,
        ihsgPrice: m.ihsg_close,
        goldPrice: m.gold_close,
        usdidrRate: m.usdidr_rate,
        stockAdjPrices: stockAdj,
        stockPrices,
        stockVolumes: stockVol,
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

    // Build historical dividend DPS lookup: { ticker: { year: dps } }
    // Source: idx80_scans historical dividend_yield × stock_daily close
    const scanDataRows = await env.DB.prepare(
      "SELECT ticker, scan_date, dividend_yield FROM idx80_scans WHERE dividend_yield > 0 ORDER BY scan_date"
    ).all<any>();

    // Get latest close price per ticker per year for DPS calculation
    const yearlyPriceRows = await env.DB.prepare(
      "SELECT ticker, substr(date, 1, 4) as year, close FROM stock_daily WHERE date IN (SELECT MAX(date) FROM stock_daily GROUP BY ticker, substr(date, 1, 4)) ORDER BY ticker, year"
    ).all<any>();

    // Build year→close map per ticker
    const yearlyPriceMap: Record<string, Record<string, number>> = {};
    for (const yr of yearlyPriceRows.results) {
      if (!yearlyPriceMap[yr.ticker]) yearlyPriceMap[yr.ticker] = {};
      yearlyPriceMap[yr.ticker][yr.year] = yr.close;
    }

    // For each scan_date, compute DPS = (dividend_yield/100) * close_price
    // Aggregate by year: use latest scan per year as representative
    const dividendLookup: Record<string, Record<string, number>> = {};
    for (const sd of scanDataRows.results) {
      const year = sd.scan_date.slice(0, 4);
      const ticker = sd.ticker;
      const close = yearlyPriceMap[ticker]?.[year] ?? 0;
      if (close > 0 && sd.dividend_yield > 0) {
        const dps = (sd.dividend_yield / 100) * close;
        if (dps > 0) {
          if (!dividendLookup[ticker]) dividendLookup[ticker] = {};
          // Use latest scan per year (overwrites earlier scans)
          dividendLookup[ticker][year] = Math.round(dps * 100) / 100;
        }
      }
    }

    const defaultWeights = {
      prod: { quality: 0.45, growth: 0.1, value: 0.05, momentum: 0.40, dividend: 0 },
      res: { quality: 0.40, growth: 0.25, value: 0.05, momentum: 0.30, dividend: 0 },
    };

    return Response.json({ success: true, count: data.length, configType, weights: defaultWeights, data, scoreLookup: { dates: scoreDates, byDate: scoresByDate }, dividendLookup });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
};
