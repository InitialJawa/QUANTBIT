interface Env {
  DB: D1Database;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env } = context;
  const prices: Record<string, { close: number; change: number; pct: number }> = {};

  try {
    const tickers = ["BBCA.JK","BBRI.JK","BMRI.JK","TLKM.JK","ASII.JK","ADRO.JK","PTBA.JK","ESSA.JK","GOTO.JK","^JKSE","USDIDR=X","GC=F"];
    const resp = await fetch(`https://query1.finance.yahoo.com/v8/finance/spark?symbols=${tickers.join(",")}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Accept: "application/json" },
    });

    if (resp.ok) {
      const apiRes: any = await resp.json();
      for (const [symRaw, item] of Object.entries(apiRes)) {
        let sym = (symRaw as string).split(".")[0];
        if (symRaw === "^JKSE") sym = "IHSG";
        if (symRaw === "USDIDR=X") sym = "USDIDR";
        if (symRaw === "GC=F") sym = "GOLD";
        const d = item as any;
        if (d?.close?.length) {
          const closes = d.close.filter((c: any) => typeof c === "number");
          const lc = closes[closes.length - 1];
          const prev = d.previousClose || lc || 1;
          prices[sym] = { close: Number(lc || 0), change: Number((lc || 0) - prev), pct: Number(((lc || 0) - prev) / prev * 100) };
        }
      }
    }

    if (Object.keys(prices).length > 0) {
      return Response.json({ success: true, prices, source: "Yahoo Finance (Live)" });
    }
  } catch {
    // fall through to D1 fallback
  }

  // D1 fallback: return last market_daily row as static prices
  try {
    const lastRow = await env.DB.prepare("SELECT ihsg_close,gold_close,usdidr_rate FROM market_daily ORDER BY date DESC LIMIT 1").first<any>();
    if (lastRow) {
      return Response.json({
        success: true,
        prices: {
          IHSG: { close: lastRow.ihsg_close, change: 0, pct: 0 },
          USDIDR: { close: lastRow.usdidr_rate, change: 0, pct: 0 },
          GOLD: { close: lastRow.gold_close, change: 0, pct: 0 },
        },
        source: "D1 (Yahoo offline)",
      });
    }
  } catch {}

  return Response.json({ success: false, error: "Yahoo offline, no D1 fallback available" }, { status: 503 });
};
