// Fetch company profiles (sector/industry/name) dari Yahoo -> tickers
// Run: npx tsx scripts/sync-profiles.ts

import { execSync } from "child_process";
import { writeFileSync } from "fs";
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
  return execSync(cmd, { cwd: __root, encoding: "utf-8", timeout: 120000 });
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function esc(v: any): string {
  if (v == null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

async function main() {
  console.log("=== Sync Company Profiles -> D1 ===");
  const { default: YF } = await import("yahoo-finance2");
  const yf = new YF({ suppressNotices: ["ripHistorical", "yahooSurvey"] as any });

  interface Profile {
    ticker: string;
    name: string | null;
    sector: string | null;
    industry: string | null;
  }

  const profiles: Profile[] = [];
  let count = 0;

  for (const tkr of TICKERS) {
    count++;
    const clean = tkr.replace(".JK", "");
    process.stdout.write(`[${count}/${TICKERS.length}] ${tkr}...`);
    try {
      const r = await yf.quoteSummary(tkr, {
        modules: ["summaryProfile", "price"],
      });
      const sp = r.summaryProfile;
      const p = r.price;
      const name = p?.longName || p?.shortName || null;
      const sector = sp?.sector || null;
      const industry = sp?.industry || null;

      if (name || sector || industry) {
        profiles.push({ ticker: clean, name, sector, industry });
        process.stdout.write(` ${sector ?? "-"} / ${industry ?? "-"}\n`);
      } else {
        process.stdout.write(" no data\n");
      }
    } catch (e) {
      process.stdout.write(" FAIL\n");
    }
    await sleep(400);
  }

  console.log(`\n✓ ${profiles.length} profiles fetched`);

  // Generate UPDATE SQL
  const sqlLines: string[] = [];
  for (const p of profiles) {
    const updates: string[] = [];
    if (p.name != null) updates.push(`name=${esc(p.name)}`);
    if (p.sector != null) updates.push(`sector=${esc(p.sector)}`);
    if (p.industry != null) updates.push(`industry=${esc(p.industry)}`);
    if (updates.length > 0) {
      sqlLines.push(`UPDATE tickers SET ${updates.join(", ")} WHERE ticker=${esc(p.ticker)};`);
    }
  }

  if (sqlLines.length === 0) {
    console.log("No profiles to update");
    return;
  }

  const tmpFile = join(__root, "db", "seeds", "_profiles.sql");
  writeFileSync(tmpFile, sqlLines.join("\n") + "\n", "utf-8");
  console.log(`\n${sqlLines.length} UPDATE statements written to _profiles.sql`);

  console.log("Seeding to D1...");
  run(`npx wrangler d1 execute quantbit-db --remote --file="${tmpFile}"`);
  console.log("Done!");
}

main().catch(e => { console.error(e); process.exit(1); });
