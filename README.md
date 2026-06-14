<div align="center">

# 💎 QUANTBIT: Quantitative stock trading & portfolio terminal

[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.x-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Gemini](https://img.shields.io/badge/Gemini_AI-2.5_Flash-F4B400?style=for-the-badge&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)

<p align="center">
  <b>Terminal finansial kuantitatif cerdas perhitungan backtest untuk simulasi portofolio, analisis faktor investasi, dan mitigasi krisis di Bursa Efek Indonesia (BEI / IDX).</b>
</p>

---
</div>

## 🌟 Fitur Utama

QUANTBIT menggabungkan keunggulan data historis presisi dengan kekuatan intelegensi buatan untuk memberikan pengalaman riset pasar level institusi:

*   **📊 Screener Multi-Faktor Kuantitatif**: Pemindai kinerja emiten IDX80 & IDX30 menggunakan kombinasi faktor *Quality* (ROE & DER), *Growth* (Akselerasi Profit), *Value* (Inverted PBV & PER), dan *Momentum* (Trend 60 hari vs MA).
*   **⏳ Algorithmic Backtester (Bebas Bias)**: Pengujian performa historis (sejak 2016) menggunakan data riil Yahoo Finance. Simulasi memperhitungkan ketentuan 1 Lot (100 lembar), pajak transaksi, komisi sekuritas, *slippage*, dan dividen neto.
*   **🛡️ Crash Protection & Safe-Haven Rotation**: Protokol otomatis pelestarian modal. Sistem akan mengevakuasi aset portofolio ke **Emas Fisik** (menggunakan harga gram riil) atau **Kas Rupiah** jika detektor mendeteksi tren pelemahan IHSG yang membahayakan.
*   **🤖 AI Deep Equity Analyst**: Modul **Gemini 2.5 Flash** server-side yang menyusun laporan analisis fundamental mendalam, perbandingan valuasi sektor BEI, analisis SWOT, estimasi *Fair Value* saham, hingga asisten obrolan interaktif kontekstual.
*   **💼 Ledger Portofolio Visual**: Visualisasi alokasi bobot kelas aset, pelacakan *Floating P&L* waktu-nyata, ringkasan pembayaran dividen, serta log lengkap aktivitas perdagangan.

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

3.  **Sinkronisasi Awal Data Pasar** *(Opsional - database offline bawaan sudah tersedia)*:
    ```bash
    npx tsx fetch_historical_data.ts
    ```

4.  **Jalankan Server**:
    ```bash
    npm run dev
    ```
    Buka peramban Anda di alamat [http://localhost:3000](http://localhost:3000).

---

## 📈 Model Penilaian (Multi-Factor Scoring)

Bobot konfigurasi pemeringkat saham dapat diatur secara dinamis melalui antarmuka terminal:

> [!NOTE]
> *   **Strategi Fundamental (Config F / "Prod")**: `Quality: 25%` | `Growth: 10%` | `Value: 30%` | `Momentum: 35%`.
> *   **Strategi Teknis / Momentum (Config B / "Res")**: `Quality: 25%` | `Growth: 30%` | `Value: 10%` | `Momentum: 35%`.

---

## 📁 Struktur Folder Proyek

```bash
├── 📂 data                  # Penyimpanan data pasar historis offline & state mesin
├── 📂 src                   # Logika antarmuka Frontend React
│   ├── 📂 components        # Komponen modular UI (Tab, AI Chat, Grafik Recharts)
│   ├── 📂 data              # Data statis & salinan bundel data historis offline
│   ├── 📜 App.tsx           # Entry utama komponen frontend & sync state
│   ├── 📜 main.tsx          # React main mounter
│   └── 📜 index.css         # Desain sistem & kustomisasi gaya visual
├── 📜 server.ts             # REST API server Express.js & gerbang AI Gemini
├── 📜 sync_engine.ts        # Pekerjaan latar belakang (cron) pemindai fundamental
├── 📜 fetch_historical_data.ts # Script penarik data historis Yahoo Finance
├── 📜 tsconfig.json         # Konfigurasi compiler TypeScript
└── 📜 vite.config.ts        # Konfigurasi bundler Vite dev server
```

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah **MIT License**. Silakan gunakan, modifikasi, dan kembangkan kode ini secara bebas untuk kebutuhan analisis finansial Anda.
