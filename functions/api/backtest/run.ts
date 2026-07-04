interface Env {
  DB: D1Database;
}

interface StrategyConfig {
  weights: { quality: number; growth: number; value: number; momentum: number; dividend: number };
  topN: number;
  rebalanceFreq: "weekly" | "monthly" | "quarterly";
  crashProtection: boolean;
  dcaActive: boolean;
  dcaAmount: number;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { env, request } = context;
  if (request.method !== "POST") {
    return Response.json({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body: { tickers?: string[]; from?: string; to?: string; config?: StrategyConfig; initialCash?: number } = await request.json();
    const { from = "2021-01-01", to = "2026-12-31", initialCash = 100000000 } = body;
    const config: StrategyConfig = body.config || {
      weights: { quality: 0.45, growth: 0.1, value: 0.05, momentum: 0.40, dividend: 0 },
      topN: 5,
      rebalanceFreq: "monthly",
      crashProtection: true,
      dcaActive: false,
      dcaAmount: 0,
    };

    // Read intermediate data for selected tickers (or all idx80)
    let tickerFilter = "";
    if (body.tickers && body.tickers.length > 0) {
      const quoted = body.tickers.map((t: string) => `'${t.replace(".JK", "")}'`).join(",");
      tickerFilter = `AND i.ticker IN (${quoted})`;
    }

    const rows = await env.DB.prepare(
      `SELECT i.date,i.ticker,i.close,i.sma20,i.sma50,i.sma200,i.rsi14,i.macd,i.macd_signal,i.atr14,i.max_drawdown,i.volume,
              s.quality,s.growth,s.value,s.momentum,s.dividend
       FROM backtest_intermediate i
       LEFT JOIN stock_scores s ON i.ticker = s.ticker AND s.score_date = (SELECT MAX(score_date) FROM stock_scores)
       WHERE i.date >= ? AND i.date <= ? ${tickerFilter}
       ORDER BY i.date ASC, i.ticker ASC`
    ).bind(from, to).all<any>();

    const { weights, topN, rebalanceFreq, crashProtection, dcaActive, dcaAmount } = config;

    // Compute total score for each row
    const scored = rows.results.map((r: any) => {
      const totalScore = (r.quality ?? 50) * weights.quality +
        (r.growth ?? 50) * weights.growth +
        (r.value ?? 50) * weights.value +
        (r.momentum ?? 50) * weights.momentum +
        (r.dividend ?? 50) * weights.dividend;
      return { ...r, totalScore };
    });

    // Group by date and pick topN
    const byDate: Record<string, any[]> = {};
    for (const r of scored) {
      if (!byDate[r.date]) byDate[r.date] = [];
      byDate[r.date].push(r);
    }

    const sortedDates = Object.keys(byDate).sort();

    // Determine rebalance dates
    const rebalanceDay: Set<string> = new Set();
    if (rebalanceFreq === "weekly") {
      for (const d of sortedDates) rebalanceDay.add(d);
    } else {
      let lastRebalance = "";
      for (const d of sortedDates) {
        const dt = new Date(d);
        const period = rebalanceFreq === "monthly" ? `${dt.getFullYear()}-${dt.getMonth()}` : `${Math.floor(dt.getMonth() / 3)}-${dt.getFullYear()}`;
        if (period !== lastRebalance) { rebalanceDay.add(d); lastRebalance = period; }
      }
    }

    const trades: any[] = [];
    let cash = initialCash;
    let holdings: Record<string, number> = {};

    for (let di = 0; di < sortedDates.length; di++) {
      const date = sortedDates[di];
      const stocks = byDate[date].sort((a: any, b: any) => b.totalScore - a.totalScore);

      // Crash protection: if SMA50 < SMA200, skip buying (stay in cash)
      const isCrashed = crashProtection && stocks[0]?.sma50 != null && stocks[0]?.sma200 != null && stocks[0].sma50 < stocks[0].sma200;

      // Rebalance: sell all, buy topN
      if (rebalanceDay.has(date)) {
        // Sell all holdings (look up price from full daily list)
        const allToday = byDate[date];
        for (const tkr of Object.keys(holdings)) {
          const price = allToday.find((s: any) => s.ticker === tkr)?.close || 0;
          cash += holdings[tkr] * price;
          trades.push({ date, ticker: tkr, action: "sell", shares: holdings[tkr], price, total: holdings[tkr] * price });
        }
        holdings = {};

        // Buy topN if not crashed
        if (!isCrashed) {
          const buys = stocks.slice(0, topN).filter(s => s.close > 0);
          if (buys.length > 0) {
            const perStock = Math.floor(cash / buys.length);
            for (const s of buys) {
              if (s.close <= 0) continue;
              const shares = Math.floor(perStock / s.close);
              if (shares > 0) {
                holdings[s.ticker] = (holdings[s.ticker] || 0) + shares;
                cash -= shares * s.close;
                trades.push({ date, ticker: s.ticker, action: "buy", shares, price: s.close, total: shares * s.close });
              }
            }
          }
        }
      }

      // DCA: buy topN regardless of rebalance schedule
      if (dcaActive && dcaAmount > 0) {
        const dcaBuys = stocks.slice(0, topN).filter(s => s.close > 0);
        for (const s of dcaBuys) {
          if (cash >= dcaAmount && s.close > 0) {
            const shares = Math.floor(dcaAmount / s.close);
            if (shares > 0) {
              holdings[s.ticker] = (holdings[s.ticker] || 0) + shares;
              cash -= shares * s.close;
              trades.push({ date, ticker: s.ticker, action: "buy", shares, price: s.close, total: shares * s.close });
            }
          }
        }
      }
    }

    // Compute portfolio value at end
    const lastDate = sortedDates[sortedDates.length - 1];
    const lastStocks = byDate[lastDate] || [];
    let portfolioValue = cash;
    const positions: any[] = [];
    for (const [tkr, shares] of Object.entries(holdings)) {
      const lastPrice = lastStocks.find((s: any) => s.ticker === tkr)?.close || 0;
      portfolioValue += shares * lastPrice;
      positions.push({ ticker: tkr + ".JK", shares, lastPrice, value: shares * lastPrice });
    }

    const totalReturn = ((portfolioValue - initialCash) / initialCash) * 100;

    return Response.json({
      success: true,
      summary: {
        initialCash,
        finalValue: Math.round(portfolioValue),
        totalReturn: Math.round(totalReturn * 100) / 100,
        totalTrades: trades.length,
        positions: positions.length,
      },
      trades: trades.slice(-100), // last 100 trades for display
      positions,
    });

  } catch (e: any) {
    return Response.json({ success: false, error: e.message }, { status: 500 });
  }
};
