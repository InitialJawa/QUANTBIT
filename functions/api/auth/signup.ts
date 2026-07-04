interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const body = await request.json() as { email?: string; password?: string; name?: string };
  const email = body?.email || "demo@quantbit.local";
  const name = body?.name || email.split("@")[0];

  await env.DB.prepare("INSERT INTO user_profiles (id,display_name,theme) VALUES (?,?,?)").bind(email, name, "terminal").run();

  const session = `qb_${email}_${Date.now()}`;

  return Response.json({
    user: { id: email, email, name, cash: 100000000, theme: "dark", data_feed: "yahoo", active_config: "aman" },
    session,
  });
};
