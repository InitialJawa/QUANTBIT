# Quantbit Data Audit Notes

Tanggal audit: 2026-06-15

Dokumen ini mencatat area repo yang berpotensi memakai data palsu, generated, stale, atau bias. Tujuannya bukan menghapus data yang ada secara membabi-buta, tetapi memisahkan data yang verified dari data yang estimated/cached agar UI tetap menampilkan angka tanpa mengklaim sesuatu sebagai live kalau sumbernya tidak live.

## Inti Keputusan

PR #1 benar sebagai langkah transparansi, tetapi hanya berfungsi sebagai lampu peringatan: badge memberi tahu user bahwa sebagian data adalah simulasi, statis, estimasi, atau feed parsial. Itu berguna, tetapi belum menyelesaikan tujuan utama QUANTBIT.

Tujuan utama QUANTBIT adalah memakai backtest sebagai mesin pembaca rezim pasar, bukan sekadar alat pamer return. Backtest harus membaca sejarah panjang market, menjalankan ulang aturan keputusan, lalu menjawab posisi sekarang sebaiknya berada di saham, cash, atau emas.

Solusi final:

1. Pertahankan backtest sebagai `market regime engine`, dengan output seperti `RISK_ON`, `RISK_OFF`, `GOLD_DEFENSE`, dan `RECOVERY_WATCH`.
2. Tetap tampilkan data tanpa "data unavailable", tetapi setiap angka wajib punya status sumber: `LIVE`, `CACHED`, `STALE`, atau `ESTIMATED`.
3. Jika live feed gagal, gunakan cache valid terakhir. Jangan kosong, jangan unavailable, dan jangan generate angka palsu.
4. Jangan overwrite cache bagus dengan hasil scan kosong, terutama untuk `data/idx80_scan.json`.
5. Tambahkan `Decision Audit Trail` agar sistem bisa menjelaskan sejak kapan kabur ke emas, trigger apa yang aktif, kenapa belum beli saham, dan syarat apa agar balik masuk saham.
6. AI hanya menjelaskan keputusan dan skenario; keputusan utama harus berasal dari rule/backtest, bukan narasi AI.

Dengan kata lain: PR #1 adalah lampu peringatan. Yang dibutuhkan berikutnya adalah mesin keputusan rezim yang jujur, memakai cache verified, dan bisa menjelaskan kenapa sekarang pegang emas atau belum beli saham.

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

## Tujuan Backtest Yang Harus Dipertahankan

Backtest di QUANTBIT bukan hanya alat untuk menunjukkan return historis. Tujuan utamanya adalah menjadi `market regime engine`: membaca pola pasar dari data lama, menguji ulang aturan keputusan pada periode historis, lalu membantu menjawab posisi sekarang sebaiknya berada di saham, cash, atau emas.

Contoh tujuan praktis:

- Jika market sejak Januari 2026 masuk fase crash/risk-off, sistem harus bisa menunjukkan kapan trigger terjadi.
- Jika simulasi historis menunjukkan aksi defensif terbaik adalah kabur ke emas, UI harus menampilkan alasan dan tanggal perpindahan itu.
- Jika sampai tanggal audit belum ada saham layak beli, sistem harus menjelaskan saham mana yang gagal lolos filter dan filter apa yang gagal.
- Output utama backtest bukan "profit paling tinggi", tetapi keputusan rezim: `Risk-On`, `Risk-Off`, `Recovery Watch`, `Gold Defense`, atau `Cash Defense`.

Backtest tetap penting, tetapi harus dibersihkan dari data palsu dan diberi audit trail agar keputusan "pegang emas" atau "belum beli saham" bisa dipercaya.

## Solusi Produk

### 1. Jadikan Backtest Sebagai Regime Engine

- Tambahkan status rezim pasar:
  - `RISK_ON`: saham boleh dibeli berdasarkan aturan historis dan data terkini.
  - `RISK_OFF`: pasar belum layak diserang.
  - `GOLD_DEFENSE`: sistem bertahan di emas karena trigger crash/risk-off aktif.
  - `CASH_DEFENSE`: sistem bertahan di cash karena emas tidak dipilih atau data emas tidak memenuhi syarat.
  - `RECOVERY_WATCH`: pasar mulai membaik, tetapi belum memenuhi aturan masuk saham.
- Tampilkan satu keputusan utama saat ini:
  - `HOLD_GOLD`
  - `HOLD_CASH`
  - `BUY_STOCKS`
  - `WAIT_RECOVERY`
- Keputusan harus berasal dari aturan backtest yang sama, bukan dari narasi AI.

### 2. Tambahkan Decision Audit Trail

UI perlu section khusus yang menjawab:

- Tanggal trigger terakhir.
- Rezim sebelum trigger.
- Rezim sesudah trigger.
- Faktor pemicu: IHSG drawdown, MA20/MA50, rank saham, score, breadth, atau exit rules.
- Aksi simulasi: jual saham, pindah ke emas, pindah ke cash, atau tetap hold.
- Posisi sekarang: emas/cash/saham.
- Syarat balik masuk saham:
  - IHSG kembali di atas MA20/MA50.
  - Breadth membaik.
  - Minimal N saham lolos rank/score.
  - Tidak ada exit risk besar pada kandidat utama.
  - Data source minimal `CACHED` dan tidak melewati batas stale maksimum.

Contoh output yang diinginkan:

```txt
Current Decision: HOLD_GOLD
Regime: GOLD_DEFENSE
Trigger Date: 2026-01-xx
Reason: IHSG drawdown/risk-off rule aktif dan kandidat saham tidak lolos filter recovery.
Current Position: Emas
Re-entry Condition: tunggu recovery confirmation + minimal kandidat saham lolos rank/score.
Data Status: CACHED/STALE, last verified YYYY-MM-DD HH:mm WIB
```

### 3. Tetap Tampilkan Data, Tetapi Jujur Statusnya

- Jangan tampilkan "data unavailable".
- Jika data hari ini gagal, gunakan cache terakhir yang valid.
- Jika cache sudah lama, tampilkan `STALE` tetapi tetap tampilkan angka.
- Jika angka adalah model, tampilkan `ESTIMATED`.
- Jangan ubah timestamp menjadi hari ini kecuali data benar-benar berhasil diambil atau dihitung dari input verified hari ini.

### 4. Bedakan Simulasi Dari Eksekusi Nyata

- Backtest boleh menghasilkan aksi seperti "kabur ke emas", tetapi labelnya harus jelas sebagai `simulated decision replay`.
- Current decision boleh ditampilkan sebagai panduan sistem, tetapi harus menyebut status data.
- AI tidak boleh mengubah keputusan utama. AI hanya boleh menjelaskan audit trail dan skenario.

### 5. Definisikan "Belum Layak Beli Saham"

Kalimat "belum ada saham layak beli" harus dihitung dari rule eksplisit, misalnya:

- Tidak ada kandidat top rank dengan score di atas ambang.
- Breadth pasar belum mendukung.
- IHSG masih di bawah trend filter.
- Kandidat utama masih memiliki `EXIT` atau `EXIT RISK`.
- Volume/liquidity tidak memenuhi minimum.
- Data kandidat terlalu stale untuk masuk mode `BUY_STOCKS`.

Jika semua kondisi ini gagal, keputusan yang valid adalah `HOLD_GOLD` atau `WAIT_RECOVERY`, bukan sekadar opini.

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
3. Tambah `market regime engine` dengan status `RISK_ON`, `RISK_OFF`, `GOLD_DEFENSE`, `CASH_DEFENSE`, dan `RECOVERY_WATCH`.
4. Tambah `Decision Audit Trail` untuk menjelaskan trigger, aksi simulasi, posisi sekarang, dan syarat balik beli saham.
5. Definisikan rule eksplisit untuk "belum ada saham layak beli".
6. Ganti leader/radar/log dari hardcoded ke cache hasil scan verified.
7. Hilangkan `Math.random()` dari data yang tampil sebagai market/finance.
8. Ubah bid/ask/log palsu menjadi market event/timeline berbasis data verified.
9. Turunkan bahasa UI/AI dari rekomendasi eksekusi menjadi analisis skenario.
10. Audit backtest untuk survivorship, corporate action, dan point-in-time data.
11. Tambah guard untuk cache freshness dan timestamp asli.
12. Bedakan portfolio simulasi/default dari portfolio user asli.
13. Perbaiki formula return `* 105` menjadi standar.

## Target Perilaku Setelah Perbaikan

- User tetap melihat data, tidak melihat "data unavailable".
- Semua angka punya status sumber.
- Data lama tetap boleh ditampilkan sebagai cache, tetapi timestamp dan freshness jujur.
- Estimasi tetap boleh ada, tetapi tidak diklaim sebagai live market data.
- Backtest tetap tersedia, tetapi diberi label metodologi dan batasan bias.
- Backtest menjadi dasar pembacaan rezim pasar dan keputusan saat ini: saham, cash, atau emas.
- Keputusan "pegang emas" atau "belum beli saham" selalu punya audit trail yang bisa dicek.
