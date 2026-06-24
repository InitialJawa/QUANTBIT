export interface CrashSignal {
  signaled: boolean;
  reason: string;
}

export function detectCrashAlgo(
  ihsgPrices: number[],
  currentIhsgPrice: number,
  crashSensitivity: number
): CrashSignal {
  const window = ihsgPrices.slice(Math.max(0, ihsgPrices.length - 60));
  const maxIhsg60d = Math.max(...window);
  const ihsgPctDrop = ((currentIhsgPrice - maxIhsg60d) / maxIhsg60d) * 100;

  const window20 = ihsgPrices.slice(Math.max(0, ihsgPrices.length - 20));
  const sma20 = window20.reduce((sum, d) => sum + d, 0) / window20.length;
  const window50 = ihsgPrices.slice(Math.max(0, ihsgPrices.length - 50));
  const sma50 = window50.reduce((sum, d) => sum + d, 0) / window50.length;

  const fastCrash = ihsgPctDrop <= -crashSensitivity;

  const grindPriceRatio = 1 - (crashSensitivity * 0.5) / 100;
  const grindSmaRatio = 1 - (crashSensitivity * 0.2) / 100;
  const slowGrind = currentIhsgPrice < sma50 * grindPriceRatio && sma20 < sma50 * grindSmaRatio;

  if (fastCrash) {
    return { signaled: true, reason: `IHSG anjlok tajam ${Math.abs(ihsgPctDrop).toFixed(1)}% dari puncak 60 hari` };
  }
  if (slowGrind) {
    return { signaled: true, reason: "Trend bearish jangka panjang terkonfirmasi (IHSG di bawah MA50, MA20 < MA50)" };
  }

  return { signaled: false, reason: "" };
}

export function detectCrashSingle(
  priceWindow: number[],
  currentPrice: number,
  sellTrigger: number
): CrashSignal {
  const window = [...priceWindow, currentPrice];
  if (window.length > 20) window.shift();
  const trailingHigh = Math.max(...window);
  const dropFromPeak = ((currentPrice - trailingHigh) / trailingHigh) * 100;

  if (dropFromPeak <= -sellTrigger) {
    return { signaled: true, reason: `Saham turun ${Math.abs(dropFromPeak).toFixed(1)}% dari puncak 20 hari` };
  }

  return { signaled: false, reason: "" };
}

export function detectRecoveryAlgo(
  ihsgPrices: number[],
  currentIhsgPrice: number
): CrashSignal {
  const window20 = ihsgPrices.slice(Math.max(0, ihsgPrices.length - 20));
  const sma20 = window20.reduce((sum, d) => sum + d, 0) / window20.length;

  const ihsgPrev = ihsgPrices[Math.max(0, ihsgPrices.length - 5)];
  const ihsg5dReturn = ((currentIhsgPrice - ihsgPrev) / ihsgPrev) * 100;

  const trendRecovery = currentIhsgPrice > sma20;
  const momentumRecovery = ihsg5dReturn >= 2.5 && currentIhsgPrice > sma20;

  if (trendRecovery || momentumRecovery) {
    return { signaled: true, reason: "Pasar pulih — IHSG kembali di atas rata-rata pergerakan" };
  }

  return { signaled: false, reason: "" };
}

export function detectRecoverySingle(
  trough: number,
  currentPrice: number,
  buyTrigger: number
): CrashSignal {
  const newTrough = Math.min(trough, currentPrice);
  const riseFromTrough = ((currentPrice - newTrough) / newTrough) * 100;

  if (riseFromTrough >= buyTrigger) {
    return { signaled: true, reason: `Saham pulih ${riseFromTrough.toFixed(1)}% dari dasar` };
  }

  return { signaled: false, reason: "" };
}
