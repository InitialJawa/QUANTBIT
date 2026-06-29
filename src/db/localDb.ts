/**
 * localDb.ts — Local SQLite DB access for dev server.
 *
 * Uses Python3 as a bridge (child_process) because better-sqlite3
 * native module can't build in all environments (arm64, missing headers).
 *
 * Production (Cloudflare D1) uses the D1 binding directly in functions/.
 *
 * Usage:
 *   import { query } from "../db/localDb";
 *   const rows = await query("SELECT * FROM daily_overview WHERE date = ?", ["2021-01-04"]);
 */

import { execSync } from "child_process";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..", "..");
const DB_QUERY_SCRIPT = join(ROOT, "scripts", "db-query.py");

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  try {
    const paramsJson = JSON.stringify(params);
    const stdout = execSync(
      `python3 "${DB_QUERY_SCRIPT}" ${escapeArg(sql)} ${escapeArg(paramsJson)}`,
      { encoding: "utf-8", timeout: 15000 },
    );
    const result = JSON.parse(stdout);
    if (result && typeof result === "object" && "error" in result) {
      throw new Error(result.error);
    }
    return (result as T[]) || [];
  } catch (err: any) {
    throw new Error(`DB query failed: ${err.message}`);
  }
}

export async function queryFirst<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function escapeArg(arg: string): string {
  // Simple shell escaping for Python args
  return `'${arg.replace(/'/g, "'\\''")}'`;
}
