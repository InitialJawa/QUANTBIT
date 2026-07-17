// marketData.ts
// Ported from target_data.js to provide real, robust, production-level IDX metrics
// Phase 3: L[], PF, FD populated from D1 API via dataService.initDataService()

import { setDividendCache } from "./engine/dividendCache.ts";

export interface LeaderStock {
  rank: string;
  ticker: string;
  quality: string;
  growth: string;
  value: string;
  momentum: string;
  dividend: string;
  final_score: string;
}

export interface ProfileDetails {
  name: string;
  sector: string;
  industry: string;
  summary: string;
}

export interface FundamentalDetails {
  roe: number | null;
  net_margin: number | null;
  operating_margin: number | null;
  debt_to_equity: number | null;
  free_cash_flow: number | null;
  pe_ratio: number | null;
  pb_ratio: number | null;
  dividend_yield: number | null;
  roa: number | null;
  market_cap: number | null;
  revenue_growth: number | null;
  earnings_growth: number | null;
}

export let L: LeaderStock[] = [];
export let PF: Record<string, ProfileDetails> = {};
export let FD: Record<string, FundamentalDetails> = {};

export function setL(v: LeaderStock[]) { L = v; }
export function setPF(v: Record<string, ProfileDetails>) { PF = v; }
export function setFD(v: Record<string, FundamentalDetails>) { FD = v; }
export const RS = {
  last_update: "2026-06-11 13:03",
  status: "SAFE",
  market_health: 48,
  opportunity: 74,
  risk: 40,
  confidence: 61,
  capital_deployment: 40,
  action: "WAIT",
  rationale: "Score gap 40.6 poin menunjukkan pemisahan kualitas yang jelas antara top5 dan bottom5. Faktor dominan: Growth (80.0). Faktor terlemah: Quality (60.0). Breadth terbatas (1 saham >=70). 2 dari 5 saham watchlist volume sepi - likuiditas rendah.",
  detail_message: "Score gap 40.6 poin menunjukkan pemisahan kualitas yang jelas antara top5 dan bottom5. Faktor dominan: Growth (80.0). Faktor terlemah: Quality (60.0). Breadth terbatas (1 saham >=70). 2 dari 5 saham watchlist volume sepi - likuiditas rendah.",
  radar_context: {
    production_config: "Aman",
    top5_avg_score: 66.8,
    bot5_avg_score: 26.2,
    score_gap: 40.6,
    score_gap_5d_change: 0,
    breadth_above_70: 1,
    breadth_above_60: 7,
    breadth_below_40: 7,
    strongest_factor: "Growth",
    strongest_factor_score: 80.0,
    weakest_factor: "Quality",
    weakest_factor_score: 60.0,
    top5_turnover: 0,
    watchlist_count: 5,  // LEGACY: gunakan idx_universe_size (size of IDX80 universe)
    idx_universe_size: 80,  // FASE 1.5 — ukuran universe (IDX80 default)
  },
  volume_details: [
    "PTBA.JK: Volume 1.6x (Wajar)",
    "BBNI.JK: Volume 1.9x (Wajar)",
    "INDF.JK: Volume 0.9x (Sepi)",
    "ASII.JK: Volume 1.0x (Sepi)",
    "ITMG.JK: Volume 2.4x (Volume Lonjakan)"
  ]
};

export const MKT = {
  last_update: "2026-06-23",
  market_last_update: "2026-06-23 17:00:00 WIB",
  // NOTE: daily/weekly/monthly di-overwrite oleh refreshRSFromRegime() dari historical IHSG data.
  // prices[] diisi oleh setIhsgHistory() dari /api/backtest-data; value di-update dari Yahoo live price.
  // Nilai di bawah hanya dipakai sebagai fallback pre-data-load.
  ihsg: { value: 5875.78, daily: 0, daily_pct: 0, weekly: 0, monthly: 0, prices: [] as { close: number; date: string; isCarriedForward?: boolean }[] },
  usdidr: { value: 17955, daily: 0, weekly: 0, monthly: 0 },
  gold: { value: 2417492, daily: 0, weekly: 0, monthly: 0 },
  oil: { value: 88, daily: 0, weekly: 0, monthly: 0 }
};

let _prevRanks: Record<string, number> = {};

// Default weight constants — hasil backtest optimasi step 0.05 (data 2021-2026).
// AMAN: prioritas Sharpe + drawdown rendah.
// AGRESIF: growth-heavy.
// DIVIDEN: fokus dividend yield.
export const CW_AMAN = { quality: 0.30, growth: 0.45, value: 0.10, momentum: 0.00, dividend: 0.15 };
export const CW_AGRESIF = { quality: 0.20, growth: 0.60, value: 0.10, momentum: 0.10, dividend: 0.00 };
export const CW_DIVIDEN = { quality: 0.15, growth: 0.20, value: 0.05, momentum: 0.00, dividend: 0.60 };

/** Legacy map — used by callers that still reference "prod"/"res"/profile-id strings. */
export const CW_MAP: Record<string, typeof CW_AMAN> = {
  aman: CW_AMAN,
  agresif: CW_AGRESIF,
  dividen: CW_DIVIDEN,
  "growth-heavy": { quality: 0.10, growth: 0.70, value: 0.05, momentum: 0.10, dividend: 0.05 },
};

// Scan data cache from idx80_scan.json (loaded from /api/engine/idx80)
interface ScanStock {
  ticker: string;
  quality: number;
  growth: number;
  value: number;
  momentum: number;
  dividend?: number;
  currentPrice: number;
  changePercent: number;
  volume?: number;
  peRatio?: number;
  pbRatio?: number;
  dividendYield?: number;
  companyName?: string;
  sector?: string;
  industry?: string;
  lastUpdated: string;
  longBusinessSummary?: string;
  marketCap?: number;
  trailingEps?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  totalRevenue?: number;
  netIncome?: number;
  operatingCashflow?: number;
  freeCashflow?: number;
  grossProfit?: number;
  ebitda?: number;
  revenueGrowth?: number;
  earningsGrowth?: number;
  returnOnEquity?: number;
  debtToEquity?: number;
  operatingMargin?: number;
  grossMargins?: number;
}
let scanDataCache: { stocks: ScanStock[]; lastUpdated: string } | null = null;

export function setScanData(data: { stocks: ScanStock[]; lastUpdated: string } | null) {
  scanDataCache = data;
  if (data?.stocks?.length) {
    enrichDividendScore(data.stocks);
    syncRadarContext(data);
    buildDividendCache(data.stocks);
  }
}

function buildDividendCache(stocks: ScanStock[]) {
  const cache: Record<string, Record<string, number>> = {};
  const currentYear = new Date().getFullYear();

  for (const s of stocks) {
    const ticker = s.ticker.replace(".JK", "");
    if (s.dividendYield && s.dividendYield > 0 && s.currentPrice > 0) {
      const dps = (s.dividendYield / 100) * s.currentPrice;
      if (dps > 0) {
        const yearMap: Record<string, number> = {};
        for (let y = 2021; y <= currentYear; y++) {
          yearMap[y.toString()] = dps;
        }
        cache[ticker] = yearMap;
      }
    }
  }

  setDividendCache(cache);
}

/** Compute 0-100 dividend score from dividendYield (%). IDX dividend yield
 *  range is roughly 0-15%; linear map: 0%→0, 7.5%→50, 15%→100.
 *  Mutates s.dividend in place so getProcessedLeaders + marketRegimeEngine
 *  see the same value as the other 0-100 factors. */
function enrichDividendScore(stocks: ScanStock[]) {
  let enriched = 0;
  for (const s of stocks) {
    if (s.dividend === undefined && s.dividendYield !== undefined) {
      s.dividend = Math.max(0, Math.min(100, s.dividendYield * (100 / 15)));
      enriched++;
    }
  }
  if (typeof console !== "undefined") {
    console.log(`[dividend] enriched ${enriched}/${stocks.length} stocks from dividendYield`);
  }
}

function syncRadarContext(scanData: { stocks: ScanStock[]; lastUpdated: string }) {
  const stocks = scanData.stocks;
  if (!stocks.length) return;

  const avgQ = stocks.reduce((s, x) => s + (x.quality ?? 50), 0) / stocks.length;
  const avgG = stocks.reduce((s, x) => s + (x.growth ?? 50), 0) / stocks.length;
  const avgV = stocks.reduce((s, x) => s + (x.value ?? 50), 0) / stocks.length;
  const avgM = stocks.reduce((s, x) => s + (x.momentum ?? 50), 0) / stocks.length;
  const avgD = stocks.reduce((s, x) => s + (x.dividend ?? 50), 0) / stocks.length;

  const factors: [string, number][] = [["Quality", avgQ], ["Growth", avgG], ["Value", avgV], ["Momentum", avgM], ["Dividen", avgD]];
  factors.sort((a, b) => b[1] - a[1]);

  const strongest = factors[0];
  const weakest = factors[factors.length - 1];

  const volDetails = stocks
    .filter(s => (s.volume || 0) > 0)
    .sort((a, b) => (b.volume || 0) - (a.volume || 0))
    .slice(0, 5)
    .map(s => {
      const ratio = ((s.volume || 0) / 500000).toFixed(1);
      const label = parseFloat(ratio) > 2 ? "Volume Lonjakan" : parseFloat(ratio) < 0.8 ? "Sepi" : "Wajar";
      const tickerClean = s.ticker.replace(".JK", "");
      return `${tickerClean}.JK: Volume ${ratio}x (${label})`;
    });

  RS.radar_context.strongest_factor = strongest[0];
  RS.radar_context.strongest_factor_score = Math.round(strongest[1] * 10) / 10;
  RS.radar_context.weakest_factor = weakest[0];
  RS.radar_context.weakest_factor_score = Math.round(weakest[1] * 10) / 10;
  RS.radar_context.watchlist_count = stocks.length;
  // FASE 1.5 — Gunakan field yang lebih jelas untuk ukuran universe
  RS.radar_context.idx_universe_size = stocks.length;
  RS.volume_details = volDetails;
}

export function getScanData() {
  return scanDataCache;
}

export function getProcessedLeaders(activeStocksList: any[], config: string | { quality: number; growth: number; value: number; momentum: number; dividend: number }) {
  const weights = typeof config === "string"
    ? (CW_MAP[config] ?? CW_AMAN)
    : config;

  const dynamicL = activeStocksList.map((s, idx) => {
    // Prefer scan data over hardcoded L for score factors
    const normTicker = s.ticker.replace(".JK", "");
    const scanStock = scanDataCache?.stocks.find(st => st.ticker.replace(".JK", "") === normTicker);
    if (scanStock) {
      const div = scanStock.dividend ?? 50;
      return {
        rank: String(idx + 1),
        ticker: normTicker + ".JK",
        quality: scanStock.quality.toFixed(2),
        growth: scanStock.growth.toFixed(2),
        value: scanStock.value.toFixed(2),
        momentum: scanStock.momentum.toFixed(2),
        dividend: div.toFixed(2),
        final_score: String(Math.round(
          scanStock.quality * weights.quality +
          scanStock.growth * weights.growth +
          scanStock.value * weights.value +
          scanStock.momentum * weights.momentum +
          div * weights.dividend
        )),
      };
    }

    const existing = L.find(l => l.ticker.replace(".JK", "") === s.ticker);
    if (existing) {
      const div = parseFloat(existing.dividend || "50");
      return {
        ...existing,
        quality: parseFloat(existing.quality).toFixed(2),
        growth: parseFloat(existing.growth).toFixed(2),
        value: parseFloat(existing.value).toFixed(2),
        momentum: parseFloat(existing.momentum).toFixed(2),
        dividend: div.toFixed(2),
        final_score: String(Math.round(
          parseFloat(existing.quality) * weights.quality +
          parseFloat(existing.growth) * weights.growth +
          parseFloat(existing.value) * weights.value +
          parseFloat(existing.momentum) * weights.momentum +
          div * weights.dividend
        )),
      };
    }

    // No scan data and not in L — assign neutral score so stock still visible
    return {
      rank: String(idx + 1),
      ticker: normTicker + ".JK",
      quality: "50.00",
      growth: "50.00",
      value: "50.00",
      momentum: "50.00",
      dividend: "50.00",
      final_score: "50",
    };
  }).filter(Boolean);

  const computeScore = (stock: typeof L[0]) => {
    const qVal = parseFloat(stock.quality) || 0;
    const gVal = parseFloat(stock.growth) || 0;
    const vVal = parseFloat(stock.value) || 0;
    const mVal = parseFloat(stock.momentum) || 0;
    const dVal = (stock as any).dividend !== undefined && (stock as any).dividend !== null && (stock as any).dividend !== "" ? parseFloat((stock as any).dividend) : 0;
    return qVal * weights.quality + gVal * weights.growth + vVal * weights.value + mVal * weights.momentum + dVal * weights.dividend;
  };

  const sorted = dynamicL.map((stock) => {
    const calculatedScore = computeScore(stock);
    return {
      ...stock,
      score: parseFloat(calculatedScore.toFixed(2)),
    };
  }).sort((a, b) => b.score - a.score);

  const now = Date.now();
  return sorted.map((stock, idx) => {
    const currentRank = idx + 1;
    const prevRank = _prevRanks[stock.ticker];
    let change = 0;
    if (prevRank !== undefined) {
      change = prevRank - currentRank;
    }
    _prevRanks[stock.ticker] = currentRank;
    return { ...stock, rankChange: change };
  });
}

export interface NewsItem {
  portal: string;
  title: string;
  url: string;
  summary: string;
  time: string;
  badge: string;
  color: string;
}

export const idxNews: NewsItem[] = [
  {
    portal: "CNBC Indonesia",
    title: "BI-Rate Tetap 6.25%: Sentimen Likuiditas Perbankan Masih Terjaga Sempurna",
    url: "https://www.cnbcindonesia.com/market",
    summary: "Rapat Dewan Gubernur Bank Indonesia memutuskan untuk menahan suku bunga acuan. Langkah ini diambil untuk mengawal stabilitas nilai tukar Rupiah dari volatilitas eksternal global.",
    time: "20 mins ago",
    badge: "Macro Indicator",
    color: "border-emerald-500/20 text-emerald-400 bg-emerald-500/10"
  },
  {
    portal: "Bisnis.com",
    title: "Emiten Batubara Menggeliat, ADRO & ITMG Nikmati Berkah Lonjakan Volume Ekspor",
    url: "https://market.bisnis.com",
    summary: "Sejumlah emiten batubara membukukan peningkatan volume ekspor yang signifikan ke wilayah Asia Timur. Permintaan solid ini menyokong neraca kas fundamental yang tebal bagi para pemegang saham.",
    time: "1 hour ago",
    badge: "Coal Sector",
    color: "border-emerald-500/20 text-emerald-400 bg-emerald-500/10"
  },
  {
    portal: "Kontan",
    title: "Rapor Keuangan Q1 Perbankan KBMI 4 Cemerlang, Rekomendasi Akumulasi BBCA & BMRI",
    url: "https://www.kontan.co.id",
    summary: "Bank-bank raksasa mencetak margin bunga bersih (NIM) yang kompetitif meskipun dihantam kebijakan suku bunga restriktif. Konsensus analis menyarankan buy on weakness.",
    time: "3 hours ago",
    badge: "Banking Intel",
    color: "border-purple-500/20 text-purple-400 bg-purple-400/10"
  },
  {
    portal: "Bloomberg Technoz",
    title: "Rupiah Kokoh Menguat ke Rp 16.145 per Dolar AS Ditopang Derasnya Modal Asing",
    url: "https://www.bloombergtechnoz.com",
    summary: "Aliran modal asing (flow of funds) membanjiri surat utang negara dan bursa saham domestik. Rupiah menguat paling prima di kawasan regional Asia Tenggara.",
    time: "4 hours ago",
    badge: "Exchange Rate",
    color: "border-teal-500/20 text-teal-400 bg-teal-500/10"
  }
];

