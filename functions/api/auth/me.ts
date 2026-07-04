interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace("Bearer ", "");

  if (!token.startsWith("qb_")) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const email = token.split("_")[1];
  if (!email) {
    return Response.json({ error: "Invalid session" }, { status: 401 });
  }

  const user = await env.DB.prepare("SELECT id,display_name,theme FROM user_profiles WHERE id=?").bind(email).first<any>();
  if (!user) {
    return Response.json({ error: "User not found" }, { status: 401 });
  }

  return Response.json({
    user: { id: user.id, email: user.id, name: user.display_name, cash: 100000000, theme: user.theme || "dark", data_feed: "yahoo", active_config: "aman" },
  });
};
