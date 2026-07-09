interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  const rawTicker = url.searchParams.get("ticker")?.toUpperCase();
  if (!rawTicker) {
    return Response.json({ success: false, error: "Missing ticker param" }, { status: 400 });
  }
  const dbTicker = rawTicker.replace(".JK", "");

  try {
    const rows = await env.DB.prepare(
      `SELECT ticker, date, sector, industry, rotation_label, rotation_status,
              quality_score, growth_score, momentum_score
       FROM rotation_history
       WHERE ticker = ?
       ORDER BY date DESC
       LIMIT 30`
    ).bind(dbTicker).all<any>();

    const appendJK = (r: any) => r ? { ...r, ticker: r.ticker + ".JK" } : null;
    const current = rows.results[0] ? appendJK(rows.results[0]) : null;
    const history = rows.results.map(appendJK);

    return Response.json({
      success: true,
      ticker: rawTicker,
      current,
      history,
      latestDate: current?.date || null,
    });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
};
