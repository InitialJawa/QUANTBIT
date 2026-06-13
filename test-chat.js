import http from 'http';
const data = JSON.stringify({
  messages: [{ role: "user", content: "Halo, ini test" }],
  selectedStock: { ticker: "BBCA" }
});
const req = http.request('http://localhost:3000/api/gemini/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' } }, (res) => {
  let chunks = '';
  res.on('data', (c) => chunks += c);
  res.on('end', () => console.log(chunks));
});
req.write(data);
req.end();
