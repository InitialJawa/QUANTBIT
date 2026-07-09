interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  const ticker = url.searchParams.get("ticker")?.toUpperCase();

  if (!ticker) {
    return Response.json({ success: false, error: "Missing ticker param" }, { status: 400 });
  }

  try {
    const rows = await env.DB.prepare(
      `SELECT ticker, date, sector, industry, rotation_label, rotation_status,
              quality_score, growth_score, momentum_score
       FROM rotation_history
       WHERE ticker = ?
       ORDER BY date DESC
       LIMIT 30`
    ).bind(ticker).all<any>();

    const current = rows.results[0] || null;
    const history = rows.results;

    return Response.json({
      success: true,
      ticker,
      current,
      history,
      latestDate: current?.date || null,
    });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
};
