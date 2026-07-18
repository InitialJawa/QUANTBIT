import { execSync } from "child_process";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const __root = join(__dirname, "..");

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
  return execSync(cmd, { cwd: __root, encoding: "utf-8", timeout: 180000 });
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

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

async function fetchDividendHistory(symbol: string): Promise<Record<string, number>> {
  const { default: YF } = await import("yahoo-finance2");
  const yf = new YF({ suppressNotices: ["ripHistorical", "yahooSurvey"] as any });
  const dpsByYear: Record<string, number> = {};
  try {
    const raw = await yf.chart(symbol, { period1: "2021-01-01", interval: "1d" });
    for (const evt of raw.events?.dividends || []) {
      if (evt.amount && evt.amount > 0) {
        const year = new Date(evt.date).getFullYear().toString();
        dpsByYear[year] = (dpsByYear[year] || 0) + evt.amount;
      }
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stdout.write(`  ⚠️ ${symbol} dividend fetch failed: ${msg.split("\n")[0].slice(0, 80)}\n`);
  }
  return dpsByYear;
}

async function fetchPriceAtDate(symbol: string, dateStr: string): Promise<number> {
  const { default: YF } = await import("yahoo-finance2");
  const yf = new YF({ suppressNotices: ["ripHistorical", "yahooSurvey"] as any });
  try {
    const end = new Date(dateStr);
    end.setDate(end.getDate() + 10);
    const raw = await yf.chart(symbol, {
      period1: dateStr,
      interval: "1d",
    });
    const quotes = raw.quotes || [];
    if (quotes.length > 0) {
      return quotes[quotes.length - 1].close || 0;
    }
  } catch {}
  return 0;
}

async function main() {
  console.log("=== Backfill idx80_scans (dividend_yield historis 2021-2026) ===\n");

  const years = ["2021", "2022", "2023", "2024", "2025", "2026"];
  const allLines: string[] = [];
  let count = 0;

  for (const tkr of TICKERS) {
    count++;
    const clean = tkr.replace(".JK", "");
    process.stdout.write(`[${count}/${TICKERS.length}] ${clean}...`);

    const dpsByYear = await fetchDividendHistory(tkr);
    const hasDividends = Object.values(dpsByYear).some(d => d > 0);

    if (!hasDividends) {
      process.stdout.write(" no dividends\n");
      await sleep(300);
      continue;
    }

    for (const year of years) {
      const dps = dpsByYear[year];
      if (!dps || dps <= 0) continue;

      const scanDate = `${year}-12-31`;
      const price = await fetchPriceAtDate(tkr, scanDate);
      if (price <= 0) continue;

      const dividendYield = (dps / price) * 100;
      if (dividendYield <= 0 || dividendYield > 50) continue;

      allLines.push(
        `INSERT OR IGNORE INTO idx80_scans(ticker,scan_date,current_price,pe_ratio,pb_ratio,market_cap,volume,dividend_yield,week_52_high,week_52_low) VALUES(` +
        `'${clean}','${scanDate}',${esc(price)},NULL,NULL,NULL,NULL,` +
        `${Math.round(dividendYield * 100) / 100},NULL,NULL);`
      );
    }

    const yearsWithData = Object.entries(dpsByYear)
      .filter(([_, d]) => d > 0)
      .map(([y, d]) => `${y}:${d.toFixed(2)}`)
      .join(", ");
    process.stdout.write(` DPS: ${yearsWithData}\n`);
    await sleep(500);
  }

  if (allLines.length === 0) {
    console.log("\nNo dividend data to backfill!");
    return;
  }

  const sqlFile = sqlPath("_backfill_idx80_scans.sql");
  writeFileSync(sqlFile, allLines.join("\n") + "\n", "utf-8");
  console.log(`\n${allLines.length} rows written to _backfill_idx80_scans.sql`);

  console.log("\nSeeding to D1 remote...");
  run(`npx wrangler d1 execute quantbit-db --remote --file="${sqlFile}"`);
  console.log("Backfill complete!");

  const v = run(`npx wrangler d1 execute quantbit-db --remote --command="SELECT ticker, scan_date, dividend_yield FROM idx80_scans WHERE dividend_yield > 0 ORDER BY scan_date, ticker LIMIT 30"`);
  console.log("\nSample data:");
  console.log(v);
}

main().catch(e => { console.error(e); process.exit(1); });
