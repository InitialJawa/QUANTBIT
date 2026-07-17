import type { StockData } from "../types";
import { DataStatus } from "../types/DataStatus";

export type FieldQuality = "valid" | "fallback" | "missing";

export interface TickerDataQuality {
  status: "valid" | "partial" | "fallback" | "missing";
  label: string;
  warnings: string[];
  fields: {
    price: FieldQuality;
    fundamentals: FieldQuality;
    charts: FieldQuality;
    description: FieldQuality;
    peers: FieldQuality;
    dividend: FieldQuality;
    rotation: FieldQuality;
    signals: FieldQuality;
  };
}

const FALLBACK_RATIOS = { pe: 14.5, pb: 1.6, roe: 12.4, der: 0.35, div: 2.4 };

function isDefaultFallback(value: number, fallback: number): boolean {
  return Math.abs(value - fallback) < 0.01;
}

function priceFieldStatus(stock: StockData): FieldQuality {
  if (!stock.currentPrice || stock.currentPrice <= 0) return "missing";
  if (stock.dataSources?.price === DataStatus.ESTIMATED) return "fallback";
  return "valid";
}

function fundamentalsFieldStatus(stock: StockData): FieldQuality {
  if (!stock.peRatio && !stock.roe) return "missing";
  const isDefault =
    isDefaultFallback(stock.peRatio, FALLBACK_RATIOS.pe) &&
    isDefaultFallback(stock.pbRatio, FALLBACK_RATIOS.pb) &&
    isDefaultFallback(stock.roe, FALLBACK_RATIOS.roe);
  if (isDefault) return "fallback";
  if (stock.dataSources?.fundamentals === DataStatus.ESTIMATED) return "fallback";
  return "valid";
}

function chartsFieldStatus(stock: StockData): FieldQuality {
  if (!stock.chartDataMonthly?.length) return "missing";
  if (stock.dataSources?.charts === DataStatus.ESTIMATED) return "fallback";
  return "valid";
}

function descriptionFieldStatus(stock: StockData): FieldQuality {
  if (!stock.description || stock.description === "-" || stock.description === "Data tidak tersedia") return "missing";
  if (stock.description.includes("adalah salah satu perusahaan publik terkemuka")) return "fallback";
  if (stock.dataSources?.description === DataStatus.ESTIMATED) return "fallback";
  return "valid";
}

export function assessTickerDataQuality(
  stock: StockData,
  opts?: { hasPeers?: boolean; hasRotation?: boolean; hasSignals?: boolean; hasDividend?: boolean }
): TickerDataQuality {
  const warnings: string[] = [];

  const price = priceFieldStatus(stock);
  const fundamentals = fundamentalsFieldStatus(stock);
  const charts = chartsFieldStatus(stock);
  const description = descriptionFieldStatus(stock);
  const peers: FieldQuality = opts?.hasPeers ? "valid" : "missing";
  const dividend: FieldQuality = opts?.hasDividend ? "valid" : (stock.dividendYield > 0 ? "valid" : "missing");
  const rotation: FieldQuality = opts?.hasRotation ? "valid" : "missing";
  const signals: FieldQuality = opts?.hasSignals ? "valid" : "missing";

  if (price === "fallback") warnings.push("Harga menggunakan data estimasi, bukan live.");
  if (fundamentals === "fallback") warnings.push("Rasio fundamental menggunakan nilai default fallback.");
  if (charts === "fallback") warnings.push("Chart menggunakan data sintetis, bukan live market.");
  if (description === "fallback") warnings.push("Deskripsi perusahaan menggunakan template otomatis.");
  if (peers === "missing") warnings.push("Data peer belum tersedia.");
  if (rotation === "missing") warnings.push("Data rotasi belum tersedia.");
  if (signals === "missing") warnings.push("Data sinyal belum tersedia.");

  const fields = { price, fundamentals, charts, description, peers, dividend, rotation, signals };
  const values = Object.values(fields);
  const validCount = values.filter(v => v === "valid").length;
  const missingCount = values.filter(v => v === "missing").length;

  let status: TickerDataQuality["status"];
  let label: string;
  if (validCount >= 6) {
    status = "valid";
    label = "Valid";
  } else if (missingCount <= 2) {
    status = "partial";
    label = "Partial";
  } else if (missingCount >= 6) {
    status = "missing";
    label = "Tidak Ada Data";
  } else {
    status = "fallback";
    label = "Fallback";
  }

  return { status, label, warnings, fields };
}

export function getDataQualityColor(status: TickerDataQuality["status"]): string {
  switch (status) {
    case "valid": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "partial": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "fallback": return "bg-amber-500/10 text-amber-400/80 border-amber-500/20";
    case "missing": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
  }
}

export function getDecisionBadge(stock: StockData, isRiskOff: boolean): { label: string; color: string } {
  if (isRiskOff) return { label: "Risk-Off", color: "bg-rose-500/15 text-rose-400 border-rose-500/30" };
  if (stock.change <= -3) return { label: "Hindari", color: "bg-rose-500/15 text-rose-400 border-rose-500/30" };
  if (stock.change >= 2 && stock.peRatio > 0 && stock.peRatio < 20) return { label: "Beli", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" };
  if (stock.peRatio > 25 || stock.change < -1) return { label: "Pantau", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" };
  return { label: "Netral", color: "bg-white/5 text-white/50 border-white/10" };
}
