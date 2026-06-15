<div align="center">

# 💎 QUANTBIT: Quantitative Stock Trading & Portfolio Terminal

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

QUANTBIT mengintegrasikan data sekunder dari sumber-sumber berikut melalui `fetch_historical_data.ts` dan API Gateway:

| Kategori Data | Sumber Data | Mekanisme Integrasi | Deskripsi Penggunaan |
| :--- | :--- | :--- | :--- |
| **Harga Saham Historis** | **Yahoo Finance API** | Scraper / REST Client | Mengambil data *Daily Close Price*, volume transaksi, dan penyesuaian korporasi (*Adjusted Close*). |
| **Laporan Keuangan** | **IDX (Bursa Efek Indonesia)** & **GoAPI** | REST API / Offline DB Sync | Data historis neraca (Balance Sheet) dan laba rugi untuk menghitung rasio makro fundamental (ROE, DER, PER, PBV). |
| **Aset Safe-Haven** | **Harga Emas Batangan Riil** | API / Web Scraping | Mengambil data harga emas per gram *live/daily* sebagai basis perhitungan alokasi aset saat protokol *Crash Protection* aktif. |
| **Indeks Pasar** | **IHSG (JKSE)** | Yahoo Finance API | Digunakan sebagai *benchmark* utama dan indikator penentu tren makro untuk rotasi portofolio ke Kas/Emas. |

> [!WARNING]
> **Keterbatasan Data Gratisan (Disclaimer Penting):**
> Data historis gratis dari Yahoo Finance **hanya akurat dan lengkap sejak tahun 2022 ke atas**. Data sebelum tahun 2022 banyak yang *corrupt*, bolong-bolong, atau tidak terdeteksi oleh sistem karena limitasi API publik. 
> 
> **Kalau Anda butuh backtest jangka panjang dengan data riil yang 100% presisi dari tahun 2016 atau sebelumnya, modal dikit dan beli API premium sendiri (GoAPI, Bloomberg, atau sejenisnya).** Jangan pelit untuk akurasi data modal sendiri. Kode di terminal ini siap disesuaikan kalau Anda punya kredensial API berbayar.

---

## 🌟 Fitur Utama

*   **📊 Engine Multi-Faktor Kuantitatif (Matematika Riil)**: Pemindai performa emiten IDX80 & IDX30 yang menghitung skor berdasarkan data laporan keuangan riil:
    *   *Quality* (Kalkulasi formula ROE & DER)
    *   *Growth* (Persentase Akselerasi Profit)
    *   *Value* (Inverted PBV & PER)
    *   *Momentum* (Kalkulasi matematis tren harga 60 hari vs MA)
*   **⏳ Algorithmic Backtester Berbasis Data Historis**: Simulasi performa menggunakan data *close price* riil dari Yahoo Finance (Optimal semenjak 2022). Perhitungan presisi memperhitungkan:
    *   Ketentuan fraksi lot BEI (1 Lot = 100 lembar)
    *   Pajak transaksi & komisi broker sekuritas
    *   Faktor *slippage* harga dan akumulasi dividen neto
*   **🛡️ Protokol Rotasi Aset Deterministik**: Modul pelindung modal otomatis. Jika indikator teknikal mendeteksi tren pelemahan IHSG berada di bawah batas matematis yang berbahaya, sistem akan mengkalkulasi rotasi aset portofolio ke **Emas Fisik** (menggunakan data harga per gram riil) atau **Kas Rupiah**.
*   **💼 Ledger Portofolio Visual**: Tracker matematis untuk visualisasi alokasi bobot kelas aset, pelacakan *Floating P&L* waktu-nyata, ringkasan pembayaran dividen, serta log lengkap aktivitas perdagangan.
*   **🤖 AI Briefing & Insight Generator**: Modul **Gemini 2.5 Flash** server-side yang bertugas membaca *output* angka mentah hasil kalkulasi engine kuantitatif, kemudian menyusun laporan ringkas berupa analisis SWOT, perbandingan valuasi sektor, dan rangkuman naratif kinerja portofolio.

---

## 📈 Alur Pemrosesan Data
