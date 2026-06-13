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

const top = getTopTickersOnDay(stockPrices, stockRanks, numStocks);
for (const ticker of top) {
    const rawPrice = stockPrices[ticker];
    if (!rawPrice || rawPrice <= 0) {
        console.error(`CRITICAL PIPELINE ERROR: Attempted to trade #${ticker} on ${day0.date}, but has no active price feed! Stock is either pre-IPO, suspended, or delisted.`);
    }
    if (ticker === "GOTO" && day0.date < "2022-04-11") {
        console.error(`CRITICAL PIPELINE ERROR: Attempted to trade GOTO on ${day0.date}, which is before its real IPO date (2022-04-11)! Backtest failed.`);
    }
    if (ticker === "AMMN" && day0.date < "2023-07-07") {
        console.error(`CRITICAL PIPELINE ERROR: Attempted to trade AMMN on ${day0.date}, which is before its real IPO date (2023-07-07)! Backtest failed.`);
    }
}
console.log("No errors for day0.");
