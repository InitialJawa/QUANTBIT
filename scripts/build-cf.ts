import { cpSync, writeFileSync, existsSync, statSync } from "fs";
import { join } from "path";

const cwd = process.cwd();
const dist = join(cwd, "dist");
const data = join(cwd, "data");
const distData = join(dist, "data");

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

if (existsSync(data)) {
  // exclude: large JSON files (>25MB Cloudflare Pages limit), sqlite DB, .bak files
  // keep: years/*.json (<3MB each) and other small JSON files
  cpSync(data, distData, {
    recursive: true,
    filter: (f) => {
      if (f.endsWith(".sqlite")) return false;
      if (f.endsWith(".bak")) return false;
      if (f.includes("historical_market_data.json") && !f.includes("years")) return false;
      if (existsSync(f) && statSync(f).isFile() && statSync(f).size > MAX_FILE_SIZE_BYTES) return false;
      return true;
    },
  });
  console.log("Copied data/ to dist/data/");
}

writeFileSync(
  join(dist, "_routes.json"),
  JSON.stringify({
    version: 1,
    include: ["/api/*"],
    exclude: [],
  })
);
console.log("Created dist/_routes.json");
