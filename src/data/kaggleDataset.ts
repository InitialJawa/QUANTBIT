import fs from "fs";
import path from "path";
import Papa from "papaparse"; // npm install papaparse

// Path to the CSV file exported from the Kaggle dataset (should be placed in src/data/kaggle/)
const CSV_PATH = path.resolve(__dirname, "../data/kaggle/ihsg_stock_data.csv");

/**
 * Load the Kaggle CSV synchronously and return an array of pipe‑separated strings
 * matching the original RAW_STOCKS_DATA format.
 */
export function loadKaggleDataSync(): string[] {
  if (!fs.existsSync(CSV_PATH)) {
    console.warn("Kaggle CSV not found at", CSV_PATH, "– falling back to empty data.");
    return [];
  }
  const csvText = fs.readFileSync(CSV_PATH, "utf-8");
  const { data } = Papa.parse<any>(csvText, { header: true, skipEmptyLines: true });
  // Expect CSV columns: ticker, name, sector, industry, marketCap, price, change, roe, der, peRatio, pbRatio, dividendYield
  return (data as any[]).map(row => {
    const ticker = (row.ticker ?? "").replace('.JK', "");
    const name = row.name ?? "";
    const sector = row.sector ?? "";
    const industry = row.industry ?? "";
    const marketCap = row.marketCap ?? "0";
    const price = row.price ?? "0";
    const change = row.change ?? "0";
    const roe = row.roe ?? "0";
    const der = row.der ?? "0";
    const peRatio = row.peRatio ?? "0";
    const pbRatio = row.pbRatio ?? "0";
    const dividendYield = row.dividendYield ?? "0";
    return `${ticker}|${name}|${sector}|${industry}|${marketCap}|${price}|${change}|${roe}|${der}|${peRatio}|${pbRatio}|${dividendYield}`;
  });
}
