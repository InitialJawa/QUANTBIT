interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request } = context;

  if (request.method !== "POST") {
    return Response.json({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  // Trigger GitHub Actions workflow dispatch via API
  // Requires GITHUB_TOKEN env var set in Cloudflare Pages dashboard
  if (!context.env.GITHUB_TOKEN) {
    return Response.json({ success: false, error: "GITHUB_TOKEN not configured in CF Pages env" }, { status: 501 });
  }
  try {
    const resp = await fetch(
      "https://api.github.com/repos/InitialJawa/QUANTBIT/actions/workflows/pipeline.yml/dispatches",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${context.env.GITHUB_TOKEN}`,
          "Accept": "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      }
    );

    if (resp.ok) {
      return Response.json({ success: true, message: "Pipeline triggered on GitHub" });
    }
    return Response.json({ success: false, error: `GitHub API returned ${resp.status}` }, { status: 502 });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 502 });
  }
};
