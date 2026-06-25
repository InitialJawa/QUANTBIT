// ─────────────────────────────────────────────────────────────
// Database migration runner for Quantbit.
//
// Subcommands:
//   status       — list applied vs pending migrations
//   apply [name] — apply all pending (or one specific) migrations
//   dry-run      — show what would execute without running
//
// Uses Cloudflare Wrangler CLI to apply migrations to D1
// (production) or local SQLite (via --local flag).
//
// All migrations are idempotent (CREATE IF NOT EXISTS), so re-running
// is safe. The runner records applied migrations in `_migrations`
// table for visibility.
// ─────────────────────────────────────────────────────────────
import { execSync, spawnSync } from "child_process";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, "..");
const MIGRATIONS_DIR = join(REPO_ROOT, "db", "migrations");
const DB_NAME = "quantbit-db";

/** Returns migration files in NNNN_name.sql format, sorted ascending. */
function listMigrationFiles(): string[] {
  if (!existsSync(MIGRATIONS_DIR)) return [];
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.+\.sql$/.test(f))
    .sort();
}

/** Read a migration's SQL contents. */
function readMigration(name: string): string {
  return readFileSync(join(MIGRATIONS_DIR, name), "utf-8");
}

/** Run a wrangler command. Returns stdout. Throws on non-zero exit. */
function runWrangler(args: string[]): string {
  const result = spawnSync("npx", ["wrangler", ...args], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    stdio: ["inherit", "pipe", "pipe"],
    env: { ...process.env, CI: "1" },
  });
  if (result.status !== 0) {
    const stderr = result.stderr || "";
    const stdout = result.stdout || "";
    throw new Error(
      `wrangler ${args.join(" ")} failed (exit ${result.status})\n` +
      `STDOUT: ${stdout}\nSTDERR: ${stderr}`,
    );
  }
  return result.stdout || "";
}

/** Query D1 (production or local) for currently applied migrations.
 *  Returns Set of migration names. */
function getAppliedMigrations(local: boolean = false): Set<string> {
  const targetFlag = local ? "--local" : "--remote";
  try {
    const stdout = runWrangler([
      "d1", "execute", DB_NAME,
      targetFlag,
      "--json",
      "--command=SELECT name FROM _migrations ORDER BY name;",
    ]);
    // wrangler --json output is mixed with log lines like
    // "🌀 Executing on local database ...". Find the JSON array
    // by looking for the first '[' on its own line.
    const lines = stdout.split("\n");
    let jsonStart = -1;
    let jsonEnd = -1;
    for (let i = 0; i < lines.length; i++) {
      if (jsonStart === -1 && lines[i].trim().startsWith("[")) {
        jsonStart = i;
      }
      if (jsonStart !== -1 && lines[i].trim().endsWith("]")) {
        jsonEnd = i;
        break;
      }
    }
    if (jsonStart === -1 || jsonEnd === -1) return new Set();
    const jsonText = lines.slice(jsonStart, jsonEnd + 1).join("\n");
    const parsed = JSON.parse(jsonText);
    const rows = Array.isArray(parsed) ? parsed : [];
    const all = rows.flatMap((r: any) => r.results || []);
    return new Set(all.map((r: any) => r.name));
  } catch (e: any) {
    // If _migrations table doesn't exist yet, no migrations applied
    if (e.message?.includes("no such table")) {
      return new Set();
    }
    // Auth / connectivity issues — surface a clear hint
    if (
      e.message?.includes("CLOUDFLARE_API_TOKEN") ||
      e.message?.includes("not authenticated") ||
      e.message?.includes("not logged in")
    ) {
      console.error("\n❌ Cloudflare authentication required for --remote.\n");
      console.error("Options:");
      console.error("  1. Set CLOUDFLARE_API_TOKEN env var (scope: D1 Edit)");
      console.error("  2. Run `wrangler login` first");
      console.error("  3. Use --local flag (no auth needed, tests against miniflare D1)");
      console.error("Get a token: https://dash.cloudflare.com/profile/api-tokens\n");
      process.exit(1);
    }
    throw e;
  }
}

/** Apply a single migration via wrangler and record it. */
function applyMigration(name: string, dryRun: boolean = false, local: boolean = false): boolean {
  const sql = readMigration(name);
  const targetFlag = local ? "--local" : "--remote";
  if (dryRun) {
    console.log(`\n📄 ${name} (${sql.length} chars) — would execute (${targetFlag}):`);
    console.log(sql.split("\n").slice(0, 5).map((l) => "  " + l).join("\n") + "\n  ...");
    return true;
  }
  console.log(`⏳ Applying ${name} (${targetFlag})...`);
  const result = spawnSync("npx", [
    "wrangler", "d1", "execute", DB_NAME,
    targetFlag,
    "--file", join(MIGRATIONS_DIR, name),
  ], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
    stdio: "inherit",
    env: { ...process.env, CI: "1" },
  });
  if (result.status !== 0) {
    console.error(`❌ Failed to apply ${name}`);
    return false;
  }
  // Record in _migrations table.
  // Use SQL escaping to prevent injection (migration names come
  // from filesystem, but defense in depth).
  const escapedName = name.replace(/'/g, "''");
  runWrangler([
    "d1", "execute", DB_NAME,
    targetFlag,
    `--command=INSERT OR IGNORE INTO _migrations (name) VALUES ('${escapedName}');`,
  ]);
  console.log(`✅ Applied ${name}`);
  return true;
}

/** Print status table. */
function cmdStatus(args: string[]) {
  const local = args.includes("--local");
  const all = listMigrationFiles();
  const applied = getAppliedMigrations(local);

  console.log("\n┌─────────────────────┬───────────┬──────────────────────────┐");
  console.log("│ Migration           │ Status    │ Applied At                │");
  console.log("├─────────────────────┼───────────┼──────────────────────────┤");
  for (const name of all) {
    const isApplied = applied.has(name);
    const status = isApplied ? "✅ applied" : "⏳ pending";
    const when = isApplied ? "(see D1 for exact time)" : "—";
    console.log(`│ ${name.padEnd(19)} │ ${status.padEnd(9)} │ ${when.padEnd(24)} │`);
  }
  console.log("└─────────────────────┴───────────┴──────────────────────────┘");

  const pending = all.filter((m) => !applied.has(m));
  if (pending.length > 0) {
    console.log(`\n⚠️  ${pending.length} pending migration(s):`);
    for (const m of pending) console.log(`   - ${m}`);
    console.log(`\n   Run: npm run db:migrate${local ? " --local" : ""}\n`);
  } else {
    console.log(`\n✅ All ${all.length} migrations applied (${local ? "local" : "remote"}).\n`);
  }
}

/** Apply pending migrations (or one specific). */
function cmdApply(args: string[]) {
  const local = args.includes("--local");
  const specificName = args.find((a) => !a.startsWith("--"));
  // First, ensure _migrations table exists by applying 0000 if needed.
  const all = listMigrationFiles();
  const applied = getAppliedMigrations(local);

  // Apply 0000 first if not applied (it creates _migrations itself)
  if (!specificName && !applied.has("0000_migrations_tracker.sql")) {
    if (all.includes("0000_migrations_tracker.sql")) {
      const ok = applyMigration("0000_migrations_tracker.sql", false, local);
      if (!ok) process.exit(1);
      // Re-fetch applied list
      const updated = getAppliedMigrations(local);
      updated.add("0000_migrations_tracker.sql");
      // Update local set for next iteration
      for (const n of updated) applied.add(n);
    }
  }

  const targets = specificName
    ? all.filter((m) => m === specificName)
    : all.filter((m) => !applied.has(m));

  if (targets.length === 0) {
    console.log(specificName
      ? `Migration ${specificName} not found or already applied.`
      : "✅ All migrations already applied.");
    return;
  }

  console.log(`\n📋 Applying ${targets.length} migration(s) to ${local ? "LOCAL D1 (miniflare)" : "PRODUCTION D1"}...\n`);
  let success = 0;
  for (const m of targets) {
    if (applyMigration(m, false, local)) success++;
  }
  console.log(`\n${success === targets.length ? "✅" : "⚠️"} Done. ${success}/${targets.length} applied.\n`);
  if (success !== targets.length) process.exit(1);
}

/** Dry-run: show what would be applied without executing.
 *  Pure file-based — does NOT query D1 (no wrangler auth required). */
function cmdDryRun() {
  const all = listMigrationFiles();
  // Assume all migrations are pending (no D1 query).
  // User can run `db:status` separately to see actual applied state.
  const pending = all;

  if (pending.length === 0) {
    console.log("\n✅ No migration files found.\n");
    return;
  }
  console.log(`\n🔍 DRY RUN: ${pending.length} migration file(s) would be applied in order:\n`);
  for (const m of pending) {
    applyMigration(m, true);
  }
  console.log("\n(Note: dry-run assumes all are pending. Run `db:status` to see actual state.)\n");
}

function main() {
  const cmd = process.argv[2];
  const args = process.argv.slice(3);
  switch (cmd) {
    case "status":
      return cmdStatus(args);
    case "apply":
      return cmdApply(args);
    case "dry-run":
      return cmdDryRun();
    case "--help":
    case "-h":
    case undefined:
    case "help":
      console.log(`\nUsage: tsx scripts/migrate.ts <status|apply|dry-run> [name] [--local]\n`);
      console.log("Subcommands:");
      console.log("  status        List applied vs pending migrations");
      console.log("  apply [name]  Apply all pending (or one specific) migrations");
      console.log("  dry-run       Show what would execute (file-based, no D1)");
      console.log("");
      console.log("Flags:");
      console.log("  --local       Use wrangler --local (miniflare D1, no auth needed)");
      console.log("                Default: --remote (production D1, needs CLOUDFLARE_API_TOKEN)");
      console.log("");
      return;
    default:
      console.error(`Unknown subcommand: ${cmd}`);
      process.exit(1);
  }
}

main();
