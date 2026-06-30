# Agent Update – 2026‑06‑23

## Perubahan Terbaru

| No | Perubahan | Detail |
|----|-----------|--------|
| **1** | **Fix AICockpitProvider Error** | Moved `<StockDrawer />` inside `<AICockpitProvider>` di `src/App.tsx`. Memperbaiki error "useAICockpit must be used within AICockpitProvider" saat klik ticker. |
| **2** | **Floating Wallet (pisah dari sidebar)** | • Dibuat `src/components/FloatingWallet.tsx` — tombol floating `bottom-24 right-6` di atas AI Chat, slide-in panel dari kanan. <br>• `DigitalWalletUI` dipindah dari `AppSidebar` ke modal floating. <br>• Sidebar jadi lebih bersih, wallet bisa diakses dari tab mana pun. |
| **3** | **Market Tab Charts** | • Dibuat `src/components/MarketOverviewCharts.tsx` — chart IHSG+Gold indexed to 100 + SMA20/SMA50 overlay + regime coloring + panel indikator. <br>• MarketTab: tambah sub-tab "Charts", hapus "All Stocks". <br>• Data dari `/api/backtest-data`, timeframe selector 1M/6M/1Y/5Y/MAX. |
| **4** | **Sidebar Market Enhancements** | • Berita expanded (no max-height). <br>• Top Movers section (2-col gainers/losers + RSI coloring + histogram bars). <br>• Technical Stats section (RSI, MACD, SMA20/50, breadth, score gap). <br>• Helper functions: `computeRSI`, `computeMACD`, `getIhsgData` di `marketRegimeEngine.ts`. |
| **5** | **Fix Backtest Data Palsu + Gold** | • `server.ts`: tambah handler `/api/backtest-data` baca dari `data/years/*.json` (real data, no PRNG). <br>• `vite.config.ts`: proxy `/api/backtest-data` & `/api/yahoo` → localhost:3001. <br>• `npm run dev:full` — jalanin API server + Vite bersamaan. <br>• `generateClientBacktestData()`: gold mulai 75K (dari 300K), drift 0.054 (dari 0.007). <br>• `MKT.gold.value`: 1.350.000 → 2.466.698 (latest). |

## 🚀 Cara Menjalankan Proyek

1. **Instal dependensi**
   ```bash
   npm install
   ```
2. **Jalankan API Yahoo (backend)**
   ```bash
   npm run serve-api   # menjalankan Express pada http://localhost:3001
   ```
3. **Jalankan UI (frontend)**
   ```bash
   npm run dev        # Vite dev server pada http://localhost:5173
   ```
   - Atau gunakan `concurrently` untuk menjalankan keduanya sekaligus.
4. **Build production**
   ```bash
   npm run build
   ```

## 📄 Dokumen Tambahan
- **`src/server/yahooApi.ts`** – Handler API yang mengembalikan data Yahoo Finance atau `404` bila tidak tersedia.
- **`src/data/yahoo/fetchYahooData.ts`** – Modul yang berinteraksi dengan `yahoo-finance2` (eksekusi di server, bukan di browser).
- **`src/index.css`** – CSS utama; selector legacy dihapus, kini semua styling glass‑morphism menggunakan Tailwind arbitrary class `bg-[#0A0A0A]`.

---

*Catatan:* Untuk menampilkan data harga live di UI, tambahkan pemanggilan ke endpoint `/api/yahoo?ticker=XYZ.JK` pada komponen yang menampilkan detail saham.
