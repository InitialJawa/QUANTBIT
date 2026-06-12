const urls = [
  "https://api.goapi.io/v1/stock/idx/prices",
  "https://api.goapi.io/stock/idx/prices",
  "https://api.goapi.id/v1/stock/idx/prices",
  "https://api.goapi.io/api/idx/prices",
  "https://api.goapi.io/stock/idx/live",
  "https://api.goapi.io/stock/idx/companies",
  "https://api.goapi.io/stock/idx/index",
];

async function test() {
  for (const url of urls) {
    try {
      const res = await fetch(url);
      console.log(`URL: ${url} - Status: ${res.status}`);
    } catch (e) {
      console.log(`URL: ${url} - Error: ${e.message}`);
    }
  }
}
test();