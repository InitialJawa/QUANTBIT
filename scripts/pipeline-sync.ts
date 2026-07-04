// Pipeline Sync — Dual Source
// Yahoo:  harga (stock_daily, market_daily) + fundamental (stock_scores)
// D1:     single source of truth

import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const START_DATE = "2021-01-01";
const SCORE_DATE = new Date().toISOString().split("T")[0];

const TICKERS = [
  "BBCA.JK","BBRI.JK","BMRI.JK","BBNI.JK","ASII.JK","TLKM.JK","UNVR.JK","ICBP.JK","INDF.JK","GOTO.JK",
  "ADRO.JK","PTBA.JK","ITMG.JK","UNTR.JK","AMMN.JK","BREN.JK","CUAN.JK","PGEO.JK","TPIA.JK","BYAN.JK",
  "ESSA.JK","BRPT.JK","KLBF.JK","MIKA.JK","CPIN.JK","JPFA.JK","INDY.JK","MEDC.JK","ENRG.JK","HRUM.JK",
  "AMRT.JK","MIDI.JK","MAPA.JK","MAPI.JK","ACES.JK","SCMA.JK","EMTK.JK","BUKA.JK","ARTO.JK","BRIS.JK",
  "BBTN.JK","BDMN.JK","BNGA.JK","NISP.JK","PNBN.JK","JSMR.JK","WIKA.JK","PTPP.JK","ADHI.JK","WSKT.JK",
  "SMGR.JK","INTP.JK","SMRA.JK","CTRA.JK","BSDE.JK","PWON.JK","ASRI.JK","AKRA.JK","PGAS.JK","EXCL.JK",
  "ISAT.JK","TOWR.JK","TBIG.JK","MTEL.JK","INCO.JK","ANTM.JK","MDKA.JK","TINS.JK","SMDR.JK","TMAS.JK",
  "NELY.JK","SIDO.JK","MYOR.JK","ULTJ.JK","CLEO.JK","ROTI.JK","WOOD.JK","INKP.JK","TKIM.JK","SMAR.JK",
  "LSIP.JK","AADI.JK","ADMR.JK","BUMI.JK","DEWA.JK","HRTA.JK","MBMA.JK","WIFI.JK",
  "TRIL.JK","TRAM.JK","MYRX.JK","RIMO.JK","KREN.JK","SUGI.JK","NUSA.JK",
];

const MACRO = [
  { symbol: "^JKSE", field: "ihsg" },
  { symbol: "GC=F", field: "gold" },
  { symbol: "USDIDR=X", field: "usdidr" },
];

// —— Helpers ——

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function run(cmd: string): string {
  return execSync(cmd, { cwd: join(__dirname, ".."), encoding: "utf-8", timeout: 60000 });
}

function fmtDate(d: Date): string { return d.toISOString().split("T")[0]; }
function safe(v: number | undefined | null, d: number): number { return v != null ? v : d; }

// —— Fetch: Prices (chart) ——

async function fetchPrices(symbol: string): Promise<Record<string, any>> {
  const { default: YF } = await import("yahoo-finance2");
  const yf = new YF({ suppressNotices: ["ripHistorical", "yahooSurvey"] as any });
  const result: Record<string, any> = {};
  try {
    const raw = await yf.chart(symbol, { period1: START_DATE, interval: "1d" });
    for (const q of raw.quotes || []) {
      if (!q.date || !q.close || q.close <= 0) continue;
      const d = new Date(q.date);
      if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
      result[fmtDate(d)] = {
        close: q.close, open: q.open, high: q.high, low: q.low, volume: q.volume ?? 0,
      };
    }
  } catch (e) { process.stdout.write(`⚠️`); }
  return result;
}

// —— Fetch: Fundamentals (quoteSummary) ——

interface Funda {
  ticker: string;
  perTrailing?: number;
  perForward?: number;
  eps?: number;
  pbv?: number;
  bookValue?: number;
  dividendYield?: number;
  dividendRate?: number;
  payoutRatio?: number;
  profitMargins?: number;
  roe?: number;
  revenue?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  operatingMargins?: number;
  grossMargins?: number;
  debtEquity?: number;
  currentRatio?: number;
  marketCap?: number;
}

async function fetchFundamentals(symbol: string): Promise<Funda | null> {
  const { default: YF } = await import("yahoo-finance2");
  const yf = new YF({ suppressNotices: ["yahooSurvey"] as any });
  try {
    const r = await yf.quoteSummary(symbol, {
      modules: ["price", "summaryDetail", "financialData", "defaultKeyStatistics"],
    });
    const fd = r.financialData;
    const ks = r.defaultKeyStatistics;
    const sd = r.summaryDetail;
    const p = r.price;
    if (!p?.regularMarketPrice) return null;
    return {
      ticker: symbol.replace(".JK", ""),
      perTrailing: sd?.trailingPE ?? undefined,
      perForward: sd?.forwardPE ?? undefined,
      eps: ks?.trailingEps ?? undefined,
      pbv: ks?.priceToBook ?? undefined,
      bookValue: ks?.bookValue ?? undefined,
      dividendYield: sd?.dividendYield ?? undefined,
      dividendRate: sd?.dividendRate ?? undefined,
      payoutRatio: sd?.payoutRatio ?? undefined,
      profitMargins: fd?.profitMargins ?? undefined,
      roe: fd?.returnOnEquity ?? undefined,
      revenue: fd?.totalRevenue ?? undefined,
      revenueGrowth: fd?.revenueGrowth ?? undefined,
      earningsGrowth: fd?.earningsGrowth ?? undefined,
      operatingMargins: fd?.operatingMargins ?? undefined,
      grossMargins: fd?.grossMargins ?? undefined,
      debtEquity: fd?.debtToEquity ?? undefined,
      currentRatio: fd?.currentRatio ?? undefined,
      marketCap: p?.marketCap ?? undefined,
    };
  } catch (e) { return null; }
}

// —— Score computation ——

function percentile(arr: number[], val: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = sorted.findIndex(x => x === val);
  if (idx === -1) return 0.5;
  return idx / (sorted.length - 1);
}

function invert(arr: number[], val: number): number {
  return 1 - percentile(arr, val);
}

function computeScores(fundas: Funda[]) {
  const valid = fundas.filter(f => f.marketCap != null && f.marketCap > 0);

  const extract = (key: keyof Funda) => valid.map(f => f[key] as number).filter(v => v != null && isFinite(v));

  const per = extract("perTrailing");
  const pbv = extract("pbv");
  const payout = extract("payoutRatio");
  const roe = extract("roe");
  const pm = extract("profitMargins");
  const om = extract("operatingMargins");
  const rg = extract("revenueGrowth");
  const eg = extract("earningsGrowth");
  const dy = extract("dividendYield");

  const results: { ticker: string; quality: number; growth: number; value: number; dividend: number; momentum: number }[] = [];

  for (const f of valid) {
    const quality = avg([
      f.roe != null && isFinite(f.roe) ? percentile(roe, f.roe) : undefined,
      f.profitMargins != null && isFinite(f.profitMargins) ? percentile(pm, f.profitMargins) : undefined,
      f.operatingMargins != null && isFinite(f.operatingMargins) ? percentile(om, f.operatingMargins) : undefined,
    ]);

    const growth = avg([
      f.revenueGrowth != null && isFinite(f.revenueGrowth) ? percentile(rg, f.revenueGrowth) : undefined,
      f.earningsGrowth != null && isFinite(f.earningsGrowth) ? percentile(eg, f.earningsGrowth) : undefined,
    ]);

    const value = avg([
      f.perTrailing != null && f.perTrailing > 0 ? invert(per, f.perTrailing) : undefined,
      f.pbv != null && f.pbv > 0 ? invert(pbv, f.pbv) : undefined,
    ]);

    const dividend = avg([
      f.dividendYield != null && isFinite(f.dividendYield) ? percentile(dy, f.dividendYield) : undefined,
      f.payoutRatio != null && isFinite(f.payoutRatio) ? percentile(payout, f.payoutRatio) : undefined,
    ]);

    results.push({
      ticker: f.ticker,
      quality: Math.round(quality * 1000) / 10,
      growth: Math.round(growth * 1000) / 10,
      value: Math.round(value * 1000) / 10,
      dividend: Math.round(dividend * 1000) / 10,
      momentum: 0,
    });
  }
  return results;
}

function avg(vals: (number | undefined)[]): number {
  const nums = vals.filter(v => v != null) as number[];
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

// —— Generate SQL ——

function writeInserts(path: string, table: string, rows: { ticker: string; date: string; fields: Record<string, number> }[]) {
  const lines: string[] = [];
  for (const r of rows) {
    const cols = Object.keys(r.fields).join(",");
    const vals = Object.values(r.fields).map(v => v != null ? v : "NULL").join(",");
    lines.push(`INSERT OR REPLACE INTO ${table}(ticker,score_date,${cols}) VALUES('${r.ticker}','${r.date}',${vals});`);
  }
  writeFileSync(path, lines.join("\n") + "\n", "utf-8");
}

// —— Main ——

async function main() {
  const mode = process.argv[2] || "all";
  console.log(`Pipeline Sync [${mode}]`);

  // ── 1. PRICES ──
  if (mode === "all" || mode === "prices") {
    console.log("\n=== Prices ===");

    // Macro
    for (const m of MACRO) {
      process.stdout.write(`  ${m.symbol}...`);
      const data = await fetchPrices(m.symbol);
      process.stdout.write(` ${Object.keys(data).length} days\n`);
      await sleep(300);
    }

    // Stocks
    let count = 0;
    for (const tkr of TICKERS) {
      count++;
      process.stdout.write(`  [${count}/${TICKERS.length}] ${tkr}...`);
      const data = await fetchPrices(tkr);
      process.stdout.write(` ${Object.keys(data).length} days\n`);
      await sleep(200);
    }
    console.log("  Prices done");
  }

  // ── 2. FUNDAMENTALS ──
  if (mode === "all" || mode === "fundamentals") {
    console.log("\n=== Fundamentals ===");
    const fundas: Funda[] = [];
    let count = 0;
    for (const tkr of TICKERS) {
      count++;
      process.stdout.write(`  [${count}/${TICKERS.length}] ${tkr}...`);
      const f = await fetchFundamentals(tkr);
      if (f) {
        fundas.push(f);
        process.stdout.write(` PER:${f.perTrailing?.toFixed(1) ?? "-"} PBV:${f.pbv?.toFixed(2) ?? "-"} ROE:${(f.roe != null ? (f.roe * 100).toFixed(1) : "-") + "%"}\n`);
      } else {
        process.stdout.write(" FAILED\n");
      }
      await sleep(500);
    }

    console.log(`\n  ${fundas.length} tickers with fundamental data`);

    // Compute scores
    const scores = computeScores(fundas);
    const sqlPath = join(__dirname, "..", "db", "seeds", "seed_scores.sql");
    const rows = scores.map(s => ({
      ticker: s.ticker,
      date: SCORE_DATE,
      fields: { quality: s.quality, growth: s.growth, value: s.value, dividend: s.dividend, momentum: s.momentum } as Record<string, number>,
    }));
    writeInserts(sqlPath, "stock_scores", rows);
    console.log(`  Scores written to seed_scores.sql`);

    // Seed to D1
    run(`npx wrangler d1 execute quantbit-db --remote --command="DELETE FROM stock_scores WHERE score_date='${SCORE_DATE}'"`);
    run(`npx wrangler d1 execute quantbit-db --remote --file="${sqlPath}"`);

    // Verify
    const v = run(`npx wrangler d1 execute quantbit-db --remote --command="SELECT COUNT(*) as total FROM stock_scores WHERE score_date='${SCORE_DATE}'"`);
    console.log(v);
  }

  console.log("\nPipeline complete!");
}

main().catch(console.error);
