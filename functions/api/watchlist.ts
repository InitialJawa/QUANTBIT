interface Env {
  DB: D1Database;
}

function getUserEmail(request: Request): string | null {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token.startsWith("qb_")) return null;
  return token.split("_")[1] || null;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const email = getUserEmail(request);
  if (!email) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (request.method === "GET") {
    const rows = await env.DB.prepare(
      "SELECT ticker,added_at FROM watchlists WHERE user_id=? ORDER BY added_at"
    ).bind(email).all<any>();
    return Response.json({ success: true, watchlist: rows.results });
  }

  if (request.method === "POST") {
    const body = await request.json() as { ticker?: string };
    if (!body.ticker) {
      return Response.json({ error: "ticker required" }, { status: 400 });
    }
    await env.DB.prepare(
      "INSERT OR IGNORE INTO watchlists (user_id,ticker) VALUES (?,?)"
    ).bind(email, body.ticker.toUpperCase()).run();
    return Response.json({ success: true });
  }

  if (request.method === "DELETE") {
    const body = await request.json() as { ticker?: string };
    if (!body.ticker) {
      return Response.json({ error: "ticker required" }, { status: 400 });
    }
    await env.DB.prepare(
      "DELETE FROM watchlists WHERE user_id=? AND ticker=?"
    ).bind(email, body.ticker.toUpperCase()).run();
    return Response.json({ success: true });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};
