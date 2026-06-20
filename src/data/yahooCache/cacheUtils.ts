// src/data/yahooCache/cacheUtils.ts
import fs from "fs";
import path from "path";
import { YahooStock } from "../yahoo/fetchYahooData";

const CACHE_FILE = path.resolve(__dirname, "cache.json");

/** Load cache from disk (if exists) */
function loadCache(): Record<string, { data: YahooStock; fetchedAt: string }> {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, "utf-8");
      return JSON.parse(raw);
    }
  } catch (_) {}
  return {};
}

/** Persist cache to disk */
function saveCache(cache: Record<string, { data: YahooStock; fetchedAt: string }>) {
  try {
    fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
  } catch (_) {}
}

const cache = loadCache();

/** Get cached Yahoo data if it is <24h old */
export function getCachedYahoo(ticker: string): YahooStock | null {
  const entry = cache[ticker.toUpperCase()];
  if (!entry) return null;
  const ageHours = (Date.now() - new Date(entry.fetchedAt).getTime()) / 1000 / 3600;
  if (ageHours > 24) return null; // stale
  return entry.data;
}

/** Warm up cache for a list of tickers (async, fire‑and‑forget) */
export async function warmYahooCache(tickers: string[]) {
  const { fetchYahooData } = await import("../yahoo/fetchYahooData");
  const promises = tickers.map(async t => {
    const key = t.toUpperCase();
    if (cache[key]) return;
    const data = await fetchYahooData(key);
    if (data) {
      cache[key] = { data, fetchedAt: new Date().toISOString() };
    }
  });
  await Promise.all(promises);
  saveCache(cache);
}
