import { execSync } from "child_process";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const __root = join(__dirname, "..");
const TODAY = new Date().toISOString().split("T")[0];
const SCORE_DATE = TODAY;

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

function run(cmd: string): string {
  return execSync(cmd, { cwd: __root, encoding: "utf-8", timeout: 120000 });
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function fmtDate(d: Date): string { return d.toISOString().split("T")[0]; }

function esc(v: any): string {
  if (v == null || v === undefined) return "NULL";
  if (typeof v === "number") return isFinite(v) ? String(v) : "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlPath(name: string): string {
  const dir = join(__dirname, "..", "db", "seeds");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, name);
}

// ── Fetch: Prices (chart) ──
async function fetchPrices(symbol: string, startDate: string): Promise<Record<string, any>> {
  const { default: YF } = await import("yahoo-finance2");
  const yf = new YF({ suppressNotices: ["ripHistorical", "yahooSurvey"] as any });
  const result: Record<string, any> = {};
  try {
    const raw = await yf.chart(symbol, { period1: startDate, interval: "1d" });
    for (const q of raw.quotes || []) {
      if (!q.date || !q.close || q.close <= 0) continue;
      const d = new Date(q.date);
      if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
      result[fmtDate(d)] = {
        close: q.close, open: q.open, high: q.high, low: q.low, volume: q.volume ?? 0,
        adjclose: q.adjclose ?? q.close,
      };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stdout.write(`⚠️ ${symbol} FAILED: ${msg.split("\n")[0].slice(0, 80)}`);
  }
  return result;
}

// ── Write prices to SQL ──
function writePriceSQL(
  macroData: Record<string, Record<string, { close: number; open?: number; high?: number; low?: number }>>,
  stockData: Record<string, Record<string, { close: number; open?: number; high?: number; low?: number; volume?: number; adjclose?: number }>>,
): string[] {
  const lines: string[] = [];
  const allDates = new Set<string>();

  for (const m of MACRO) {
    for (const d of Object.keys(macroData[m.field] || {})) allDates.add(d);
  }
  for (const tkr of TICKERS) {
    const clean = tkr.replace(".JK", "");
    for (const d of Object.keys(stockData[clean] || {})) allDates.add(d);
  }

  const sortedDates = [...allDates].sort();

  for (const date of sortedDates) {
    const ihsg = macroData.ihsg?.[date];
    const gold = macroData.gold?.[date];
    const usdidr = macroData.usdidr?.[date];

    if (ihsg || gold || usdidr) {
      // Always write the base market row (all macro fields, INSERT OR IGNORE preserves existing)
      lines.push(
        `INSERT OR IGNORE INTO market_daily(date,ihsg_close,ihsg_open,ihsg_high,ihsg_low,gold_close,gold_open,gold_high,gold_low,usdidr_rate) VALUES(` +
        `'${date}',` +
        `${esc(ihsg?.close)},${esc(ihsg?.open)},${esc(ihsg?.high)},${esc(ihsg?.low)},` +
        `${esc(gold?.close)},${esc(gold?.open)},${esc(gold?.high)},${esc(gold?.low)},` +
        `${esc(usdidr?.close)}` +
        `);`
      );
    }
    if (gold && gold.close > 0) {
      // Separate UPDATE to fix existing rows that have NULL/0 gold from previous GC=F failures
      lines.push(
        `UPDATE market_daily SET ` +
        `gold_close=${esc(gold.close)},gold_open=${esc(gold.open)},gold_high=${esc(gold.high)},gold_low=${esc(gold.low)} ` +
        `WHERE date='${date}' AND (gold_close IS NULL OR gold_close = 0);`
      );
    }

    for (const tkr of TICKERS) {
      const clean = tkr.replace(".JK", "");
      const s = stockData[clean]?.[date];
      if (s) {
        lines.push(
          `INSERT OR IGNORE INTO stock_daily(date,ticker,close,adj_close,open,high,low,volume) VALUES(` +
          `'${date}','${clean}',` +
          `${esc(s.close)},${esc(s.adjclose ?? s.close)},${esc(s.open)},${esc(s.high)},${esc(s.low)},${esc(s.volume)}` +
          `);`
        );
      }
    }
  }

  return lines;
}

// ── Fetch & Write: Fundamentals + Scores ──
interface Funda {
  ticker: string;
  per: number; pbv: number; payout: number; dy: number; dr: number;
  roe: number; pm: number; om: number; gm: number;
  rg: number; eg: number; mc: number;
}

function avg(vals: (number | undefined)[]): number {
  const nums = vals.filter(v => v != null && isFinite(v)) as number[];
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function quantile(arr: number[], val: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = sorted.findIndex(x => x === val);
  if (idx < 0) return 0.5;
  return idx / (sorted.length - 1);
}

function invert(arr: number[], val: number): number {
  return 1 - quantile(arr, val);
}

async function fetchFundamentals(symbol: string): Promise<Funda | null> {
  const { default: YF } = await import("yahoo-finance2");
  const yf = new YF({ suppressNotices: ["yahooSurvey"] as any });
  try {
    const r = await yf.quoteSummary(symbol, {
      modules: ["price", "summaryDetail", "financialData", "defaultKeyStatistics"],
    });
    const p = r.price; const sd = r.summaryDetail; const fd = r.financialData; const ks = r.defaultKeyStatistics;
    if (!p?.regularMarketPrice) return null;
    return {
      ticker: symbol.replace(".JK", ""),
      per: sd?.trailingPE, pbv: ks?.priceToBook, payout: sd?.payoutRatio,
      dy: sd?.dividendYield, dr: sd?.dividendRate,
      roe: fd?.returnOnEquity, pm: fd?.profitMargins, om: fd?.operatingMargins, gm: fd?.grossMargins,
      rg: fd?.revenueGrowth, eg: fd?.earningsGrowth, mc: p?.marketCap,
    };
  } catch (e) { return null; }
}

function computeScoreSQL(data: Funda[], scoreDate: string): string[] {
  const per = data.map(d => d.per).filter(v => v != null && v > 0);
  const pbv = data.map(d => d.pbv).filter(v => v != null && v > 0);
  const payout = data.map(d => d.payout).filter(v => v != null);
  const dy = data.map(d => d.dy).filter(v => v != null);
  const roe = data.map(d => d.roe).filter(v => v != null);
  const pm = data.map(d => d.pm).filter(v => v != null);
  const om = data.map(d => d.om).filter(v => v != null);
  const rg = data.map(d => d.rg).filter(v => v != null);
  const eg = data.map(d => d.eg).filter(v => v != null);

  const lines: string[] = [`DELETE FROM stock_scores WHERE score_date='${scoreDate}';`];
  for (const d of data) {
    if (!d.mc || d.mc <= 0) continue;
    const quality = Math.round(avg([
      d.roe != null ? quantile(roe, d.roe) : undefined,
      d.pm != null ? quantile(pm, d.pm) : undefined,
      d.om != null ? quantile(om, d.om) : undefined,
    ]) * 1000) / 10;

    const growth = Math.round(avg([
      d.rg != null ? quantile(rg, d.rg) : undefined,
      d.eg != null ? quantile(eg, d.eg) : undefined,
    ]) * 1000) / 10;

    const valueScore = Math.round(avg([
      d.per != null && d.per > 0 && per.length > 1 ? invert(per, d.per) : undefined,
      d.pbv != null && d.pbv > 0 && pbv.length > 1 ? invert(pbv, d.pbv) : undefined,
    ]) * 1000) / 10;

    const dividend = Math.round(avg([
      d.dy != null && dy.length > 1 ? quantile(dy, d.dy) : undefined,
      d.payout != null && payout.length > 1 ? quantile(payout, d.payout) : undefined,
    ]) * 1000) / 10;

    lines.push(
      `INSERT INTO stock_scores(ticker,score_date,quality,growth,value,dividend) VALUES('${d.ticker}','${scoreDate}',${quality},${growth},${valueScore},${dividend});`
    );
  }
  return lines;
}

function computeMomentumSQL(scoreDate: string): string[] {
  // Ambil latest date from stock_daily
  const raw = run(`npx wrangler d1 execute quantbit-db --remote --json --command="SELECT l.ticker,(l.close-COALESCE(p6.close,l.close))/COALESCE(NULLIF(p6.close,0),l.close) as mom6m,(l.close-COALESCE(p12.close,l.close))/COALESCE(NULLIF(p12.close,0),l.close) as mom12m FROM (SELECT ticker,close FROM stock_daily WHERE date=(SELECT MAX(date) FROM stock_daily)) l LEFT JOIN (SELECT ticker,close FROM stock_daily WHERE(ticker,date) IN(SELECT ticker,MAX(date) FROM stock_daily WHERE date<=DATE('now','-6 months') GROUP BY ticker)) p6 ON l.ticker=p6.ticker LEFT JOIN (SELECT ticker,close FROM stock_daily WHERE(ticker,date) IN(SELECT ticker,MAX(date) FROM stock_daily WHERE date<=DATE('now','-12 months') GROUP BY ticker)) p12 ON l.ticker=p12.ticker"`);
  const momData = JSON.parse(raw);
  const momRows = momData[0]?.results || [];
  if (momRows.length === 0) return [];

  const mom6 = [...momRows].sort((a: any, b: any) => a.mom6m - b.mom6m);
  const mom12 = [...momRows].sort((a: any, b: any) => a.mom12m - b.mom12m);
  const n = momRows.length;
  const r6 = new Map(mom6.map((r: any, i: number) => [r.ticker, i / (n - 1)]));
  const r12 = new Map(mom12.map((r: any, i: number) => [r.ticker, i / (n - 1)]));

  const lines: string[] = [`DELETE FROM stock_scores WHERE score_date='${scoreDate}' AND momentum IS NOT NULL;`];
  for (const r of momRows) {
    const score = Math.round(((r6.get(r.ticker)! + r12.get(r.ticker)!) / 2) * 1000) / 10;
    lines.push(`UPDATE stock_scores SET momentum=${score} WHERE ticker='${r.ticker}' AND score_date='${scoreDate}';`);
  }
  return lines;
}

// ── Main ──
async function main() {
  const full = process.argv.includes("--full");
  const mode = process.argv.find(a => !a.startsWith("-")) || "all";
  console.log(`Pipeline Sync [${mode}]${full ? ' --full' : ''} — ${TODAY}`);

  const startDate = full ? "2021-01-01" : (
    (() => { const d = new Date(); d.setDate(d.getDate() - 10); return d.toISOString().split("T")[0]; })()
  );

  // ── 1. PRICES ──
  if (mode === "all" || mode === "prices") {
    console.log("\n=== Prices ===");
    const macroData: Record<string, Record<string, any>> = {};
    for (const m of MACRO) {
      process.stdout.write(`  ${m.symbol}...`);
      macroData[m.field] = await fetchPrices(m.symbol, startDate);
      const dayCount = Object.keys(macroData[m.field]).length;
      process.stdout.write(` ${dayCount} days\n`);
      if (m.field === "gold" && dayCount === 0) {
        console.error(`\n  ⚠️ WARNING: GC=F (gold) returned 0 days — gold_close will NOT be updated`);
      }
      await sleep(300);
    }

    const stockData: Record<string, Record<string, any>> = {};
    let count = 0;
    for (const tkr of TICKERS) {
      count++;
      process.stdout.write(`  [${count}/${TICKERS.length}] ${tkr}...`);
      const clean = tkr.replace(".JK", "");
      stockData[clean] = await fetchPrices(tkr, startDate);
      process.stdout.write(` ${Object.keys(stockData[clean]).length} days\n`);
      await sleep(200);
    }

    // Generate SQL
    const priceLines = writePriceSQL(macroData, stockData);
    if (priceLines.length > 0) {
      const priceSql = sqlPath("_prices.sql");
      writeFileSync(priceSql, priceLines.join("\n") + "\n", "utf-8");
      console.log(`  ${priceLines.length} SQL lines written to _prices.sql`);

      // Seed to D1
      console.log("  Seeding prices to D1...");
      run(`npx wrangler d1 execute quantbit-db --remote --file="${priceSql}"`);
      console.log("  Prices seeded OK");
    } else {
      console.log("  No new price data");
    }
  }

  // ── 2. FUNDAMENTALS + SCORES ──
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
        process.stdout.write(` PER:${f.per?.toFixed(1) ?? "-"} PBV:${f.pbv?.toFixed(2) ?? "-"} ROE:${(f.roe != null ? (f.roe * 100).toFixed(1) : "-") + "%"}\n`);
      } else {
        process.stdout.write(" FAILED\n");
      }
      await sleep(500);
    }

    console.log(`\n  ${fundas.length} tickers with fundamental data`);

    // Compute & write scores
    const scoreLines = computeScoreSQL(fundas, SCORE_DATE);
    const scoreSql = sqlPath("seed_scores.sql");
    writeFileSync(scoreSql, scoreLines.join("\n") + "\n", "utf-8");
    console.log(`  ${scoreLines.length - 1} tickers scored`);

    console.log("  Seeding scores to D1...");
    run(`npx wrangler d1 execute quantbit-db --remote --file="${scoreSql}"`);

    // Compute momentum
    console.log("\n  Computing momentum...");
    const momLines = computeMomentumSQL(SCORE_DATE);
    if (momLines.length > 0) {
      const momSql = sqlPath("_momentum.sql");
      writeFileSync(momSql, momLines.join("\n") + "\n", "utf-8");
      run(`npx wrangler d1 execute quantbit-db --remote --file="${momSql}"`);
      console.log(`  ${momLines.length - 1} momentum scores updated`);
    }

    // Verify
    const v = run(`npx wrangler d1 execute quantbit-db --remote --command="SELECT COUNT(*) as total, ROUND(AVG(quality),1) as avg_q, ROUND(AVG(growth),1) as avg_g, ROUND(AVG(value),1) as avg_v, ROUND(AVG(dividend),1) as avg_d, ROUND(AVG(momentum),1) as avg_m FROM stock_scores WHERE score_date='${SCORE_DATE}'"`);
    console.log(v);
  }

  console.log("\nPipeline complete!");
}

main().catch(e => { console.error(e); process.exit(1); });
