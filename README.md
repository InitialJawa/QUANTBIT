```markdown
<div align="center">

# 💎 QUANTBIT: Quantitative Stock Terminal

[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Gemini](https://img.shields.io/badge/Gemini_AI-2.5_Flash-F4B400?style=for-the-badge&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)

<p align="center">
  <b>Terminal finansial kuantitatif deterministik untuk screening, backtesting data riil, dan manajemen portofolio Bursa Efek Indonesia (BEI / IDX), dilengkapi visualisasi AI-powered Executive Summary.</b>
</p>

---
</div>

## ⚖️ Filosofi Sistem: Data Akurat vs AI Halusinasi

QUANTBIT dibangun di atas prinsip akurasi data mutlak. **Sistem ini TIDAK menggunakan AI Agent untuk menghitung metrik keuangan, melakukan screening, atau menjalankan simulasi backtest.** Semua logika matematika finansial, kalkulasi bobot portofolio, dan deteksi tren pasar dieksekusi secara deterministik menggunakan kode pemrograman berbasis data riil historis. 

Peran AI (Gemini 2.5 Flash) diisolasi hanya pada lapisan akhir (*Presentation Layer*) untuk **merangkum angka-angka matematis tersebut menjadi kesimpulan naratif (Executive Summary)** yang mudah dicerna oleh investor.

---

## 🔌 Sumber Data & Integrasi (Data Sources)

Untuk memastikan akurasi kalkulasi kuantitatif, QUANTBIT mengintegrasikan data sekunder dari sumber-sumber tepercaya berikut melalui `fetch_historical_data.ts` dan API Gateway:

| Kategori Data | Sumber Data | Mekanisme Integrasi | Deskripsi Penggunaan |
| :--- | :--- | :--- | :--- |
| **Harga Saham Historis** | **Yahoo Finance API** | Scraper / `yt-dlp` / REST Client | Mengambil data *Daily Close Price*, volume transaksi, dan penyesuaian korporasi (*Adjusted Close*) sejak 2016 untuk keperluan *backtesting*. |
| **Laporan Keuangan** | **IDX (Bursa Efek Indonesia)** & **GoAPI** | REST API / Offline DB Sync | Data historis neraca (Balance Sheet) dan laba rugi untuk menghitung rasio makro fundamental (ROE, DER, PER, PBV). |
| **Aset Safe-Haven** | **Harga Emas Batangan Riil** | API / Web Scraping | Mengambil data harga emas per gram *live/daily* sebagai basis perhitungan alokasi aset saat protokol *Crash Protection* aktif. |
| **Indeks Pasar** | **IHSG (JKSE)** | Yahoo Finance API | Digunakan sebagai *benchmark* utama dan indikator penentu tren makro untuk rotasi portofolio ke Kas/Emas. |

---

## 🌟 Fitur Utama

*   **📊 Engine Multi-Faktor Kuantitatif (Matematika Riil)**: Pemindai performa emiten IDX80 & IDX30 yang menghitung skor berdasarkan data laporan keuangan riil:
    *   *Quality* (Kalkulasi formula ROE & DER)
    *   *Growth* (Persentase Akselerasi Profit)
    *   *Value* (Inverted PBV & PER)
    *   *Momentum* (Kalkulasi matematis tren harga 60 hari vs MA)
*   **⏳ Algorithmic Backtester Berbasis Data Historis**: Simulasi performa sejak 2016 menggunakan data *close price* riil dari Yahoo Finance. Perhitungan presisi memperhitungkan:
    *   Ketentuan fraksi lot BEI (1 Lot = 100 lembar)
    *   Pajak transaksi & komisi broker sekuritas
    *   Faktor *slippage* harga dan akumulasi dividen neto
*   **🛡️ Protokol Rotasi Aset Determnistik**: Modul pelindung modal otomatis. Jika indikator teknikal mendeteksi tren pelemahan IHSG berada di bawah batas matematis yang berbahaya, sistem akan mengkalkulasi rotasi aset portofolio ke **Emas Fisik** (menggunakan data harga per gram riil) atau **Kas Rupiah**.
*   **💼 Ledger Portofolio Visual**: Tracker matematis untuk visualisasi alokasi bobot kelas aset, pelacakan *Floating P&L* waktu-nyata, ringkasan pembayaran dividen, serta log lengkap aktivitas perdagangan.
*   **🤖 AI Briefing & Insight Generator**: Modul **Gemini 2.5 Flash** server-side yang bertugas membaca *output* angka mentah hasil kalkulasi engine kuantitatif, kemudian menyusun laporan ringkas berupa analisis SWOT, perbandingan valuasi sektor, dan rangkuman naratif kinerja portofolio.

---

## 📈 Alur Pemrosesan Data


```

[Sumber Data Riil] ➔ [Deterministic Engine] ➔ [Output Angka & Grafik] ➔ [Gemini 2.5 Flash] ➔ [Naratif Ringkasan]
(Yahoo Fin / IDX)       (Screening & Backtest)     (Akurat 100% Tanpa AI)   (Hanya untuk Summary)    (User Interface)

```

---

## 🛠️ Instalasi & Setup Lokal

### 📋 Prasyarat
*   [Node.js](https://nodejs.org/) (Versi 18 atau lebih baru)
*   NPM (otomatis terpasang bersama Node.js)

### 💻 Langkah Instalasi

1.  **Unduh dependensi proyek**:
```bash
    npm install
    ```

2.  **Konfigurasi Variabel Lingkungan**:
    Salin templat file `.env.example` ke `.env`:
```bash
    cp .env.example .env
    ```
    Buka file `.env` baru Anda, kemudian konfigurasi kunci API Anda:
```env
    GEMINI_API_KEY="kunci_api_gemini_anda"
    
    # Opsional (API Cadangan / live pricing):
    GROQ_API_KEY="kunci_groq_jika_ada"
    OPENROUTER_API_KEY="kunci_openrouter_jika_ada"
    GOAPI_API_KEY="kunci_goapi_jika_ada"
    ```

3.  **Sinkronisasi Awal Data Pasar (Wajib untuk Akurasi Backtest)**:
    Jalankan script ini untuk menarik data historis riil dari Yahoo Finance dan laporan keuangan ke dalam database lokal:
```bash
    npx tsx fetch_historical_data.ts
    ```

4.  **Jalankan Server & Terminal**:
```bash
    npm run dev
    ```
    Buka peramban Anda di alamat [http://localhost:3000](http://localhost:3000).

---

## 📐 Konfigurasi Bobot Multi-Factor Scoring

Bobot konfigurasi pemeringkat saham dapat diatur secara dinamis melalui antarmuka terminal. Angka bobot ini akan langsung dikalikan dengan matriks finansial riil emiten:

> [!NOTE]
> *   **Strategi Fundamental (Config F / "Prod")**: `Quality: 25%` | `Growth: 10%` | `Value: 30%` | `Momentum: 35%`.
> *   **Strategi Teknis / Momentum (Config B / "Res")**: `Quality: 25%` | `Growth: 30%` | `Value: 10%` | `Momentum: 35%`.

---

## 📁 Struktur Folder Proyek

```bash
├── 📂 data                  # Database offline (.json/.db) data pasar historis & laporan keuangan riil
├── 📂 src                   # Logika antarmuka Frontend React
│   ├── 📂 components        # Komponen modular UI (Tab, Grafik Recharts, AI Summary Panel)
│   ├── 📂 data              # Data statis & salinan bundel data historis offline
│   ├── 📜 App.tsx           # Entry utama komponen frontend & sync state
│   ├── 📜 main.tsx          # React main mounter
│   └── 📜 index.css         # Desain sistem & kustomisasi gaya visual (Tailwind)
├── 📜 server.ts             # REST API server Express.js & gerbang AI Gemini (Parser data to summary)
├── 📜 sync_engine.ts        # Script kalkulasi latar belakang (cron) untuk update matriks fundamental
├── 📜 fetch_historical_data.ts # Script penarik data historis riil (Yahoo Finance API scraper)
├── 📜 tsconfig.json         # Konfigurasi compiler TypeScript
└── 📜 vite.config.ts        # Konfigurasi bundler Vite dev server

```

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah **MIT License**. Silakan gunakan, modifikasi, dan kembangkan kode ini secara bebas untuk kebutuhan analisis finansial berbasis data riil Anda.

```

```
