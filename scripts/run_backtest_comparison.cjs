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

const filtered = allData.filter(d => d.date >= '2021-01-04' && d.date <= todayStr);
console.log('Backtest days:', filtered.length, '|', filtered[0]?.date, '→', filtered[filtered.length-1]?.date, '\n');

const wProd  = { quality: 0.45, growth: 0.10, value: 0.05, momentum: 0.40, label: 'Config QM (Quality Momentum)' };
const wRes   = { quality: 0.40, growth: 0.25, value: 0.05, momentum: 0.30, label: 'Config BG (Balanced Growth)' };
const wEqual = { quality: 0.25, growth: 0.25, value: 0.25, momentum: 0.25, label: 'Equal Weight (All 4)' };
const wQual  = { quality: 1.0,  growth: 0.0,  value: 0.0,  momentum: 0.0,  label: 'Quality Only (ROE)' };
const wGrowth= { quality: 0.0,  growth: 1.0,  value: 0.0,  momentum: 0.0,  label: 'Growth Only' };
const wValue = { quality: 0.0,  growth: 0.0,  value: 1.0,  momentum: 0.0,  label: 'Value Only (1/PB)' };
const wMoment= { quality: 0.0,  growth: 0.0,  value: 0.0,  momentum: 1.0,  label: 'Momentum Only (60d)' };

function getRanks(day, weights) {
  if (day.stockNormScores && typeof day.stockNormScores === 'object') {
    const scores = Object.entries(day.stockNormScores).map(([ticker, s]) => ({
      ticker,
      score: (s.quality || 50) * weights.quality
        + (s.growth || 50) * weights.growth
        + (s.value || 50) * weights.value
        + (s.momentum || 50) * weights.momentum
    }));
    scores.sort((a, b) => b.score - a.score);
    const ranks = {};
    scores.forEach((item, idx) => { ranks[item.ticker] = idx + 1; });
    return ranks;
  }
  const isProd = weights.quality === 0.45 && weights.growth === 0.10 && weights.value === 0.05 && weights.momentum === 0.40;
  return day[isProd ? 'stockRanksProd' : 'stockRanksRes'];
}

function runBacktest(weights, universeFilter = null) {
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
  const day0Ranks = getRanks(day0, weights);
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

  // Init rebalance month from day0 to avoid day-1 false trigger
  lastRebalanceMonth = new Date(day0.date).getMonth();

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
        for (const [t, shares] of Object.entries(positions)) {
          const rawPrice = day.stockPrices?.[t] || 100;
          const exitPrice = rawPrice * (1 - SLIPPAGE);
          cash += shares * exitPrice * (1 - SELL_FEE - TAX);
          delete positions[t];
        }
      }
    }

    if (i > 0 && !inCrashState) {
      const dayRanks = getRanks(day, weights);
      const ownedTickers = Object.keys(positions);
      const isMonthChange = currentMonth !== lastRebalanceMonth;

      for (const ticker of ownedTickers) {
        const currentRank = dayRanks[ticker] || 99;
        const isEmergencyExit = currentRank >= 15;
        const isRoutineExit = isMonthChange && currentRank >= 10;

        if (isEmergencyExit || isRoutineExit) {
          const rawPrice = day.stockPrices?.[ticker] || 100;
          const exitPrice = rawPrice * (1 - SLIPPAGE);
          const sellProceeds = positions[ticker] * exitPrice * (1 - SELL_FEE - TAX);
          delete positions[ticker];

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

  const lastDay = filtered[filtered.length - 1];
  let stockVal = 0;
  let totalDividends = 0;
  for (const [t, shares] of Object.entries(positions)) {
    stockVal += shares * (lastDay.stockPrices?.[t] || 100);
  }
  const finalVal = cash + stockVal + totalDividends;

  const ihsgStart = filtered[0]?.ihsgPrice || 1;
  const ihsgEnd = lastDay?.ihsgPrice || 1;
  const ihsgReturn = (ihsgEnd / ihsgStart - 1) * 100;

  const totalReturn = (finalVal / cap - 1) * 100;
  const years = (new Date(lastDay.date) - new Date(filtered[0].date)) / (365.25 * 86400000);
  const cagr = years > 0 ? (Math.pow(finalVal / cap, 1 / years) - 1) * 100 : 0;

  console.log(`  Return:  ${totalReturn.toFixed(2)}% | CAGR: ${cagr.toFixed(2)}% | IHSG: ${ihsgReturn.toFixed(2)}% | Swaps: ${totalSwaps}`);
}

function runAll() {
  console.log('\n=== BACKTEST 2021-01-04 sd SEKARANG ===');
  const configs = [wProd, wRes, wEqual, wQual, wGrowth, wValue, wMoment];
  configs.forEach(w => {
    console.log(`\n${w.label}:`);
    runBacktest(w);
  });
}

runAll();

// Also with IHSG membership filter
const idxTickers = filtered[filtered.length-1]?.idxMembers || Object.keys(filtered[filtered.length-1]?.stockRanksProd || {}).slice(0, 80);
console.log('\n──────────────────────────────────');
