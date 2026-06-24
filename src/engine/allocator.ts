import { ExecutionFees, DEFAULT_FEES } from "./types";

export interface AllocationResult {
  positions: Record<string, number>;
  cash: number;
  totalVolume: number;
  pendingTickers: { ticker: string; capital: number }[];
}

export interface LiquidationResult {
  proceeds: number;
  totalVolume: number;
}

export interface SwapResult {
  sold: boolean;
  sellProceeds: number;
  swappedTo: string;
  newShares: number;
  cashDelta: number;
  totalVolume: number;
}

export function computeInitialAllocation(
  capital: number,
  topTickers: string[],
  dayPrices: Record<string, number>,
  dayVolumes: Record<string, number> | undefined,
  fees: ExecutionFees = DEFAULT_FEES
): AllocationResult {
  const positions: Record<string, number> = {};
  let cash = capital;
  let totalVolume = 0;
  const pendingTickers: { ticker: string; capital: number }[] = [];

  const perStockAlloc = capital / topTickers.length;

  topTickers.forEach((ticker) => {
    const rawPrice = dayPrices[ticker];
    if (!rawPrice || rawPrice <= 0) {
      pendingTickers.push({ ticker, capital: perStockAlloc });
      return;
    }

    const entryPrice = rawPrice * (1 + fees.slippage);
    const costPerShareWithFee = entryPrice * (1 + fees.buyFee);

    let maxLots = Math.floor(perStockAlloc / (costPerShareWithFee * 100));
    let sharesToBuy = maxLots * 100;

    const dailyVol = dayVolumes?.[ticker] ?? 10000000;
    const maxVolShares = Math.floor((dailyVol * 0.05) / 100) * 100;
    if (sharesToBuy > maxVolShares) {
      sharesToBuy = maxVolShares;
    }

    if (sharesToBuy > 0) {
      positions[ticker] = sharesToBuy;
      cash -= sharesToBuy * costPerShareWithFee;
      totalVolume += sharesToBuy * entryPrice;
    }
  });

  return { positions, cash, totalVolume, pendingTickers };
}

export function liquidateHoldings(
  positions: Record<string, number>,
  dayPrices: Record<string, number>,
  fees: ExecutionFees = DEFAULT_FEES
): LiquidationResult {
  let proceeds = 0;
  let totalVolume = 0;

  Object.entries(positions).forEach(([ticker, shares]) => {
    const rawPrice = dayPrices[ticker] || 100;
    const exitPrice = rawPrice * (1 - fees.slippage);
    const proceed = shares * exitPrice * (1 - fees.sellFee - fees.tax);
    proceeds += proceed;
    totalVolume += shares * exitPrice;
  });

  return { proceeds, totalVolume };
}

export function computeGoldPurchase(
  cash: number,
  goldPrice: number
): { goldGrams: number; cash: number } {
  const goldBuyPrice = goldPrice * 1.01;
  const goldGrams = cash / goldBuyPrice;
  return { goldGrams, cash: 0 };
}

export function computeGoldSale(
  goldGrams: number,
  goldPrice: number
): { cash: number } {
  const goldSellPrice = goldPrice * 0.99;
  return { cash: goldGrams * goldSellPrice };
}

export function computeRebalanceSwap(
  ticker: string,
  sellProceeds: number,
  dayPrices: Record<string, number>,
  dayVolumes: Record<string, number> | undefined,
  swapInTicker: string,
  fees: ExecutionFees = DEFAULT_FEES
): { shares: number; cashRemainder: number; totalVolume: number } {
  const rawPrice = dayPrices[swapInTicker] || 100;
  const entryPrice = rawPrice * (1 + fees.slippage);
  const costWithFee = entryPrice * (1 + fees.buyFee);

  let newLots = Math.floor(sellProceeds / (costWithFee * 100));
  let newShares = newLots * 100;

  const dailyVol = dayVolumes?.[swapInTicker] ?? 10000000;
  const maxVolShares = Math.floor((dailyVol * 0.05) / 100) * 100;
  if (newShares > maxVolShares) newShares = maxVolShares;

  let cashRemainder = sellProceeds;

  if (newShares > 0) {
    cashRemainder = sellProceeds - newShares * costWithFee;
  }

  return { shares: newShares, cashRemainder, totalVolume: newShares * entryPrice };
}

export function computeBuyAmount(
  availableCash: number,
  ticker: string,
  price: number,
  dayVolumes: Record<string, number> | undefined,
  fees: ExecutionFees = DEFAULT_FEES
): { shares: number; cost: number } {
  const entryPrice = price * (1 + fees.slippage);
  const costWithFee = entryPrice * (1 + fees.buyFee);

  let maxLots = Math.floor(availableCash / (costWithFee * 100));
  let sharesToBuy = maxLots * 100;

  const dailyVol = dayVolumes?.[ticker] ?? 10000000;
  const maxVolShares = Math.floor((dailyVol * 0.05) / 100) * 100;
  if (sharesToBuy > maxVolShares) sharesToBuy = maxVolShares;

  if (sharesToBuy <= 0) return { shares: 0, cost: 0 };

  return { shares: sharesToBuy, cost: sharesToBuy * costWithFee };
}

export function computeSellProceeds(
  shares: number,
  price: number,
  fees: ExecutionFees = DEFAULT_FEES
): { proceeds: number; volume: number } {
  const exitPrice = price * (1 - fees.slippage);
  const proceeds = shares * exitPrice * (1 - fees.sellFee - fees.tax);
  const volume = shares * exitPrice;
  return { proceeds, volume };
}
