import { cpSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const cwd = process.cwd();
const dist = join(cwd, "dist");
const data = join(cwd, "data");
const distData = join(dist, "data");

if (existsSync(data)) {
  // exclude: main JSON (79MB, >25MB limit), sqlite DB, .bak files
  // keep: years/*.json (<3MB each) and other small JSON files
  cpSync(data, distData, {
    recursive: true,
    filter: (f) => {
      if (f.endsWith(".sqlite")) return false;
      if (f.endsWith(".bak")) return false;
      if (f.includes("historical_market_data.json") && !f.includes("years")) return false;
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
