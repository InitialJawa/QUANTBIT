import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";

interface NormScore {
  quality: number;
  growth: number;
  value: number;
  momentum: number;
}

interface FundRecord {
  code: string;
  fsDate: string;
  roe: number | null;
  eps: number | null;
  sales: number | null;
  per: number | null;
  priceBV: number | null;
}

interface DayRecord {
  date: string;
  [key: string]: unknown;
  stockPrices: Record<string, number>;
}

function main() {
  const cwd = process.cwd();
  const dataPath = join(cwd, "data", "historical_market_data.json");
  const fundPath = join(cwd, "data", "fundamental_idx_all.json");

  console.log("Reading market data...");
  const raw = readFileSync(dataPath, "utf-8");
  const marketData: DayRecord[] = JSON.parse(raw);
  console.log(`Loaded ${marketData.length} market records`);

  console.log("Reading IDX warehouse...");
  const rawFund: Record<string, unknown>[] = JSON.parse(
    readFileSync(fundPath, "utf-8")
  );
  console.log(`Loaded ${rawFund.length} fundamental records`);

  // Build lookup: code -> sorted fund records
  const fundMap = new Map<string, FundRecord[]>();
  for (const r of rawFund) {
    const code = r.code as string;
    if (!fundMap.has(code)) fundMap.set(code, []);
    fundMap.get(code)!.push({
      code,
      fsDate: (r.fsDate as string) ?? "",
      roe: (r.roe as number | null) ?? null,
      eps: (r.eps as number | null) ?? null,
      sales: (r.sales as number | null) ?? null,
      per: (r.per as number | null) ?? null,
      priceBV: (r.priceBV as number | null) ?? null,
    });
  }

  for (const arr of fundMap.values()) {
    arr.sort((a, b) => a.fsDate.localeCompare(b.fsDate));
  }

  function findLatestFund(
    ticker: string,
    targetDate: string
  ): FundRecord | null {
    const arr = fundMap.get(ticker);
    if (!arr || arr.length === 0) return null;
    let lo = 0;
    let hi = arr.length - 1;
    let best = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid].fsDate <= targetDate) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return best >= 0 ? arr[best] : null;
  }

  function findYearAgoFund(
    ticker: string,
    targetDate: string
  ): FundRecord | null {
    const d = new Date(targetDate);
    d.setFullYear(d.getFullYear() - 1);
    return findLatestFund(ticker, d.toISOString().slice(0, 10));
  }

  const prevPrices: Record<string, number[]> = {};

  let recordsUpdated = 0;

  for (let i = 0; i < marketData.length; i++) {
    const day = marketData[i];
    const date = day.date;
    const sp = day.stockPrices;
    const tickers = Object.keys(sp).filter((t) => sp[t] > 0);

    if (tickers.length === 0) continue;

    const rawQ: { t: string; v: number }[] = [];
    const rawG: { t: string; v: number }[] = [];
    const rawV: { t: string; v: number }[] = [];
    const rawM: { t: string; v: number }[] = [];

    for (const ticker of tickers) {
      const fund = findLatestFund(ticker, date);

      // Quality: ROE
      if (fund?.roe != null) {
        rawQ.push({ t: ticker, v: fund.roe });
      }

      // Value: inverse of PER, else inverse of priceBV
      if (fund?.per != null && fund.per > 0) {
        rawV.push({ t: ticker, v: 1 / fund.per });
      } else if (fund?.priceBV != null && fund.priceBV > 0) {
        rawV.push({ t: ticker, v: 1 / fund.priceBV });
      }

      // Growth: EPS YoY, else sales YoY
      let growthVal: number | null = null;
      if (fund?.eps != null && fund.eps !== 0) {
        const fundPrev = findYearAgoFund(ticker, date);
        if (fundPrev?.eps != null && fundPrev.eps !== 0) {
          growthVal =
            ((fund.eps - fundPrev.eps) / Math.abs(fundPrev.eps)) * 100;
        }
      }
      if (growthVal == null && fund?.sales != null && fund.sales !== 0) {
        const fundPrev = findYearAgoFund(ticker, date);
        if (fundPrev?.sales != null && fundPrev.sales !== 0) {
          growthVal =
            ((fund.sales - fundPrev.sales) / Math.abs(fundPrev.sales)) * 100;
        }
      }
      if (growthVal != null) {
        rawG.push({ t: ticker, v: growthVal });
      }

      // Momentum: 20-day return
      if (!prevPrices[ticker]) prevPrices[ticker] = [];
      prevPrices[ticker].push(sp[ticker]);
      if (prevPrices[ticker].length >= 20) {
        const cur = prevPrices[ticker][prevPrices[ticker].length - 1];
        const twentyAgo = prevPrices[ticker][prevPrices[ticker].length - 20];
        if (cur > 0 && twentyAgo > 0) {
          rawM.push({
            t: ticker,
            v: ((cur - twentyAgo) / twentyAgo) * 100,
          });
        }
      }
    }

    // Normalize each factor to [0, 95] across available data
    function normalize(
      items: { t: string; v: number }[]
    ): Map<string, number> {
      const result = new Map<string, number>();
      if (items.length === 0) return result;
      const vals = items.map((x) => x.v);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      for (const item of items) {
        const n =
          max > min ? Math.max(0, Math.min(95, 95 * ((item.v - min) / (max - min)))) : 50;
        result.set(item.t, n);
      }
      return result;
    }

    const normQ = normalize(rawQ);
    const normG = normalize(rawG);
    const normV = normalize(rawV);
    const normM = normalize(rawM);

    const norms: Record<string, NormScore> = {};
    for (const ticker of tickers) {
      norms[ticker] = {
        quality: normQ.has(ticker) ? normQ.get(ticker)! : 50,
        growth: normG.has(ticker) ? normG.get(ticker)! : 50,
        value: normV.has(ticker) ? normV.get(ticker)! : 50,
        momentum: normM.has(ticker) ? normM.get(ticker)! : 50,
      };
    }

    (day as Record<string, unknown>).stockNormScores = norms;
    recordsUpdated++;

    if ((i + 1) % 1000 === 0) {
      console.log(`  Processed ${i + 1}/${marketData.length}`);
    }
  }

  console.log(`\nDone: ${recordsUpdated}/${marketData.length} records updated.`);

  // Write back to data/
  console.log("Writing data/historical_market_data.json...");
  writeFileSync(dataPath, JSON.stringify(marketData));
  console.log("  OK");

  // Write to src/data/
  const srcDataPath = join(cwd, "src", "data", "historical_market_data.json");
  const srcDataDir = join(cwd, "src", "data");
  if (!existsSync(srcDataDir)) {
    mkdirSync(srcDataDir, { recursive: true });
  }
  console.log(`Writing ${srcDataPath}...`);
  writeFileSync(srcDataPath, JSON.stringify(marketData));
  console.log("  OK");

  // Run split-data
  console.log("\nRunning split-data...");
  execSync("npx tsx scripts/split-data.ts", { cwd, stdio: "inherit" });
}

main();
