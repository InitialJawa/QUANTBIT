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
      "SELECT * FROM trade_logs WHERE user_id=? ORDER BY executed_at DESC LIMIT 200"
    ).bind(email).all<any>();
    return Response.json({ success: true, logs: rows.results });
  }

  if (request.method === "POST") {
    const body = await request.json() as { ticker?: string; action?: string; shares?: number; price?: number; total?: number };
    if (!body.ticker || !body.action || body.price === undefined) {
      return Response.json({ error: "ticker, action, price required" }, { status: 400 });
    }
    const total = body.total ?? ((body.shares ?? 0) * body.price);
    await env.DB.prepare(
      "INSERT INTO trade_logs (id,user_id,ticker,action,shares,price,total) VALUES (?,?,?,?,?,?,?)"
    ).bind(crypto.randomUUID(), email, body.ticker.toUpperCase(), body.action, body.shares ?? null, body.price, total).run();
    return Response.json({ success: true });
  }

  if (request.method === "DELETE") {
    const body = await request.json() as { id?: string };
    if (body.id) {
      await env.DB.prepare("DELETE FROM trade_logs WHERE id=? AND user_id=?").bind(body.id, email).run();
    } else {
      await env.DB.prepare("DELETE FROM trade_logs WHERE user_id=?").bind(email).run();
    }
    return Response.json({ success: true });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};
