import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const cwd = process.cwd();
const src = join(cwd, "data", "historical_market_data.json");
const outDir = join(cwd, "data", "years");

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

console.log("Reading JSON...");
const raw = readFileSync(src, "utf-8");
const data = JSON.parse(raw);
console.log(`Total records: ${data.length}`);

const years: Record<string, any[]> = {};
for (const rec of data) {
  const year = rec.date.slice(0, 4);
  if (!years[year]) years[year] = [];
  years[year].push(rec);
}

let total = 0;
for (const [year, records] of Object.entries(years).sort()) {
  const filePath = join(outDir, `${year}.json`);
  writeFileSync(filePath, JSON.stringify(records));
  const size = (Buffer.byteLength(JSON.stringify(records)) / 1024 / 1024).toFixed(2);
  console.log(`${year}: ${records.length} records, ${size}MB`);
  total += records.length;
}
console.log(`Done. ${total} records split into ${Object.keys(years).length} year files.`);
