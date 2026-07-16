import { execSync } from "child_process";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const __root = join(__dirname, "..");
const TODAY = new Date().toISOString().split("T")[0];

function run(cmd: string, trim = true): string {
  const r = execSync(cmd, { encoding: "utf-8", timeout: 120000 });
  return trim ? r.trim() : r;
}

function sqlPath(name: string): string {
  const dir = join(__root, "db", "seeds");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, name);
}

function esc(v: any): string {
  if (v == null || v === undefined || (typeof v === "number" && !isFinite(v))) return "NULL";
  return String(v);
}

// SMA — simple moving average
function sma(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += values[j];
    result.push(sum / period);
  }
  return result;
}

// RSI — relative strength index (Wilder's smoothing)
function rsi(values: number[], period: number): (number | null)[] {
  if (values.length < period + 1) return values.map(() => null);
  const result: (number | null)[] = [];
  for (let i = 0; i < period; i++) result.push(null);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff > 0) avgGain += diff; else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - 100 / (1 + rs0));
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - 100 / (1 + rs));
  }
  return result;
}

// MACD — moving average convergence divergence
function macd(values: number[], fast: number, slow: number, signal: number): { macd: (number | null)[]; signal: (number | null)[] } {
  const emaFast = ema(values, fast);
  const emaSlow = ema(values, slow);
  const macdLine: (number | null)[] = [];
  for (let i = 0; i < values.length; i++) {
    if (emaFast[i] == null || emaSlow[i] == null) { macdLine.push(null); continue; }
    macdLine.push(emaFast[i]! - emaSlow[i]!);
  }
  const signalLine = ema(macdLine.filter(v => v != null) as number[], signal);
  const paddedSignal: (number | null)[] = [];
  let si = 0;
  for (let i = 0; i < values.length; i++) {
    if (macdLine[i] == null) { paddedSignal.push(null); }
    else { paddedSignal.push(signalLine[si] ?? null); si++; }
  }
  return { macd: macdLine, signal: paddedSignal };
}

function ema(values: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  for (let i = 0; i < values.length; i++) {
    if (i === 0) { result.push(values[i]); continue; }
    if (result[i - 1] == null) { result.push(values[i]); continue; }
    result.push(values[i] * k + result[i - 1]! * (1 - k));
  }
  return result;
}

// ATR — average true range
function atr(highs: number[], lows: number[], closes: number[], period: number): (number | null)[] {
  const tr: number[] = [highs[0] - lows[0]];
  for (let i = 1; i < closes.length; i++) {
    const hml = Math.abs(highs[i] - lows[i]);
    const hmc = Math.abs(highs[i] - closes[i - 1]);
    const lmc = Math.abs(lows[i] - closes[i - 1]);
    tr.push(Math.max(hml, hmc, lmc));
  }
  const result = ema(tr, period);
  return result.map(v => v != null ? Math.round(v * 100) / 100 : null) as (number | null)[];
}

// Rolling max drawdown — returns array of max drawdown (%) as of each index
function rollingMaxDrawdown(values: number[]): number[] {
  const result: number[] = [];
  let peak = values[0];
  let maxDd = 0;
  for (const v of values) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDd) maxDd = dd;
    result.push(Math.round(maxDd * 10000) / 100);
  }
  return result;
}

interface DailyRow {
  date: string;
  ticker: string;
  close: number;
  adj_close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

async function main() {
  console.log("[intermediate] Computing backtest intermediate data...");

  function unwrapD1(jsonStr: string): any[] {
    // Log first 2KB for debugging
    const snippet = jsonStr.length > 2000 ? jsonStr.slice(0, 2000) + "..." : jsonStr;
    console.error(`[debug] D1 response (${jsonStr.length} chars): ${snippet}`);
    try {
      const parsed = JSON.parse(jsonStr);
      // wrangler 4+ returns [{ results: [...], success: true }]
      if (Array.isArray(parsed) && parsed[0]?.results) return parsed[0].results;
      // direct results object { results: [...] }
      if (parsed?.results) return parsed.results;
      // already an array of rows
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch {
      console.error(`[error] Failed to parse D1 JSON`);
      return [];
    }
  }

  // Fetch all tickers from D1
  const tickerRows = unwrapD1(run(`npx wrangler d1 execute quantbit-db --remote --command="SELECT DISTINCT ticker FROM stock_daily ORDER BY ticker" --json`));
  const tickers = tickerRows.map((r: any) => r.ticker).filter(Boolean);

  console.log(`[intermediate] ${tickers.length} tickers found`);

  // For each ticker, compute indicators and generate SQL
  const allLines: string[] = [
    `DELETE FROM backtest_intermediate WHERE date >= (SELECT MIN(date) FROM stock_daily);`
  ];

  for (let ti = 0; ti < tickers.length; ti++) {
    const tkr = tickers[ti];
    process.stdout.write(`  [${ti + 1}/${tickers.length}] ${tkr}...`);

    try {
      const dailyRows = unwrapD1(run(`npx wrangler d1 execute quantbit-db --remote --command="SELECT date,ticker,close,adj_close,open,high,low,volume FROM stock_daily WHERE ticker='${tkr}' AND close>0 ORDER BY date" --json`));

      if (dailyRows.length < 20) {
        console.log(" SKIP (<20 rows)");
        continue;
      }

      const closes = dailyRows.map(r => r.close);
      const highs = dailyRows.map(r => r.high);
      const lows = dailyRows.map(r => r.low);
      const volumes = dailyRows.map(r => r.volume);
      const dates = dailyRows.map(r => r.date);

      const sma20 = sma(closes, 20);
      const sma50 = sma(closes, 50);
      const sma200 = sma(closes, 200);
      const rsi14 = rsi(closes, 14);
      const macdResult = macd(closes, 12, 26, 9);
      const atr14 = atr(highs, lows, closes, 14);
      const rollingDd = rollingMaxDrawdown(closes);

      for (let i = 0; i < dates.length; i++) {
        allLines.push(
          `INSERT OR REPLACE INTO backtest_intermediate(date,ticker,close,sma20,sma50,sma200,rsi14,macd,macd_signal,atr14,max_drawdown,volume) VALUES(` +
          `'${dates[i]}','${tkr}',` +
          `${esc(closes[i])},${esc(sma20[i])},${esc(sma50[i])},${esc(sma200[i])},` +
          `${esc(rsi14[i])},${esc(macdResult.macd[i])},${esc(macdResult.signal[i])},` +
          `${esc(atr14[i])},${esc(rollingDd[i])},${esc(volumes[i])}` +
          `);`
        );
      }

      console.log(` ${dailyRows.length} rows`);
    } catch (e: any) {
      console.log(` ERROR: ${e.message}`);
    }
  }

  // Write SQL file
  const sqlFilePath = sqlPath("_intermediate.sql");
  writeFileSync(sqlFilePath, allLines.join("\n") + "\n", "utf-8");
  console.log(`\n[intermediate] ${allLines.length - 1} total SQL statements written`);

  // Execute to D1
  console.log("[intermediate] Seeding to D1...");
  run(`npx wrangler d1 execute quantbit-db --remote --file="${sqlFilePath}"`);

  console.log("[intermediate] Complete!");
}

main().catch(e => { console.error(e); process.exit(1); });
