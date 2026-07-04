import { IDX80_TICKERS, IDX30_TICKERS, LQ45_TICKERS } from "../src/constants/idx80";

const allTickers = [...new Set([...IDX80_TICKERS, ...IDX30_TICKERS, ...LQ45_TICKERS])].sort();

const idx80Set = new Set(IDX80_TICKERS);
const idx30Set = new Set(IDX30_TICKERS);
const lq45Set = new Set(LQ45_TICKERS);

for (const tkr of allTickers) {
  const clean = tkr.replace(".JK", "");
  const isIdx80 = idx80Set.has(tkr) ? 1 : 0;
  const isLq45 = lq45Set.has(tkr) ? 1 : 0;
  const isIdx30 = idx30Set.has(tkr) ? 1 : 0;
  const name = `${clean} Tbk`;
  const sector = "Unknown";
  const industry = "Unknown";
  console.log(`INSERT OR IGNORE INTO tickers (ticker, name, sector, industry, is_active, is_idx80) VALUES ('${clean}', '${name}', '${sector}', '${industry}', 1, ${isIdx80});`);
}
