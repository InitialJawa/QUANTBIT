// src/utils/getDataStatus.ts
import { DataStatus } from "../types/DataStatus";
import { fetchWithStatus } from "./fetchWithStatus";

/**
 * Retrieve the DataStatus for a specific ticker.
 * Uses the generic fetchWithStatus helper which already determines LIVE/CACHED/STALE/ESTIMATED.
 * If the request fails, we fall back to ESTIMATED.
 */
export async function getDataStatus(ticker: string): Promise<DataStatus> {
  try {
    const { status } = await fetchWithStatus<any>(`/api/stock/${ticker}`);
    return status;
  } catch (e) {
    console.warn("getDataStatus error", e);
    return DataStatus.ESTIMATED;
  }
}
