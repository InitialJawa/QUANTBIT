interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env } = context;
  try {
    const rows = await env.DB.prepare(
      "SELECT ticker,quality,growth,value,dividend,momentum,score_date FROM stock_scores WHERE score_date=(SELECT MAX(score_date) FROM stock_scores) ORDER BY ticker"
    ).all<any>();

    const stocks = rows.results.map((r: any, i: number) => ({
      rank: String(i + 1),
      ticker: r.ticker + ".JK",
      quality: String(r.quality ?? 50),
      growth: String(r.growth ?? 50),
      value: String(r.value ?? 50),
      momentum: String(r.momentum ?? 50),
      dividend: String(r.dividend ?? 50),
      final_score: String(Math.round(
        (r.quality ?? 50) * 0.25 + (r.growth ?? 50) * 0.25 + (r.value ?? 50) * 0.25 + (r.momentum ?? 50) * 0.25
      )),
    }));

    return Response.json({ success: true, count: stocks.length, stocks, lastUpdated: rows.results[0]?.score_date || null });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
};
