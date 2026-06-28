/**
 * seed-db.ts — Migrate data/years/*.json + IDX fondamentals ke SQLite DB.
 *
 * Baca historical market data dari file JSON, trus INSERT ke:
 *   - daily_overview   (ihsg_close, gold_idr, usdidr_rate per hari)
 *   - stock_daily       (close, volume, rank, score per saham per hari)
 *   - stock_fundamentals (quality, growth, value, momentum, dividend per ticker)
 *
 * Jalanin: npx tsx scripts/seed-db.ts
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, resolve } from "path";
import Database from "better-sqlite3";

const ROOT = resolve(import.meta.dirname, "..");
const DB_PATH = join(ROOT, "data", "historical_market.sqlite"); // local SQLite
const YEARS_DIR = join(ROOT, "data", "years");

function openDb(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = OFF");
  return db;
}

/** Ensure destination tables exist (same schema as migration 0003). */
function ensureTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_overview (
      date TEXT PRIMARY KEY,
      ihsg_close REAL NOT NULL,
      gold_idr REAL,
      usdidr_rate REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS stock_daily (
      date TEXT NOT NULL,
      ticker TEXT NOT NULL,
      close REAL,
      adj_close REAL,
      volume INTEGER,
      rank_prod INTEGER,
      rank_res INTEGER,
      norm_score REAL,
      raw_metrics TEXT,
      PRIMARY KEY (date, ticker)
    );
    CREATE TABLE IF NOT EXISTS stock_fundamentals (
      ticker TEXT PRIMARY KEY,
      quality REAL DEFAULT 0,
      growth REAL DEFAULT 0,
      value REAL DEFAULT 0,
      momentum REAL DEFAULT 0,
      dividend REAL DEFAULT 0,
      final_score REAL DEFAULT 0,
      sector TEXT DEFAULT '',
      industry TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function seedMarketData(db: Database.Database) {
  const insertOverview = db.prepare(`
    INSERT OR REPLACE INTO daily_overview (date, ihsg_close, gold_idr, usdidr_rate)
    VALUES (?, ?, ?, ?)
  `);
  const insertStockDaily = db.prepare(`
    INSERT OR REPLACE INTO stock_daily (date, ticker, close, adj_close, volume, rank_prod, rank_res, norm_score, raw_metrics)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const yearFiles = readdirSync(YEARS_DIR)
    .filter(f => f.endsWith(".json"))
    .sort();

  let totalDays = 0;
  let totalStockRows = 0;

  const txn = db.transaction(() => {
    for (const file of yearFiles) {
      const yearPath = join(YEARS_DIR, file);
      const entries: any[] = JSON.parse(readFileSync(yearPath, "utf-8"));
      console.log(`  ${file}: ${entries.length} days`);

      for (const day of entries) {
        insertOverview.run(day.date, day.ihsgPrice, day.goldPrice, day.usdidrRate);

        const tickers = Object.keys(day.stockPrices || {});
        for (const ticker of tickers) {
          const rawMetrics = JSON.stringify({
            open: day.stockOpens?.[ticker],
            high: day.stockHighs?.[ticker],
            low: day.stockLows?.[ticker],
          });
          insertStockDaily.run(
            day.date,
            ticker,
            day.stockPrices?.[ticker] ?? null,
            day.stockAdjPrices?.[ticker] ?? null,
            day.stockVolumes?.[ticker] ?? null,
            day.stockRanksProd?.[ticker] ?? null,
            day.stockRanksRes?.[ticker] ?? null,
            day.stockNormScores?.[ticker] ?? null,
            rawMetrics,
          );
          totalStockRows++;
        }
        totalDays++;
      }
    }
  });

  console.log("Seeding market data...");
  txn();
  console.log(`  Done: ${totalDays} days, ${totalStockRows} stock rows`);
}

function seedFundamentals(db: Database.Database) {
  const paths = [
    join(ROOT, "data", "idx80_scan.json"),
    join(ROOT, "data", "idx_fundamentals_all.json"),
    join(ROOT, "data", "fundamental_snapshots.json"),
  ];

  const insert = db.prepare(`
    INSERT OR REPLACE INTO stock_fundamentals (ticker, quality, growth, value, momentum, dividend, final_score, sector, industry, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  let count = 0;
  for (const fp of paths) {
    if (!existsSync(fp)) { console.log(`  SKIP (not found): ${fp}`); continue; }
    const data: any = JSON.parse(readFileSync(fp, "utf-8"));
    const stocks = data.stocks || data.data || data || [];
    const txn = db.transaction(() => {
      for (const s of stocks) {
        const ticker = s.ticker || s.Ticker || s.kode;
        if (!ticker) continue;
        insert.run(
          ticker?.toUpperCase(),
          parseFloat(s.quality || s.Quality || s.SCORES?.quality || 0),
          parseFloat(s.growth || s.Growth || s.SCORES?.growth || 0),
          parseFloat(s.value || s.Value || s.SCORES?.value || 0),
          parseFloat(s.momentum || s.Momentum || s.SCORES?.momentum || 0),
          parseFloat(s.dividend || s.Dividend || s.SCORES?.dividend || 0),
          parseFloat(s.final_score || s.FinalScore || s.SCORE || 0),
          s.sector || s.Sector || "",
          s.industry || s.Industry || "",
        );
        count++;
      }
    });
    txn();
    console.log(`  ${fp.replace(ROOT + "/", "")}: ${stocks.length} entries → ${count} total`);
  }
  console.log(`  Done: ${count} fundamentals rows`);
}

function main() {
  console.log("Seeding DB from data/years/*.json + idx scans\n");

  if (!existsSync(YEARS_DIR)) {
    console.error(`ERROR: years dir not found at ${YEARS_DIR}`);
    process.exit(1);
  }

  const db = openDb();
  ensureTables(db);
  seedMarketData(db);
  seedFundamentals(db);
  db.close();

  console.log("\nDone. DB at:", DB_PATH);
}

main();
