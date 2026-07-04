interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env } = context;
  try {
    const rows = await env.DB.prepare(
      "SELECT ticker,name,sector,industry,is_idx80 FROM tickers WHERE is_active=1 ORDER BY ticker"
    ).all<any>();

    const profiles: Record<string, any> = {};
    for (const r of rows.results) {
      profiles[r.ticker] = { name: r.name, sector: r.sector, industry: r.industry };
    }

    return Response.json({ success: true, data: profiles, count: Object.keys(profiles).length });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
};
