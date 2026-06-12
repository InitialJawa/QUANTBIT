const https = require('https');
https.get('https://query1.finance.yahoo.com/v7/finance/quote?symbols=^JKSE,IDR=X', {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0)",
    "Accept": "application/json"
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
});
