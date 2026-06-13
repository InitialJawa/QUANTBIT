
# 📈 Indonesia Stock Intelligence (ISI) NEW GEN

<p align="center">
  <img src="https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite Badge" />
  <img src="https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Badge" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript Badge" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind Badge" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express Badge" />
  <img src="https://img.shields.io/badge/Gemini_AI-Flash_&_Pro-8E43E7?style=for-the-badge&logo=google-gemini&logoColor=white" alt="Gemini Badge" />
</p>

---

## 🌟 Tentang Proyek

**Indonesia Stock Intelligence (ISI) NEW GEN** adalah platform analitik dan simulasi investasi saham premium yang dirancang khusus untuk pasar modal Indonesia (**IDX / Bursa Efek Indonesia**). Platform ini menggabungkan analisis kuantitatif dengan kecerdasan buatan (**Gemini AI**) guna memberikan panduan taktis, mendiagnosis kesehatan pasar secara real-time, mendeteksi sinyal rotasi sektor, serta melakukan pengujian strategi (*backtesting*) historis sejak tahun 2020.

Antarmuka platform dirancang dengan estetika modern yang premium (gelap, berkelas, dengan transisi yang mulus) untuk menghadirkan pengalaman layaknya terminal profesional bagi para investor.

---

## 🛠️ Fitur Unggulan

Platform ini dilengkapi dengan fitur analitik end-to-end yang dibagi ke dalam beberapa modul utama:

### 1. 🚦 Market Regime & Status Pasar
*   **Regime Tracker:** Menganalisis kondisi pasar IHSG secara real-time untuk menentukan sikap alokasi modal (*Risk On* vs *Risk Off*).
*   **AI Daily Summary:** Ringkasan harian pasar saham Indonesia yang ditulis dalam bahasa finansial elegan secara otomatis oleh Gemini AI.
*   **Order Book Real-Time:** Simulasi kedalaman antrian bid/ask interaktif berdasarkan fraksi harga resmi BEI.

### 2. ⚡ Algorithmic Backtester (Simulation)
*   **Rebalancing Algoritma:** Menguji performa portofolio Anda menggunakan aturan rebalancing berkala (seperti *Rank 7 Rule*).
*   **Crash Protection:** Algoritma pengaman otomatis yang memindahkan aset ke instrumen defensif (Emas Fisik atau Kas IDR) ketika IHSG terdeteksi mengalami kejatuhan sistemik.
*   **Interactive Simulation Charts:** Grafik perbandingan performa rebalancing algoritma terhadap benchmark IHSG & Emas sejak tahun 2020.

### 3. 🎯 Leaders & Rotasi Sektor
*   **Strategi Ganda:**
    *   **Config F (Fundamental Focus):** Mengutamakan kualitas laporan keuangan dan valuasi wajar perusahaan.
    *   **Config B (Backtest/Technical Optimized):** Menitikberatkan pada momentum dan tren pertumbuhan saham.
*   **Market Rotation Matrix:** Melacak laju pergerakan saham untuk melihat frekuensi emiten dalam memuncaki daftar pasar (*Top Hits*) atau tertekan (*Drop Hits*).

### 4. 💼 Portfolio & Watchlist Tracker
*   **Enriched Holdings:** Memantau keuntungan/kerugian (PnL), persentase alokasi sektor bursa, dan mendeteksi secara dini emiten yang memicu sinyal jual (*Exit Alarm*).
*   **Sektor Distribusi:** Visualisasi diagram lingkaran (*Pie Chart*) dinamis untuk alokasi industri portofolio Anda.

### 5. 🪙 Forward Dividends Forecast
*   **Compounding Effect Simulator:** Memproyeksikan laba per saham (EPS) dan dividen per saham (DPS) emiten terpilih dalam jangka waktu 5 tahun mendatang.
*   **DRIP (Dividend Reinvestment Plan):** Mensimulasikan hasil investasi bersih jika dana dividen secara otomatis dibelikan kembali ke saham terkait (setelah dikurangi pajak dividen Indonesia sebesar 10%).

### 6. 🧠 Asisten AI Analis Kuantitatif
*   **Gemini Expert Advisor:** Bertanya langsung tentang profil emiten, pola rasio utang, dampak perubahan suku bunga BI-Rate, inflasi rupiah, maupun taktik investasi defensif secara interaktif.

---

## 🏗️ Arsitektur Teknologi

Proyek ini dibangun menggunakan arsitektur modern fullstack JavaScript/TypeScript:

*   **Frontend**: React 19 (React-JSX), Vite 6, Tailwind CSS v4, Lucide React (ikon), Recharts (visualisasi data chart), dan Motion (micro-animation).
*   **Backend Server**: Node.js Express server yang di-host dengan `tsx` untuk mendukung modul ES6 dan TypeScript secara langsung.
*   **Integrasi AI**: SDK Resmi `@google/genai` (menggunakan model `gemini-2.5-flash` / `gemini-3.5-flash`) dengan fallback otomatis ke Groq (`llama-3.3-70b`) dan OpenRouter (`llama-3.1-8b`) untuk menjamin reliabilitas penuh.
*   **Data Feeds**: Yahoo Finance API Quote Spark dan GoAPI Live Prices Proxy untuk pembaruan harga emiten JKSE secara real-time.

---

## 🚀 Memulai Proyek

Ikuti langkah-langkah berikut untuk menjalankan aplikasi di komputer lokal Anda:

### 1. Prasyarat
Pastikan Anda sudah menginstal **Node.js** (versi 18 ke atas) dan **npm** di komputer Anda.

### 2. Kloning Repositori
```bash
git clone https://github.com/InitialJawa/ISI-NEW-GEN.git
cd ISI-NEW-GEN
```

### 3. Konfigurasi Environment Variables
Salin berkas `.env.example` menjadi `.env` dan masukkan kunci API Anda:
```bash
cp .env.example .env
```
Isi variabel di dalam file `.env`:
```env
GEMINI_API_KEY="KUNCI_API_GEMINI_ANDA"
GOAPI_API_KEY="KUNCI_API_GOAPI_ANDA"       # Opsional, memiliki mock fallback
GROQ_API_KEY="KUNCI_API_GROQ_ANDA"         # Opsional, sebagai fallback AI
OPENROUTER_API_KEY="KUNCI_API_OPENROUTER"   # Opsional, sebagai fallback AI
```

### 4. Instalasi Dependensi
```bash
npm install
# atau menggunakan npm ci jika ingin sesuai lockfile
npm ci
```

### 5. Menjalankan Server Pengembangan (Development)
Perintah ini akan menjalankan backend Express dan Vite secara paralel:
```bash
npm run dev
```
Buka browser Anda dan navigasikan ke: [http://localhost:3000](http://localhost:3000)

### 6. Build Produksi
Untuk melakukan bundling aplikasi untuk tahap produksi:
```bash
npm run build
npm start
```

---

## 📑 Panduan Skrip package.json
*   `npm run dev`: Memulai server pengembangan berbasis `tsx server.ts`.
*   `npm run build`: Mem-build frontend menggunakan Vite, serta membundel file server.ts menggunakan `esbuild`.
*   `npm run start`: Menjalankan file server produksi yang sudah dibundel di `dist/server.cjs`.
*   `npm run lint`: Memvalidasi tipe TypeScript proyek (`tsc --noEmit`).
*   `npm run clean`: Menghapus folder `dist` lama sebelum build baru dilakukan.

---

## ⚖️ Disclaimer (Pernyataan Sanggahan)
*Aplikasi ini murni bersifat edukatif, simulasi, dan riset kuantitatif. Semua analisis yang dihasilkan oleh kecerdasan buatan (Gemini AI) tidak boleh dianggap sebagai rekomendasi investasi keuangan mutlak atau ajakan membeli/menjual saham secara riil. Keputusan investasi penuh berada di tangan pengguna masing-masing.*
