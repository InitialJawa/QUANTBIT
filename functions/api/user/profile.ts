interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  if (request.method !== "PATCH") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");
  if (!token.startsWith("qb_")) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const email = token.split("_")[1];
  if (!email) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  const body = await request.json() as { cash?: number; theme?: string; dataFeed?: string; activeConfig?: string };

  const updates: string[] = [];
  const values: any[] = [];

  if (body.cash !== undefined) { updates.push("cash=?"); values.push(body.cash); }
  if (body.theme !== undefined) { updates.push("theme=?"); values.push(body.theme); }
  if (body.dataFeed !== undefined) { updates.push("data_feed=?"); values.push(body.dataFeed); }
  if (body.activeConfig !== undefined) { updates.push("active_config=?"); values.push(body.activeConfig); }

  if (updates.length === 0) {
    return Response.json({ success: false, error: "No fields to update" }, { status: 400 });
  }

  updates.push("updated_at=datetime('now')");
  values.push(email);

  await env.DB.prepare(`UPDATE users SET ${updates.join(",")} WHERE id=?`).bind(...values).run();

  return Response.json({ success: true });
};
