/**
 * Grid Search: cari konfigurasi backtest terbaik
 * PASS 1: core params (16P × 11N × 5T × 2E × 3F = 5,280)
 * PASS 2: best profiles + new features (3P × 4N × 2T × 2C × 2S × 2F × 3SM × 3TS = 1,728)
 */

const API = "https://quantbit-terminal.pages.dev/api/backtest-data";
const FROM = "2021-01-04";
const TO = "2026-07-08";
const CAP = 100_000_000;

interface D {
  date: string; ihsgPrice: number; goldPrice: number;
  stockPrices: Record<string, number>;
  stockNormScores?: Record<string, Record<string, number>>;
}

interface Cfg {
  topN: number; weights: number[]; threshold: number;
  emergency: boolean; crashSens: number; safeHaven: "kas" | "emas";
  rebalanceFreq: "monthly" | "quarterly" | "semiannual" | "off";
  smoothEma: number; dualMomentum: boolean;
  volWeight: boolean; trailingStop: number;
}

interface Res { c: Cfg; ret: number; cagr: number; sharpe: number; dd: number; trades: number; crashes: number; }

const PROFILES: [string, ...number[]][] = [
  ["Aman (Q30 G45 V10 M0 D15)", 0.30,0.45,0.10,0.00,0.15],
  ["Agresif (Q20 G60 V10 M10 D0)", 0.20,0.60,0.10,0.10,0.00],
  ["Dividen (Q15 G20 V5 M0 D60)", 0.15,0.20,0.05,0.00,0.60],
  ["Prod (Q45 G10 V5 M40 D0)", 0.45,0.10,0.05,0.40,0.00],
  ["Res (Q40 G25 V5 M30 D0)", 0.40,0.25,0.05,0.30,0.00],
  ["Quality-heavy (Q60 G20 V10 M10 D0)", 0.60,0.20,0.10,0.10,0.00],
  ["Growth-heavy (Q10 G70 V5 M10 D5)", 0.10,0.70,0.05,0.10,0.05],
  ["Balanced (Q25 G25 V25 M25 D0)", 0.25,0.25,0.25,0.25,0.00],
  ["Momentum (Q15 G15 V10 M60 D0)", 0.15,0.15,0.10,0.60,0.00],
  ["Value+Div (Q20 G10 V35 M0 D35)", 0.20,0.10,0.35,0.00,0.35],
  ["All Equal (Q20 G20 V20 M20 D20)", 0.20,0.20,0.20,0.20,0.20],
  ["Ultra Aman (Q50 G30 V15 M0 D5)", 0.50,0.30,0.15,0.00,0.05],
  ["G10 M50 (goldilocks)", 0.10,0.10,0.10,0.50,0.20],
  ["Anti-Div (Q30 G40 V20 M10 D0)", 0.30,0.40,0.20,0.10,0.00],
  ["Momentum+Growth (Q10 G40 V0 M50 D0)", 0.10,0.40,0.00,0.50,0.00],
  ["Defensive (Q50 G15 V20 M10 D5)", 0.50,0.15,0.20,0.10,0.05],
];

let simCount = 0;

function run(data: D[], cfg: Cfg): Res {
  simCount++;
  let cash = CAP, pos: Record<string, number> = {}, t = 0, inC = false, cool = 0, lk = "";
  let pe: Record<string, number> | null = null, hwm: Record<string, number> = {};
  let crashes = 0, mx = CAP, mdd = 0, dr: number[] = [], pv = CAP, gg = 0;
  const ihl: number[] = [];

  const rank = (s: Record<string, Record<string, number>>) => {
    const e = Object.entries(s).map(([tk, sc]) => ({
      tk, v: (sc.quality ?? 50) * cfg.weights[0] + (sc.growth ?? 50) * cfg.weights[1] +
             (sc.value ?? 50) * cfg.weights[2] + (sc.momentum ?? 50) * cfg.weights[3] +
             (sc.dividend ?? 50) * cfg.weights[4]
    }));
    e.sort((a, b) => b.v - a.v);
    return Object.fromEntries(e.map((x, i) => [x.tk, i + 1]));
  };

  for (let i = 0; i < data.length; i++) {
    const day = data[i];
    ihl.push(day.ihsgPrice);
    if (ihl.length > 200) ihl.shift();
    if (!day.stockNormScores) continue;

    const rawR = rank(day.stockNormScores);
    if (cfg.smoothEma > 0 && pe) {
      const a = 2 / (cfg.smoothEma + 1);
      for (const tk of new Set([...Object.keys(rawR), ...Object.keys(pe)])) {
        rawR[tk] = (pe[tk] ?? rawR[tk]) + a * (rawR[tk] - (pe[tk] ?? rawR[tk]));
      }
    }
    pe = { ...rawR };
    const r = rawR;

    let sv = 0;
    for (const [k, s] of Object.entries(pos)) {
      const p = day.stockPrices[k] ?? 100;
      sv += s * p; hwm[k] = Math.max(hwm[k] ?? p, p);
    }
    const tv = cash + sv;
    if (tv > mx) mx = tv;
    const dd = (tv - mx) / mx * 100;
    if (dd < mdd) mdd = dd;
    if (i > 0) dr.push((tv - pv) / pv);
    pv = tv;
    if (cool > 0) cool--;

    const w60 = Math.max(...ihl.slice(Math.max(0, ihl.length - 60)));
    const dd60 = ((day.ihsgPrice - w60) / w60) * 100;
    const sma20 = ihl.slice(Math.max(0, ihl.length - 20)).reduce((a, b) => a + b, 0) / Math.min(20, ihl.length);
    const sma50 = ihl.slice(Math.max(0, ihl.length - 50)).reduce((a, b) => a + b, 0) / Math.min(50, ihl.length);
    const r1 = 1 - (cfg.crashSens * 0.5) / 100, r2 = 1 - (cfg.crashSens * 0.2) / 100;
    const crashed = !inC && (dd60 <= -cfg.crashSens || (day.ihsgPrice < sma50 * r1 && sma20 < sma50 * r2));

    if (crashed && !inC && cool <= 0) {
      for (const [k, s] of Object.entries(pos)) { cash += s * (day.stockPrices[k] ?? 100); t++; }
      pos = {}; hwm = {};
      if (cfg.safeHaven === "emas" && day.goldPrice > 0) { gg = cash / day.goldPrice; cash = 0; }
      inC = true; cool = 20; crashes++; continue;
    }

    if (inC && cool <= 0) {
      const s20 = ihl.slice(Math.max(0, ihl.length - 20)).reduce((a, b) => a + b, 0) / Math.min(20, ihl.length);
      const d5 = ihl[Math.max(0, ihl.length - 5)];
      const rec = day.ihsgPrice > s20 || ((day.ihsgPrice - d5) / d5 * 100 >= 2.5 && day.ihsgPrice > s20);
      if (rec) {
        if (gg > 0 && day.goldPrice > 0) { cash += gg * day.goldPrice; gg = 0; }
        inC = false; cool = 20;
      }
    }
    if (inC) continue;

    if (cfg.trailingStop > 0) {
      for (const [k, s] of Object.entries(pos)) {
        const p = day.stockPrices[k] ?? 100;
        if ((p - (hwm[k] ?? p)) / (hwm[k] ?? p) < -(cfg.trailingStop / 100)) {
          cash += s * p; delete pos[k]; delete hwm[k]; t++;
        }
      }
    }

    if (cfg.emergency) {
      for (const [k, s] of Object.entries(pos)) {
        if ((r[k] ?? 99) >= 15) { cash += s * (day.stockPrices[k] ?? 100); delete pos[k]; delete hwm[k]; t++; }
      }
    }

    let allowBuy = true, validT = Object.keys(day.stockPrices);
    if (cfg.dualMomentum) {
      const i6 = data[Math.max(0, i - 125)]?.ihsgPrice ?? day.ihsgPrice;
      if ((day.ihsgPrice - i6) / i6 < -0.05) allowBuy = false;
      else validT = validT.filter(tk => {
        const p6 = data[Math.max(0, i - 125)]?.stockPrices?.[tk];
        return !p6 || p6 <= 0 || (day.stockPrices[tk] - p6) / p6 > -0.15;
      });
    }

    const d = new Date(day.date), m = d.getMonth(), y = d.getFullYear();
    let pk: string;
    switch (cfg.rebalanceFreq) {
      case "monthly": pk = `${y}-${m}`; break;
      case "quarterly": pk = `${y}-Q${Math.floor(m / 3)}`; break;
      case "semiannual": pk = `${y}-S${Math.floor(m / 6)}`; break;
      default: pk = "once";
    }
    const isRebal = pk !== lk || i === 0;
    if (isRebal && allowBuy) {
      lk = pk;
      for (const [k, s] of Object.entries(pos)) {
        if ((r[k] ?? 99) > cfg.threshold) {
          cash += s * (day.stockPrices[k] ?? 100); delete pos[k]; delete hwm[k]; t++;
        }
      }
      const held = Object.values(pos).length;
      const target = Math.min(cfg.topN, held + Object.keys(r).length);
      const need = target - held;
      if (need > 0 && cash > 0) {
        const cand = Object.entries(r)
          .filter(([k]) => validT.includes(k))
          .filter(([k]) => (day.stockPrices[k] ?? 0) > 0 && !pos[k])
          .sort((a, b) => a[1] - b[1])
          .slice(0, need);
        let alloc: number[];
        if (cfg.volWeight && target > 0) {
          const w = [0.30, 0.25, 0.20, 0.15, 0.10, 0.08, 0.06, 0.05, 0.04, 0.03, 0.03, 0.03, 0.03, 0.03, 0.02];
          alloc = w.slice(0, target).map(x => x / w.slice(0, target).reduce((a, b) => a + b, 0));
        } else {
          alloc = Array(target).fill(1 / target);
        }
        const newAlloc = alloc.slice(held);
        for (let ci = 0; ci < cand.length; ci++) {
          const [k] = cand[ci];
          const p = day.stockPrices[k];
          if (p <= 0) continue;
          const sh = Math.floor((cash * (newAlloc[ci] ?? 1 / need)) / p);
          if (sh >= 100) { pos[k] = (pos[k] || 0) + sh; cash -= sh * p; hwm[k] = p; t++; }
        }
      }
    }
  }

  let fv = cash;
  for (const [k, s] of Object.entries(pos)) fv += s * (data[data.length - 1].stockPrices[k] ?? 100);
  if (gg > 0) fv += gg * data[data.length - 1].goldPrice;
  const ret = ((fv - CAP) / CAP) * 100;
  const yr = (new Date(TO).getTime() - new Date(FROM).getTime()) / (365.25 * 86400000);
  const cagr = yr > 0.5 ? (Math.pow(fv / CAP, 1 / yr) - 1) * 100 : 0;
  const avgR = dr.reduce((a, b) => a + b, 0) / Math.max(1, dr.length);
  const stdR = Math.sqrt(dr.reduce((s, r) => s + (r - avgR) ** 2, 0) / Math.max(1, dr.length));
  const sharpe = stdR > 0 ? (avgR * 252) / (stdR * Math.sqrt(252)) : 0;
  return { c: cfg, ret: Math.round(ret * 100) / 100, cagr: Math.round(cagr * 100) / 100, sharpe: Math.round(sharpe * 1000) / 1000, dd: Math.round(mdd * 100) / 100, trades: t, crashes };
}

async function main() {
  console.log("=== GRID SEARCH ===\n");
  const res = await fetch(`${API}?configType=prod&from=${FROM}&to=${TO}`);
  const j: any = await res.json();
  const data: D[] = j.data;
  console.log(`Data: ${data.length} days, ${Object.keys(data[0]?.stockPrices || {}).length} tickers\n`);

  // ── PASS 1: Core params ──
  console.log("─── PASS 1: Core Parameters ───\n");
  const p1: Cfg[] = [];
  const topNs = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15];
  const thresholds = [7, 10, 15, 20, 99];
  const ems = [true, false];
  const freqs: Cfg["rebalanceFreq"][] = ["monthly", "quarterly", "off"];

  for (const [, ...w] of PROFILES) {
    for (const n of topNs) {
      for (const th of thresholds) {
        for (const em of ems) {
          for (const rf of freqs) {
            p1.push({ topN: n, weights: w as number[], threshold: th, emergency: em, crashSens: 10, safeHaven: "kas", rebalanceFreq: rf, smoothEma: 0, dualMomentum: false, volWeight: false, trailingStop: 0 });
          }
        }
      }
    }
  }
  console.log(`Combos: ${p1.length.toLocaleString("id-ID")}`);
  const start1 = Date.now();
  const r1 = p1.map(cfg => run(data, cfg));
  r1.sort((a, b) => b.ret - a.ret);
  const t1 = Date.now() - start1;
  console.log(`Done in ${(t1 / 1000).toFixed(1)}s (${(p1.length / (t1 / 1000)).toFixed(0)} sim/s)\n`);

  console.log("TOP 20 (PASS 1):");
  console.log("Rk  Return%    CAGR%   Sharpe  MaxDD%   Trd  Cr  TopN  Thr  Em  Freq       Profile");
  console.log("-".repeat(95));
  for (let i = 0; i < 20; i++) {
    const r = r1[i];
    const pn = PROFILES.find(([_, ...w]) => w.every((v, j) => v === r.c.weights[j]));
    console.log(
      String(i + 1).padEnd(3) +
      (r.ret >= 0 ? " " : "") + r.ret.toFixed(2).padEnd(8) +
      (r.cagr >= 0 ? " " : "") + r.cagr.toFixed(2).padEnd(7) +
      (r.sharpe >= 0 ? " " : "") + r.sharpe.toFixed(3).padEnd(8) +
      (r.dd >= 0 ? " " : "") + r.dd.toFixed(2).padEnd(7) +
      String(r.trades).padEnd(5) + String(r.crashes).padEnd(4) +
      "N" + String(r.c.topN).padEnd(4) +
      (r.c.threshold === 99 ? "∞" : String(r.c.threshold)).padEnd(5) +
      (r.c.emergency ? "Y" : "N").padEnd(4) +
      r.c.rebalanceFreq.substring(0, 9).padEnd(10) +
      (pn ? pn[0].substring(0, 36) : "custom")
    );
  }

  // ── PASS 2: Top profiles + features ──
  const bestProfiles = PROFILES.filter(([n]) =>
    ["Agresif", "Growth-heavy", "Quality-heavy"].some(t => n.startsWith(t))
  );
  const topNs2 = [3, 4, 10, 15];
  const ths2 = [7, 99];
  const css = [10, 15];
  const shs: Cfg["safeHaven"][] = ["kas", "emas"];
  const freqs2: Cfg["rebalanceFreq"][] = ["quarterly", "monthly"];
  const smooths = [0, 10, 20];
  const tss = [0, 15, 20];

  const p2: Cfg[] = [];
  for (const [, ...w] of bestProfiles) {
    for (const n of topNs2) {
      for (const th of ths2) {
        for (const cs of css) {
          for (const sh of shs) {
            for (const rf of freqs2) {
              for (const sm of smooths) {
                for (const ts of tss) {
                  p2.push({ topN: n, weights: w as number[], threshold: th, emergency: false, crashSens: cs, safeHaven: sh, rebalanceFreq: rf, smoothEma: sm, dualMomentum: false, volWeight: false, trailingStop: ts });
                }
              }
            }
          }
        }
      }
    }
  }
  console.log(`\n─── PASS 2: ${p2.length.toLocaleString("id-ID")} combos ───\n`);
  const start2 = Date.now();
  const r2 = p2.map(cfg => run(data, cfg));
  r2.sort((a, b) => b.ret - a.ret);
  const t2 = Date.now() - start2;
  console.log(`Done in ${(t2 / 1000).toFixed(1)}s (${(p2.length / (t2 / 1000)).toFixed(0)} sim/s)\n`);

  console.log("TOP 20 (PASS 2):");
  console.log("Rk  Return%    CAGR%   Sharpe  MaxDD%   Trd  Cr  TopN  Thr  Sens/Hvn Freq       Sm  TS  Profile");
  console.log("-".repeat(105));
  for (let i = 0; i < 20; i++) {
    const r = r2[i];
    const pn = PROFILES.find(([_, ...w]) => w.every((v, j) => v === r.c.weights[j]));
    console.log(
      String(i + 1).padEnd(3) +
      (r.ret >= 0 ? " " : "") + r.ret.toFixed(2).padEnd(8) +
      (r.cagr >= 0 ? " " : "") + r.cagr.toFixed(2).padEnd(7) +
      (r.sharpe >= 0 ? " " : "") + r.sharpe.toFixed(3).padEnd(8) +
      (r.dd >= 0 ? " " : "") + r.dd.toFixed(2).padEnd(7) +
      String(r.trades).padEnd(5) + String(r.crashes).padEnd(4) +
      "N" + String(r.c.topN).padEnd(4) +
      (r.c.threshold === 99 ? "∞" : String(r.c.threshold)).padEnd(5) +
      String(r.c.crashSens).padEnd(5) + r.c.safeHaven.padEnd(4) +
      r.c.rebalanceFreq.substring(0, 9).padEnd(10) +
      String(r.c.smoothEma).padEnd(4) +
      String(r.c.trailingStop).padEnd(4) +
      (pn ? pn[0].substring(0, 36) : "custom")
    );
  }

  // ── ANALISIS ──
  console.log("\n\n=== ANALISIS ===\n");

  const byP: Record<string, number[]> = {};
  const all = [...r1, ...r2];
  for (const r of all) {
    const p = PROFILES.find(([_, ...w]) => w.every((v, j) => v === r.c.weights[j]));
    const k = p ? p[0] : "custom";
    if (!byP[k]) byP[k] = [];
    byP[k].push(r.ret);
  }
  console.log("Profile (avg return):");
  for (const [k, v] of Object.entries(byP).sort((a, b) => b[1].reduce((s, x) => s + x, 0) / b[1].length - a[1].reduce((s, x) => s + x, 0) / a[1].length)) {
    const avg = v.reduce((a, b) => a + b, 0) / v.length;
    const best = Math.max(...v);
    console.log(`  ${k.padEnd(36)} avg: ${avg >= 0 ? " " : ""}${avg.toFixed(2)}%  best: ${best >= 0 ? " " : ""}${best.toFixed(2)}%`);
  }

  const byN: Record<number, number[]> = {};
  for (const r of r1) {
    if (!byN[r.c.topN]) byN[r.c.topN] = [];
    byN[r.c.topN].push(r.ret);
  }
  console.log("\nTopN:");
  for (const k of Object.keys(byN).map(Number).sort((a, b) => a - b)) {
    const v = byN[k];
    console.log(`  Top ${String(k).padEnd(2)} → avg: ${(v.reduce((a, b) => a + b, 0) / v.length >= 0 ? " " : "")}${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)}%  best: ${(Math.max(...v) >= 0 ? " " : "")}${Math.max(...v).toFixed(2)}%`);
  }

  const shk = r2.filter(r => r.c.safeHaven === "kas");
  const she = r2.filter(r => r.c.safeHaven === "emas");
  console.log(`\nSafe Haven Kas:  avg ${(shk.reduce((s, r) => s + r.ret, 0) / shk.length).toFixed(2)}%  best ${Math.max(...shk.map(r => r.ret)).toFixed(2)}%`);
  console.log(`Safe Haven Emas: avg ${(she.reduce((s, r) => s + r.ret, 0) / she.length).toFixed(2)}%  best ${Math.max(...she.map(r => r.ret)).toFixed(2)}%`);

  const byTS: Record<number, number[]> = {};
  for (const r of r2) {
    if (!byTS[r.c.trailingStop]) byTS[r.c.trailingStop] = [];
    byTS[r.c.trailingStop].push(r.ret);
  }
  console.log("\nTrailing Stop:");
  for (const k of Object.keys(byTS).map(Number).sort((a, b) => a - b)) {
    const v = byTS[k];
    console.log(`  ${k === 0 ? "OFF" : k + "%".padEnd(4)} avg: ${(v.reduce((a, b) => a + b, 0) / v.length >= 0 ? " " : "")}${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)}%  best: ${(Math.max(...v) >= 0 ? " " : "")}${Math.max(...v).toFixed(2)}%`);
  }

  const bySM: Record<number, number[]> = {};
  for (const r of r2) {
    if (!bySM[r.c.smoothEma]) bySM[r.c.smoothEma] = [];
    bySM[r.c.smoothEma].push(r.ret);
  }
  console.log("\nSmooth EMA:");
  for (const k of Object.keys(bySM).map(Number).sort((a, b) => a - b)) {
    const v = bySM[k];
    console.log(`  ${k === 0 ? "OFF" : k + "d".padEnd(3)} avg: ${(v.reduce((a, b) => a + b, 0) / v.length >= 0 ? " " : "")}${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)}%  best: ${(Math.max(...v) >= 0 ? " " : "")}${Math.max(...v).toFixed(2)}%`);
  }

  const byCS: Record<number, number[]> = {};
  for (const r of r2) {
    if (!byCS[r.c.crashSens]) byCS[r.c.crashSens] = [];
    byCS[r.c.crashSens].push(r.ret);
  }
  console.log("\nCrash Sensitivity:");
  for (const k of Object.keys(byCS).map(Number).sort((a, b) => a - b)) {
    const v = byCS[k];
    console.log(`  ${k}%  avg: ${(v.reduce((a, b) => a + b, 0) / v.length >= 0 ? " " : "")}${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(2)}%  best: ${(Math.max(...v) >= 0 ? " " : "")}${Math.max(...v).toFixed(2)}%`);
  }

  // ── TOP 50 ALL ──
  console.log("\n\n=== TOP 50 KESELURUHAN ===\n");
  all.sort((a, b) => b.ret - a.ret);
  console.log("Rk  Return%    CAGR%   Sharpe  MaxDD%   Trades  TopN  Thr  Sens SH  Freq       Sm  TS  Profile");
  console.log("-".repeat(105));
  for (let i = 0; i < 50; i++) {
    const r = all[i];
    const pn = PROFILES.find(([_, ...w]) => w.every((v, j) => v === r.c.weights[j]));
    console.log(
      String(i + 1).padEnd(3) +
      (r.ret >= 0 ? " " : "") + r.ret.toFixed(2).padEnd(8) +
      (r.cagr >= 0 ? " " : "") + r.cagr.toFixed(2).padEnd(7) +
      (r.sharpe >= 0 ? " " : "") + r.sharpe.toFixed(3).padEnd(8) +
      (r.dd >= 0 ? " " : "") + r.dd.toFixed(2).padEnd(8) +
      String(r.trades).padEnd(7) +
      "N" + String(r.c.topN).padEnd(5) +
      (r.c.threshold === 99 ? "∞" : String(r.c.threshold)).padEnd(5) +
      String(r.c.crashSens).padEnd(5) + r.c.safeHaven.padEnd(4) +
      r.c.rebalanceFreq.substring(0, 9).padEnd(10) +
      String(r.c.smoothEma).padEnd(4) +
      String(r.c.trailingStop).padEnd(4) +
      (pn ? pn[0].substring(0, 36) : "custom")
    );
  }

  console.log(`\nTotal simulations: ${simCount.toLocaleString("id-ID")}`);
}

main().catch(console.error);
