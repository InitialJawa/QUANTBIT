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
      "SELECT ticker,shares,buy_price,added_at FROM portfolios WHERE user_id=? ORDER BY added_at"
    ).bind(email).all<any>();
    return Response.json({ success: true, portfolio: rows.results });
  }

  if (request.method === "POST") {
    const body = await request.json() as { ticker?: string; shares?: number; price?: number };
    if (!body.ticker || body.shares === undefined || body.price === undefined) {
      return Response.json({ error: "ticker, shares, price required" }, { status: 400 });
    }
    const ticker = body.ticker.toUpperCase();
    const existing = await env.DB.prepare(
      "SELECT shares,buy_price FROM portfolios WHERE user_id=? AND ticker=?"
    ).bind(email, ticker).first<any>();

    if (existing) {
      const totalShares = existing.shares + body.shares;
      const avgPrice = ((existing.shares * existing.buy_price) + (body.shares * body.price)) / totalShares;
      await env.DB.prepare(
        "UPDATE portfolios SET shares=?,buy_price=?,updated_at=datetime('now') WHERE user_id=? AND ticker=?"
      ).bind(totalShares, avgPrice, email, ticker).run();
    } else {
      await env.DB.prepare(
        "INSERT INTO portfolios (id,user_id,ticker,shares,buy_price) VALUES (?,?,?,?,?)"
      ).bind(crypto.randomUUID(), email, ticker, body.shares, body.price).run();
    }

    return Response.json({ success: true });
  }

  if (request.method === "DELETE") {
    const body = await request.json() as { ticker?: string; shares?: number };
    if (!body.ticker) {
      return Response.json({ error: "ticker required" }, { status: 400 });
    }
    const ticker = body.ticker.toUpperCase();

    if (body.shares !== undefined) {
      const existing = await env.DB.prepare(
        "SELECT shares FROM portfolios WHERE user_id=? AND ticker=?"
      ).bind(email, ticker).first<any>();
      if (existing) {
        const remaining = existing.shares - body.shares;
        if (remaining <= 0) {
          await env.DB.prepare("DELETE FROM portfolios WHERE user_id=? AND ticker=?").bind(email, ticker).run();
        } else {
          await env.DB.prepare("UPDATE portfolios SET shares=?,updated_at=datetime('now') WHERE user_id=? AND ticker=?").bind(remaining, email, ticker).run();
        }
      }
    } else {
      await env.DB.prepare("DELETE FROM portfolios WHERE user_id=? AND ticker=?").bind(email, ticker).run();
    }

    return Response.json({ success: true });
  }

  return Response.json({ error: "Method not allowed" }, { status: 405 });
};
