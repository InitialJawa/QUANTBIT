import { ensureSchema, seedFile, closeDb } from "../src/server/db";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const __root = join(__dirname, "..");

async function main() {
  console.log("=== Seed Local DB ===");

  console.log("Creating schema...");
  await ensureSchema();

  // Seed tickers
  const seedsDir = join(__root, "db", "seeds");
  console.log("Seeding tickers...");
  await seedFile(join(seedsDir, "seed_tickers.sql"));

  // Seed historical prices
  console.log("Seeding historical prices...");
  const years = ["2021", "2022", "2023", "2024", "2025", "2026"];
  for (const y of years) {
    const f = join(seedsDir, `seed_historical_${y}.sql`);
    await seedFile(f);
    console.log(`  ${y}/6 done`);
  }

  // Seed scores
  console.log("Seeding scores...");
  await seedFile(join(seedsDir, "seed_scores.sql"));
  await seedFile(join(seedsDir, "_momentum.sql"));

  console.log("Local DB seeded successfully!");
  closeDb();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  closeDb();
  process.exit(1);
});
