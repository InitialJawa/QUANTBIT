interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  const rawTicker = url.searchParams.get("ticker")?.toUpperCase();

  try {
    if (rawTicker) {
      const dbTicker = rawTicker.replace(".JK", "");
      const rows = await env.DB.prepare(
        "SELECT ticker, date, signal_tier, signal_label, signal_reason FROM signal_history WHERE ticker = ? ORDER BY date DESC LIMIT 30"
      ).bind(dbTicker).all<any>();

      const signals = rows.results.map((r: any) => ({ ...r, ticker: r.ticker + ".JK" }));

      return Response.json({
        success: true,
        ticker: rawTicker,
        signals,
        latestDate: rows.results[0]?.date || null,
      });
    }

    // All tickers — latest date only
    const latestDateRow = await env.DB.prepare(
      "SELECT MAX(date) as max_date FROM signal_history"
    ).first<any>();
    const latestDate = latestDateRow?.max_date;

    if (!latestDate) {
      return Response.json({ success: true, signals: [], latestDate: null });
    }

    const rows = await env.DB.prepare(
      "SELECT ticker, date, signal_tier, signal_label, signal_reason FROM signal_history WHERE date = ? ORDER BY signal_tier DESC"
    ).bind(latestDate).all<any>();

    const signals = rows.results.map((r: any) => ({ ...r, ticker: r.ticker + ".JK" }));

    return Response.json({
      success: true,
      signals,
      latestDate,
    });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
};
