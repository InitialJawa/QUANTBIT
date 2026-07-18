/**
 * Grid Search: optimasi weights per profil strategi
 * Step 0.05, semua kombinasi Q+G+V+M+D = 1.0
 * Objective: Aman→max Sharpe, Agresif→max CAGR, Dividen→max totalDividends, Growth-heavy→max CAGR
 *
 * Jalankan: npx tsx scripts/grid-search-weights.ts
 */

const API = "https://quantbit-terminal.pages.dev/api/backtest-data";
const FROM = "2021-01-04";
const TO = "2026-07-15";
const CAP = 100_000_000;
const TOP_N = 5;
const STEP = 0.05;

interface DayData {
  date: string;
  ihsgPrice: number;
  goldPrice: number;
  stockPrices: Record<string, number>;
  stockNormScores?: Record<string, Record<string, number>>;
}

interface Res {
  weights: number[];
  ret: number;
  cagr: number;
  sharpe: number;
  dd: number;
  totalDiv: number;
  trades: number;
}

const PROFILES = [
  { name: "Aman", base: [0.30, 0.45, 0.10, 0.00, 0.15], objective: "sharpe" as const },
  { name: "Agresif", base: [0.20, 0.60, 0.10, 0.10, 0.00], objective: "cagr" as const },
  { name: "Dividen", base: [0.15, 0.20, 0.05, 0.00, 0.60], objective: "dividends" as const },
  { name: "Growth-heavy", base: [0.10, 0.70, 0.05, 0.10, 0.05], objective: "cagr" as const },
];

// ── Fetch data ──
async function fetchData(): Promise<DayData[]> {
  const url = `${API}?configType=prod&from=${FROM}&to=${TO}`;
  console.log(`Fetching data from ${url}...`);
  const res = await fetch(url);
  const json: any = await res.json();
  if (!json.success) throw new Error(json.error);
  console.log(`  → ${json.data.length} days loaded`);
  return json.data;
}

// ── Simplified backtest (same engine logic) ──
function runBacktest(data: DayData[], weights: number[]): Res {
  let cash = CAP;
  const pos: Record<string, number> = {};
  let mx = CAP;
  let mdd = 0;
  const dr: number[] = [];
  let totalDiv = 0;
  let trades = 0;
  let lastMonth = -1;

  const rank = (scores: Record<string, Record<string, number>>) => {
    const e = Object.entries(scores).map(([tk, s]) => ({
      tk,
      v: (s.quality ?? 50) * weights[0] + (s.growth ?? 50) * weights[1] +
        (s.value ?? 50) * weights[2] + (s.momentum ?? 50) * weights[3] +
        (s.dividend ?? 50) * weights[4]
    }));
    e.sort((a, b) => b.v - a.v);
    return Object.fromEntries(e.map((x, i) => [x.tk, i + 1]));
  };

  const pickTop = (ranks: Record<string, number>, prices: Record<string, number>, n: number) => {
    return Object.entries(ranks)
      .filter(([tk]) => prices[tk] && prices[tk] > 0)
      .sort((a, b) => a[1] - b[1])
      .slice(0, n)
      .map(([tk]) => tk);
  };

  // Month-end rebalance tracking
  let rebalanceDay = -1;

  for (let i = 0; i < data.length; i++) {
    const day = data[i];
    const dt = new Date(day.date);
    const month = dt.getMonth();
    const dateNum = dt.getDate();

    if (!day.stockNormScores) continue;

    const ranks = rank(day.stockNormScores);

    // Monthly rebalance on 1st trading day of month (after day 0)
    if (i > 0 && month !== lastMonth) {
      lastMonth = month;
      rebalanceDay = i;

      const topTickers = pickTop(ranks, day.stockPrices, TOP_N);

      // Sell tickers not in top N
      for (const tk of Object.keys(pos)) {
        if (pos[tk] > 0 && !topTickers.includes(tk)) {
          const price = day.stockPrices[tk];
          if (price > 0) {
            cash += pos[tk] * price * 0.996; // fees approx
            trades++;
          }
          delete pos[tk];
        }
      }

      // Buy new top tickers
      for (const tk of topTickers) {
        if (!pos[tk] || pos[tk] === 0) {
          const price = day.stockPrices[tk];
          if (price > 0) {
            const alloc = Math.floor(cash / (topTickers.length - Object.keys(pos).filter(k => pos[k] > 0).length + 0.1) / (price * 1.006));
            const lots = Math.max(0, alloc);
            if (lots > 0) {
              pos[tk] = lots * 100;
              cash -= lots * 100 * price * 1.006;
              trades++;
            }
          }
        }
      }
    }

    // Monthly dividend (DPS / 12 approximation)
    if (i > 0 && month !== (new Date(data[i - 1].date)).getMonth()) {
      let monthDiv = 0;
      for (const [tk, shares] of Object.entries(pos)) {
        if (shares <= 0) continue;
        const price = day.stockPrices[tk];
        if (!price || price <= 0) continue;
        // Approximate dividend: assume ~3% annual yield → 0.25% monthly
        const approxDps = price * 0.03 / 12;
        monthDiv += Math.round(shares * approxDps * 0.90);
      }
      cash += monthDiv;
      totalDiv += monthDiv;
    }

    // Portfolio value
    let stocksVal = 0;
    for (const [tk, shares] of Object.entries(pos)) {
      const price = day.stockPrices[tk];
      if (price > 0) stocksVal += shares * price;
    }
    const pv = cash + stocksVal;

    if (pv > mx) mx = pv;
    else {
      const dd = ((mx - pv) / mx) * 100;
      if (dd > mdd) mdd = dd;
    }

    if (i > 0) {
      const prev = data[i - 1];
      let prevStocks = 0;
      for (const [tk, s] of Object.entries(pos)) {
        const p = prev.stockPrices[tk];
        if (p > 0) prevStocks += s * p;
      }
      const prevPv = cash + prevStocks;
      if (prevPv > 0) dr.push(((pv - prevPv) / prevPv) * 100);
    }
  }

  const finalPv = (() => {
    let sv = 0;
    for (const [tk, s] of Object.entries(pos)) {
      const p = data[data.length - 1].stockPrices[tk];
      if (p > 0) sv += s * p;
    }
    return cash + sv;
  })();

  const ret = ((finalPv - CAP) / CAP) * 100;
  const days = data.length;
  const years = days / 252;
  const cagr = years > 0 ? (Math.pow(finalPv / CAP, 1 / years) - 1) * 100 : 0;

  const validDr = dr.filter(r => Number.isFinite(r));
  const avgR = validDr.length > 0 ? validDr.reduce((a, b) => a + b, 0) / validDr.length : 0;
  const stdR = validDr.length > 1
    ? Math.sqrt(validDr.reduce((s, r) => s + Math.pow(r - avgR, 2), 0) / (validDr.length - 1))
    : 0;
  const annVol = stdR * Math.sqrt(252);
  const sharpe = annVol > 0 ? (cagr / 100 - 0.05) / (annVol / 100) : 0;

  return { weights, ret, cagr, sharpe, dd: mdd, totalDiv, trades };
}

// ── Generate all weight combos with step 0.05 ──
function* generateWeights(): Generator<number[]> {
  const n = Math.round(1 / STEP); // 20
  for (let q = 0; q <= n; q++) {
    for (let g = 0; g <= n - q; g++) {
      for (let v = 0; v <= n - q - g; v++) {
        for (let m = 0; m <= n - q - g - v; m++) {
          const d = n - q - g - v - m;
          yield [q * STEP, g * STEP, v * STEP, m * STEP, d * STEP];
        }
      }
    }
  }
}

function countCombos(): number {
  const n = Math.round(1 / STEP);
  // Stars and bars: C(n+5-1, 5-1) = C(n+4, 4)
  let count = 0;
  for (let q = 0; q <= n; q++) {
    for (let g = 0; g <= n - q; g++) {
      for (let v = 0; v <= n - q - g; v++) {
        count += (n - q - g - v + 1);
      }
    }
  }
  return count;
}

function pickBest(results: Res[], objective: string): Res {
  if (objective === "sharpe") {
    return results.reduce((best, r) => r.sharpe > best.sharpe ? r : best);
  } else if (objective === "cagr") {
    return results.reduce((best, r) => r.cagr > best.cagr ? r : best);
  } else if (objective === "dividends") {
    return results.reduce((best, r) => r.totalDiv > best.totalDiv ? r : best);
  }
  return results[0];
}

async function main() {
  const data = await fetchData();
  const totalCombos = countCombos();
  console.log(`\nGrid search: ${totalCombos.toLocaleString("id-ID")} weight combos per profile`);
  console.log(`Step: ${STEP}, Dimensions: 5 (Q, G, V, M, D)\n`);

  for (const profile of PROFILES) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Profile: ${profile.name} (base: ${profile.base.join(", ")})`);
    console.log(`Objective: max ${profile.objective}`);
    console.log(`${"=".repeat(60)}`);

    let best: Res | null = null;
    let count = 0;
    const startTime = Date.now();

    for (const w of generateWeights()) {
      const res = runBacktest(data, w);
      if (!best || pickBest([best, res], profile.objective) === res) {
        best = res;
      }
      count++;
      if (count % 1000 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = count / elapsed;
        const eta = ((totalCombos - count) / rate).toFixed(0);
        process.stdout.write(`\r  ${count.toLocaleString("id-ID")}/${totalCombos.toLocaleString("id-ID")} (${(count/totalCombos*100).toFixed(1)}%) — ETA: ${eta}s — best: ${profile.objective === "sharpe" ? best!.sharpe.toFixed(3) : profile.objective === "cagr" ? best!.cagr.toFixed(2) + "%" : "Rp" + (best!.totalDiv/1e6).toFixed(1) + "M"}`);
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n\n  Results (${elapsed}s):`);
    console.log(`  Best weights: Q=${best!.weights[0]} G=${best!.weights[1]} V=${best!.weights[2]} M=${best!.weights[3]} D=${best!.weights[4]}`);
    console.log(`  Return: ${best!.ret.toFixed(2)}% | CAGR: ${best!.cagr.toFixed(2)}% | Sharpe: ${best!.sharpe.toFixed(3)} | MaxDD: ${best!.dd.toFixed(2)}% | Dividends: Rp ${(best!.totalDiv / 1e6).toFixed(1)}M | Trades: ${best!.trades}`);
  }

  console.log(`\n\n${"=".repeat(60)}`);
  console.log("SUMMARY");
  console.log(`${"=".repeat(60)}`);
  console.log("Jalankan script ini dan copy weights terbaik ke EngineConfigContext.tsx");
}

main().catch(console.error);
