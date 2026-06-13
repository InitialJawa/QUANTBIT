import https from 'https';
https.get('https://assets.stockbit.com/logos/companies/BBCA.png', (res) => {
  console.log(res.statusCode);
});
