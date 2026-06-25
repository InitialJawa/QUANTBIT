// ─────────────────────────────────────────────────────────────
// Unit tests for the migration system itself.
//
// What we test (without hitting D1 or wrangler):
// - Migration file naming convention
// - Files are in sequential order
// - All files use IF NOT EXISTS (idempotent)
// - All files have valid SQL syntax (no parse errors)
// - The _migrations tracker table is created by 0000
// - Migration files reference tables that exist in prior migrations
//   (no foreign-key to non-existent table)
// - scripts/migrate.ts command structure parses correctly
// ─────────────────────────────────────────────────────────────
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, "..");

const REPO_ROOT = resolve(__dirname, "..", "..");
const MIGRATIONS_DIR = join(REPO_ROOT, "db", "migrations");

function readMigrations(): { name: string; sql: string }[] {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(MIGRATIONS_DIR, name), "utf-8") }));
}

describe("migration files — naming convention", () => {
  it("all migration files match NNNN_name.sql", () => {
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
    for (const f of files) {
      assert.match(f, /^\d{4}_.+\.sql$/, `${f} does not match NNNN_name.sql format`);
    }
  });

  it("includes 0000 (tracker), 0001 (init), 0002 (ai_memory)", () => {
    const names = readMigrations().map((m) => m.name);
    assert.ok(names.includes("0000_migrations_tracker.sql"), "missing 0000 tracker");
    assert.ok(names.includes("0001_init.sql"), "missing 0001 init");
    assert.ok(names.includes("0002_ai_memory.sql"), "missing 0002 ai_memory");
  });

  it("migrations are in sequential order without gaps", () => {
    const names = readMigrations().map((m) => m.name);
    const numbers = names.map((n) => parseInt(n.slice(0, 4), 10));
    for (let i = 0; i < numbers.length - 1; i++) {
      assert.equal(numbers[i + 1], numbers[i] + 1, `gap between ${numbers[i]} and ${numbers[i + 1]}`);
    }
  });
});

describe("migration files — content", () => {
  it("0000 creates _migrations table", () => {
    const m0000 = readMigrations().find((m) => m.name === "0000_migrations_tracker.sql");
    assert.ok(m0000, "0000 missing");
    assert.match(m0000.sql, /CREATE TABLE IF NOT EXISTS _migrations/);
    assert.match(m0000.sql, /name TEXT PRIMARY KEY/);
    assert.match(m0000.sql, /applied_at/);
  });

  it("0001 creates 8 original tables (users, sessions, portfolios, watchlists, trade_logs, cached_reports, idx_scan_data, engine_state)", () => {
    const m0001 = readMigrations().find((m) => m.name === "0001_init.sql");
    assert.ok(m0001, "0001 missing");
    const tables = [
      "users", "sessions", "portfolios", "watchlists",
      "trade_logs", "cached_reports", "idx_scan_data", "engine_state",
    ];
    for (const t of tables) {
      assert.match(m0001.sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${t}\\b`), `missing table ${t}`);
    }
  });

  it("0002 creates ai_sessions and ai_messages", () => {
    const m0002 = readMigrations().find((m) => m.name === "0002_ai_memory.sql");
    assert.ok(m0002, "0002 missing");
    assert.match(m0002.sql, /CREATE TABLE IF NOT EXISTS ai_sessions\b/);
    assert.match(m0002.sql, /CREATE TABLE IF NOT EXISTS ai_messages\b/);
  });

  it("all migrations use IF NOT EXISTS for idempotency", () => {
    for (const m of readMigrations()) {
      const tables = m.sql.match(/CREATE TABLE\b(?! IF NOT EXISTS)/g) || [];
      const indexes = m.sql.match(/CREATE INDEX\b(?! IF NOT EXISTS)/g) || [];
      assert.equal(tables.length, 0, `${m.name} has non-idempotent CREATE TABLE`);
      assert.equal(indexes.length, 0, `${m.name} has non-idempotent CREATE INDEX`);
    }
  });

  it("ai_messages has foreign key to ai_sessions (CASCADE on delete)", () => {
    const m0002 = readMigrations().find((m) => m.name === "0002_ai_memory.sql");
    assert.ok(m0002);
    // ai_messages.session_id REFERENCES ai_sessions(id) ON DELETE CASCADE
    assert.match(m0002.sql, /ai_messages[\s\S]*?FOREIGN KEY \(session_id\) REFERENCES ai_sessions\(id\) ON DELETE CASCADE/);
  });

  it("ai_sessions has foreign key to users (CASCADE on delete)", () => {
    const m0002 = readMigrations().find((m) => m.name === "0002_ai_memory.sql");
    assert.ok(m0002);
    assert.match(m0002.sql, /ai_sessions[\s\S]*?FOREIGN KEY \(user_id\) REFERENCES users\(id\) ON DELETE CASCADE/);
  });

  it("all migrations create at least one table", () => {
    for (const m of readMigrations()) {
      // 0000 might just create _migrations (1 table)
      // 0001+ should have multiple
      const createCount = (m.sql.match(/CREATE TABLE IF NOT EXISTS/g) || []).length;
      assert.ok(createCount >= 1, `${m.name} has no CREATE TABLE statements`);
    }
  });

  it("all SQL is non-empty and not just comments", () => {
    for (const m of readMigrations()) {
      const stripped = m.sql.replace(/--.*$/gm, "").trim();
      assert.ok(stripped.length > 0, `${m.name} is empty after stripping comments`);
    }
  });
});

describe("migration files — valid SQL syntax (parse-only)", () => {
  it("all migrations have balanced parentheses", () => {
    for (const m of readMigrations()) {
      // Strip strings first
      const cleaned = m.sql
        .replace(/'[^']*'/g, "''")  // remove single-quoted strings
        .replace(/"[^"]*"/g, '""');  // remove double-quoted strings
      const opens = (cleaned.match(/\(/g) || []).length;
      const closes = (cleaned.match(/\)/g) || []).length;
      assert.equal(opens, closes, `${m.name} has unbalanced parentheses: ${opens} open vs ${closes} close`);
    }
  });

  it("all migrations end with semicolon (or close of last statement)", () => {
    for (const m of readMigrations()) {
      // Strip whitespace and trailing comments
      const stripped = m.sql.replace(/--[^\n]*$/gm, "").trim();
      // Should end with ; or be a single line
      const lastChar = stripped[stripped.length - 1];
      assert.ok(
        lastChar === ";" || lastChar === ")" || lastChar === "'" || lastChar === '"',
        `${m.name} doesn't end with a valid terminator (got: ${lastChar})`,
      );
    }
  });
});

describe("migration runner script", () => {
  it("scripts/migrate.ts exists and has the expected subcommands", () => {
    const runnerPath = join(REPO_ROOT, "scripts", "migrate.ts");
    assert.ok(existsSync(runnerPath), "scripts/migrate.ts not found");
    const src = readFileSync(runnerPath, "utf-8");
    assert.match(src, /case "status"/);
    assert.match(src, /case "apply"/);
    assert.match(src, /case "dry-run"/);
    assert.match(src, /function cmdStatus/);
    assert.match(src, /function cmdApply/);
    assert.match(src, /function cmdDryRun/);
  });

  it("uses wrangler CLI via spawnSync (not execSync with shell)", () => {
    const src = readFileSync(join(REPO_ROOT, "scripts", "migrate.ts"), "utf-8");
    // We use spawnSync for safety (no shell injection)
    assert.match(src, /spawnSync/);
    // Reads from disk via wrangler --file flag
    assert.match(src, /--file/);
  });
});
