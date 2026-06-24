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

  function findPriorFund(
    ticker: string,
    targetDate: string
  ): FundRecord | null {
    const arr = fundMap.get(ticker);
    if (!arr || arr.length === 0) return null;
    const current = findLatestFund(ticker, targetDate);
    if (!current) return null;
    const curIdx = arr.indexOf(current);
    for (let i = curIdx - 1; i >= 0; i--) {
      const fd = arr[i].fsDate;
      if (fd < targetDate) return arr[i];
    }
    return null;
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

      // Growth: EPS change from prior period (annualized), else sales change
      let growthVal: number | null = null;
      const fundPrev = findPriorFund(ticker, date);
      if (fund && fundPrev) {
        const curFd = new Date(fund.fsDate).getTime();
        const prevFd = new Date(fundPrev.fsDate).getTime();
        const yearsDiff = Math.max(0.1, (curFd - prevFd) / (365.25 * 24 * 60 * 60 * 1000));

        let rawGrowth: number | null = null;
        if (fund.eps != null && fund.eps !== 0 && fundPrev.eps != null && fundPrev.eps !== 0) {
          rawGrowth = (fund.eps - fundPrev.eps) / Math.abs(fundPrev.eps);
        } else if (fund.sales != null && fund.sales !== 0 && fundPrev.sales != null && fundPrev.sales !== 0) {
          rawGrowth = (fund.sales - fundPrev.sales) / Math.abs(fundPrev.sales);
        }

        if (rawGrowth != null) {
          // Annualize: for positive growth use compound annualized, for negative use raw
          if (rawGrowth > 0) {
            growthVal = (Math.pow(1 + rawGrowth, 1 / yearsDiff) - 1) * 100;
          } else {
            growthVal = rawGrowth / yearsDiff * 100;
          }
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

    // Normalize each factor to [0, 95] using rank-based scaling (resilient to outliers)
    function normalize(
      items: { t: string; v: number }[]
    ): Map<string, number> {
      const result = new Map<string, number>();
      if (items.length === 0) return result;
      items.sort((a, b) => a.v - b.v);
      const n = items.length;
      for (let i = 0; i < n; i++) {
        // position 0 -> score 0, position n-1 -> score 95, evenly distributed
        const score = (i / (n - 1)) * 95;
        result.set(items[i].t, Math.max(0, Math.min(95, score)));
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
