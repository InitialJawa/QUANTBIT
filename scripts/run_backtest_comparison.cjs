const fs = require('fs');
const path = require('path');

// Load all years
const allData = [];
for (let y = 2000; y <= 2026; y++) {
  const p = path.join('data', 'years', y + '.json');
  if (fs.existsSync(p)) allData.push(...JSON.parse(fs.readFileSync(p, 'utf-8')));
}

console.log('Total days loaded:', allData.length);

// Bridge to today
const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
const todayStr = now.toISOString().slice(0, 10);
const last = allData[allData.length - 1];
if (last.date < todayStr) {
  const curr = new Date(new Date(last.date).getTime() + 86400000);
  while (curr <= now) {
    const dow = curr.getDay();
    if (dow !== 0 && dow !== 6) {
      const ds = curr.toISOString().slice(0, 10);
      if (ds <= todayStr) allData.push({ ...last, date: ds, isCarriedForward: true });
    }
    curr.setDate(curr.getDate() + 1);
  }
}

const filtered = allData.filter(d => d.date >= '2022-01-03' && d.date <= todayStr);
console.log('Backtest days:', filtered.length, '|', filtered[0]?.date, '→', filtered[filtered.length-1]?.date, '\n');

function getRanks(day, configType) {
  if (day.stockNormScores && typeof day.stockNormScores === 'object') {
    const w = configType === 'prod'
      ? { quality: 0.25, growth: 0.1, value: 0.3, momentum: 0.35 }
      : { quality: 0.25, growth: 0.3, value: 0.1, momentum: 0.35 };
    const ranks = {};
    for (const [t, s] of Object.entries(day.stockNormScores)) {
      const sc = s;
      const score = (sc.quality || 0) * w.quality
        + (sc.growth || 0) * w.growth
        + (sc.value || 0) * w.value
        + (sc.momentum || 0) * w.momentum;
      ranks[t] = 1 - score;
    }
    return ranks;
  }
  return configType === 'prod' ? day.stockRanksProd : day.stockRanksRes;
}

function runBacktest(configType, label, universeFilter = null) {
  const cap = 100000000;
  const topN = 5;
  const BUY_FEE = 0.0015;
  const SELL_FEE = 0.0025;
  const TAX = 0.0010;
  const SLIPPAGE = 0.0025;

  let cash = cap;
  let positions = {};
  let lastRebalanceMonth = -1;
  let totalSwaps = 0;
  let inCrashState = false;
  let crashCooldown = 0;

  const getSma = (ticker, dayIdx, period) => {
    let sum = 0, count = 0;
    for (let i = Math.max(0, dayIdx - period + 1); i <= dayIdx; i++) {
      const p = filtered[i]?.stockAdjPrices?.[ticker];
      if (p && p > 0) { sum += p; count++; }
    }
    return count >= period ? sum / count : null;
  };

  const detectCrash = (dayIdx) => {
    if (dayIdx < 20) return false;
    const cur = filtered[dayIdx]?.ihsgPrice || 0;
    const prev = filtered[dayIdx - 20]?.ihsgPrice || 1;
    return (prev - cur) / prev > 0.10;
  };

  const detectRecovery = (dayIdx) => {
    if (dayIdx < 5) return false;
    const cur = filtered[dayIdx]?.ihsgPrice || 0;
    const prev5 = filtered[dayIdx - 5]?.ihsgPrice || 1;
    return (cur - prev5) / prev5 > 0.05;
  };

  const getTopTickers = (day, dayRanks, count) => {
    const candidates = Object.entries(dayRanks)
      .filter(([ticker]) => {
        const price = day.stockPrices?.[ticker];
        return price !== undefined && price > 0;
      })
      .sort((a, b) => a[1] - b[1]);

    if (universeFilter) {
      return candidates.filter(([t]) => universeFilter.includes(t)).slice(0, count).map(([t]) => t);
    }
    return candidates.slice(0, count).map(([t]) => t);
  };

  // Day 0: initial buy
  const day0 = filtered[0];
  const day0Ranks = getRanks(day0, configType);
  const initialTop = getTopTickers(day0, day0Ranks, topN);
  const perStock = cap / topN;

  initialTop.forEach(ticker => {
    const rawPrice = day0.stockPrices?.[ticker];
    if (!rawPrice || rawPrice <= 0) return;
    const entryPrice = rawPrice * (1 + SLIPPAGE);
    const costPerShare = entryPrice * (1 + BUY_FEE);
    let shares = Math.floor(perStock / (costPerShare * 100)) * 100;
    if (shares > 0) {
      positions[ticker] = shares;
      cash -= shares * costPerShare;
    }
  });

  // Day loop
  for (let i = 0; i < filtered.length; i++) {
    const day = filtered[i];
    const dateObj = new Date(day.date);
    const currentMonth = dateObj.getMonth();

    // Crash detection
    if (inCrashState) {
      crashCooldown--;
      if (crashCooldown <= 0 && detectRecovery(i)) {
        inCrashState = false;
      }
    } else {
      if (detectCrash(i)) {
        inCrashState = true;
        crashCooldown = 20;
        // Liquidate all
        for (const [t, shares] of Object.entries(positions)) {
          const rawPrice = day.stockPrices?.[t] || 100;
          const exitPrice = rawPrice * (1 - SLIPPAGE);
          cash += shares * exitPrice * (1 - SELL_FEE - TAX);
          delete positions[t];
        }
      }
    }

    if (i > 0 && !inCrashState) {
      const dayRanks = getRanks(day, configType);
      const ownedTickers = Object.keys(positions);
      const isMonthChange = currentMonth !== lastRebalanceMonth;

      for (const ticker of ownedTickers) {
        const currentRank = dayRanks[ticker] || 99;
        const isExit = isMonthChange && currentRank >= 10;

        if (isExit) {
          const rawPrice = day.stockPrices?.[ticker] || 100;
          const exitPrice = rawPrice * (1 - SLIPPAGE);
          const sellProceeds = positions[ticker] * exitPrice * (1 - SELL_FEE - TAX);
          delete positions[ticker];

          // Find swap candidate
          const topCandidates = getTopTickers(day, dayRanks, topN);
          const swapIn = topCandidates.find(t => !positions[t]) || topCandidates[0];
          if (swapIn) {
            const swapPrice = day.stockPrices?.[swapIn] || 100;
            const swapEntry = swapPrice * (1 + SLIPPAGE);
            const swapCost = swapEntry * (1 + BUY_FEE);
            let newShares = Math.floor(sellProceeds / (swapCost * 100)) * 100;
            if (newShares > 0) {
              positions[swapIn] = (positions[swapIn] || 0) + newShares;
              cash += sellProceeds - newShares * swapCost;
            } else {
              cash += sellProceeds;
            }
          } else {
            cash += sellProceeds;
          }
          totalSwaps++;
        }
      }
      if (isMonthChange) lastRebalanceMonth = currentMonth;
    }
  }

  // Final calc
  const lastDay = filtered[filtered.length - 1];
  let stockVal = 0;
  let totalDividends = 0;
  for (const [t, shares] of Object.entries(positions)) {
    stockVal += shares * (lastDay.stockPrices?.[t] || 100);
    // Dividends approximated per year
    if (lastDay.stockRawMetrics?.[t]?.dividendYield) {
      totalDividends += shares * (lastDay.stockPrices?.[t] || 100) * (lastDay.stockRawMetrics[t].dividendYield || 0) * 0.9;
    }
  }
  const finalVal = cash + stockVal + totalDividends;

  // IHSG benchmark
  const ihsgStart = filtered[0]?.ihsgPrice || 1;
  const ihsgEnd = lastDay?.ihsgPrice || 1;
  const ihsgReturn = (ihsgEnd / ihsgStart - 1) * 100;

  const totalReturn = (finalVal / cap - 1) * 100;
  const years = (new Date(lastDay.date) - new Date(filtered[0].date)) / (365.25 * 86400000);
  const cagr = (Math.pow(finalVal / cap, 1 / years) - 1) * 100;

  // Volatility (daily returns)
  let returns = [];
  let prevVal = cap;
  for (let i = 1; i < filtered.length; i++) {
    let sv = 0;
    for (const [t, s] of Object.entries(positions)) {
      sv += s * (filtered[i].stockPrices?.[t] || 0);
    }
    // This is approximate
  }

  console.log(`\n=== ${label} (${configType}) ===`);
  console.log(`Period: ${filtered[0].date} → ${lastDay.date} (${years.toFixed(1)} thn)`);
  console.log(`Initial: Rp ${cap.toLocaleString()}`);
  console.log(`Final:   Rp ${finalVal.toLocaleString('id-ID')}`);
  console.log(`Return:  ${totalReturn.toFixed(2)}%`);
  console.log(`CAGR:    ${cagr.toFixed(2)}%`);
  console.log(`IHSG:    ${ihsgReturn.toFixed(2)}%`);
  console.log(`Swaps:   ${totalSwaps}`);
  console.log(`Positions akhir: ${Object.keys(positions).join(', ')}`);
}

runBacktest('res', 'Config B (Backtest Optimized)');
runBacktest('prod', 'Config F (Fundamental Focus)');

// Also with IHSG membership filter
const idxTickers = filtered[filtered.length-1]?.idxMembers || Object.keys(filtered[filtered.length-1]?.stockRanksProd || {}).slice(0, 80);
console.log('\n──────────────────────────────────');
