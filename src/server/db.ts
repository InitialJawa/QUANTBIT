import { existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const __root = join(__dirname, "..", "..");

// Points to local SQLite untuk dev. Prod pakai env.DB (CF Pages Functions).
const DB_PATH = join(__root, "data", "quantbit.db");

// ── dynamic import so Node.js doesn't require --experimental-sqlite at parse time ──
type DatabaseType = import("node:sqlite").DatabaseSync;
type StatementType = import("node:sqlite").StatementSync;

let db: DatabaseType | null = null;

async function getNodeSqlite() {
  return import("node:sqlite");
}

export async function getDb(): Promise<DatabaseType> {
  if (db) return db;
  const { DatabaseSync } = await getNodeSqlite();
  db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode=WAL");
  db.exec("PRAGMA foreign_keys=ON");
  return db;
}

export function closeDb(): void {
  if (db) { db.close(); db = null; }
}

/** Jalankan migration 0004 + 0005 jika tabel belum ada */
export async function ensureSchema(): Promise<void> {
  const d = await getDb();
  const stmt = d.prepare("SELECT count(*) as n FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  const row = stmt.get() as any;
  if (row.n >= 19) return;

  const mig004 = join(__root, "db", "migrations", "0004_v2_schema.sql");
  const mig005 = join(__root, "db", "migrations", "0005_auth_tables.sql");
  if (existsSync(mig004)) {
    const sql = readFileSync(mig004, "utf-8");
    d.exec(sql);
  }
  if (existsSync(mig005)) {
    const sql = readFileSync(mig005, "utf-8");
    d.exec(sql);
  }
}

/** Seed dari file SQL path */
export async function seedFile(...paths: string[]): Promise<void> {
  const d = await getDb();
  for (const p of paths) {
    if (!existsSync(p)) { console.warn(`[db] seed file not found: ${p}`); continue; }
    const sql = readFileSync(p, "utf-8");
    d.exec(sql);
  }
}

/** Seed dari seed_historical_*.sql */
export async function seedHistorical(): Promise<void> {
  const seedsDir = join(__root, "db", "seeds");
  const files = [
    "seed_tickers.sql",
    "seed_historical_2021.sql",
    "seed_historical_2022.sql",
    "seed_historical_2023.sql",
    "seed_historical_2024.sql",
    "seed_historical_2025.sql",
    "seed_historical_2026.sql",
    "seed_scores.sql",
    "_momentum.sql",
  ];
  for (const f of files) {
    const p = join(seedsDir, f);
    if (!existsSync(p)) { console.warn(`[db] seed file not found: ${f}`); continue; }
    const sql = readFileSync(p, "utf-8");
    (await getDb()).exec(sql);
    console.log(`[db] seeded ${f}`);
  }
}

/** Query helper — return array of rows */
export async function queryAll(sql: string, params: any[] = []): Promise<any[]> {
  const d = await getDb();
  return d.prepare(sql).all(...params) as any[];
}

/** Query helper — return first row */
export async function queryOne(sql: string, params: any[] = []): Promise<any | null> {
  const d = await getDb();
  return (d.prepare(sql).get(...params) as any) ?? null;
}

export default { getDb, closeDb, ensureSchema, seedFile, seedHistorical, queryAll, queryOne };
