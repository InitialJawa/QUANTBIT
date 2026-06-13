import fs from "fs";
const rawData = JSON.parse(fs.readFileSync("./src/data/historical_market_data.json", "utf8"));
const BUY_FEE = 0.0015;
const SELL_FEE = 0.0025;
const TAX = 0.0010;
const SLIPPAGE = 0.0075;

let cash = 100000000;
let positions: Record<string, number> = {};
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

const day0 = rawData[0];
const initialTop = getTopTickersOnDay(day0.stockAdjPrices, day0.stockRanksProd, numStocks);
const alloc = cash / numStocks;
for (const ticker of initialTop) {
    const rawPrice = day0.stockAdjPrices[ticker];
    const entryPrice = rawPrice * (1 + SLIPPAGE);
    const costPerShareWithFee = entryPrice * (1 + BUY_FEE);
    const sharesToBuy = Math.floor(alloc / (costPerShareWithFee * 100)) * 100;
    positions[ticker] = sharesToBuy;
    cash -= sharesToBuy * costPerShareWithFee;
}

let lastRebalanceMonth = -1;

for (let stepIndex = 0; stepIndex < rawData.length; stepIndex++) {
    const day = rawData[stepIndex];
    const dateObj = new Date(day.date);
    const currentMonth = dateObj.getMonth();
    
    // Rank 7 Rule active rebalancing
    if (true) {
        const ownedTickers = Object.entries(positions).filter(([_, shares]) => shares > 0).map(([ticker]) => ticker);
        let evaluatedRoutine = false;

        for (const ticker of ownedTickers) {
            const currentRank = day.stockRanksProd[ticker] || 5;
            
            const isMonthChange = currentMonth !== lastRebalanceMonth;
            const isEmergencyExit = currentRank >= 15;
            const isRoutineExit = isMonthChange && currentRank >= 10;

            if (isEmergencyExit || isRoutineExit) {
                const rawPrice = day.stockAdjPrices[ticker] || 100;
                const exitPrice = rawPrice * (1 - SLIPPAGE);
                const sellProceeds = positions[ticker] * exitPrice * (1 - SELL_FEE - TAX);
                delete positions[ticker];
                
                const topCandidates = getTopTickersOnDay(day.stockAdjPrices, day.stockRanksProd, 4);
                const swapInTicker = topCandidates.find(t => !positions[t] || positions[t] === 0) || topCandidates[0];
                
                const swapInRawPrice = day.stockAdjPrices[swapInTicker] || 100;
                const swapInEntryPrice = swapInRawPrice * (1 + SLIPPAGE);
                const swapInCostWithFee = swapInEntryPrice * (1 + BUY_FEE);

                const newLots = Math.floor(sellProceeds / (swapInCostWithFee * 100));
                const newShares = newLots * 100;
                if (newShares > 0) {
                    positions[swapInTicker] = (positions[swapInTicker] || 0) + newShares;
                    cash += sellProceeds - (newShares * swapInCostWithFee);
                } else {
                    cash += sellProceeds;
                }
            }
        }
        if (currentMonth !== lastRebalanceMonth) {
            lastRebalanceMonth = currentMonth;
        }
    }
}

let stocksValue = 0;
for (const [ticker, shares] of Object.entries(positions)) {
    stocksValue += shares * rawData[rawData.length - 1].stockAdjPrices[ticker];
}
const todayPortfolioVal = cash + stocksValue;
console.log("End: " + todayPortfolioVal);

