import { api } from "./api";
import { setL, setPF, setFD } from "../marketData";
import type { LeaderStock, ProfileDetails, FundamentalDetails } from "../marketData";

let initialized = false;

export async function initDataService(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    const [scoresRes, profilesRes, fundamentalsRes] = await Promise.all([
      api.get<{ success: boolean; stocks: LeaderStock[] }>("/api/stocks/scores").catch(() => null),
      api.get<{ success: boolean; data: Record<string, ProfileDetails> }>("/api/stocks/profiles").catch(() => null),
      api.get<{ success: boolean; data: Record<string, FundamentalDetails> }>("/api/stocks/fundamentals").catch(() => null),
    ]);

    if (scoresRes?.stocks) setL(scoresRes.stocks);
    if (profilesRes?.data) setPF(profilesRes.data);
    if (fundamentalsRes?.data) setFD(fundamentalsRes.data);
  } catch (e) {
    console.warn("[dataService] init failed, L/PF/FD remain empty until scan data loads:", e);
  }
}
