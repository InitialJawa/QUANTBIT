import Database from "better-sqlite3";
import { readFileSync, existsSync, statSync } from "fs";
import { join } from "path";

function main() {
  const cwd = process.cwd();
  const jsonPath = join(cwd, "data", "historical_market_data.json");
  const dbPath = join(cwd, "data", "historical_market.db");

  if (!existsSync(jsonPath)) {
    console.error("JSON not found, skipping SQLite build");
    process.exit(0);
  }

  console.log("Building SQLite database from JSON...");
  const rawData = JSON.parse(readFileSync(jsonPath, "utf-8"));
  if (!Array.isArray(rawData) || rawData.length === 0) {
    console.error("Invalid JSON, skipping");
    process.exit(0);
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.exec(`CREATE TABLE IF NOT EXISTS daily_market (
    date TEXT PRIMARY KEY, ihsgPrice REAL, goldPrice REAL, usdidrRate REAL,
    stockPrices TEXT, stockAdjPrices TEXT, stockVolumes TEXT,
    stockOpens TEXT, stockHighs TEXT, stockLows TEXT,
    stockRanksProd TEXT, stockRanksRes TEXT
  )`);

  const insert = db.prepare(`INSERT OR REPLACE INTO daily_market
    (date, ihsgPrice, goldPrice, usdidrRate, stockPrices, stockAdjPrices, stockVolumes,
     stockOpens, stockHighs, stockLows, stockRanksProd, stockRanksRes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  const tx = db.transaction((rows: any[]) => {
    for (const r of rows) insert.run(r.date, r.ihsgPrice, r.goldPrice, r.usdidrRate,
      JSON.stringify(r.stockPrices ?? {}), JSON.stringify(r.stockAdjPrices ?? {}),
      JSON.stringify(r.stockVolumes ?? {}), JSON.stringify(r.stockOpens ?? {}),
      JSON.stringify(r.stockHighs ?? {}), JSON.stringify(r.stockLows ?? {}),
      JSON.stringify(r.stockRanksProd ?? {}), JSON.stringify(r.stockRanksRes ?? {}));
  });
  tx(rawData);
  db.close();

  const sizeMB = statSync(dbPath).size / 1024 / 1024;
  console.log(`SQLite DB built: ${rawData.length} records, ${sizeMB.toFixed(1)}MB`);
}

main();
