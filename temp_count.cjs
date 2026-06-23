var fs = require('fs');

// Count L array entries using proper parsing
var m = fs.readFileSync('D:/CODE/QUANTBIT/src/marketData.ts', 'utf-8');

// Find L: export const L: LeaderStock[] = [
var Lidx = m.indexOf('export const L: LeaderStock');
// Search for the end of L array - it ends with '];'
var searchStart = Lidx;
var bracketDepth = 0;
var inLArray = false;
var Lend = -1;
for (var i = m.indexOf('[', Lidx); i < m.length; i++) {
  if (m[i] === '[') bracketDepth++;
  if (m[i] === ']') {
    bracketDepth--;
    if (bracketDepth === 0 && inLArray) {
      Lend = i;
      break;
    }
  }
  if (m[i] === '[' && !inLArray && m.substring(i-1,i) !== '=') {
    // this should be the start
  }
  if (m[i] === '[' && bracketDepth === 1) inLArray = true;
}

var LarrayStart = m.indexOf('[', Lidx);
var LarrayEnd = m.indexOf('];', LarrayStart) + 1;
var Ltext = m.substring(LarrayStart, LarrayEnd + 1);
var Lmatch = Ltext.match(/\{"rank":"[^"]+","ticker":"[^"]+"[^}]*\}/g);
console.log('L leader entries:', Lmatch ? Lmatch.length : 0);

// Get tickers from L
if (Lmatch) {
  var Ltickers = Lmatch.map(function(s) { return s.match(/"ticker":"([^"]+)"/)[1]; });
  console.log('L tickers:', Ltickers.join(', '));
}

// Count COMBINED_TICKERS
var c = fs.readFileSync('D:/CODE/QUANTBIT/src/constants/idx80.ts', 'utf-8');
var allRefs = c.match(/"[A-Z]+\.JK"/g);
console.log('\nTotal ticker references:', allRefs ? allRefs.length : 0);
var unique = new Set(allRefs);
console.log('Unique tickers:', unique.size);

var combinedTickers = [...unique].map(function(t) { return t.replace(/"/g,''); });

// Count scan data stocks
var scan = JSON.parse(fs.readFileSync('D:/CODE/QUANTBIT/data/idx80_scan.json', 'utf-8'));
console.log('Scan data stocks:', scan.stocks.length);

var scanTickers = new Set(scan.stocks.map(function(s) { return s.ticker; }));

// Compare combined with scan
var inScan = combinedTickers.filter(function(t) { return scanTickers.has(t); });
var notInScan = combinedTickers.filter(function(t) { return !scanTickers.has(t); });
console.log('Combined tickers IN scan data:', inScan.length);
console.log('Combined tickers NOT in scan data:', notInScan.length);
if (notInScan.length > 0) {
  console.log('Not in scan:', notInScan.join(', '));
}

// Count how many are actually returned by getProcessedLeaders
// It includes if in scan cache OR in L array
var scanOrL = new Set(inScan);
if (Lmatch) {
  Lmatch.forEach(function(s) {
    var t = s.match(/"ticker":"([^"]+)"/)[1];
    scanOrL.add(t);
  });
}
console.log('\nStocks that would pass getProcessedLeaders filter: ' + scanOrL.size);

// The scan data has 95 stocks. COMBINED_TICKERS has 95 unique stocks.
// So theoretically all 95 should appear. But let me check if some may be excluded
// because they're only in the set but not in scan data...

// Check: which combined tickers are in scan data?
console.log('\nCombined tickers IN scan:');
inScan.forEach(function(t) { console.log('  ' + t); });
