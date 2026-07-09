interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  const url = new URL(request.url);
  const rawTicker = url.searchParams.get("ticker")?.toUpperCase();
  if (!rawTicker) {
    return Response.json({ success: false, error: "Missing ticker param" }, { status: 400 });
  }
  const dbTicker = rawTicker.replace(".JK", "");

  try {
    // Get sector of requested ticker
    const sectorRow = await env.DB.prepare(
      "SELECT sector FROM tickers WHERE ticker = ?"
    ).bind(dbTicker).first<any>();

    if (!sectorRow?.sector) {
      return Response.json({ success: false, error: "Ticker not found" });
    }

    const sector = sectorRow.sector;
    const latestScore = await env.DB.prepare(
      "SELECT MAX(score_date) as max_date FROM stock_scores"
    ).first<any>();
    const scoreDate = latestScore?.max_date;

    if (!scoreDate) {
      return Response.json({ success: false, error: "No scores available" });
    }

    // Fetch peers in same sector with scores
    const rows = await env.DB.prepare(
      `SELECT s.ticker, s.quality, s.growth, s.value, s.momentum, s.dividend,
              t.name, t.sector, t.industry
       FROM stock_scores s
       JOIN tickers t ON s.ticker = t.ticker
       WHERE t.sector = ? AND s.score_date = ?
       ORDER BY ((s.quality * 0.25) + (s.growth * 0.30) + (s.value * 0.10) + (s.momentum * 0.35) + (s.dividend * 0.00)) DESC`
    ).bind(sector, scoreDate).all<any>();

    const peers = rows.results.map((r: any, i: number) => ({
      rank: i + 1,
      ticker: r.ticker + ".JK",
      name: r.name,
      sector: r.sector,
      industry: r.industry,
      quality: Math.round(r.quality ?? 50),
      growth: Math.round(r.growth ?? 50),
      value: Math.round(r.value ?? 50),
      momentum: Math.round(r.momentum ?? 50),
      dividend: Math.round(r.dividend ?? 50),
      totalScore: Math.round(
        (r.quality ?? 50) * 0.25 +
        (r.growth ?? 50) * 0.30 +
        (r.value ?? 50) * 0.10 +
        (r.momentum ?? 50) * 0.35
      ),
    }));

    // Current ticker position
    const currentIndex = peers.findIndex((p) => p.ticker === rawTicker);
    const currentPeer = currentIndex >= 0 ? peers[currentIndex] : null;

    // Sector averages
    const n = peers.length;
    const sectorAverages = n > 0 ? {
      quality: Math.round(peers.reduce((s, p) => s + p.quality, 0) / n),
      growth: Math.round(peers.reduce((s, p) => s + p.growth, 0) / n),
      value: Math.round(peers.reduce((s, p) => s + p.value, 0) / n),
      momentum: Math.round(peers.reduce((s, p) => s + p.momentum, 0) / n),
      dividend: Math.round(peers.reduce((s, p) => s + p.dividend, 0) / n),
      totalScore: Math.round(peers.reduce((s, p) => s + p.totalScore, 0) / n),
    } : null;

    return Response.json({
      success: true,
      sector,
      scoreDate,
      peerCount: peers.length,
      currentTicker: rawTicker,
      currentRank: currentIndex >= 0 ? currentIndex + 1 : null,
      currentPeer,
      sectorAverages,
      peers,
    });
  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
};
