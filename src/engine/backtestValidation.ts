import type { BacktestDayData, BacktestResult } from "./types";

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

export interface ResultValidation {
  status: ValidationStatus;
  errors: string[];
  warnings: string[];
  diagnostics: Record<string, string | number | boolean>;
}

export function validateBacktestResult(
  result: BacktestResult,
  initialCapital: number
): ResultValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const diag: Record<string, string | number | boolean> = {};

  const d = result.diagnostics;

  diag["finalValue"] = result.finalValue;
  diag["totalReturnPct"] = result.totalReturnPct.toFixed(2) + "%";
  diag["cagr"] = result.cagr.toFixed(2) + "%";
  diag["totalTrades"] = result.totalTrades;
  diag["crashCount"] = result.crashCount ?? 0;
  diag["finalInCrashState"] = result.finalInCrashState ?? false;

  if (d) {
    diag["bufferCash"] = d.bufferCash;
    diag["finalStockValue"] = d.finalStockValue;
    diag["finalGoldValue"] = d.finalGoldValue;
    diag["finalCash"] = d.finalCash;
    diag["initialAllocatedTickers"] = d.initialAllocatedTickers;
    diag["scoreLookupAvailable"] = d.scoreLookupAvailable;
    diag["dataDays"] = d.dataDaysTotal;
    diag["period"] = `${d.startDate} → ${d.endDate}`;
    diag["ihsgRange"] = `${d.ihsgPriceStart.toFixed(0)} → ${d.ihsgPriceEnd.toFixed(0)}`;
    diag["goldRange"] = `${d.goldPriceStart.toFixed(0)} → ${d.goldPriceEnd.toFixed(0)}`;
  }

  if (result.finalValue === 0 && initialCapital > 0) {
    errors.push("Final value Rp0 dari modal awal — hasil tidak valid.");
    if (d) {
      if (d.bufferCash === 0) {
        errors.push("bufferCash = 0. Reserve Buffer Percentage mungkin bernilai 0.");
      }
      if (d.initialAllocatedTickers === 0) {
        errors.push("Tidak ada emitentyang dialokasikan di hari pertama.");
      }
      if (d.finalGoldValue === 0 && d.finalStockValue === 0 && d.finalCash === 0) {
        errors.push("Semua komponen portfolio bernilai 0 (stock + gold + cash).");
      }
    }
  }

  if (result.totalReturnPct === -100 && result.cagr === 0) {
    errors.push("Return -100% tetapi CAGR = 0%. Inkonsistensi metrik.");
  }

  if (result.totalTrades === 0 && result.logs.length > 1) {
    warnings.push(`Trades = 0 tetapi jurnal memiliki ${result.logs.length} event. Kemungkinan hanya ada inisialisasi.`);
  }

  if (result.totalTrades === 0 && result.finalInCrashState) {
    warnings.push("Status crash aktif tetapi tidak ada transaksi tercatat.");
  }

  if (result.finalInCrashState && result.finalGoldGrams === 0 && result.finalCash === 0) {
    errors.push("Status Safe Haven aktif tetapi tidak ada holding emas atau cash.");
  }

  if (d) {
    if (d.initialAllocatedTickers > 0 && d.finalStockValue === 0 && !result.finalInCrashState) {
      warnings.push("Alokasi awal ada tetapi nilai saham akhir = 0 tanpa status crash.");
    }

    const ihsgReturn = d.ihsgPriceStart > 0
      ? ((d.ihsgPriceEnd - d.ihsgPriceStart) / d.ihsgPriceStart) * 100
      : 0;
    if (Math.abs(ihsgReturn - result.ihsgReturnPct) > 0.1) {
      warnings.push(`IHSG return inkonsisten: diagnosa ${ihsgReturn.toFixed(2)}% vs metrik ${result.ihsgReturnPct.toFixed(2)}%.`);
    }

    if (d.dataDaysTotal < 10) {
      warnings.push(`Hanya ${d.dataDaysTotal} hari data — hasil mungkin tidak representatif.`);
    }

    if (!d.scoreLookupAvailable) {
      warnings.push("Score lookup tidak tersedia — ranking menggunakan data fallback.");
    }
  }

  if (result.ihsgReturnPct > 50 && Math.abs(result.totalReturnPct) < 1) {
    warnings.push("IHSG return sangat tinggi tapi strategi flat — kemungkinan masalah data atau ranking.");
  }

  if (result.goldReturnPct > 100 && result.totalReturnPct < -50) {
    warnings.push("Emas naik >100% tapi strategi rugi >50%. Periksa apakah safe haven aktif.");
  }

  const status: ValidationStatus = errors.length > 0 ? "invalid" : warnings.length > 0 ? "warning" : "valid";

  return { status, errors, warnings, diagnostics: diag };
}
