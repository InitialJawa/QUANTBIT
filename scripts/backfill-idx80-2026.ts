import { execSync } from "child_process";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const __root = join(__dirname, "..");
const TODAY = new Date().toISOString().split("T")[0];

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

async function fetchDividendAndPrice(symbol: string): Promise<{ dps: Record<string, number>, lastPrice: number }> {
  const { default: YF } = await import("yahoo-finance2");
  const yf = new YF({ suppressNotices: ["ripHistorical", "yahooSurvey"] as any });
  const dpsByYear: Record<string, number> = {};
  let lastPrice = 0;
  try {
    const raw = await yf.chart(symbol, { period1: "2021-01-01", interval: "1d" });
    for (const evt of raw.events?.dividends || []) {
      if (evt.amount && evt.amount > 0) {
        const year = new Date(evt.date).getFullYear().toString();
        dpsByYear[year] = (dpsByYear[year] || 0) + evt.amount;
      }
    }
    const quotes = raw.quotes || [];
    if (quotes.length > 0) {
      lastPrice = quotes[quotes.length - 1].close || 0;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    process.stdout.write(`  ⚠️ ${symbol} failed: ${msg.split("\n")[0].slice(0, 60)}\n`);
  }
  return { dps: dpsByYear, lastPrice };
}

async function main() {
  console.log(`=== Add 2026 idx80_scans data (using last available price) ===\n`);

  const allLines: string[] = [];
  let count = 0;

  for (const tkr of TICKERS) {
    count++;
    const clean = tkr.replace(".JK", "");
    process.stdout.write(`[${count}/${TICKERS.length}] ${clean}...`);

    const { dps, lastPrice } = await fetchDividendAndPrice(tkr);

    const dps2026 = dps["2026"];
    if (!dps2026 || dps2026 <= 0 || lastPrice <= 0) {
      process.stdout.write(` skip (no 2026 div or price)\n`);
      await sleep(300);
      continue;
    }

    const dividendYield = (dps2026 / lastPrice) * 100;
    if (dividendYield <= 0 || dividendYield > 50) {
      process.stdout.write(` skip (DY=${dividendYield.toFixed(2)}%)\n`);
      await sleep(300);
      continue;
    }

    allLines.push(
      `INSERT OR REPLACE INTO idx80_scans(ticker,scan_date,current_price,pe_ratio,pb_ratio,market_cap,volume,dividend_yield,week_52_high,week_52_low) VALUES(` +
      `'${clean}','${TODAY}',${esc(lastPrice)},NULL,NULL,NULL,NULL,` +
      `${Math.round(dividendYield * 100) / 100},NULL,NULL);`
    );
    process.stdout.write(` DPS2026:${dps2026.toFixed(2)} Price:${lastPrice} DY:${dividendYield.toFixed(2)}%\n`);
    await sleep(300);
  }

  if (allLines.length === 0) {
    console.log("\nNo 2026 data to insert!");
    return;
  }

  const sqlFile = sqlPath("_idx80_scans_2026.sql");
  writeFileSync(sqlFile, allLines.join("\n") + "\n", "utf-8");
  console.log(`\n${allLines.length} rows written`);

  console.log("\nSeeding to D1...");
  run(`npx wrangler d1 execute quantbit-db --remote --file="${sqlFile}"`);
  console.log("Done!");

  const v = run(`npx wrangler d1 execute quantbit-db --remote --command="SELECT ticker, scan_date, ROUND(dividend_yield,2) as dy, ROUND(current_price,0) as price FROM idx80_scans WHERE scan_date='${TODAY}' ORDER BY ticker LIMIT 15"`);
  console.log("\nSample 2026 data:");
  console.log(v);
}

main().catch(e => { console.error(e); process.exit(1); });
