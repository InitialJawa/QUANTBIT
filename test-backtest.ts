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
console.log("TOP DAY 0:", top);
for (const t of top) {
  if (t === "GOTO" && day0.date < "2022-04-11") {
    console.log("CRITICAL PIPELINE ERROR GOTO");
  }
}
