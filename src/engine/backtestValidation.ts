import type { BacktestDayData } from "./types";

export type ValidationStatus = "valid" | "warning" | "invalid";

export interface ValidationCoverage {
  totalTradingDays: number;
  dateRangeStart: string;
  dateRangeEnd: string;
  avgStocksPerDay: number;
  minStocksDay: string;
  minStocksCount: number;
  hasIhsgData: boolean;
  hasGoldData: boolean;
  hasScores: boolean;
}

export interface ValidationResult {
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
  coverage: ValidationCoverage;
}

export function validateBacktestData(
  data: BacktestDayData[],
  startDate: string,
  endDate: string,
  topN: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data || data.length === 0) {
    return {
      status: "invalid",
      errors: ["Tidak ada data historis yang tersedia dari server."],
      warnings: [],
      coverage: {
        totalTradingDays: 0,
        dateRangeStart: "",
        dateRangeEnd: "",
        avgStocksPerDay: 0,
        minStocksDay: "",
        minStocksCount: 0,
        hasIhsgData: false,
        hasGoldData: false,
        hasScores: false,
      },
    };
  }

  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const filtered = sorted.filter((d) => d.date >= startDate && d.date <= endDate);

  if (filtered.length === 0) {
    return {
      status: "invalid",
      errors: [
        `Tidak ada data trading dalam rentang ${startDate} hingga ${endDate}.`,
        `Data tersedia: ${sorted[0]?.date} hingga ${sorted[sorted.length - 1]?.date}.`,
      ],
      warnings: [],
      coverage: {
        totalTradingDays: 0,
        dateRangeStart: sorted[0]?.date || "",
        dateRangeEnd: sorted[sorted.length - 1]?.date || "",
        avgStocksPerDay: 0,
        minStocksDay: "",
        minStocksCount: 0,
        hasIhsgData: false,
        hasGoldData: false,
        hasScores: false,
      },
    };
  }

  const hasIhsgData = filtered.some((d) => d.ihsgPrice > 0);
  const hasGoldData = filtered.some((d) => d.goldPrice > 0);
  const hasScores = filtered.some(
    (d) => d.stockNormScores && Object.keys(d.stockNormScores).length > 0
  );

  const stockCounts = filtered.map(
    (d) => Object.keys(d.stockPrices || {}).filter((t) => d.stockPrices[t] > 0).length
  );
  const totalStocks = stockCounts.reduce((a, b) => a + b, 0);
  const avgStocksPerDay = filtered.length > 0 ? Math.round(totalStocks / filtered.length) : 0;
  const minStocksIdx = stockCounts.indexOf(Math.min(...stockCounts));
  const minStocksDay = filtered[minStocksIdx]?.date || "";
  const minStocksCount = stockCounts[minStocksIdx] || 0;

  if (!hasIhsgData) {
    errors.push("Data IHSG tidak tersedia atau semua bernilai 0.");
  }
  if (!hasGoldData) {
    warnings.push("Data emas tidak tersedia — benchmark emas akan nol.");
  }
  if (!hasScores) {
    warnings.push("Score kuantitatif tidak tersedia — ranking menggunakan fallback.");
  }

  if (minStocksCount < topN) {
    warnings.push(
      `Tanggal ${minStocksDay} hanya memiliki ${minStocksCount} saham (TopN=${topN}). Beberapa alokasi mungkin tidak penuh.`
    );
  }

  const availableStart = sorted[0]?.date || "";
  const availableEnd = sorted[sorted.length - 1]?.date || "";
  if (startDate < availableStart) {
    warnings.push(
      `Tanggal mulai ${startDate} sebelum data tersedia (${availableStart}). Backtest dimulai dari data pertama.`
    );
  }
  if (endDate > availableEnd) {
    warnings.push(
      `Tanggal akhir ${endDate} setelah data tersedia (${availableEnd}). Data akan carry-forward.`
    );
  }

  const status: ValidationStatus = errors.length > 0 ? "invalid" : warnings.length > 0 ? "warning" : "valid";

  return {
    status,
    errors,
    warnings,
    coverage: {
      totalTradingDays: filtered.length,
      dateRangeStart: filtered[0]?.date || "",
      dateRangeEnd: filtered[filtered.length - 1]?.date || "",
      avgStocksPerDay,
      minStocksDay,
      minStocksCount,
      hasIhsgData,
      hasGoldData,
      hasScores,
    },
  };
}
