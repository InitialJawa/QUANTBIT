// ─────────────────────────────────────────────────────────────
// sync-daily-data.ts — Fetch Yahoo Finance EOD data untuk IDX
// dan upsert ke `data/years/<tahun>.json` + rebuild SQLite DB.
//
// Usage:
//   npx tsx scripts/sync-daily-data.ts [YYYY-MM-DD]
//
// Jika tanggal tidak diberikan, pakai hari kerja terakhir.
// ─────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data", "years");

// Ticker mapping: symbol di file (clean) → Yahoo symbol (with .JK suffix)
function yahooSymbol(ticker: string): string {
  if (ticker === "IHSG") return "^JKSE";
  if (ticker === "GOLD") return "GC=F";
  if (ticker === "USDIDR") return "USDIDR=X";
  return ticker.includes(".") ? ticker : `${ticker}.JK`;
}

function cleanTicker(sym: string): string {
  if (sym === "^JKSE") return "IHSG";
  if (sym === "GC=F") return "GOLD";
  if (sym === "USDIDR=X") return "USDIDR";
  return sym.replace(".JK", "");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchYahooSpark(tickers: string[]): Promise<Record<string, { close: number; volume: number }>> {
  const batchSize = 50;
  const result: Record<string, { close: number; volume: number }> = {};

  for (let i = 0; i < tickers.length; i += batchSize) {
    const batch = tickers.slice(i, i + batchSize);
    const url = `https://query1.finance.yahoo.com/v8/finance/spark?symbols=${batch.join(",")}`;
    
    try {
      const resp = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "application/json",
        },
      });

      if (!resp.ok) {
        console.warn(`  Yahoo HTTP ${resp.status} untuk batch ${i / batchSize + 1}, skip`);
        continue;
      }

      const data: any = await resp.json();
      for (const [symRaw, item] of Object.entries(data)) {
        const clean = cleanTicker(symRaw);
        const d = item as any;
        if (d?.close?.length) {
          const closes = d.close.filter((c: any) => typeof c === "number" && c > 0);
          const volumes = d.volume?.filter((v: any) => typeof v === "number" && v > 0) || [];
          const lc = closes[closes.length - 1];
          const lv = volumes.length > 0 ? volumes[volumes.length - 1] : 0;
          if (lc > 0) {
            result[clean] = { close: Number(lc), volume: Number(lv || 0) };
          }
        }
      }

      console.log(`  Batch ${i / batchSize + 1}: ${batch.length} tickers → ${Object.keys(result).length} results`);
    } catch (err: any) {
      console.warn(`  Fetch error batch ${i / batchSize + 1}: ${err.message}`);
    }

    if (i + batchSize < tickers.length) {
      await sleep(500);
    }
  }

  return result;
}

async function main() {
  const targetDate = process.argv[2];
  const today = targetDate
    ? new Date(targetDate)
    : new Date(Date.now() + 7 * 60 * 60 * 1000); // WIB
  const dateStr = today.toISOString().slice(0, 10);
  const yearStr = dateStr.slice(0, 4);
  const yearFile = path.join(DATA_DIR, `${yearStr}.json`);

  console.log(`\n=== Sync Daily Data: ${dateStr} ===`);

  if (!fs.existsSync(yearFile)) {
    console.error(`ERROR: File tahun ${yearFile} tidak ditemukan.`);
    process.exit(1);
  }

  // Baca data tahun yang sudah ada
  const allData: any[] = JSON.parse(fs.readFileSync(yearFile, "utf-8"));
  const lastEntry = allData[allData.length - 1];

  if (!lastEntry || !lastEntry.stockPrices) {
    console.error("ERROR: Data tahun tidak memiliki entry valid.");
    process.exit(1);
  }

  // Cek duplikasi — skip jika sudah ada entry untuk tanggal ini
  if (allData.some((d) => d.date === dateStr)) {
    console.log(`  Data untuk ${dateStr} sudah ada. Lewati.`);
    console.log("  Gunakan `--force` untuk menimpa.");
    if (!process.argv.includes("--force")) {
      process.exit(0);
    }
  }

  // Cek apakah hari kerja (Senin-Jumat)
  const dow = today.getDay();
  if (dow === 0 || dow === 6) {
    console.log(`  ${dateStr} adalah akhir pekan. Tidak perlu sync.`);
    process.exit(0);
  }

  // Kumpulkan tickers dari data terakhir (IHSG, GOLD, USDIDR + semua saham)
  const metaTickers = ["^JKSE", "GC=F", "USDIDR=X"];
  const stockTickers = Object.keys(lastEntry.stockPrices).map(yahooSymbol);

  console.log(`  Meta tickers: ${metaTickers.join(", ")}`);
  console.log(`  Stock tickers: ${stockTickers.length} total`);

  // Fetch dari Yahoo
  console.log("\n  Fetching Yahoo Finance...");
  const allTickers = [...metaTickers, ...stockTickers];
  const prices = await fetchYahooSpark(allTickers);
  console.log(`  Got ${Object.keys(prices).length} prices`);

  // Cek apakah IHSG dapat — jika tidak, skip hari ini (mungkin libur)
  const ihsgPrice = prices["IHSG"]?.close;
  if (!ihsgPrice || ihsgPrice <= 0) {
    console.log(`  IHSG tidak dapat (${
      prices["IHSG"] ? "0 atau undefined" : "missing"
    }). Mungkin hari libur. Skip.`);
    if (!process.argv.includes("--force")) {
      process.exit(0);
    }
  }

  // Bangun entry baru
  const stockPrices: Record<string, number> = {};
  const stockAdjPrices: Record<string, number> = {};
  const stockVolumes: Record<string, number> = {};

  const stockTickerList = Object.keys(lastEntry.stockPrices);
  for (const ticker of stockTickerList) {
    const yKey = yahooSymbol(ticker);
    const p = prices[cleanTicker(yKey)];
    if (p && p.close > 0) {
      stockPrices[ticker] = p.close;
      stockAdjPrices[ticker] = p.close;
      stockVolumes[ticker] = p.volume;
    } else {
      // Fallback ke harga terakhir dari year file
      stockPrices[ticker] = lastEntry.stockPrices[ticker];
      stockAdjPrices[ticker] = lastEntry.stockAdjPrices?.[ticker] || lastEntry.stockPrices[ticker];
      stockVolumes[ticker] = lastEntry.stockVolumes?.[ticker] || 0;
    }
  }

  const goldPrice = prices["GOLD"]?.close || lastEntry.goldPrice;
  const usdidrRate = prices["USDIDR"]?.close || lastEntry.usdidrRate;

  const newEntry: Record<string, any> = {
    date: dateStr,
    ihsgPrice,
    goldPrice: goldPrice,
    usdidrRate: usdidrRate,
    stockPrices,
    stockAdjPrices,
    stockVolumes,
    stockOpens: lastEntry.stockOpens || {},
    stockHighs: lastEntry.stockHighs || {},
    stockLows: lastEntry.stockLows || {},
    stockRanksProd: lastEntry.stockRanksProd || {},
    stockRanksRes: lastEntry.stockRanksRes || {},
    stockNormScores: lastEntry.stockNormScores || {},
  };

  // Hapus duplikat jika ada
  const filtered = allData.filter((d) => d.date !== dateStr);
  filtered.push(newEntry);
  filtered.sort((a, b) => a.date.localeCompare(b.date));

  // Tulis ke year file
  fs.writeFileSync(yearFile, JSON.stringify(filtered, null, 2), "utf-8");
  console.log(`\n  ✓ ${yearFile} diperbarui: ${filtered.length} days (${dateStr})`);

  // Reseed SQLite DB
  console.log("\n  Mereseed SQLite DB...");
  try {
    const seedScript = path.join(ROOT, "scripts", "seed-db.py");
    if (fs.existsSync(seedScript)) {
      const pythonCmd = process.platform === "win32" ? "python" : "python3";
      execSync(`${pythonCmd} "${seedScript}"`, {
        encoding: "utf-8",
        timeout: 60000,
        cwd: ROOT,
      });
      console.log("  ✓ SQLite DB reseeded");
    }
  } catch (err: any) {
    console.warn("  ⚠ SQLite reseed gagal (mungkin Python tidak ada):", err.message);
    console.log("  Data tetap tersimpan di year file.");
  }

  console.log(`\n✓ Sync selesai: ${dateStr}`);
  console.log(`  IHSG: ${ihsgPrice} | GOLD: ${goldPrice} | USD/IDR: ${usdidrRate}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
