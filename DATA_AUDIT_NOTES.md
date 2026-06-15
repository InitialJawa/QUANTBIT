# Quantbit Data Audit Notes

Tanggal audit: 2026-06-15

Dokumen ini mencatat area repo yang berpotensi memakai data palsu, generated, stale, atau bias. Tujuannya bukan menghapus data yang ada secara membabi-buta, tetapi memisahkan data yang verified dari data yang estimated/cached agar UI tetap menampilkan angka tanpa mengklaim sesuatu sebagai live kalau sumbernya tidak live.

## Prinsip Solusi

- Jangan tampilkan "data unavailable" sebagai default.
- Jangan generate angka baru lalu mengaku live/update.
- Gunakan status sumber data:
  - `LIVE`: baru dari provider/API.
  - `CACHED`: data asli terakhir yang berhasil diverifikasi.
  - `STALE`: cache asli, tetapi melewati batas freshness.
  - `ESTIMATED`: hasil model/rumus, bukan data market aktual.
- Jika live gagal, pakai last verified cache.
- Jika cache kosong, pakai baseline verified bawaan dengan timestamp asli.
- Jangan overwrite cache valid dengan hasil scan kosong.

## Temuan Data Generated / Stale

### Leader / Ranking

- `src/marketData.ts`
  - `L` berisi leader ranking statik, bukan hasil live scan.
  - `RS` radar/status market statik bertanggal `2026-06-11`.
  - `MKT` market data statik bertanggal `2026-06-11`.
  - `idxNews` berisi berita naratif dengan URL halaman kategori, bukan artikel spesifik.

- `src/components/LeadersTab.tsx`
  - `getRotationData()` memakai database rotasi hardcoded.
  - `topHits`, `dropHits`, `path`, dan label rotasi seperti "Konsisten Peak", "Rotasi Kuat", "Breakout" bukan hasil perhitungan live.
  - Ticker di luar data hardcoded dibuat dengan hash deterministik dan perubahan harga.

### Market Log / Bid-Ask / Timeline

- `src/components/MarketTab.tsx`
  - "Sinyal Timeline & Log" mengambil data dari `RS.volume_details`.
  - Data ini statik, tetapi label UI seperti "JCI FEED" bisa membuatnya terlihat seperti feed aktual.
  - Jika tidak ada orderbook provider asli, jangan sebut bid/ask live.
  - Gunakan label "estimated spread" kalau spread dihitung model.

### Live Market Cache

- `data/live_market.json`
  - Disebut live market, tetapi `last_update` dan `market_last_update` masih `2026-06-11`.
  - Perlu status `CACHED`/`STALE`, bukan ditampilkan sebagai live tanpa konteks.

- `data/idx80_scan.json`
  - Saat audit: `lastUpdated` hari ini, tetapi `stocks: []`.
  - Ini berbahaya karena terlihat baru, padahal hasil scan kosong.
  - Scanner tidak boleh menimpa cache valid dengan array kosong.

### Stock Detail / Chart / Fundamental

- `src/stocksData.ts`
  - Data finansial ringkas dibuat dari rumus seperti `marketCap * 10`.
  - Chart daily/weekly/monthly memakai `Math.random()` untuk price/volume.
  - Fallback IDX80 disintesis agar semua ticker bisa tampil.
  - `currentPrice` fallback bisa dari exit data atau default `1000`.
  - `change` fallback bisa dari momentum leader, bukan perubahan market aktual.

- `fetch_historical_data.ts`
  - Beberapa fundamental snapshot hardcoded.
  - Ticker tanpa data Yahoo/snapshot memakai fallback hash deterministik.
  - Komentar menyebut no look-ahead bias, tetapi tetap perlu verifikasi ketat per tanggal.

- `src/components/SimulationTab.tsx`
  - Memiliki salinan logika fundamental snapshot/fallback.
  - Ada komentar "simulated stable factor ratings".

### Backtest Bridging

- `server.ts`
  - `bridgeHistoricalDataToToday()` mengisi gap sampai hari ini dengan carry-forward dari data terakhir.
  - Variabel dinamai `mockDay`.
  - Ini bukan random fake, tetapi bukan harga aktual hari tersebut.
  - Harus diberi status `CARRIED_FORWARD`/`STALE`, bukan live.

### AI Fallback / Summary

- `src/components/MarketTab.tsx`
  - Jika market summary gagal, UI memakai static fallback summary.
  - Ini perlu label jelas sebagai cached/static generated brief.

- `server.ts`
  - Prompt AI dapat menghasilkan rekomendasi `STRONG_BUY`, `BUY`, `SELL`, dll.
  - Jika input stale/generated, output AI tetap bisa terdengar sangat yakin.

## Bias / Risiko Analitik

### High Priority

- Survivorship bias:
  - Universe IDX80 saat ini dipakai mundur ke periode historis.
  - Perlu universe point-in-time atau minimal penanda saham belum IPO/suspended/delisted.

- Look-ahead / point-in-time risk:
  - Fundamental fallback/snapshot harus dipastikan tidak memakai data masa depan.
  - Lag laporan 3 bulan sudah ada, tetapi harus diuji.

- Backtest overfitting:
  - Label `Config B (Backtest Optimized)` berisiko menampilkan strategi hasil tuning historis sebagai strategi robust.

- AI recommendation confidence:
  - AI diberi schema rekomendasi trading tegas.
  - Perlu downgrade menjadi "analysis stance" atau "scenario", terutama bila data bukan `LIVE`.

- UI wording terlalu meyakinkan:
  - Contoh frasa: "berhasil melampaui", "emiten terkuat untuk dikoleksi", "segera lakukan proteksi", "crash aktif", "buy-on-weakness".
  - Perlu bahasa yang membedakan analisis, simulasi, dan instruksi eksekusi.

### Data / Market Bias

- Yahoo/GoAPI coverage bias:
  - Hanya beberapa ticker utama punya live price.
  - Ticker lain bisa fallback ke statik, tetapi UI tetap terlihat seragam.

- Corporate action bias:
  - Perlu audit split, dividen, rights issue, stock bonus, ticker change, merger.
  - `adjClose` membantu, tetapi dividend/corporate action manual tetap rawan.

- Liquidity bias:
  - Backtest punya cap volume, tetapi real execution impact di IDX bisa jauh lebih buruk.

- Spread/slippage bias:
  - Spread/slippage dipukul rata.
  - Real spread tergantung ticker, jam, volume, dan kondisi pasar.

- Benchmark bias:
  - Perlu benchmark tambahan: IDX80 equal-weight, IDX30, LQ45, sector-neutral, dan cash/risk-free return.

### Formula / Model Bias

- Default neutral score 50:
  - `sync_engine.ts` memberi starting score 50 saat data kurang.
  - Ini bisa memberi nilai wajar pada saham dengan data tidak lengkap.

- Outlier bias:
  - Normalisasi/ranking perlu winsorization atau clipping per faktor.

- Growth/momentum bias:
  - Bobot growth/momentum bisa overweight saham siklikal atau saham yang sedang hype.

- Dividend forecast bias:
  - `ForwardDividendsForecast.tsx` menghitung payout dari PE dan dividend yield.
  - Ini harus disebut estimasi, bukan proyeksi pasti.

- Gold/rupiah unit bias:
  - Ada potensi beda skala harga emas antara ribuan dan jutaan IDR.
  - Perlu satuan tunggal: IDR/gram atau IDR/oz dengan label jelas.

### State / App Bias

- Cache kosong menimpa data bagus:
  - `idx80_scan.json` kosong dengan timestamp baru adalah contoh risiko.

- LocalStorage vs Firebase divergence:
  - State dapat berbeda antara localStorage dan Firebase.

- Default portfolio palsu:
  - `server.ts` punya default BBCA/BBRI dan trade logs timestamp sekarang.
  - Jangan tampilkan sebagai riwayat asli user.

- Return calculation bias:
  - `MarketTab.tsx` memakai `* 105` pada `myReturnPercent`.
  - Ini membuat return naik 5% dibanding formula standar.

- News hallucination bias:
  - Berita statik/generic bisa mempengaruhi sentimen seolah berasal dari artikel nyata.

## Prioritas Perbaikan

1. Cegah cache valid ditimpa hasil scan kosong.
2. Tambah metadata status sumber data: `LIVE`, `CACHED`, `STALE`, `ESTIMATED`.
3. Ganti leader/radar/log dari hardcoded ke cache hasil scan verified.
4. Hilangkan `Math.random()` dari data yang tampil sebagai market/finance.
5. Ubah bid/ask/log palsu menjadi market event/timeline berbasis data verified.
6. Turunkan bahasa UI/AI dari rekomendasi eksekusi menjadi analisis skenario.
7. Audit backtest untuk survivorship, corporate action, dan point-in-time data.
8. Tambah guard untuk cache freshness dan timestamp asli.
9. Bedakan portfolio simulasi/default dari portfolio user asli.
10. Perbaiki formula return `* 105` menjadi standar.

## Target Perilaku Setelah Perbaikan

- User tetap melihat data, tidak melihat "data unavailable".
- Semua angka punya status sumber.
- Data lama tetap boleh ditampilkan sebagai cache, tetapi timestamp dan freshness jujur.
- Estimasi tetap boleh ada, tetapi tidak diklaim sebagai live market data.
- Backtest tetap tersedia, tetapi diberi label metodologi dan batasan bias.
