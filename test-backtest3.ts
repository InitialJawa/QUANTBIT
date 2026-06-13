import fs from "fs";
const historicalDataJson = JSON.parse(fs.readFileSync("./src/data/historical_market_data.json", "utf8"));
const day0 = historicalDataJson[0];
const stockPrices = day0.stockAdjPrices;
const stockRanks = day0.stockRanksProd;
const numStocks = 5;

const getTopTickersOnDay = (dayPrices: any, dayRanks: any, count: number = 3) => {
  return Object.entries(dayRanks)
    .filter(([ticker, rank]) => {
      const price = dayPrices[ticker];
      return price !== undefined && price > 0;
    })
    .sort((a, b) => (a[1] as number) - (b[1] as number))
    .slice(0, count)
    .map(([ticker]) => ticker);
};

let cash = 100000000;
let positions: Record<string, number> = {};
const initialTop = getTopTickersOnDay(stockPrices, stockRanks, numStocks);
const alloc = cash / numStocks;
for (const ticker of initialTop) {
    const rawPrice = stockPrices[ticker];
    const sharesToBuy = Math.floor(alloc / (rawPrice * 100)) * 100;
    positions[ticker] = sharesToBuy;
    cash -= sharesToBuy * rawPrice;
}
console.log("Initial Positions:", positions, "Cash:", cash);

const lastDay = historicalDataJson[historicalDataJson.length - 1];
let finalValue = cash;
for (const [ticker, shares] of Object.entries(positions)) {
    finalValue += shares * lastDay.stockAdjPrices[ticker];
}
console.log("Value if held to last day:", finalValue);
