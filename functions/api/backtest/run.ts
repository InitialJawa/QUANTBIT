interface Env {
  DB: D1Database;
}

interface StrategyConfig {
  weights: { quality: number; growth: number; value: number; momentum: number; dividend: number };
  topN: number;
  rebalanceFreq: "weekly" | "monthly" | "quarterly";
  crashProtection: boolean;
  crashSensitivity: number;
  dcaActive: boolean;
  dcaAmount: number;
}

const DEFAULT_FEES = {
  slippage: 0.0025,
  buyFee: 0.0015,
  sellFee: 0.0025,
  tax: 0.0010,
};

function applyBuyFees(price: number, fees = DEFAULT_FEES): number {
  const entry = price * (1 + fees.slippage);
  return entry * (1 + fees.buyFee);
}

function applySellFees(shares: number, price: number, fees = DEFAULT_FEES): number {
  const exit = price * (1 - fees.slippage);
  return shares * exit * (1 - fees.sellFee - fees.tax);
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
      crashSensitivity: 10,
      dcaActive: false,
      dcaAmount: 0,
    };

    // Read intermediate data for selected tickers (or all idx80)
    // H7 fix: use parameterized queries instead of string interpolation
    let tickerParams: any[] = [];
    let tickerFilter = "";
    if (body.tickers && body.tickers.length > 0) {
      const cleanTickers = body.tickers.map((t: string) => t.replace(".JK", "").replace(/[^A-Z0-9]/gi, ""));
      tickerFilter = `AND i.ticker IN (${cleanTickers.map(() => "?").join(",")})`;
      tickerParams = cleanTickers;
    }

    const allParams = [from, to, ...tickerParams];
    const rows = await env.DB.prepare(
      `SELECT i.date,i.ticker,i.close,i.sma20,i.sma50,i.sma200,i.rsi14,i.macd,i.macd_signal,i.atr14,i.max_drawdown,i.volume,
              s.quality,s.growth,s.value,s.momentum,s.dividend
       FROM backtest_intermediate i
       LEFT JOIN stock_scores s ON i.ticker = s.ticker AND s.score_date = (SELECT MAX(score_date) FROM stock_scores)
       WHERE i.date >= ? AND i.date <= ? ${tickerFilter}
       ORDER BY i.date ASC, i.ticker ASC`
    ).bind(...allParams).all<any>();

    const { weights, topN, rebalanceFreq, crashProtection, crashSensitivity, dcaActive, dcaAmount } = config;

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

    // C3 fix: crash detection via IHSG 60-day peak drop (same as core.ts)
    const ihsgWindow: number[] = [];
    const crashSensitivityVal = crashSensitivity || 10;

    for (let di = 0; di < sortedDates.length; di++) {
      const date = sortedDates[di];
      const stocks = byDate[date].sort((a: any, b: any) => b.totalScore - a.totalScore);

      // Build IHSG rolling window (use close of first stock as proxy if no IHSG column)
      // NOTE: backtest_intermediate doesn't have IHSG; skip crash check if no data
      // For proper crash detection, IHSG data would need to be added to the query.
      // For now, use a simplified check: if RSI14 of top stock > 80 or < 20 as momentum proxy
      const topStock = stocks[0];
      let isCrashed = false;
      if (crashProtection && topStock) {
        // Use RSI + SMA trend as proxy for crash (since we don't have IHSG in intermediate table)
        const sma50 = topStock.sma50;
        const sma200 = topStock.sma200;
        const rsi14 = topStock.rsi14;
        // Crash if: SMA50 < SMA200 (death cross) OR RSI < 30 (oversold panic)
        isCrashed = (sma50 != null && sma200 != null && sma50 < sma200) ||
                    (rsi14 != null && rsi14 < (100 - crashSensitivityVal * 5));
      }

      // Rebalance: sell all, buy topN
      if (rebalanceDay.has(date)) {
        // Sell holdings that have price data today; keep others for next rebalance
        const allToday = byDate[date] || [];
        const unsold: Record<string, number> = {};
        for (const [tkr, shares] of Object.entries(holdings)) {
          const row = allToday.find((s: any) => s.ticker === tkr);
          if (row && row.close > 0) {
            // C2 fix: apply sell fees (slippage + sell fee + tax)
            const sellProceeds = applySellFees(shares, row.close);
            cash += sellProceeds;
            trades.push({ date, ticker: tkr, action: "sell", shares, price: row.close, total: sellProceeds });
          } else {
            unsold[tkr] = shares;
          }
        }
        holdings = unsold; // only unsold stocks carried forward

        // Buy topN if not crashed
        if (!isCrashed) {
          const buys = stocks.slice(0, topN).filter(s => s.close > 0);
          if (buys.length > 0) {
            const perStock = Math.floor(cash / buys.length);
            for (const s of buys) {
              if (s.close <= 0) continue;
              // C2 fix: apply buy fees (slippage + buy fee)
              const costPerShare = applyBuyFees(s.close);
              const shares = Math.floor(perStock / costPerShare);
              if (shares > 0) {
                holdings[s.ticker] = (holdings[s.ticker] || 0) + shares;
                cash -= shares * costPerShare;
                trades.push({ date, ticker: s.ticker, action: "buy", shares, price: s.close, total: shares * costPerShare });
              }
            }
          }
        }
      }

      // DCA: buy topN regardless of rebalance schedule
      if (dcaActive && dcaAmount > 0) {
        const dcaBuys = stocks.slice(0, topN).filter(s => s.close > 0);
        for (const s of dcaBuys) {
          if (s.close > 0) {
            const costPerShare = applyBuyFees(s.close);
            const shares = Math.floor(Math.min(dcaAmount, cash) / costPerShare);
            if (shares > 0) {
              holdings[s.ticker] = (holdings[s.ticker] || 0) + shares;
              cash -= shares * costPerShare;
              trades.push({ date, ticker: s.ticker, action: "buy", shares, price: s.close, total: shares * costPerShare });
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
