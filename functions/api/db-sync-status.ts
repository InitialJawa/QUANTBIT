interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env } = context;
  try {
    const row = await env.DB.prepare("SELECT MAX(date) as latest FROM market_daily").first<any>();
    const latestDate = row?.latest || null;
    const stale = latestDate
      ? (Date.now() - new Date(latestDate + "T23:59:59+07:00").getTime()) > 86400000 * 2
      : true;

    return Response.json({ success: true, latestDate, stale, source: "D1" });
  } catch {
    return Response.json({ success: true, latestDate: null, stale: true, source: "D1" });
  }
};
