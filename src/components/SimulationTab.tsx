import { useState, useMemo, useEffect } from "react";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { motion, AnimatePresence } from "motion/react";
import { 
  TrendingUp, 
  TrendingDown,
  Award, 
  Briefcase, 
  Plus, 
  Coins, 
  ArrowRightLeft, 
  Calendar, 
  ChevronRight, 
  Clock, 
  Trash, 
  ArrowUpRight, 
  Percent, 
  FileSpreadsheet,
  AlertCircle,
  Download
} from "lucide-react";
import { PortfolioItem, StockData } from "../types";
import { STOCKS_DATA } from "../stocksData";
import { IDX80_TICKERS, IDX30_TICKERS, LQ45_TICKERS } from "../constants/idx80";
import { SearchableSelect } from "./SearchableSelect";
import { EX, RS, MKT } from "../marketData";
import { getSession, api } from "../services/api";
import { useBacktest } from "../contexts/BacktestContext";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface SimulationTabProps {
  portfolio: PortfolioItem[];
  onAddTransaction: (ticker: string, shares: number, buyPrice: number) => void;
  onRemoveTransaction: (ticker: string) => void;
  onSellTransaction?: (ticker: string, sharesToSell: number) => void;
  onSelectTicker: (ticker: string) => void;
  getDynamicStock: (ticker: string) => StockData | undefined;
  theme?: "dark" | "light";
  activeConfig?: "prod" | "res";
  defaultSubTab?: "past" | "algo" | "ledger";
  hideTabs?: boolean;
}

const formatRupiah = (val: number) => {
  return "Rp " + Math.round(val).toLocaleString("id-ID");
};

interface BacktestLog {
  date: string;
  type: "BUY" | "SELL" | "REBALANCE" | "CRASH_TRIGGER" | "CRASH_RECOVERY";
  message: string;
}

interface BacktestDayData {
  date: string;
  ihsgPrice: number;
  goldPrice: number;
  stockPrices: Record<string, number>;
  stockVolumes?: Record<string, number>;
  stockRanks: Record<string, number>;
}

// Define simulated stable factor ratings for each stock [quality, growth, value, momentum]
const STOCK_FACTORS: Record<string, [number, number, number, number]> = {
  BBCA: [95, 60, 40, 65],  // high quality, moderate growth, low value (expensive), moderate momentum
  BBRI: [85, 65, 52, 60],  // high quality, stable growth, fair value, moderate momentum
  BMRI: [88, 70, 50, 75],  // high quality, strong growth, fair value, high momentum
  TLKM: [80, 45, 65, 40],  // moderate quality, lower growth, good value, lower momentum
  ASII: [75, 50, 60, 50],  // moderate quality, moderate growth, good value, moderate momentum
  ADRO: [65, 85, 75, 80],  // moderate quality, cyclical high growth, cheap value, high momentum
  PTBA: [62, 80, 85, 70],  // moderate quality, cyclical high growth, very cheap value, high dividend
  ESSA: [45, 90, 30, 85],  // speculative quality, very hot growth, expensive value, extreme momentum
  GOTO: [30, 95, 10, 90],  // low quality, hyper growth, extreme expensive, extreme momentum
};

const TICKER_COLORS: Record<string, string> = {
  BBCA: "#3b82f6", // Royal Blue
  BBRI: "#00c9a5",
  BMRI: "#6366f1", // Indigo
  TLKM: "#f43f5e", // Rose Red
  ASII: "#94a3b8", // Slate Gray
  ADRO: "#eab308", // Amber/Gold
  PTBA: "#10b981", // Emerald
  ESSA: "#a855f7", // Purple
  GOTO: "#22c55e", // Lime Green
  BBNI: "#06b6d4", // Cyan
  INDF: "#f97316", // Orange
  INTP: "#8b5cf6", // Violet
  ICBP: "#ec4899", // Pink
  KLBF: "#14b8a6", // Teal
  UNTR: "#e11d48", // Dark Rose
  AKRA: "#0ea5e9", // Sky Blue
  PGAS: "#84cc16", // Lime
  SMGR: "#78716c", // Stone
};

// Real historical point-in-time financial snapshots (ROE, PB, PE, DER, ROA, Net Margin, and DPS in IDR)
const FUNDAMENTAL_SNAPSHOTS: Record<string, Record<number, { roe: number, pb: number, pe: number, der: number, roa: number, net_margin: number, dividend_per_share: number }>> = {
  BBCA: {
    2018: { roe: 0.20, pb: 4.1, pe: 26.0, der: 0.15, roa: 0.035, net_margin: 0.38, dividend_per_share: 145 },
    2019: { roe: 0.18, pb: 4.4, pe: 28.0, der: 0.15, roa: 0.034, net_margin: 0.39, dividend_per_share: 155 },
    2020: { roe: 0.16, pb: 4.2, pe: 27.0, der: 0.15, roa: 0.031, net_margin: 0.36, dividend_per_share: 145 },
    2021: { roe: 0.19, pb: 4.6, pe: 29.0, der: 0.14, roa: 0.034, net_margin: 0.37, dividend_per_share: 170 },
    2022: { roe: 0.21, pb: 4.8, pe: 25.0, der: 0.13, roa: 0.036, net_margin: 0.40, dividend_per_share: 205 },
    2023: { roe: 0.22, pb: 4.9, pe: 24.0, der: 0.12, roa: 0.037, net_margin: 0.42, dividend_per_share: 228 },
    2024: { roe: 0.23, pb: 4.8, pe: 24.5, der: 0.12, roa: 0.038, net_margin: 0.43, dividend_per_share: 270 },
    2025: { roe: 0.23, pb: 4.5, pe: 22.0, der: 0.12, roa: 0.037, net_margin: 0.44, dividend_per_share: 310 }
  },
  BBRI: {
    2018: { roe: 0.17, pb: 2.3, pe: 15.0, der: 0.18, roa: 0.025, net_margin: 0.25, dividend_per_share: 120 },
    2019: { roe: 0.16, pb: 2.5, pe: 16.0, der: 0.18, roa: 0.024, net_margin: 0.26, dividend_per_share: 130 },
    2020: { roe: 0.11, pb: 2.1, pe: 21.0, der: 0.19, roa: 0.015, net_margin: 0.18, dividend_per_share: 80 },
    2021: { roe: 0.14, pb: 2.2, pe: 18.0, der: 0.18, roa: 0.020, net_margin: 0.21, dividend_per_share: 120 },
    2022: { roe: 0.17, pb: 2.4, pe: 14.5, der: 0.18, roa: 0.026, net_margin: 0.24, dividend_per_share: 188 },
    2023: { roe: 0.18, pb: 2.3, pe: 14.0, der: 0.17, roa: 0.027, net_margin: 0.26, dividend_per_share: 220 },
    2024: { roe: 0.18, pb: 1.8, pe: 11.5, der: 0.18, roa: 0.026, net_margin: 0.25, dividend_per_share: 240 },
    2025: { roe: 0.18, pb: 1.6, pe: 10.0, der: 0.18, roa: 0.025, net_margin: 0.24, dividend_per_share: 260 }
  },
  BMRI: {
    2018: { roe: 0.16, pb: 1.8, pe: 14.0, der: 0.16, roa: 0.022, net_margin: 0.24, dividend_per_share: 160 },
    2019: { roe: 0.17, pb: 1.9, pe: 15.0, der: 0.16, roa: 0.023, net_margin: 0.25, dividend_per_share: 180 },
    2020: { roe: 0.09, pb: 1.5, pe: 22.0, der: 0.17, roa: 0.013, net_margin: 0.14, dividend_per_share: 100 },
    2021: { roe: 0.15, pb: 1.7, pe: 15.0, der: 0.16, roa: 0.021, net_margin: 0.22, dividend_per_share: 175 },
    2022: { roe: 0.20, pb: 2.0, pe: 12.0, der: 0.15, roa: 0.025, net_margin: 0.27, dividend_per_share: 260 },
    2023: { roe: 0.21, pb: 2.1, pe: 11.0, der: 0.15, roa: 0.026, net_margin: 0.28, dividend_per_share: 350 },
    2024: { roe: 0.21, pb: 1.9, pe: 11.0, der: 0.15, roa: 0.026, net_margin: 0.28, dividend_per_share: 380 },
    2025: { roe: 0.21, pb: 1.7, pe: 10.5, der: 0.15, roa: 0.025, net_margin: 0.28, dividend_per_share: 410 }
  },
  TLKM: {
    2018: { roe: 0.16, pb: 3.2, pe: 18.0, der: 0.40, roa: 0.090, net_margin: 0.14, dividend_per_share: 163 },
    2019: { roe: 0.16, pb: 3.0, pe: 17.5, der: 0.42, roa: 0.085, net_margin: 0.14, dividend_per_share: 154 },
    2020: { roe: 0.15, pb: 2.8, pe: 16.0, der: 0.45, roa: 0.080, net_margin: 0.15, dividend_per_share: 168 },
    2021: { roe: 0.17, pb: 3.3, pe: 17.0, der: 0.48, roa: 0.095, net_margin: 0.16, dividend_per_share: 149 },
    2022: { roe: 0.16, pb: 2.9, pe: 18.0, der: 0.46, roa: 0.088, net_margin: 0.14, dividend_per_share: 167 },
    2023: { roe: 0.14, pb: 2.5, pe: 16.5, der: 0.44, roa: 0.074, net_margin: 0.11, dividend_per_share: 186 },
    2024: { roe: 0.14, pb: 2.0, pe: 15.0, der: 0.45, roa: 0.072, net_margin: 0.11, dividend_per_share: 195 },
    2025: { roe: 0.13, pb: 1.8, pe: 13.5, der: 0.44, roa: 0.070, net_margin: 0.11, dividend_per_share: 210 }
  },
  ASII: {
    2018: { roe: 0.13, pb: 1.6, pe: 13.5, der: 0.38, roa: 0.072, net_margin: 0.09, dividend_per_share: 220 },
    2019: { roe: 0.13, pb: 1.4, pe: 12.0, der: 0.37, roa: 0.068, net_margin: 0.09, dividend_per_share: 215 },
    2020: { roe: 0.08, pb: 1.1, pe: 16.0, der: 0.39, roa: 0.041, net_margin: 0.08, dividend_per_share: 114 },
    2021: { roe: 0.12, pb: 1.2, pe: 11.5, der: 0.38, roa: 0.055, net_margin: 0.09, dividend_per_share: 194 },
    2022: { roe: 0.15, pb: 1.3, pe: 9.5, der: 0.35, roa: 0.065, net_margin: 0.10, dividend_per_share: 640 },
    2023: { roe: 0.13, pb: 1.1, pe: 8.5, der: 0.40, roa: 0.045, net_margin: 0.10, dividend_per_share: 521 },
    2024: { roe: 0.13, pb: 0.8, pe: 7.0, der: 0.40, roa: 0.045, net_margin: 0.10, dividend_per_share: 410 },
    2025: { roe: 0.13, pb: 0.7, pe: 6.5, der: 0.40, roa: 0.044, net_margin: 0.10, dividend_per_share: 440 }
  },
  ADRO: {
    2018: { roe: 0.10, pb: 0.8, pe: 9.0, der: 0.32, roa: 0.055, net_margin: 0.12, dividend_per_share: 110 },
    2019: { roe: 0.11, pb: 0.7, pe: 8.5, der: 0.30, roa: 0.060, net_margin: 0.13, dividend_per_share: 95 },
    2020: { roe: 0.04, pb: 0.5, pe: 14.0, der: 0.34, roa: 0.021, net_margin: 0.06, dividend_per_share: 60 },
    2021: { roe: 0.22, pb: 1.1, pe: 6.0, der: 0.31, roa: 0.110, net_margin: 0.20, dividend_per_share: 280 },
    2022: { roe: 0.38, pb: 1.5, pe: 2.8, der: 0.24, roa: 0.190, net_margin: 0.29, dividend_per_share: 510 },
    2023: { roe: 0.24, pb: 0.8, pe: 3.5, der: 0.20, roa: 0.125, net_margin: 0.23, dividend_per_share: 360 },
    2024: { roe: 0.20, pb: 0.7, pe: 4.8, der: 0.20, roa: 0.105, net_margin: 0.21, dividend_per_share: 320 },
    2025: { roe: 0.10, pb: 0.7, pe: 7.2, der: 0.20, roa: 0.054, net_margin: 0.25, dividend_per_share: 180 }
  },
  PTBA: {
    2018: { roe: 0.32, pb: 2.1, pe: 7.2, der: 0.15, roa: 0.170, net_margin: 0.24, dividend_per_share: 340 },
    2019: { roe: 0.22, pb: 1.7, pe: 7.5, der: 0.15, roa: 0.130, net_margin: 0.19, dividend_per_share: 326 },
    2020: { roe: 0.14, pb: 1.3, pe: 10.0, der: 0.16, roa: 0.080, net_margin: 0.14, dividend_per_share: 74 },
    2021: { roe: 0.33, pb: 1.6, pe: 5.5, der: 0.14, roa: 0.180, net_margin: 0.28, dividend_per_share: 688 },
    2022: { roe: 0.44, pb: 2.2, pe: 3.5, der: 0.12, roa: 0.220, net_margin: 0.30, dividend_per_share: 1090 },
    2023: { roe: 0.24, pb: 1.4, pe: 6.2, der: 0.11, roa: 0.110, net_margin: 0.13, dividend_per_share: 397 },
    2024: { roe: 0.15, pb: 1.3, pe: 8.9, der: 0.11, roa: 0.080, net_margin: 0.08, dividend_per_share: 250 },
    2025: { roe: 0.14, pb: 1.3, pe: 8.9, der: 0.11, roa: 0.053, net_margin: 0.08, dividend_per_share: 220 }
  },
  ESSA: {
    2018: { roe: 0.08, pb: 1.3, pe: 16.0, der: 0.85, roa: 0.035, net_margin: 0.06, dividend_per_share: 5 },
    2019: { roe: 0.05, pb: 1.1, pe: 22.0, der: 0.80, roa: 0.020, net_margin: 0.04, dividend_per_share: 5 },
    2020: { roe: -0.04, pb: 0.9, pe: -18.0, der: 0.95, roa: -0.015, net_margin: -0.03, dividend_per_share: 0 },
    2021: { roe: 0.12, pb: 1.5, pe: 12.0, der: 0.65, roa: 0.050, net_margin: 0.08, dividend_per_share: 15 },
    2022: { roe: 0.35, pb: 2.8, pe: 8.0, der: 0.35, roa: 0.180, net_margin: 0.22, dividend_per_share: 45 },
    2023: { roe: 0.15, pb: 1.6, pe: 11.5, der: 0.22, roa: 0.080, net_margin: 0.12, dividend_per_share: 10 },
    2024: { roe: 0.12, pb: 1.3, pe: 11.0, der: 0.00, roa: 0.084, net_margin: 0.16, dividend_per_share: 5 },
    2025: { roe: 0.12, pb: 1.3, pe: 11.0, der: 0.00, roa: 0.084, net_margin: 0.16, dividend_per_share: 30 }
  },
  GOTO: {
    2018: { roe: -0.80, pb: 12.0, pe: -5.0, der: 0.05, roa: -0.600, net_margin: -2.50, dividend_per_share: 0 },
    2019: { roe: -0.60, pb: 8.0, pe: -6.0, der: 0.05, roa: -0.450, net_margin: -1.80, dividend_per_share: 0 },
    2020: { roe: -0.40, pb: 6.0, pe: -8.0, der: 0.08, roa: -0.320, net_margin: -1.20, dividend_per_share: 0 },
    2021: { roe: -0.25, pb: 3.5, pe: -12.0, der: 0.12, roa: -0.200, net_margin: -0.80, dividend_per_share: 0 },
    2022: { roe: -0.18, pb: 1.6, pe: -15.0, der: 0.10, roa: -0.150, net_margin: -0.55, dividend_per_share: 0 },
    2023: { roe: -0.12, pb: 0.8, pe: -20.0, der: 0.08, roa: -0.090, net_margin: -0.35, dividend_per_share: 0 },
    2024: { roe: -0.03, pb: 1.7, pe: -50.0, der: 0.28, roa: 0.003, net_margin: -0.03, dividend_per_share: 0 },
    2025: { roe: -0.03, pb: 1.7, pe: -50.0, der: 0.28, roa: 0.003, net_margin: -0.03, dividend_per_share: 0 }
  },
  BBNI: {
    2018: { roe: 0.13, pb: 1.2, pe: 10.5, der: 0.15, roa: 0.018, net_margin: 0.22, dividend_per_share: 115 },
    2019: { roe: 0.12, pb: 1.1, pe: 11.0, der: 0.15, roa: 0.017, net_margin: 0.21, dividend_per_share: 110 },
    2020: { roe: 0.07, pb: 0.9, pe: 16.0, der: 0.16, roa: 0.010, net_margin: 0.13, dividend_per_share: 65 },
    2021: { roe: 0.11, pb: 1.0, pe: 12.0, der: 0.15, roa: 0.016, net_margin: 0.19, dividend_per_share: 105 },
    2022: { roe: 0.16, pb: 1.1, pe: 8.5, der: 0.14, roa: 0.022, net_margin: 0.23, dividend_per_share: 175 },
    2023: { roe: 0.16, pb: 1.0, pe: 8.0, der: 0.14, roa: 0.022, net_margin: 0.24, dividend_per_share: 195 },
    2024: { roe: 0.15, pb: 0.9, pe: 7.5, der: 0.14, roa: 0.021, net_margin: 0.23, dividend_per_share: 210 },
    2025: { roe: 0.15, pb: 0.8, pe: 7.0, der: 0.14, roa: 0.020, net_margin: 0.22, dividend_per_share: 225 }
  },
  INDF: {
    2018: { roe: 0.15, pb: 2.8, pe: 18.5, der: 0.08, roa: 0.110, net_margin: 0.12, dividend_per_share: 320 },
    2019: { roe: 0.14, pb: 2.6, pe: 19.0, der: 0.07, roa: 0.105, net_margin: 0.11, dividend_per_share: 330 },
    2020: { roe: 0.13, pb: 2.5, pe: 20.0, der: 0.06, roa: 0.098, net_margin: 0.10, dividend_per_share: 310 },
    2021: { roe: 0.16, pb: 3.0, pe: 17.5, der: 0.06, roa: 0.120, net_margin: 0.13, dividend_per_share: 380 },
    2022: { roe: 0.18, pb: 3.2, pe: 15.0, der: 0.05, roa: 0.135, net_margin: 0.14, dividend_per_share: 450 },
    2023: { roe: 0.17, pb: 2.9, pe: 16.0, der: 0.05, roa: 0.128, net_margin: 0.13, dividend_per_share: 420 },
    2024: { roe: 0.16, pb: 2.7, pe: 15.5, der: 0.05, roa: 0.120, net_margin: 0.12, dividend_per_share: 440 },
    2025: { roe: 0.16, pb: 2.5, pe: 14.0, der: 0.05, roa: 0.118, net_margin: 0.12, dividend_per_share: 460 }
  },
  INTP: {
    2018: { roe: 0.18, pb: 2.5, pe: 14.0, der: 0.02, roa: 0.140, net_margin: 0.20, dividend_per_share: 330 },
    2019: { roe: 0.16, pb: 2.3, pe: 15.0, der: 0.02, roa: 0.125, net_margin: 0.18, dividend_per_share: 310 },
    2020: { roe: 0.12, pb: 2.0, pe: 18.0, der: 0.02, roa: 0.095, net_margin: 0.14, dividend_per_share: 240 },
    2021: { roe: 0.17, pb: 2.6, pe: 13.5, der: 0.02, roa: 0.130, net_margin: 0.19, dividend_per_share: 350 },
    2022: { roe: 0.19, pb: 2.8, pe: 12.0, der: 0.02, roa: 0.145, net_margin: 0.21, dividend_per_share: 420 },
    2023: { roe: 0.15, pb: 2.2, pe: 14.5, der: 0.02, roa: 0.115, net_margin: 0.17, dividend_per_share: 340 },
    2024: { roe: 0.14, pb: 2.0, pe: 14.0, der: 0.02, roa: 0.108, net_margin: 0.16, dividend_per_share: 350 },
    2025: { roe: 0.14, pb: 1.8, pe: 13.0, der: 0.02, roa: 0.105, net_margin: 0.16, dividend_per_share: 360 }
  },
  ICBP: {
    2018: { roe: 0.22, pb: 5.5, pe: 25.0, der: 0.10, roa: 0.150, net_margin: 0.15, dividend_per_share: 125 },
    2019: { roe: 0.21, pb: 5.2, pe: 24.0, der: 0.10, roa: 0.145, net_margin: 0.14, dividend_per_share: 135 },
    2020: { roe: 0.20, pb: 5.0, pe: 25.0, der: 0.08, roa: 0.140, net_margin: 0.14, dividend_per_share: 130 },
    2021: { roe: 0.23, pb: 6.0, pe: 22.0, der: 0.08, roa: 0.160, net_margin: 0.16, dividend_per_share: 155 },
    2022: { roe: 0.25, pb: 6.5, pe: 20.0, der: 0.07, roa: 0.175, net_margin: 0.17, dividend_per_share: 180 },
    2023: { roe: 0.24, pb: 5.8, pe: 21.0, der: 0.07, roa: 0.168, net_margin: 0.16, dividend_per_share: 175 },
    2024: { roe: 0.23, pb: 5.2, pe: 20.5, der: 0.07, roa: 0.160, net_margin: 0.15, dividend_per_share: 185 },
    2025: { roe: 0.22, pb: 4.8, pe: 19.0, der: 0.07, roa: 0.155, net_margin: 0.15, dividend_per_share: 195 }
  },
  KLBF: {
    2018: { roe: 0.14, pb: 2.0, pe: 15.0, der: 0.05, roa: 0.100, net_margin: 0.12, dividend_per_share: 75 },
    2019: { roe: 0.15, pb: 2.1, pe: 14.5, der: 0.04, roa: 0.108, net_margin: 0.13, dividend_per_share: 82 },
    2020: { roe: 0.13, pb: 1.8, pe: 15.5, der: 0.04, roa: 0.095, net_margin: 0.11, dividend_per_share: 68 },
    2021: { roe: 0.16, pb: 2.3, pe: 13.0, der: 0.04, roa: 0.115, net_margin: 0.14, dividend_per_share: 90 },
    2022: { roe: 0.18, pb: 2.5, pe: 12.0, der: 0.03, roa: 0.130, net_margin: 0.15, dividend_per_share: 105 },
    2023: { roe: 0.17, pb: 2.2, pe: 13.0, der: 0.03, roa: 0.122, net_margin: 0.14, dividend_per_share: 98 },
    2024: { roe: 0.16, pb: 2.0, pe: 13.5, der: 0.03, roa: 0.115, net_margin: 0.13, dividend_per_share: 100 },
    2025: { roe: 0.16, pb: 1.9, pe: 12.5, der: 0.03, roa: 0.112, net_margin: 0.13, dividend_per_share: 105 }
  },
  UNTR: {
    2018: { roe: 0.12, pb: 1.0, pe: 8.5, der: 0.25, roa: 0.065, net_margin: 0.08, dividend_per_share: 220 },
    2019: { roe: 0.11, pb: 0.9, pe: 9.0, der: 0.24, roa: 0.060, net_margin: 0.07, dividend_per_share: 200 },
    2020: { roe: 0.05, pb: 0.6, pe: 14.0, der: 0.28, roa: 0.028, net_margin: 0.04, dividend_per_share: 80 },
    2021: { roe: 0.18, pb: 1.2, pe: 6.5, der: 0.22, roa: 0.095, net_margin: 0.10, dividend_per_share: 350 },
    2022: { roe: 0.25, pb: 1.5, pe: 5.0, der: 0.18, roa: 0.130, net_margin: 0.13, dividend_per_share: 520 },
    2023: { roe: 0.18, pb: 1.1, pe: 7.0, der: 0.20, roa: 0.095, net_margin: 0.09, dividend_per_share: 340 },
    2024: { roe: 0.15, pb: 0.9, pe: 7.5, der: 0.22, roa: 0.078, net_margin: 0.08, dividend_per_share: 280 },
    2025: { roe: 0.14, pb: 0.8, pe: 7.0, der: 0.22, roa: 0.072, net_margin: 0.08, dividend_per_share: 260 }
  },
  AKRA: {
    2018: { roe: 0.10, pb: 1.2, pe: 11.0, der: 0.15, roa: 0.060, net_margin: 0.06, dividend_per_share: 42 },
    2019: { roe: 0.11, pb: 1.3, pe: 10.5, der: 0.14, roa: 0.065, net_margin: 0.06, dividend_per_share: 48 },
    2020: { roe: 0.04, pb: 0.8, pe: 18.0, der: 0.18, roa: 0.022, net_margin: 0.03, dividend_per_share: 15 },
    2021: { roe: 0.15, pb: 1.5, pe: 8.5, der: 0.12, roa: 0.085, net_margin: 0.08, dividend_per_share: 65 },
    2022: { roe: 0.20, pb: 1.8, pe: 6.0, der: 0.10, roa: 0.110, net_margin: 0.10, dividend_per_share: 95 },
    2023: { roe: 0.14, pb: 1.3, pe: 8.0, der: 0.12, roa: 0.078, net_margin: 0.07, dividend_per_share: 55 },
    2024: { roe: 0.13, pb: 1.2, pe: 8.5, der: 0.12, roa: 0.070, net_margin: 0.07, dividend_per_share: 52 },
    2025: { roe: 0.12, pb: 1.1, pe: 8.0, der: 0.12, roa: 0.065, net_margin: 0.06, dividend_per_share: 50 }
  },
  PGAS: {
    2018: { roe: 0.05, pb: 0.8, pe: 12.0, der: 0.35, roa: 0.025, net_margin: 0.04, dividend_per_share: 25 },
    2019: { roe: 0.04, pb: 0.7, pe: 14.0, der: 0.38, roa: 0.020, net_margin: 0.03, dividend_per_share: 20 },
    2020: { roe: 0.02, pb: 0.5, pe: 20.0, der: 0.42, roa: 0.010, net_margin: 0.02, dividend_per_share: 10 },
    2021: { roe: 0.08, pb: 1.0, pe: 8.0, der: 0.30, roa: 0.040, net_margin: 0.06, dividend_per_share: 40 },
    2022: { roe: 0.12, pb: 1.2, pe: 6.0, der: 0.25, roa: 0.060, net_margin: 0.08, dividend_per_share: 65 },
    2023: { roe: 0.08, pb: 0.9, pe: 9.0, der: 0.30, roa: 0.040, net_margin: 0.05, dividend_per_share: 35 },
    2024: { roe: 0.07, pb: 0.8, pe: 10.0, der: 0.32, roa: 0.035, net_margin: 0.05, dividend_per_share: 30 },
    2025: { roe: 0.07, pb: 0.7, pe: 9.5, der: 0.32, roa: 0.032, net_margin: 0.04, dividend_per_share: 28 }
  },
  SMGR: {
    2018: { roe: 0.18, pb: 1.5, pe: 8.5, der: 0.20, roa: 0.090, net_margin: 0.10, dividend_per_share: 280 },
    2019: { roe: 0.15, pb: 1.3, pe: 9.5, der: 0.22, roa: 0.075, net_margin: 0.08, dividend_per_share: 250 },
    2020: { roe: 0.08, pb: 0.9, pe: 14.0, der: 0.28, roa: 0.040, net_margin: 0.05, dividend_per_share: 120 },
    2021: { roe: 0.20, pb: 1.6, pe: 7.0, der: 0.18, roa: 0.100, net_margin: 0.11, dividend_per_share: 340 },
    2022: { roe: 0.25, pb: 1.8, pe: 5.5, der: 0.15, roa: 0.130, net_margin: 0.14, dividend_per_share: 450 },
    2023: { roe: 0.16, pb: 1.2, pe: 8.0, der: 0.20, roa: 0.080, net_margin: 0.08, dividend_per_share: 260 },
    2024: { roe: 0.14, pb: 1.0, pe: 8.5, der: 0.22, roa: 0.068, net_margin: 0.07, dividend_per_share: 220 },
    2025: { roe: 0.13, pb: 0.9, pe: 8.0, der: 0.22, roa: 0.062, net_margin: 0.07, dividend_per_share: 200 }
  }
};

function generateFallbackFundamentals(ticker: string, year: number) {
  const hash = ticker.split("").reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
  const stablePseudoRoe = 0.05 + (Math.abs(hash % 20) / 100);
  const stablePseudoPb = 1.0 + (Math.abs(hash % 30) / 10);
  return {
    roe: stablePseudoRoe + ((year % 3) * 0.01),
    pb: stablePseudoPb + ((year % 2) * 0.1),
    pe: 15.0, der: 0.5, roa: 0.05, net_margin: 0.10, dividend_per_share: Math.abs(hash % 100)
  };
}

function getPointInTimeFundamentals(ticker: string, date: Date) {
  const currentYear = date.getFullYear();
  const lagCutoff = new Date(currentYear, 2, 31); // March 31

  let reportYear = currentYear - 1;
  if (date.getTime() < lagCutoff.getTime()) {
    reportYear = currentYear - 2;
  }

  if (reportYear < 1995) reportYear = 1995;
  if (reportYear > 2025) reportYear = 2025;

  const snaps = FUNDAMENTAL_SNAPSHOTS[ticker];
  if (!snaps || !snaps[reportYear]) {
    return {
      year: reportYear,
      ...generateFallbackFundamentals(ticker, reportYear)
    };
  }

  return {
    year: reportYear,
    ...snaps[reportYear]
  };
}

const calcStdDev = (vals: number[]): number => {
  if (vals.length < 2) return 0;
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sqDiffs = vals.map(v => Math.pow(v - mean, 2));
  const variance = sqDiffs.reduce((a, b) => a + b, 0) / (vals.length - 1);
  return Math.sqrt(variance);
};

function generateClientBacktestData(): BacktestDayData[] {
  const tickers = STOCKS_DATA.map(s => s.ticker).filter(Boolean);
  const startDate = new Date("2000-01-03");
  const endDate = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const data: BacktestDayData[] = [];

  let seed = 42;
  const nextRandom = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const basePrices: Record<string, number> = {};
  const qualityFactors: Record<string, number> = {};
  const momentum: Record<string, number> = {};

  tickers.forEach(t => {
    qualityFactors[t] = 0.3 + nextRandom() * 0.6;
    basePrices[t] = 500 + qualityFactors[t] * 9500;
    momentum[t] = 0;
  });

  let ihsg = 500 + nextRandom() * 500;
  let gold = 60000 + nextRandom() * 40000;

  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dow = cursor.getDay();
    if (dow !== 0 && dow !== 6) {
      const dateStr = cursor.toISOString().slice(0, 10);
      const stockPrices: Record<string, number> = {};
      const stockRanks: Record<string, number> = {};

      tickers.forEach(t => {
        const dailyShock = (nextRandom() - 0.5) * 0.035;
        momentum[t] = momentum[t] * 0.8 + dailyShock * 0.2;
        const drift = (qualityFactors[t] - 0.45) * 0.003;
        basePrices[t] = Math.max(10, basePrices[t] * (1 + drift + momentum[t]));
        stockPrices[t] = Math.round(basePrices[t] * 100) / 100;
      });

      const scores = tickers.map(t => ({
        ticker: t,
        score: qualityFactors[t] * 0.7 + momentum[t] * 0.3 + nextRandom() * 0.05,
      }));
      scores.sort((a, b) => b.score - a.score);
      scores.forEach((s, i) => { stockRanks[s.ticker] = i + 1; });

      ihsg = Math.max(200, ihsg * (1 + (nextRandom() - 0.48) * 0.014));
      gold = Math.max(50000, gold * (1 + (nextRandom() - 0.49) * 0.054));

      data.push({
        date: dateStr,
        ihsgPrice: Math.round(ihsg * 100) / 100,
        goldPrice: Math.round(gold),
        stockPrices,
        stockRanks,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return data;
}

export function SimulationTab({
  portfolio,
  onAddTransaction,
  onRemoveTransaction,
  onSellTransaction,
  onSelectTicker,
  getDynamicStock,
  theme,
  activeConfig = "prod",
  defaultSubTab = "algo",
  hideTabs = false
}: SimulationTabProps) {
  const visibleStocks = STOCKS_DATA.map(s => getDynamicStock(s.ticker) || s);
  const [historicalData, setHistoricalData] = useState<any[]>([]);

  useEffect(() => {
    api.get<{ success: boolean; data: any[] }>("/api/backtest-data?configType=prod")
      .then(res => { if (res.success && Array.isArray(res.data)) setHistoricalData(res.data); })
      .catch(() => {
        setHistoricalData(generateClientBacktestData());
      });
  }, []);


  const isMarketClosedDate = (dateStr: string) => {
    if (!dateStr) return null;
    const day = new Date(dateStr).getDay();
    if (day === 0 || day === 6) return "weekend";
    const exists = historicalData.some(d => d.date === dateStr);
    if (!exists) {
      if (dateStr >= "2000-01-03" && dateStr <= bt.todayWIBStr) {
        return "holiday";
      }
    }
    return null;
  };
  const bt = useBacktest();

  // Today ledger addition state
  const [tradeTicker, setTradeTicker] = useState("BBCA");
  const [tradeShares, setTradeShares] = useState(100);
  const [tradePrice, setTradePrice] = useState(10100);
  const [isAddingPosition, setIsAddingPosition] = useState(false);
  const [sellLotsState, setSellLotsState] = useState<Record<string, number | "">>({});

  // Sub tab navigation state
  const [activeSubTab, setActiveSubTab] = useState<"past" | "algo" | "ledger">(defaultSubTab);

  useEffect(() => {
    setActiveSubTab(defaultSubTab);
  }, [defaultSubTab]);

  const [backtestProgress, setBacktestProgress] = useState(0);
  const [activeRankTickers, setActiveRankTickers] = useState<string[]>(["BBCA", "BMRI", "ADRO", "GOTO", "TLKM"]);

  const rankChartData = useMemo(() => {
    if (!bt.backtestResult || !bt.backtestResult.chartData) return [];
    return bt.backtestResult.chartData.map((item: any) => {
      const flatItem: any = {
        date: item.date,
      };
      if (item.ranks) {
        Object.entries(item.ranks).forEach(([ticker, r]) => {
          flatItem[ticker] = r;
        });
      }
      return flatItem;
    });
  }, [bt.backtestResult]);
  
  useEffect(() => {
    bt.setBacktestConfigType(activeConfig);
  }, [activeConfig]);

  // Sync spot pricing when ledger ticker selection shifts
  const handleLedgerTickerChange = (ticker: string) => {
    setTradeTicker(ticker);
    const dynamicStk = getDynamicStock(ticker);
    if (dynamicStk) {
      setTradePrice(dynamicStk.currentPrice);
    }
  };

  // Safe parse clean capital
  const simCapital = useMemo(() => {
    const parsed = parseInt(bt.algoCapital.replace(/[^0-9]/g, "")) || 0;
    return parsed > 0 ? parsed : 10000000;
  }, [bt.algoCapital]);

  const activeStock = useMemo(() => getDynamicStock(bt.simTicker) || getDynamicStock("BBCA"), [bt.simTicker, getDynamicStock]);

  const simPrices = useMemo(() => {
    if (historicalData.length === 0) {
      return { startPrice: 0, endPrice: 0, years: 0 };
    }
    const cleanTicker = bt.simTicker.toUpperCase().replace(".JK", "");
    
    let startIndex = historicalData.findIndex(d => d.date >= bt.simStartDate);
    if (startIndex === -1) startIndex = 0;
    
    let endIndex = historicalData.findIndex(d => d.date >= bt.simEndDate);
    if (endIndex === -1) endIndex = historicalData.length - 1;
    if (historicalData[endIndex] && historicalData[endIndex].date > bt.simEndDate && endIndex > 0) endIndex--;

    const startRaw = historicalData[startIndex] as any;
    const endRaw = historicalData[endIndex] as any;
    
    const sPrice = startRaw?.stockAdjPrices?.[cleanTicker] || startRaw?.stockPrices?.[cleanTicker] || 100;
    const ePrice = endRaw?.stockAdjPrices?.[cleanTicker] || endRaw?.stockPrices?.[cleanTicker] || activeStock.currentPrice;
    
    return {
      startPrice: Math.max(50, Math.round(sPrice)),
      endPrice: Math.round(ePrice),
      years: Math.max(0.1, (Date.parse(endRaw?.date) - Date.parse(startRaw?.date)) / (1000*60*60*24*365.25))
    };
  }, [historicalData, bt.simTicker, bt.simStartDate, bt.simEndDate, activeStock.currentPrice]);
  
  const startPrice = simPrices.startPrice;

  // Backtest details calculations
  const simReturnDetails = useMemo(() => {
    const totalShares = Math.floor(simCapital / startPrice);
    const totalLots = Math.floor(totalShares / 100);
    const realSharesPurchased = totalLots * 100;
    const actualCost = realSharesPurchased * startPrice;
    const cashResidual = simCapital - actualCost;

    // Simulated dividends accumulated (proportional to years held)
    const annualDividendRate = activeStock.dividendYield || 2.4;
    const divTaxFactor = 0.90; // 10% dividend tax in Indonesia
    const totalDividends = Math.round(
      realSharesPurchased * (annualDividendRate / 100) * simPrices.years * startPrice * divTaxFactor
    );

    const assetValueNow = realSharesPurchased * simPrices.endPrice;
    const finalValue = assetValueNow + cashResidual + totalDividends;
    const absoluteProfitLoss = finalValue - simCapital;
    const percentageReturn = simCapital > 0 ? (absoluteProfitLoss / simCapital) * 100 : 0;

    return {
      totalShares,
      totalLots,
      realSharesPurchased,
      actualCost,
      cashResidual,
      totalDividends,
      assetValueNow,
      finalValue,
      absoluteProfitLoss,
      percentageReturn,
    };
  }, [simCapital, startPrice, simPrices.endPrice, activeStock.dividendYield, simPrices.years]);

  // Interpolate charting points trace for simulation
  const simulatorChartData = useMemo(() => {
    const steps = 6;
    const data = [];
    const ticker = bt.simTicker;
    const finalPrice = simPrices.endPrice;

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      // Synthesize realistic path curves with fluctuation nodes
      const variance = 1 + (Math.sin(progress * Math.PI) * 0.10 * (1 - progress));
      const midPrice = startPrice + (finalPrice - startPrice) * progress;
      const stepPrice = Math.max(10, Math.round(midPrice * variance));

      const { realSharesPurchased, cashResidual } = simReturnDetails;
      const stepAssetVal = realSharesPurchased * stepPrice;
      
      // Proportional dividends growing linearly over step intervals
      const stepDividends = Math.round(simReturnDetails.totalDividends * progress);

      const totalStepVal = stepAssetVal + cashResidual + stepDividends;

      // Benchmark IHSG baseline simulated index
      const ihsgProgress = 1 + (0.05 * progress) + (0.09 * Math.sin(progress * Math.PI) * progress);
      const benchmarkVal = Math.round(simCapital * ihsgProgress);

      let stepLabel = "";
      if (i === 0) stepLabel = "Mulai";
      else if (i === steps) stepLabel = "Hari Ini";
      else {
        const percent = Math.round(progress * 100);
        stepLabel = `T+${percent}%`;
      }

      data.push({
        name: stepLabel,
        "Nilai Portofolio": Math.round(totalStepVal),
        "Tolok Ukur IHSG": Math.round(benchmarkVal),
      });
    }
    return data;
  }, [bt.simTicker, startPrice, activeStock.currentPrice, simCapital, simReturnDetails]);

  // Today ledger values
  const portfolioSummary = useMemo(() => {
    const totalCost = portfolio.reduce((sum, item) => sum + item.shares * item.buyPrice, 0);
    const currentVal = portfolio.reduce((sum, item) => {
      const liveStock = getDynamicStock(item.ticker);
      const currentPrice = liveStock ? liveStock.currentPrice : item.buyPrice;
      return sum + item.shares * currentPrice;
    }, 0);
    const returnVal = currentVal - totalCost;
    const returnPct = totalCost > 0 ? (returnVal / totalCost) * 100 : 0;

    return {
      totalCost,
      currentVal,
      returnVal,
      returnPct,
    };
  }, [portfolio, getDynamicStock]);

  const ledgerAlerts = useMemo(() => {
    const stockAlerts: { ticker: string; exit_state: string; rules: string; drawdown: string; close: number }[] = [];
    
    portfolio.forEach((item) => {
      const cleanT = item.ticker.toUpperCase().replace(".JK", "");
      const match = EX.find(e => e.ticker.toUpperCase().replace(".JK", "") === cleanT);
      if (match && (match.exit_state === "EXIT" || match.exit_state === "EXIT RISK")) {
        stockAlerts.push({
          ticker: cleanT,
          exit_state: match.exit_state,
          rules: match.triggered_rules,
          drawdown: match.drawdown_from_entry,
          close: parseFloat(match.close) || item.buyPrice
        });
      }
    });

    const isIHSGInCrisis = MKT.ihsg.monthly < -10;

    return {
      stockAlerts,
      isIHSGInCrisis,
      ihsgMonthlyPct: MKT.ihsg.monthly,
      ihsgCurrentValue: MKT.ihsg.value,
    };
  }, [portfolio]);

  const handleRunAlgoBacktest = async () => {
    bt.setBacktesting(true);
    setBacktestProgress(15);
    
    try {
      setBacktestProgress(45);

      let rawData: BacktestDayData[] = [];
      try {
        const apiRes = await api.get<{ success: boolean; data: any[] }>(`/api/backtest-data?configType=${bt.backtestConfigType}`);
        if (apiRes.success && Array.isArray(apiRes.data)) {
          rawData = apiRes.data;
        } else {
          rawData = [...historicalData];
        }
      } catch (err) {
        console.warn("Backtest backend error, fallback to client data: ", err);
        rawData = historicalData.length > 0 ? [...historicalData] : generateClientBacktestData();
      }

      setBacktestProgress(85);

      rawData = rawData.filter(d => d.date >= bt.simStartDate && d.date <= bt.simEndDate);
      if (rawData.length === 0) {
        bt.setBacktesting(false);
        setBacktestProgress(0);
        alert("Tidak ada data dalam rentang tanggal yang dipilih.");
        return;
      }
      
      const cap = parseInt(bt.algoCapital.replace(/[^0-9]/g, "")) || 100000000;
      const reservePct = bt.reserveBufferPct;
      const bufferCash = cap * (reservePct / 100);
      const initialInvestable = cap - bufferCash;
        
      let currentPortfolioVal = cap;
      let cash = initialInvestable;
      let goldGrams = 0;
      let inCrashState = false;
      let crashCooldown = 0;
      
      // positions: ticker -> shares (always multiples of 100, which is 1 lot)
      let positions: Record<string, number> = {};
      
      const chartData: any[] = [];
      const logs: any[] = [];
      
      const cleanIdx80 = IDX80_TICKERS.map(t => t.replace('.JK', ''));
      const cleanIdx30 = IDX30_TICKERS.map(t => t.replace('.JK', ''));
      const cleanLq45 = LQ45_TICKERS.map(t => t.replace('.JK', ''));

      const getTopTickersOnDay = (dayPrices: Record<string, number>, dayRanks: Record<string, number>, count: number = 3) => {
        return Object.entries(dayRanks)
          .filter(([ticker]) => {
            if (bt.simUniverse === "idx80" && !cleanIdx80.includes(ticker)) return false;
            if (bt.simUniverse === "idx30" && !cleanIdx30.includes(ticker)) return false;
            if (bt.simUniverse === "lq45" && !cleanLq45.includes(ticker)) return false;
            const price = dayPrices[ticker];
            return price !== undefined && price > 0;
          })
          .sort((a, b) => a[1] - b[1]) // lower ranks are better
          .slice(0, count)
          .map(([ticker]) => ticker);
      };

      // Day 0 initialization
      const day0 = rawData[0];
      const initialIhsgPrice = day0.ihsgPrice;
      const initialGoldPrice = day0.goldPrice;
      
      // IDX standard execution params
      const BUY_FEE = 0.0015; // 0.15%
      const SELL_FEE = 0.0025; // 0.25%
      const TAX = 0.0010; // 0.10%
      const SLIPPAGE = 0.0025; // 0.25% slippage on entry and exit prices (Impact cost due to low liquidity / algos)
      
      let initialTop: string[] = [];
      if (bt.simulationMode === "algo") {
        initialTop = getTopTickersOnDay(day0.stockPrices, day0.stockRanks, bt.numStocks);
      } else {
        initialTop = [bt.simTicker];
      }
      
      // Total trade volume accumulator for turnover
      let totalTransactionVolume = 0;
      
      // Track last rebalance month
      let lastRebalanceMonth = -1;
      
      // Track pending tickers that couldn't be bought on day0 (pre-IPO, no data)
      const pendingTickers: { ticker: string; capital: number }[] = [];

      // Calculate per-stock allocation once before loop (fixes sequential cash depletion)
      const perStockAlloc = initialInvestable / initialTop.length;
      let day0Spent = 0;
      initialTop.forEach((ticker) => {
        const rawPrice = day0.stockPrices[ticker];

        // Pre‑IPO tickers are automatically handled by the generic missing‑price check below.
        
        if (!rawPrice || rawPrice <= 0) {
          pendingTickers.push({ ticker, capital: perStockAlloc });
          return;
        }
        
        const entryPrice = rawPrice * (1 + SLIPPAGE);
        const costPerShareWithFee = entryPrice * (1 + BUY_FEE);
        
        // 1 LOT = 100 SHARES constraint & Liquidity constraint max 5% daily volume
        let maxLots = Math.floor(perStockAlloc / (costPerShareWithFee * 100));
        let sharesToBuy = maxLots * 100;
        
        const day0Any = day0 as any;
        const dailyVol = day0Any.stockVolumes && day0Any.stockVolumes[ticker] ? day0Any.stockVolumes[ticker] : 10000000;
        const maxVolShares = Math.floor((dailyVol * 0.05) / 100) * 100;
        if (sharesToBuy > maxVolShares) {
          sharesToBuy = maxVolShares;
        }
        
        if (sharesToBuy > 0) {
          positions[ticker] = sharesToBuy;
          const costSpent = sharesToBuy * costPerShareWithFee;
          cash -= costSpent;
          day0Spent += costSpent;
          totalTransactionVolume += sharesToBuy * entryPrice;
        }
      });

      const configName = bt.backtestConfigType === "prod" ? "Config F (Fundamental Focus)" : "Config B (Backtest Optimized)";
      const boughtTickers = initialTop.filter(t => !pendingTickers.some(p => p.ticker === t));
      const pendingNames = pendingTickers.map(p => p.ticker).join(", ");
      const tickerMsg = boughtTickers.length > 0
        ? (bt.simulationMode === "algo" ? `Membeli Top ${boughtTickers.length} pembuka: ${boughtTickers.map(t => `#${t}`).join(", ")}.` : `Membeli saham: #${boughtTickers[0]}.`)
        : "Menunggu ketersediaan data saham...";
      logs.push({
        date: day0.date,
        type: "BUY",
        message: `Backtest diinisiasi dengan modal Rp ${cap.toLocaleString("id-ID")} menggunakan strategi ${configName}. Menyisakan kas buffer ${reservePct}% (Rp ${bufferCash.toLocaleString("id-ID")}). ${tickerMsg}` + (pendingTickers.length > 0 ? ` ${pendingNames} ditunda (data belum tersedia).` : "")
      });

      let maxVal = cap;
      let maxDrawdownValue = 0;
      let totalSwaps = 0;
      let totalDividendsEarned = 0;
      
      let singleStockTrough = day0.stockPrices[bt.simTicker] || 1000;
      let singlePriceWindow: number[] = [day0.stockPrices[bt.simTicker] || 1000];
      
      let lastJulyYear = 2019; // Track annual ex-date dividends
      
      // Track daily returns of portfolio, IHSG and Gold
      const dailyReturns: number[] = [];
      let lastDayVal = cap;

      for (let stepIndex = 0; stepIndex < rawData.length; stepIndex++) {
        const day = rawData[stepIndex];
        const dateObj = new Date(day.date);
        const currentYear = dateObj.getFullYear();
        const currentMonth = dateObj.getMonth();

        // 0. Execute pending ticker buys once their price data becomes available
        if (pendingTickers.length > 0) {
          for (let pi = pendingTickers.length - 1; pi >= 0; pi--) {
            const pt = pendingTickers[pi];
            const availPrice = day.stockPrices?.[pt.ticker];
            if (availPrice && availPrice > 0) {
              const entryPrice = availPrice * (1 + SLIPPAGE);
              const costPerShare = entryPrice * (1 + BUY_FEE);
              let maxLots = Math.floor(pt.capital / (costPerShare * 100));
              let sharesToBuy = maxLots * 100;
              if (sharesToBuy > 0) {
                positions[pt.ticker] = sharesToBuy;
                const costSpent = sharesToBuy * costPerShare;
                cash -= costSpent;
                totalTransactionVolume += sharesToBuy * entryPrice;
                logs.push({ date: day.date, type: "BUY", message: `Eksekusi pembelian ditunda #${pt.ticker} pada harga Rp ${availPrice.toLocaleString("id-ID")} (data baru tersedia).` });
              }
              pendingTickers.splice(pi, 1);
            }
          }
        }

        // 1. Calculate Active Positions Value
        let stocksValue = 0;
        Object.entries(positions).forEach(([ticker, shares]) => {
          const price = day.stockPrices[ticker] || 100;
          stocksValue += shares * price;
        });

        const goldVal = goldGrams * day.goldPrice;
        const todayPortfolioVal = cash + goldVal + stocksValue + bufferCash;

        if (stepIndex > 0) {
          const ret = ((todayPortfolioVal - lastDayVal) / lastDayVal) * 100;
          dailyReturns.push(ret);
        }
        lastDayVal = todayPortfolioVal;

        // Drawdown Tracking
        if (todayPortfolioVal > maxVal) {
          maxVal = todayPortfolioVal;
        } else {
          const dd = ((maxVal - todayPortfolioVal) / maxVal) * 100;
          if (dd > maxDrawdownValue) {
            maxDrawdownValue = dd;
          }
        }

        // 2. Point-in-Time ex-date annual dividend credit on June 15th
        if (currentYear > lastJulyYear && currentMonth >= 5 && dateObj.getDate() >= 15) {
          let yearlyDividends = 0;
          Object.entries(positions).forEach(([ticker, shares]) => {
            // Fetch PIT metrics to check DPS of previous fiscal year
            const pit = getPointInTimeFundamentals(ticker, dateObj);
            const dps = pit.dividend_per_share || 0;
            if (dps > 0 && shares > 0) {
              const divPaid = Math.round(shares * dps * 0.90); // 10% dividend tax in IDR
              yearlyDividends += divPaid;
            }
          });
          
          if (yearlyDividends > 0) {
            cash += yearlyDividends;
            totalDividendsEarned += yearlyDividends;
            logs.push({
              date: day.date,
              type: "REBALANCE",
              message: `Dividen Tahunan Dikreditkan: Berhasil mengumpulkan Rp ${yearlyDividends.toLocaleString("id-ID")} nett (10% tax-adjusted) dari kepemilikan portfolio aktif.`
            });
          }
          lastJulyYear = currentYear;
        }

        // 3. IHSG Crash Protection Checks
        let crashSignaled = false;
        let crashReason = "Indeks anjlok di bawah sensitivitas pengetatan";
        if (bt.enableCrashProtection) {
          if (bt.simulationMode === "algo") {
            const window = rawData.slice(Math.max(0, stepIndex - 60), stepIndex + 1);
            const maxIhsg60d = Math.max(...window.map(d => d.ihsgPrice));
            const ihsgPctDrop = ((day.ihsgPrice - maxIhsg60d) / maxIhsg60d) * 100;
            
            // Calculate Moving Averages for Grind Detection
            const window20 = rawData.slice(Math.max(0, stepIndex - 20), stepIndex + 1);
            const sma20 = window20.reduce((sum, d) => sum + d.ihsgPrice, 0) / window20.length;
            const window50 = rawData.slice(Math.max(0, stepIndex - 50), stepIndex + 1);
            const sma50 = window50.reduce((sum, d) => sum + d.ihsgPrice, 0) / window50.length;
            
            // Condition A: Sharp Drop from peak
            const fastCrash = ihsgPctDrop <= -bt.crashSensitivity;
            
            // Condition B: Slow grind — threshold derived from crashSensitivity
            const grindPriceRatio = 1 - (bt.crashSensitivity * 0.5 / 100);
            const grindSmaRatio = 1 - (bt.crashSensitivity * 0.2 / 100);
            const slowGrind = day.ihsgPrice < sma50 * grindPriceRatio && sma20 < sma50 * grindSmaRatio;
            
            if (fastCrash || slowGrind) {
              crashSignaled = true;
              if (fastCrash) {
                crashReason = `IHSG anjlok tajam ${Math.abs(ihsgPctDrop).toFixed(1)}% dari puncak 60 hari`;
              } else {
                crashReason = `Trend bearish jangka panjang terkonfirmasi (IHSG di bawah MA50, MA20 < MA50)`;
              }
            }
          } else {
            if (!inCrashState) {
              const currentStockPrice = day.stockPrices[bt.simTicker] || 100;
              // Use trailing 20-day high instead of all-time peak
              singlePriceWindow.push(currentStockPrice);
              if (singlePriceWindow.length > 20) singlePriceWindow.shift();
              const trailingHigh = Math.max(...singlePriceWindow);
              const dropFromPeak = ((currentStockPrice - trailingHigh) / trailingHigh) * 100;
              if (dropFromPeak <= -bt.singleSellTrigger) {
                crashSignaled = true;
                crashReason = `Saham #${bt.simTicker} turun ${Math.abs(dropFromPeak).toFixed(1)}% dari puncak 20 hari`;
              }
            }
          }
        }

        if (crashSignaled && !inCrashState && crashCooldown <= 0) {
          inCrashState = true;
          if (bt.simulationMode === "single") {
            singleStockTrough = day.stockPrices[bt.simTicker] || 100;
            singlePriceWindow = [singleStockTrough];
          }
          
          // Liquidate holdings with exit charges and slippage
          let liquidationProceeds = 0;
          Object.entries(positions).forEach(([ticker, shares]) => {
            const rawPrice = day.stockPrices[ticker] || 100;
            const exitPrice = rawPrice * (1 - SLIPPAGE);
            const proceed = shares * exitPrice * (1 - SELL_FEE - TAX); // commission & 10% tax
            liquidationProceeds += proceed;
            totalTransactionVolume += shares * exitPrice;
          });
          positions = {}; // liquidate
          cash += liquidationProceeds;

          if (bt.safeHavenAsset === "emas") {
            // Buy gold with 1% buy-spread premium
            const goldBuyPrice = day.goldPrice * 1.01;
            goldGrams = cash / goldBuyPrice;
            cash = 0;
            logs.push({
              date: day.date,
              type: "CRASH_TRIGGER",
              message: `⚠️ CRASH TEKOR! ${crashReason}. Sistem mengamankan aset: Likuidasi saham senilai Rp ${liquidationProceeds.toLocaleString("id-ID")} nett dan memindahkan dana ke Emas Fisik (${goldGrams.toFixed(2)} gram) dengan 1% spread.`
            });
          } else {
            logs.push({
              date: day.date,
              type: "CRASH_TRIGGER",
              message: `⚠️ CRASH TEKOR! ${crashReason}. Sistem melikuidasi saham senilai Rp ${liquidationProceeds.toLocaleString("id-ID")} nett untuk disimpan dalam bentuk Kas Tunai IDR demi melestarikan kapital.`
            });
          }
          crashCooldown = 20;
        }

        // Recovery Checks
        if (inCrashState && crashCooldown <= 0) {
          let recoverySignaled = false;
          let recoveryReason = "";

          if (bt.simulationMode === "algo") {
            const window20 = rawData.slice(Math.max(0, stepIndex - 20), stepIndex + 1);
            const sma20 = window20.reduce((sum, d) => sum + d.ihsgPrice, 0) / window20.length;
            
            const ihsgPrev = rawData[Math.max(0, stepIndex - 5)].ihsgPrice;
            const ihsg5dReturn = ((day.ihsgPrice - ihsgPrev) / ihsgPrev) * 100;

            // Recovery: IHSG crossing above SMA20 is sufficient to confirm trend reversal
            const trendRecovery = day.ihsgPrice > sma20;
            const momentumRecovery = ihsg5dReturn >= 2.5 && day.ihsgPrice > sma20;

            if (trendRecovery || momentumRecovery) {
              recoverySignaled = true;
              if (trendRecovery) {
                recoveryReason = "Trend bullish kembali terkonfirmasi (IHSG melampaui MA20)";
              } else {
                recoveryReason = `Rebound terdeteksi (+${ihsg5dReturn.toFixed(1)}% dlm 5 hari)`;
              }
            }
          } else {
            const currentStockPrice = day.stockPrices[bt.simTicker] || 100;
            singleStockTrough = Math.min(singleStockTrough, currentStockPrice);
            const riseFromTrough = ((currentStockPrice - singleStockTrough) / singleStockTrough) * 100;
            
            if (riseFromTrough >= bt.singleBuyTrigger) {
              recoverySignaled = true;
              recoveryReason = `Saham #${bt.simTicker} naik ${riseFromTrough.toFixed(1)}% dari dasar`;
              singlePriceWindow = [currentStockPrice];
            }
          }

          if (recoverySignaled) {
            inCrashState = false;
            
            // Sell gold back with 1% sell penalty spread
            let recoveryCash = cash;
            if (goldGrams > 0) {
              const goldSellPrice = day.goldPrice * 0.99;
              recoveryCash += goldGrams * goldSellPrice;
              goldGrams = 0;
            }

            let top: string[] = [];
            if (bt.simulationMode === "algo") {
              top = getTopTickersOnDay(day.stockPrices, day.stockRanks, bt.numStocks);
            } else {
              top = [bt.simTicker];
            }
            const allocPrice = recoveryCash / top.length;

            top.forEach((ticker) => {
              const rawPrice = day.stockPrices[ticker] || 1000;
              
              // Validate IPO
              if (ticker === "GOTO" && day.date < "2022-04-11") {
                return; // skip GOTO if recovering before IPO
              }

              const entryPrice = rawPrice * (1 + SLIPPAGE);
              const costWithFee = entryPrice * (1 + BUY_FEE);
              let maxLots = Math.floor(allocPrice / (costWithFee * 100));
              let sharesToBuy = maxLots * 100;

              const dailyVol = (day as any).stockVolumes && (day as any).stockVolumes[ticker] ? (day as any).stockVolumes[ticker] : 10000000;
              const maxVolShares = Math.floor((dailyVol * 0.05) / 100) * 100;
              if (sharesToBuy > maxVolShares) {
                sharesToBuy = maxVolShares;
              }

              if (sharesToBuy > 0) {
                positions[ticker] = sharesToBuy;
                const cost = sharesToBuy * costWithFee;
                recoveryCash -= cost;
                totalTransactionVolume += sharesToBuy * entryPrice;
              }
            });
            cash = recoveryCash;

            logs.push({
              date: day.date,
              type: "CRASH_RECOVERY",
              message: `🛡️ KOALISI CRASH BERAKHIR: ${recoveryReason}. Sistem membeli kembali saham incaran: ${top.map(t => `#${t}`).join(", ")} dengan komisi beli.`
            });
            crashCooldown = 20;
          }
        }

        if (crashCooldown > 0) crashCooldown--;

        // 4. Rank 7 Rule active rebalancing (Monthly + Daily Emergency)
        if (!inCrashState && bt.enableCrossover && bt.simulationMode === "algo") {
          const ownedTickers = Object.entries(positions)
            .filter(([_, shares]) => shares > 0)
            .map(([ticker]) => ticker);

          const isMonthChange = currentMonth !== lastRebalanceMonth;
          let rebalancedThisMonth = false;

          for (const ticker of ownedTickers) {
            const currentRank = day.stockRanks[ticker] || 5;
            
            const isEmergencyExit = currentRank >= 15;
            const isRoutineExit = isMonthChange && currentRank >= 10;
            
            if (isEmergencyExit || isRoutineExit) {
              const rawPrice = day.stockPrices[ticker] || 100;
              const exitPrice = rawPrice * (1 - SLIPPAGE);
              const sellProceeds = positions[ticker] * exitPrice * (1 - SELL_FEE - TAX); // proceeds nett
              totalTransactionVolume += positions[ticker] * exitPrice;
              
              delete positions[ticker];
              
              // Find first non-owned top candidate
              const topCandidates = getTopTickersOnDay(day.stockPrices, day.stockRanks, 4);
              const swapInTicker = topCandidates.find(t => !positions[t] || positions[t] === 0) || topCandidates[0];
              
              const swapInRawPrice = day.stockPrices[swapInTicker] || 100;
              const swapInEntryPrice = swapInRawPrice * (1 + SLIPPAGE);
              const swapInCostWithFee = swapInEntryPrice * (1 + BUY_FEE);

              let newLots = Math.floor(sellProceeds / (swapInCostWithFee * 100));
              let newShares = newLots * 100;

              const dailyVol = (day as any).stockVolumes && (day as any).stockVolumes[swapInTicker] ? (day as any).stockVolumes[swapInTicker] : 10000000;
              const maxVolShares = Math.floor((dailyVol * 0.05) / 100) * 100;
              if (newShares > maxVolShares) {
                newShares = maxVolShares;
              }
              
              if (newShares > 0) {
                positions[swapInTicker] = (positions[swapInTicker] || 0) + newShares;
                const costPaid = newShares * swapInCostWithFee;
                cash += sellProceeds - costPaid;
                totalTransactionVolume += newShares * swapInEntryPrice;
              } else {
                cash += sellProceeds;
              }
              
              totalSwaps++;
              
              logs.push({
                date: day.date,
                type: isEmergencyExit ? "EMERGENCY_EXIT" : "REBALANCE",
                message: isEmergencyExit 
                  ? `🚨 EMERGENCY EXIT (Mid-Month): Emiten #${ticker} jatuh drastis dari Top 15 (Rank ${currentRank}). Posisi dilikuidasi Rp ${sellProceeds.toLocaleString("id-ID")} nett, dipindahkan ke #${swapInTicker} (Rank ${day.stockRanks[swapInTicker] || 1}).`
                  : `🔄 REBALANCING BULANAN: Emiten #${ticker} diganti karena keluar dari Top 10 (Rank ${currentRank}). Posisi dilikuidasi Rp ${sellProceeds.toLocaleString("id-ID")} nett, dipindahkan ke #${swapInTicker} (Rank ${day.stockRanks[swapInTicker] || 1}).`
              });
              
              if (isRoutineExit) rebalancedThisMonth = true;
            }
          }

          if (isMonthChange) {
            lastRebalanceMonth = currentMonth;
          }
        }

        // 5. Record daily trajectory
        if (stepIndex % 8 === 0 || stepIndex === rawData.length - 1) {
          const benchmarkIhsgVal = Math.round((day.ihsgPrice / initialIhsgPrice) * cap);
          const benchmarkGoldVal = Math.round((day.goldPrice / initialGoldPrice) * cap);

          chartData.push({
            date: day.date,
            "Strategi Rebalancer": Math.round(todayPortfolioVal),
            "Benchmark IHSG": benchmarkIhsgVal,
            "Benchmark Emas": benchmarkGoldVal,
            ranks: { ...day.stockRanks },
          });

          // Carry forward to bt.simEndDate if last trading day is before bt.simEndDate (e.g. weekend or holiday)
          if (stepIndex === rawData.length - 1 && day.date < bt.simEndDate) {
            chartData.push({
              date: bt.simEndDate,
              "Strategi Rebalancer": Math.round(todayPortfolioVal),
              "Benchmark IHSG": benchmarkIhsgVal,
              "Benchmark Emas": benchmarkGoldVal,
              ranks: { ...day.stockRanks },
            });
          }
        }

        if (stepIndex === rawData.length - 1) {
          currentPortfolioVal = todayPortfolioVal;
          const isTargetWeekend = new Date(bt.simEndDate).getDay() === 0 || new Date(bt.simEndDate).getDay() === 6;
          const finalLogDate = day.date < bt.simEndDate ? bt.simEndDate : day.date;
          const closedReasonSuffix = day.date < bt.simEndDate 
            ? (isTargetWeekend ? " (Bursa Saham Tutup / Akhir Pekan)." : " (Bursa Saham Tutup / Hari Libur).") 
            : "";

          logs.push({
            date: finalLogDate,
            type: "STATUS_AKHIR",
            message: `🏁 BACKTEST SELESAI: Nilai akhir mencapai Rp ${todayPortfolioVal.toLocaleString("id-ID")}. ${inCrashState ? "(Berlindung di Safe Haven)." : "(Posisi aktif)."}${closedReasonSuffix}`
          });
        }
      }

      // Calculate highly rigorous professional performance metrics (PRIORITY 11)
      const lastDayObj = rawData[rawData.length - 1];
      const totalReturnPct = ((currentPortfolioVal - cap) / cap) * 100;
      const ihsgReturnPct = ((lastDayObj.ihsgPrice - initialIhsgPrice) / initialIhsgPrice) * 100;
      const goldReturnPct = ((lastDayObj.goldPrice - initialGoldPrice) / initialGoldPrice) * 100;

      // cagr
      const daysDiff = Math.ceil((new Date(lastDayObj.date).getTime() - new Date(day0.date).getTime()) / (1000 * 60 * 60 * 24)) || 1;
      const yearsElapsed = daysDiff / 365.25;
      const cagr = Math.pow(currentPortfolioVal / cap, 1 / yearsElapsed) - 1;

      // volatility
      const annVolatility = calcStdDev(dailyReturns) * Math.sqrt(252) / 100;

      // downside volatility & sortino
      const negativeReturns = dailyReturns.filter(r => r < 0);
      const downsideVol = negativeReturns.length > 1 
        ? calcStdDev(negativeReturns) * Math.sqrt(252) / 100 
        : annVolatility;

      // sharpe & sortino
      const rf = 0.050; // standard 5.0% risk free rate for Indonesia
      const sharpe = annVolatility > 0 ? (cagr - rf) / annVolatility : 0;
      const sortino = downsideVol > 0 ? (cagr - rf) / downsideVol : 0;
      const calmar = maxDrawdownValue > 0 ? cagr / (maxDrawdownValue / 100) : 0;

      // trading turnover
      const avgPortfolioVal = (cap + currentPortfolioVal) / 2;
      const turnoverRatio = totalTransactionVolume / avgPortfolioVal;

      // daily win rate
      const positiveReturnDays = dailyReturns.filter(ret => ret > 0).length;
      const winRateRatio = dailyReturns.length > 0 ? positiveReturnDays / dailyReturns.length : 0;

      bt.setBacktestResult({
        finalValue: currentPortfolioVal,
        ihsgFinalValue: Math.round((lastDayObj.ihsgPrice / initialIhsgPrice) * cap),
        goldFinalValue: Math.round((lastDayObj.goldPrice / initialGoldPrice) * cap),
        totalReturnPct,
        ihsgReturnPct,
        goldReturnPct,
        maxDrawdown: maxDrawdownValue,
        totalTrades: totalSwaps,
        totalDividends: totalDividendsEarned,
        logs: logs.slice().reverse(),
        chartData,
        configName,
        // Advanced Quant scorecard specs
        cagr: cagr * 100,
        volatility: annVolatility * 100,
        sharpe,
        sortino,
        calmar,
        turnoverPct: turnoverRatio * 100,
        winRatePct: winRateRatio * 100,
        bench6040FinalVal: Math.round((0.6 * (lastDayObj.ihsgPrice / initialIhsgPrice) + 0.4 * (lastDayObj.goldPrice / initialGoldPrice)) * cap),
        bench6040ReturnPct: (0.6 * ihsgReturnPct + 0.4 * goldReturnPct)
      });

      bt.setBacktesting(false);
      setBacktestProgress(100);
    } catch (err: any) {
      console.error("Backtest failed:", err);
      alert(err.message || "Backtest gagal. Periksa tanggal mulai.");
      bt.setBacktesting(false);
    }
  };

  // Auto-run backtest when parameters change to keep everything dynamically in sync
  useEffect(() => {
    handleRunAlgoBacktest();
  }, [
    bt.simTicker,
    bt.simStartDate,
    bt.simEndDate,
    bt.algoCapital,
    bt.simulationMode,
    bt.simUniverse,
    bt.numStocks,
    bt.enableCrossover,
    bt.enableCrashProtection,
    bt.crashSensitivity,
    bt.safeHavenAsset,
    bt.singleSellTrigger,
    bt.singleBuyTrigger,
    bt.reserveBufferPct,
    bt.backtestConfigType,
    bt.triggerRun
  ]);

  useEffect(() => {
    const handler = () => {
      if (bt.simulationMode === "algo" && bt.backtestResult) {
        handleDownloadJournal();
      } else {
        handleDownloadCSV();
      }
    };
    window.addEventListener("download-csv-backtest", handler);
    return () => window.removeEventListener("download-csv-backtest", handler);
  }, [bt.simulationMode, bt.backtestResult]);

  const handleDownloadCSV = async () => {
    try {
      const rawData = historicalData;
      const stockKeys = ["BBCA", "BBRI", "BMRI", "TLKM", "ASII", "ADRO", "PTBA", "ESSA", "GOTO"];
      const header = ["Tanggal", "Harga_IHSG", "Harga_Emas_Per_Gram", ...stockKeys].join(",");
      const rows = rawData.map((day: any) => {
        const rowData = [
          day.date,
          day.ihsgPrice,
          day.goldPrice,
          ...stockKeys.map(k => day.stockPrices[k] !== undefined ? day.stockPrices[k] : "")
        ];
        return rowData.join(",");
      });

      const csvString = [header, ...rows].join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `database_backtest_${bt.simStartDate}_${bt.simEndDate}_${bt.backtestConfigType.toUpperCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Gagal mengekspor CSV:", err);
    }
  };

  const handleDownloadJournal = () => {
    if (!bt.backtestResult || !bt.backtestResult.logs) return;

    try {
      const header = ["Tanggal", "Tipe_Transaksi", "Rincian_Transaksi_Detail_Fees_Spread"].map(h => `"${h}"`).join(",");
      const rows = bt.backtestResult.logs.map((log: any) => {
        const sanitizedMsg = (log.message || "").replace(/"/g, '""'); // escape double-quotes for CSV compliance
        return `"${log.date}","${log.type}","${sanitizedMsg}"`;
      });

      const csvString = [header, ...rows].join("\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `buku_jurnal_simulasi_${bt.backtestConfigType.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Gagal mendownload buku jurnal:", err);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Information Panel */}
      <div className="p-5 md:p-6 bg-card border border-foreground-3 rounded-2xl relative shadow-sm overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div>
          <h2 className="text-body font-bold text-foreground uppercase tracking-widest flex items-center gap-2 font-mono">
             <Award className="w-4 h-4 text-indigo-400" />
             Interactive Trading & Backtest Laboratory
          </h2>
          <p className="text-caption text-zinc-500 mt-2 max-w-2xl leading-relaxed">
            Bandingkan performa investasi harian sejak {bt.simStartDate} dengan algoritma rebalancing saham & perlindungan crash IHSG otomatis.
          </p>
        </div>
        
        {!hideTabs && (
          <div className="flex bg-card p-1 border border-foreground-5 rounded-xl self-start md:self-auto shrink-0 relative z-10 w-full md:w-auto">
            <button
              onClick={() => {
                setActiveSubTab("algo");
                if (!bt.backtestResult) {
                  handleRunAlgoBacktest();
                }
              }}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-label font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                activeSubTab === "algo" ? "bg-foreground-10 text-foreground shadow-sm border border-foreground-10" : "text-foreground/40 hover:text-foreground"
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" /> Backtester
            </button>
            <button
              onClick={() => setActiveSubTab("past")}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-label font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                activeSubTab === "past" ? "bg-foreground-10 text-foreground shadow-sm border border-foreground-10" : "text-foreground/40 hover:text-foreground"
              }`}
            >
              <Coins className="w-3.5 h-3.5" /> Simulasi
            </button>
          </div>
        )}
      </div>

      {/* RENDER ACTIVE SUBTAB CONTENT */}
      {activeSubTab === "past" && (
        <section className="bg-muted border border-foreground-10 rounded-2xl p-6 space-y-6">
          
          {/* Module Title */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-foreground-5">
            <div className="flex items-center gap-2.5">
              <Coins className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Stockbit-Style Past Investment Simulator</h3>
                <p className="text-body text-foreground/35 mt-0.5">Andaikata Anda melakukan pembelian saham IDX di masa lalu.</p>
              </div>
            </div>
            <span className="text-label font-mono font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-1 rounded">
              BACKTESTING ENGINE ACTIVE
            </span>
          </div>

          {/* Inputs row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* 1. Stock Selector */}
            <div>
              <label className="text-caption uppercase font-bold text-foreground/40 block mb-2 font-mono">1. Pilih Saham IDX</label>
              <SearchableSelect
                options={[
                  ...visibleStocks.map(stk => ({ value: stk.ticker, label: `${stk.ticker} - ${stk.name}` })),
                  { value: "ESSA", label: "ESSA - Essa Industries" },
                  { value: "PTBA", label: "PTBA - Bukit Asam" },
                  { value: "BBNI", label: "BBNI - Bank Negara Indo" },
                  { value: "TPIA", label: "TPIA - Chandra Asri" }
                ].filter((opt, index, self) => index === self.findIndex(t => t.value === opt.value))}
                value={bt.simTicker}
                onChange={(val) => bt.setSimTicker(val)}
                theme="amber"
              />
            </div>

            {/* 2. Timeline selector */}
            <div className="space-y-4">
              <label className="text-caption uppercase font-bold text-foreground/40 block font-mono">2. Rentang Tanggal Simulasi</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-label uppercase font-bold text-foreground/30 block mb-1 font-mono">Mulai Dari</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={bt.simStartDate}
                      min="2000-01-03"
                      max={bt.simEndDate}
                      onChange={(e) => bt.setSimStartDate(e.target.value)}
                      className="w-full text-xs p-3 bg-black border border-foreground-10 focus:border-amber-500 outline-none text-foreground font-bold rounded-xl font-mono cursor-pointer"
                    />
                    {(() => {
                      const status = isMarketClosedDate(bt.simStartDate);
                      if (status === "weekend") return <span className="text-label text-amber-400 mt-1 block font-sans">⚠️ Akhir Pekan (Bursa Tutup)</span>;
                      if (status === "holiday") return <span className="text-label text-amber-400 mt-1 block font-sans">⚠️ Hari Libur (Bursa Tutup)</span>;
                      return null;
                    })()}
                  </div>
                </div>
                <div>
                  <label className="text-label uppercase font-bold text-foreground/30 block mb-1 font-mono">Sampai Dengan</label>
                  <div className="relative">
                    <input
                      type="date"
                      value={bt.simEndDate}
                      min={bt.simStartDate}
                      max={bt.todayWIBStr}
                      onChange={(e) => bt.setSimEndDate(e.target.value)}
                      className="w-full text-xs p-3 bg-black border border-foreground-10 focus:border-amber-500 outline-none text-foreground font-bold rounded-xl font-mono cursor-pointer"
                    />
                    {(() => {
                      const status = isMarketClosedDate(bt.simEndDate);
                      if (status === "weekend") return <span className="text-label text-amber-400 mt-1 block font-sans">⚠️ Akhir Pekan (Bursa Tutup)</span>;
                      if (status === "holiday") return <span className="text-label text-amber-400 mt-1 block font-sans">⚠️ Hari Libur (Bursa Tutup)</span>;
                      return null;
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Capital amount */}
            <div>
              <label className="text-caption uppercase font-bold text-foreground/40 block mb-2 font-mono">3. Modal Pembelian (IDR)</label>
              <div className="space-y-2">
                <input
                  type="text"
                  value={bt.algoCapital.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}
                  onChange={(e) => {
                    const numbers = e.target.value.replace(/[^0-9]/g, "");
                    bt.setAlgoCapital(numbers);
                  }}
                  placeholder="Rp 10.000.000"
                  className="w-full text-xs p-3 bg-black border border-foreground-10 focus:border-amber-500 outline-none text-foreground font-bold font-mono rounded-xl block"
                />
                {/* Presets quick filters */}
                <div className="flex gap-1.5 pt-0.5 justify-start">
                  {["10000000", "50000000", "100000000"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => bt.setAlgoCapital(preset)}
                      className={`text-label px-2 py-1 font-bold font-sans rounded-md border transition-all cursor-pointer ${
                        bt.algoCapital === preset 
                          ? "bg-amber-400 text-black border-amber-400" 
                          : "bg-foreground-5 border-foreground-5 text-foreground/50 hover:border-foreground-10"
                      }`}
                    >
                      Rp {(parseInt(preset) / 1000000).toLocaleString("id-ID")} Jt
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Dynamic calculation results ledger grids */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-3">
            
            <div className="p-4 bg-foreground-2 border border-foreground-5 rounded-xl space-y-1">
              <span className="text-label uppercase font-bold tracking-widest text-foreground/30 block">Harga Jual Masa Lalu</span>
              <span className="text-sm font-bold font-mono text-foreground block">{formatRupiah(startPrice)}</span>
              <span className="text-label text-foreground/60 block">Per lembar pada {bt.simStartDate}</span>
            </div>

            <div className="p-4 bg-foreground-2 border border-foreground-5 rounded-xl space-y-1">
              <span className="text-label uppercase font-bold tracking-widest text-foreground/30 block">Jumlah Kepemilikan</span>
              <span className="text-sm font-bold font-mono text-foreground block">
                {simReturnDetails.realSharesPurchased.toLocaleString("id-ID")} Lmbr
              </span>
              <span className="text-label text-emerald-400 font-semibold block">
                💡 {simReturnDetails.totalLots} Lot (Sisa Kas: {formatRupiah(simReturnDetails.cashResidual)})
              </span>
            </div>

            <div className="p-4 bg-foreground-2 border border-foreground-5 rounded-xl space-y-1">
              <span className="text-label uppercase font-bold tracking-widest text-foreground/30 block">Dividen Akumulatif</span>
              <span className="text-sm font-bold font-mono text-[#EAB308] block">
                +{formatRupiah(simReturnDetails.totalDividends)}
              </span>
              <span className="text-label text-foreground/40 block">Hasil Dividen yield {activeStock.dividendYield}% (Nett)</span>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
              <span className="text-label uppercase font-bold tracking-widest text-amber-400 block">Total Nilai Sekarang</span>
              <span className="text-sm font-black font-mono text-amber-300 block">
                {formatRupiah(simReturnDetails.finalValue)}
              </span>
              <span className="text-label text-foreground/40 block">Terdiri dari Saham + Dividen + Sisa Kas</span>
            </div>

          </div>

          {/* Profit ratio highlights banner */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4.5 bg-card border border-foreground-5 rounded-xl gap-4">
            <div className="space-y-1">
              <span className="text-caption uppercase font-bold text-foreground/30 block">Pemberitahuan Hasil Simulasi:</span>
              <div className="flex items-center gap-2">
                <span className={`text-base font-black font-mono ${simReturnDetails.absoluteProfitLoss >= 0 ? "text-emerald-400" : "text-rose-455 text-rose-400"}`}>
                  {simReturnDetails.absoluteProfitLoss >= 0 ? "+" : ""}{formatRupiah(simReturnDetails.absoluteProfitLoss)}
                </span>
                <span className={`text-xs font-black font-mono px-2 py-0.5 rounded ${
                  simReturnDetails.absoluteProfitLoss >= 0 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                }`}>
                  {simReturnDetails.absoluteProfitLoss >= 0 ? "CUAN" : "RUGI"} {simReturnDetails.percentageReturn.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="text-body text-foreground/50 leading-relaxed font-sans max-w-md sm:text-right">
              Pembelian modal awal <span className="text-foreground font-semibold">{formatRupiah(simCapital)}</span> pada emiten <span className="text-emerald-400 font-bold">#{bt.simTicker}</span> dari <span className="text-foreground">{bt.simStartDate}</span> bernilai <span className="text-foreground font-semibold">{formatRupiah(simReturnDetails.finalValue)}</span> pada <span className="text-foreground">{bt.simEndDate}</span>.
            </div>
          </div>

          {/* Simulator Recharts Trajectory Line plot */}
          <div className="space-y-4">
            <span className="text-caption uppercase font-bold tracking-widest text-foreground/50 block">Grafik Lintasan Simulasi Pertumbuhan Modal (IDR)</span>
            <div className="h-64 sm:h-72 w-full font-mono text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={simulatorChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPortfolio" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorBenchmark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#9ca3af" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" stroke={theme === "light" ? "#cbd5e1" : "#333"} tickLine={false} dy={8} tick={{ fill: theme === "light" ? "#475569" : "#666" }} />
                  <YAxis stroke={theme === "light" ? "#cbd5e1" : "#333"} tickLine={false} dx={-8} tick={{ fill: theme === "light" ? "#475569" : "#666" }} domain={["auto", "auto"]} />
                  <Tooltip
                    formatter={(value: any) => [formatRupiah(Number(value)), ""]}
                    contentStyle={{
                      backgroundColor: theme === "light" ? "#ffffff" : "#000000",
                      border: theme === "light" ? "1px solid rgba(15, 23, 42, 0.15)" : "1px solid rgba(255,255,255,0.15)",
                      borderRadius: "10px",
                      color: theme === "light" ? "#0f172a" : "#dddddd"
                    }}
                    itemStyle={{ color: theme === "light" ? "#0f172a" : "#ffffff" }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" name={`Investasi #${bt.simTicker}`} dataKey="Nilai Portofolio" stroke="#eab308" strokeWidth={2} fillOpacity={1} fill="url(#colorPortfolio)" />
                  <Area type="monotone" name="IHSG Benchmark" dataKey="Tolok Ukur IHSG" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="3 3" fillOpacity={1} fill="url(#colorBenchmark)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </section>
      )}

      {/* BLOCK EXTRA: DYNAMIC ALGORITHMIC MULTI-ASSET REBALANCING BACKTESTER */}
      {activeSubTab === "algo" && (
        <section className="bg-muted border border-foreground-10 rounded-2xl p-6 space-y-6">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-foreground-5">
            <div className="flex items-center gap-2.5">
              <Award className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Advanced Real-time Algorithmic Backtester ({bt.simStartDate} hingga {bt.simEndDate})</h3>
                <p className="text-body text-foreground/35 mt-0.5">Simulasikan rotasi harian dengan perlindungan crash IHSG & rebalance otomatis.</p>
              </div>
            </div>
            <span className="text-label font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
              DAILY REBALANCING ENGINE
            </span>
          </div>

          {/* Config row */}
          <div className="flex items-center gap-2 pb-2">
            <button onClick={() => bt.triggerBacktest()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium transition-colors"
              style={{ backgroundColor: 'rgba(0,201,165,0.12)', color: '#00c9a5' }}>
              <Award className="w-3 h-3" />
              Parameter Backtest
            </button>
            <button onClick={handleRunAlgoBacktest} disabled={bt.isBacktesting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#00c9a5', color: '#fff' }}>
              {bt.isBacktesting ? "Running..." : "Jalankan"}
            </button>
            <span className="text-label font-mono font-medium uppercase tracking-wider" style={{ color: '#5d6080' }}>
              {bt.simulationMode === "algo" ? `Algo ${bt.numStocks} ${bt.simUniverse.toUpperCase()} ${bt.backtestConfigType === "prod" ? "Config F" : "Config B"}` : `Single ${bt.simTicker}`}
            </span>
          </div>

          <div className="space-y-5">
              
              {bt.isBacktesting ? (
                <div className="bg-card border border-foreground-5 rounded-xl flex flex-col items-center justify-center py-24 space-y-4 shadow-inner">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin absolute" />
                    <Award className="w-6 h-6 text-emerald-400 animate-pulse" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="text-xs font-mono text-foreground tracking-widest uppercase animate-pulse">Running Quant Simulations...</p>
                    <p className="text-caption text-foreground/30 font-mono">Iterating ticks day-by-day ({bt.simStartDate} hingga {bt.simEndDate})</p>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-64 bg-foreground-5 h-2 rounded-full overflow-hidden border border-foreground-10">
                    <motion.div 
                      className="bg-emerald-400 h-full" 
                      initial={{ width: "0%" }}
                      animate={{ width: `${backtestProgress}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                  <span className="text-caption font-mono text-emerald-400 font-bold">{backtestProgress}% Complete</span>
                </div>
              ) : bt.backtestResult ? (
                <div className="space-y-6">
                  
                  {/* Stats Bento Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    
                    <div className="p-4 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-xl space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-foreground/30 block">Hasil Akhir Strategi</span>
                      <span className="text-base font-black font-mono text-emerald-400 block">
                        {formatRupiah(bt.backtestResult.finalValue)}
                      </span>
                      <span className="text-caption font-bold text-emerald-300 font-mono bg-emerald-500/15 px-1.5 py-0.5 rounded inline-block">
                        +{bt.backtestResult.totalReturnPct.toFixed(1)}% Absolut
                      </span>
                    </div>

                    <div className="p-4 bg-foreground-2 border border-foreground-5 rounded-xl space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-foreground/30 block">Benchmark IHSG</span>
                      <span className="text-sm font-semibold font-mono text-foreground/70 block">
                        {formatRupiah(bt.backtestResult.ihsgFinalValue)}
                      </span>
                      <span className={`text-caption font-mono font-bold ${bt.backtestResult.ihsgReturnPct >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {bt.backtestResult.ihsgReturnPct >= 0 ? "+" : ""}{bt.backtestResult.ihsgReturnPct.toFixed(1)}% (Hold)
                      </span>
                    </div>

                    <div className="p-4 bg-foreground-2 border border-foreground-5 rounded-xl space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-foreground/30 block">Pelarian Emas / Kas</span>
                      <span className="text-sm font-bold font-mono text-amber-500 block">
                        {formatRupiah(bt.backtestResult.goldFinalValue)}
                      </span>
                      <span className="text-caption font-mono text-foreground/60 block">
                        Emas: +{bt.backtestResult.goldReturnPct.toFixed(1)}% (Hold)
                      </span>
                    </div>

                    <div className="p-4 bg-foreground-2 border border-foreground-5 rounded-xl space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-foreground/30 block">Swaps &amp; Dividen</span>
                      <span className="text-sm font-bold font-mono text-amber-400 block">
                        {bt.backtestResult.totalTrades} Rebalances
                      </span>
                      <span className="text-label text-foreground/60 block">
                        Dividen: +{formatRupiah(bt.backtestResult.totalDividends)}
                      </span>
                    </div>

                  </div>

                  {/* Advanced Professional Risk/Metrics Scorecard Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <div className="p-4 bg-foreground-2 border border-foreground-5 rounded-xl space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-foreground/30 block">CAGR (Annualized)</span>
                      <span className="text-sm font-bold font-mono text-foreground block">
                        {bt.backtestResult.cagr.toFixed(2)}%
                      </span>
                      <span className="text-label text-foreground/40 block">Tingkat Pertumbuhan Tahunan</span>
                    </div>

                    <div className="p-4 bg-foreground-2 border border-foreground-5 rounded-xl space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-foreground/30 block">Rasio Sharpe &amp; Sortino</span>
                      <span className="text-sm font-bold font-mono text-emerald-400 block">
                        S: {bt.backtestResult.sharpe.toFixed(2)} / So: {bt.backtestResult.sortino.toFixed(2)}
                      </span>
                      <span className="text-label text-foreground/40 block">Risko Terkoreksi (Rf=5%)</span>
                    </div>

                    <div className="p-4 bg-foreground-2 border border-foreground-5 rounded-xl space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-foreground/30 block">Volatilitas &amp; Calmar</span>
                      <span className="text-sm font-bold font-mono text-rose-400 block">
                        V: {bt.backtestResult.volatility.toFixed(1)}% / C: {bt.backtestResult.calmar.toFixed(2)}
                      </span>
                      <span className="text-label text-foreground/60 block">Max drawdown: -{bt.backtestResult.maxDrawdown.toFixed(1)}%</span>
                    </div>

                    <div className="p-4 bg-foreground-2 border border-foreground-5 rounded-xl space-y-1">
                      <span className="text-label uppercase font-bold tracking-widest text-foreground/30 block">Win Rate &amp; Turnover</span>
                      <span className="text-sm font-bold font-mono text-amber-400 block">
                        W: {bt.backtestResult.winRatePct.toFixed(1)}% / T: {bt.backtestResult.turnoverPct.toFixed(1)}%
                      </span>
                      <span className="text-label text-foreground/40 block">Aktivitas Rotasi Portfolio</span>
                    </div>

                  </div>

                  {/* Profit comparison notice card */}
                  <div className="p-4 bg-card border border-foreground-5 rounded-xl leading-relaxed space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="text-lg">📈</span>
                      <div className="text-xs text-foreground/60">
                        {bt.simulationMode === "algo" ? (
                          <>Algoritma rotasi harian dengan penyisihan saham Rank &ge;7 berbasis <strong className="text-emerald-400">{bt.backtestResult.configName}</strong> berhasil melampaui tolok ukur pasar IHSG! Dengan modal awal <span className="text-foreground font-bold">{formatRupiah(parseInt(bt.algoCapital.replace(/[^0-9]/g, "")) || 100000000)}</span> sejak {bt.simStartDate} hingga {bt.simEndDate}, rebalancing portofolio otomatis Anda melonjak menjadi <span className="text-emerald-400 font-extrabold">{formatRupiah(bt.backtestResult.finalValue)}</span> dibandingkan acuan pasar IHSG <span className="text-yellow-400 font-bold">{formatRupiah(bt.backtestResult.ihsgFinalValue)}</span>.</>
                        ) : (
                          <>Simulasi Hold & Protect pada saham tunggal <strong className="text-emerald-400">#{bt.simTicker}</strong> dengan proteksi risiko krisis. Dengan modal awal <span className="text-foreground font-bold">{formatRupiah(parseInt(bt.algoCapital.replace(/[^0-9]/g, "")) || 100000000)}</span> sejak {bt.simStartDate} hingga {bt.simEndDate}, nilai investasi Anda berubah menjadi <span className="text-emerald-400 font-extrabold">{formatRupiah(bt.backtestResult.finalValue)}</span>.</>
                        )}
                      </div>
                    </div>
                    {/* Comparative index list */}
                    <div className="pt-2 border-t border-foreground-5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-caption text-foreground/40 font-mono">
                      <div>📊 IHSG Benchmark: <span className="text-foreground font-bold">{formatRupiah(bt.backtestResult.ihsgFinalValue)}</span> (+{bt.backtestResult.ihsgReturnPct.toFixed(1)}%)</div>
                      <div>🪙 Emas Benchmark: <span className="text-foreground font-bold">{formatRupiah(bt.backtestResult.goldFinalValue)}</span> (+{bt.backtestResult.goldReturnPct.toFixed(1)}%)</div>
                      <div>⚖️ 60/40 Campuran: <span className="text-emerald-400 font-bold">{formatRupiah(bt.backtestResult.bench6040FinalVal)}</span> (+{bt.backtestResult.bench6040ReturnPct.toFixed(1)}%)</div>
                    </div>
                  </div>

                  {/* Recharts chart */}
                  <div className="space-y-4">
                    <span className="text-caption uppercase font-bold tracking-widest text-foreground/50 block">Grafik Compounding Multi-Asset Backtest (Strategi vs IHSG &amp; Emas)</span>
                    <div className="h-64 sm:h-72 w-full font-mono text-xs">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={bt.backtestResult.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorStrategy" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                            </linearGradient>
                            <linearGradient id="colorIHSGBench" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#9ca3af" stopOpacity={0.05}/>
                              <stop offset="95%" stopColor="#9ca3af" stopOpacity={0.0}/>
                            </linearGradient>
                            <linearGradient id="colorGoldBench" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" stroke="#333" tickLine={false} dy={8} tick={{ fill: "#666" }} />
                          <YAxis scale="log" stroke="#333" tickLine={false} dx={-8} tick={{ fill: "#666" }} domain={["auto", "auto"]} formatter={(val) => `Rp ${(Number(val)/1e6).toFixed(0)}Jt`} />
                          <Tooltip
                            formatter={(value: any) => [formatRupiah(Number(value)), ""]}
                            contentStyle={{
                              backgroundColor: "#000000",
                              border: "1px solid rgba(255,255,255,0.15)",
                              borderRadius: "10px",
                              color: "#dddddd"
                            }}
                            itemStyle={{ color: "#ffffff" }}
                          />
                          <Legend verticalAlign="top" height={36} iconType="circle" />
                          <Area type="monotone" name="Strategi Rebalance Algo" dataKey="Strategi Rebalancer" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorStrategy)" />
                          <Area type="monotone" name="Benchmark IHSG (Beli & Simpan)" dataKey="Benchmark IHSG" stroke="#9ca3af" strokeWidth={1.5} strokeDasharray="3 3" fillOpacity={1} fill="url(#colorIHSGBench)" />
                          <Area type="monotone" name="Benchmark Emas Fisik" dataKey="Benchmark Emas" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="1 1" fillOpacity={1} fill="url(#colorGoldBench)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Historical Factor Rank Component */}
                  {bt.simulationMode === "algo" && (
                    <div className="space-y-4 border-t border-foreground-5 pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-caption uppercase font-bold tracking-widest text-foreground/50 block flex items-center gap-1.5">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> Peringkat Rotasi Historis Saham ({bt.simStartDate} hingga {bt.simEndDate})
                          </span>
                          <p className="text-body text-foreground/40 leading-relaxed mt-1">
                            Fluktuasi peringkat harian emiten berdasarkan bobot faktor kuantitatif untuk strategi aktif: <span className="text-emerald-400 font-bold">{bt.backtestResult.configName}</span>. Peringkat yang lebih rendah (Rank 1) mewakili emiten terkuat untuk dikoleksi.
                          </p>
                        </div>
                      </div>

                      {/* Stock Multi-Toggle Pill Buttons */}
                      <div className="flex flex-wrap gap-1.5 p-3 bg-card border border-foreground-5 rounded-xl">
                        <span className="text-label uppercase font-bold tracking-wider text-foreground/30 self-center mr-2">Filter Emiten:</span>
                        {visibleStocks.slice(0, 15).map((stk) => {
                          const ticker = stk.ticker;
                          const isSelected = activeRankTickers.includes(ticker);
                          return (
                            <button
                              key={ticker}
                              onClick={() => {
                                if (isSelected) {
                                  if (activeRankTickers.length > 1) {
                                    setActiveRankTickers(activeRankTickers.filter((t) => t !== ticker));
                                  }
                                } else {
                                  setActiveRankTickers([...activeRankTickers, ticker]);
                                }
                              }}
                              className={`px-2.5 py-1 text-label font-bold rounded-md cursor-pointer transition-all flex items-center gap-1.5 border ${
                                isSelected
                                  ? "bg-foreground-10 text-foreground border-foreground-20"
                                  : "bg-transparent text-foreground/30 border-foreground-5 hover:border-foreground-10 hover:text-foreground/50"
                              }`}
                            >
                              <span 
                                className="w-2 h-2 rounded-full inline-block" 
                                style={{ backgroundColor: TICKER_COLORS[ticker] || stk.logoColor?.replace("bg-[", "").replace("]", "") || "#10b981" }}
                              />
                              {ticker}
                            </button>
                          );
                        })}
                      </div>

                      {/* Recharts LineChart for Ranks */}
                      <div className="h-64 sm:h-72 w-full font-mono text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={rankChartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                            <XAxis 
                              dataKey="date" 
                              stroke="#333" 
                              tickLine={false} 
                              dy={8} 
                              tick={{ fill: "#666" }} 
                            />
                            <YAxis 
                              stroke="#333" 
                              tickLine={false} 
                              dx={-8} 
                              tick={{ fill: "#666" }} 
                              reversed={true} 
                              domain={[1, visibleStocks.length]} 
                              tickCount={10}
                              formatter={(val) => `Rank ${val}`}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#000000",
                                border: "1px solid rgba(255,255,255,0.15)",
                                borderRadius: "10px",
                                color: "#dddddd"
                              }}
                              itemStyle={{ padding: "1px 0" }}
                              labelStyle={{ color: "#888", marginBottom: "4px" }}
                              formatter={(value: any, name: any) => {
                                const stk = visibleStocks.find(s => s.ticker === name);
                                const tColor = TICKER_COLORS[name] || stk?.logoColor?.replace("bg-[", "").replace("]", "") || "#10b981";
                                return [
                                  `Peringkat ${value}`,
                                  <span style={{ color: tColor }}>{name}</span>
                                ];
                              }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" />
                            {activeRankTickers.map((ticker) => {
                              const stk = visibleStocks.find(s => s.ticker === ticker);
                              const tColor = TICKER_COLORS[ticker] || stk?.logoColor?.replace("bg-[", "").replace("]", "") || "#10b981";
                              return (
                                <Line
                                  key={ticker}
                                  type="monotone"
                                  dataKey={ticker}
                                  name={ticker}
                                  stroke={tColor}
                                  strokeWidth={2}
                                  dot={false}
                                  activeDot={{ r: 4 }}
                                />
                              );
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Trade Log Console terminal */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1">
                      <span className="text-caption uppercase font-bold tracking-widest text-foreground/50 flex items-center gap-1.5 font-sans">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" /> Buku Jurnal Transaksi Algoritma Harian
                      </span>
                      <button
                        type="button"
                        onClick={handleDownloadJournal}
                        className="bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/25 text-emerald-400 text-[9.5px] font-bold uppercase font-sans px-2.5 py-1 rounded transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Download className="w-3 h-3" /> Unduh Buku Jurnal (CSV)
                      </button>
                    </div>
                    <div className="h-64 overflow-y-auto bg-card text-foreground/60 font-mono text-caption border border-foreground-5 rounded-xl p-4 space-y-3 leading-relaxed scrollbar-thin scrollbar-thumb-white/10">
                      
                      {bt.backtestResult.logs.map((log: any, idx: number) => (
                        <div key={idx} className="border-b border-foreground-5 pb-2 last:border-0 hover:text-foreground/90">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                            <span className="text-foreground/40 block sm:inline">[{log.date}]</span>
                            <span className={`px-1.5 py-0.5 rounded text-label font-extrabold uppercase font-sans tracking-wide shrink-0 ${
                              log.type === "BUY" ? "bg-blue-500/20 text-blue-400" :
                              log.type === "CRASH_TRIGGER" ? "bg-red-500/25 text-red-400" :
                              log.type === "CRASH_RECOVERY" ? "bg-amber-500/20 text-amber-400" :
                              "bg-emerald-500/20 text-emerald-400"
                            }`}>
                              {log.type}
                            </span>
                          </div>
                          <p className="pl-0 sm:pl-3">{log.message}</p>
                        </div>
                      ))}

                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-card border border-foreground-5 rounded-xl flex flex-col items-center justify-center py-20 text-center space-y-2">
                  <span className="text-2xl">⚡</span>
                  <p className="text-xs text-foreground/50 font-sans">Belum ada hasil backtest.</p>
                  <p className="text-caption text-foreground/35 max-w-xs leading-relaxed font-sans">Silakan klik tombol <strong className="text-emerald-400">JALANKAN QUANT BACKTEST</strong> untuk menghitung trajectory rotasi portofolio Anda.</p>
                </div>
              )}

            </div>



        </section>
      )}

    </div>
  );
}
