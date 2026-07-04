// Fetch fundamental dari Yahoo -> stock_scores
// Run: npx tsx scripts/sync-fundamentals.ts

import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const __root = join(__dirname, "..");
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

function run(cmd: string): string {
  return execSync(cmd, { cwd: __root, encoding: "utf-8", timeout: 60000 });
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

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

interface Funda {
  ticker: string;
  per: number; pbv: number; payout: number; dy: number; dr: number;
  roe: number; pm: number; om: number; gm: number;
  rg: number; eg: number; mc: number;
}

async function main() {
  console.log("=== Sync Fundamentals -> D1 ===");
  const { default: YF } = await import("yahoo-finance2");
  const yf = new YF({ suppressNotices: ["yahooSurvey"] as any });
  const data: Funda[] = [];

  // Fetch all
  let count = 0;
  for (const tkr of TICKERS) {
    count++;
    process.stdout.write(`[${count}/${TICKERS.length}] ${tkr}`);
    try {
      const r = await yf.quoteSummary(tkr, {
        modules: ["price", "summaryDetail", "financialData", "defaultKeyStatistics"],
      });
      const p = r.price; const sd = r.summaryDetail; const fd = r.financialData; const ks = r.defaultKeyStatistics;
      if (!p?.regularMarketPrice) { process.stdout.write(" - no price\n"); continue; }

      data.push({
        ticker: tkr.replace(".JK", ""),
        per: sd?.trailingPE,
        pbv: ks?.priceToBook,
        payout: sd?.payoutRatio,
        dy: sd?.dividendYield,
        dr: sd?.dividendRate,
        roe: fd?.returnOnEquity,
        pm: fd?.profitMargins,
        om: fd?.operatingMargins,
        gm: fd?.grossMargins,
        rg: fd?.revenueGrowth,
        eg: fd?.earningsGrowth,
        mc: p?.marketCap,
      });
      process.stdout.write(` PER:${(sd?.trailingPE ?? -1).toFixed(1)} PBV:${(ks?.priceToBook ?? -1).toFixed(2)} ROE:${(fd?.returnOnEquity != null ? (fd?.returnOnEquity * 100).toFixed(1) : "-") + "%"}\n`);
    } catch (e) {
      process.stdout.write(" FAIL\n");
    }
    await sleep(400);
  }

  console.log(`\n✓ ${data.length} tickers fetched`);

  // Extract arrays for quantile computation
  const per = data.map(d => d.per).filter(v => v != null && v > 0);
  const pbv = data.map(d => d.pbv).filter(v => v != null && v > 0);
  const payout = data.map(d => d.payout).filter(v => v != null);
  const dy = data.map(d => d.dy).filter(v => v != null);
  const roe = data.map(d => d.roe).filter(v => v != null);
  const pm = data.map(d => d.pm).filter(v => v != null);
  const om = data.map(d => d.om).filter(v => v != null);
  const rg = data.map(d => d.rg).filter(v => v != null);
  const eg = data.map(d => d.eg).filter(v => v != null);

  // Compute scores
  const scores: string[] = [`DELETE FROM stock_scores WHERE score_date='${SCORE_DATE}';`];
  let scored = 0;

  for (const d of data) {
    if (!d.mc || d.mc <= 0) continue;

    const quality = avg([
      d.roe != null ? quantile(roe, d.roe) : undefined,
      d.pm != null ? quantile(pm, d.pm) : undefined,
      d.om != null ? quantile(om, d.om) : undefined,
    ]);

    const growth = avg([
      d.rg != null ? quantile(rg, d.rg) : undefined,
      d.eg != null ? quantile(eg, d.eg) : undefined,
    ]);

    const valueScore = avg([
      d.per != null && d.per > 0 && per.length > 1 ? invert(per, d.per) : undefined,
      d.pbv != null && d.pbv > 0 && pbv.length > 1 ? invert(pbv, d.pbv) : undefined,
    ]);

    const dividend = avg([
      d.dy != null && dy.length > 1 ? quantile(dy, d.dy) : undefined,
      d.payout != null && payout.length > 1 ? quantile(payout, d.payout) : undefined,
    ]);

    const q = Math.round(quality * 1000) / 10;
    const g = Math.round(growth * 1000) / 10;
    const v = Math.round(valueScore * 1000) / 10;
    const div = Math.round(dividend * 1000) / 10;

    scores.push(`INSERT INTO stock_scores(ticker,score_date,quality,growth,value,dividend) VALUES('${d.ticker}','${SCORE_DATE}',${q},${g},${v},${div});`);
    scored++;
  }

  console.log(`${scored} tickers scored`);

  // Write & seed
  const sqlPath = join(__root, "db", "seeds", "seed_scores.sql");
  writeFileSync(sqlPath, scores.join("\n") + "\n", "utf-8");
  console.log("Seeding D1...");

  run(`npx wrangler d1 execute quantbit-db --remote --file="${sqlPath}"`);

  // Compute momentum from prices
  console.log("\nComputing momentum...");
  const raw = run(`npx wrangler d1 execute quantbit-db --remote --json --command="SELECT l.ticker,(l.close-COALESCE(p6.close,l.close))/COALESCE(NULLIF(p6.close,0),l.close) as mom6m,(l.close-COALESCE(p12.close,l.close))/COALESCE(NULLIF(p12.close,0),l.close) as mom12m FROM (SELECT ticker,close FROM stock_daily WHERE date=(SELECT MAX(date) FROM stock_daily)) l LEFT JOIN (SELECT ticker,close FROM stock_daily WHERE(ticker,date) IN(SELECT ticker,MAX(date) FROM stock_daily WHERE date<='2026-01-03' GROUP BY ticker)) p6 ON l.ticker=p6.ticker LEFT JOIN (SELECT ticker,close FROM stock_daily WHERE(ticker,date) IN(SELECT ticker,MAX(date) FROM stock_daily WHERE date<='2025-07-03' GROUP BY ticker)) p12 ON l.ticker=p12.ticker"`);
  const momData = JSON.parse(raw);
  const momRows = momData[0]?.results || [];
  if (momRows.length > 0) {
    const mom6 = [...momRows].sort((a: any, b: any) => a.mom6m - b.mom6m);
    const mom12 = [...momRows].sort((a: any, b: any) => a.mom12m - b.mom12m);
    const n = momRows.length;
    const r6 = new Map(mom6.map((r: any, i: number) => [r.ticker, i / (n - 1)]));
    const r12 = new Map(mom12.map((r: any, i: number) => [r.ticker, i / (n - 1)]));

    const momLines = [`DELETE FROM stock_scores WHERE score_date='${SCORE_DATE}' AND momentum IS NOT NULL;`];
    for (const r of momRows) {
      const score = Math.round(((r6.get(r.ticker)! + r12.get(r.ticker)!) / 2) * 1000) / 10;
      momLines.push(`UPDATE stock_scores SET momentum=${score} WHERE ticker='${r.ticker}' AND score_date='${SCORE_DATE}';`);
    }
    const momSql = join(__root, "db", "seeds", "_momentum.sql");
    writeFileSync(momSql, momLines.join("\n") + "\n", "utf-8");
    run(`npx wrangler d1 execute quantbit-db --remote --file="${momSql}"`);
    console.log(`  ${momRows.length} momentum scores updated`);
  }

  // Verify
  const v = run(`npx wrangler d1 execute quantbit-db --remote --command="SELECT COUNT(*) as total, ROUND(AVG(quality),1) as avg_q, ROUND(AVG(growth),1) as avg_g, ROUND(AVG(value),1) as avg_v, ROUND(AVG(dividend),1) as avg_d, ROUND(AVG(momentum),1) as avg_m FROM stock_scores WHERE score_date='${SCORE_DATE}'"`);
  console.log(v);
  console.log("Done!");
}

main().catch(console.error);
