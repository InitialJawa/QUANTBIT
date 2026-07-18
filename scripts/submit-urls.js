// IndexNow submit — submit URL ke Bing/Yandex/DuckDuckGo sekaligus
// IndexNow: https://www.indexnow.org/
// API key: perlu daftar di indexnow.org dulu

// Untuk sekarang kita pakai Bing URL Submission API (gratis, 10K URL/hari)
// Daftar: https://www.bing.com/webmasters/url-submission
// Setelah daftar, dapet API key dari dashboard

const BING_API_KEY = "YOUR_BING_API_KEY"; // Ganti dengan API key dari Bing Webmaster Tools

const URLS_TO_SUBMIT = [
  "https://quantbit.pro/",
  "https://quantbit.pro/pages/panduan-backtest/",
  "https://quantbit.pro/pages/screening-saham/",
  "https://quantbit.pro/pages/strategi-dca/",
  "https://quantbit.pro/pages/tentang/",
];

async function submitToBing() {
  if (BING_API_KEY === "YOUR_BING_API_KEY") {
    console.error("ERROR: Ganti BING_API_KEY dengan API key dari Bing Webmaster Tools");
    console.error("Daftar di: https://www.bing.com/webmasters/url-submission");
    return;
  }

  for (const url of URLS_TO_SUBMIT) {
    try {
      const res = await fetch(
        `https://api.bing.com/urljson.aspx?AppKey=${BING_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        }
      );
      const data = await res.json();
      console.log(`${url} → ${res.status} ${JSON.stringify(data)}`);
    } catch (err) {
      console.error(`${url} → ERROR: ${err.message}`);
    }
  }
}

// IndexNow (alternatif — submit ke Bing, Yandex, DuckDuckGo sekaligus)
// Daftar: https://www.indexnow.org/
// Dapat API key, taruh di root website sebagai text file

const INDEXNOW_KEY = "YOUR_INDEXNOW_KEY"; // Ganti

async function submitIndexNow() {
  if (INDEXNOW_KEY === "YOUR_INDEXNOW_KEY") {
    console.error("ERROR: Daftar IndexNow di https://www.indexnow.org/ dulu");
    return;
  }

  const host = "https://quantbit.pro";
  const payload = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${host}/${INDEXNOW_KEY}.txt`,
    urlList: URLS_TO_SUBMIT,
  };

  try {
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
    });
    console.log(`IndexNow: ${res.status}`);
    if (res.ok) {
      console.log("Berhasil! URL dikirim ke Bing, Yandex, DuckDuckGo");
    }
  } catch (err) {
    console.error(`IndexNow ERROR: ${err.message}`);
  }
}

// Run
console.log("=== Submit URLs ===");
submitToBing();
submitIndexNow();
