// Standalone dividend cache module — no imports, safe to load first.
let dividendCache: Record<string, Record<string, number>> = {};

export function setDividendCache(cache: Record<string, Record<string, number>>) {
  dividendCache = cache;
}

export function getDividendPerShare(ticker: string, date: Date): number {
  const year = date.getFullYear().toString();
  return dividendCache[ticker]?.[year] || 0;
}
