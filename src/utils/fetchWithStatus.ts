// src/utils/fetchWithStatus.ts

/**
 * Helper to fetch JSON data and attach a DataStatus.
 * Currently the logic is simple:
 *   - If the HTTP request succeeds (status 2xx) => DataStatus.LIVE
 *   - If the request fails, we fall back to a static cached response (if any)
 *     and mark it as DataStatus.CACHED or DataStatus.STALE based on the
 *     timestamp contained in the cached JSON (field `last_update`).
 *   - If no cached data is available we return an empty object with
 *     DataStatus.ESTIMATED to indicate a model‑generated fallback.
 */
import { DataStatus } from "../types/DataStatus";

export async function fetchWithStatus<T>(url: string, init?: RequestInit): Promise<{ data: T; status: DataStatus }> {
  try {
    const response = await fetch(url, init);
    if (response.ok) {
      const data = (await response.json()) as T;
      return { data, status: DataStatus.LIVE };
    }
    // Non‑2xx response – try to load a cached file if the URL matches a known endpoint
    // For simplicity we attempt to fetch a sibling ".cache.json" file.
    const cacheUrl = `${url}.cache.json`;
    const cacheResp = await fetch(cacheUrl);
    if (cacheResp.ok) {
      const cached = (await cacheResp.json()) as any;
      const ts = new Date(cached.last_update ?? 0).getTime();
      const ageHours = (Date.now() - ts) / (1000 * 60 * 60);
      const status = ageHours < 24 ? DataStatus.CACHED : DataStatus.STALE;
      return { data: cached as T, status };
    }
    // No cache available – return an empty placeholder with ESTIMATED status.
    return { data: {} as T, status: DataStatus.ESTIMATED };
  } catch (e) {
    // Network error or other exception – fall back to ESTIMATED
    console.warn("fetchWithStatus error", e);
    return { data: {} as T, status: DataStatus.ESTIMATED };
  }
}
