# DECISIONS

## 2026-06-21 — Yahoo Finance API Server
**Keputusan:** Membuat Express server (`server.ts`) sebagai proxy API Yahoo Finance terpisah dari Vite dev server.
**Alasan:** Library `yahoo-finance2` membutuhkan Node.js runtime dan tidak bisa jalan di browser. Server terpisah menghindari CORS dan SSR complexity.
**Konsekuensi:** Perlu menjalankan 2 server (`npm run dev` + `npm run serve-api`) untuk development lokal.

## 2026-06-23 — Backtest-Data API + Gold Price Fix
**Keputusan:** Menambahkan handler `/api/backtest-data` di Express server (`server.ts`) yang membaca data dari `data/years/*.json` langsung, plus Vite proxy untuk forwarding. Memperbaiki `generateClientBacktestData()` gold starting price (300K→75K) dan drift multiplier (0.007→0.054) biar realistik. Update `MKT.gold.value` stale (1.35Jt→2.47Jt) sesuai data historis.
**Alasan:** Sebelumnya backtest di local dev mode pake data PRNG palsu dengan gold starting 300K-500K vs harusnya 75K, menyebabkan IHSG sering > gold di chart. Juga MKT.gold.value di sidebar/portfolio 45% di bawah harga sebenarnya.
**Konsekuensi:** User perlu run `npm run serve-api` atau `npm run dev:full` untuk API data. Tanpa server, fallback PRNG sekarang lebih realistis.

## 2026-06-21 — Deterministic Engine (No AI for Math)
**Keputusan:** Semua kalkulasi keuangan dieksekusi secara deterministik. AI hanya digunakan di presentation layer untuk narrative summarization.
**Alasan:** Mencegah AI hallucination pada angka finansial yang bisa menyebabkan keputusan investasi salah.
**Konsekuensi:** Arsitektur lebih kompleks (engine terpisah dari AI layer), tapi hasil 100% akurat dan reproducible.

## 2026-06-21 — Data Status Transparency
**Keputusan:** Implementasi enum `DataStatus` (LIVE/CACHED/STALE/ESTIMATED) untuk setiap data point.
**Alasan:** Memberi user visibilitas penuh terhadap provenance data, terutama karena data gratis Yahoo Finance terbatas.
**Konsekuensi:** Overhead UI untuk menampilkan badge status, tapi trustworthiness meningkat.

## 2026-06-22 — AI Context Persistence + DOX
**Keputusan:** Mengadopsi AI Context Persistence System + DOX Framework untuk manajemen konteks AI.
**Alasan:** Project besar (100+ file, banyak keputusan arsitektur) membutuhkan context persistence agar AI baru tidak kehilangan konteks antar sesi.
**Konsekuensi:** Maintenance `docs/` dan `handover/` menjadi tanggung jawab rutin.

## 2026-06-22 — UI Overhaul: True Black + Cyan Accent + Floating AI Chat
**Keputusan:** Background true black (#000), accent emerald→cyan (#06b6d4), AI chat dari right-rail static → floating bottom-right widget.
**Alasan:** Tampilan lebih modern financial-terminal (Bloomberg/TradingView). Floating AI chat hemat screen real estate.
**Konsekuensi:** Semua komponen perlu di-restyle. CSS overrides emerald→cyan dipasang di index.css agar komponen dengan Tailwind emerald class tetap render cyan.

## 2026-06-23 — Remove Duplicate AI from MarketTab
**Keputusan:** Hapus AIAssistant ("AI Co-Pilot — Analisis Saham") dari MarketTab. Hanya "Analisa AI Harian" yang dipertahankan.
**Alasan:** FloatingAIChat sudah handle semua AI chat secara global. Dua AI widget di halaman yang sama redundant dan membingungkan.
**Konsekuensi:** AIAssistant masih tersedia di DiagnosticsTab untuk debugging.

## 2026-06-23 — Remove DataSourcesRow Badges
**Keputusan:** Hapus DataSourcesRow (price/fundamentals/charts/description status badges) dari StockDrawer dan DataBadge dari watchlist MarketTab.
**Alasan:** Badge tidak memberikan nilai informatif yang berarti bagi user. Menambah clutter visual.
**Konsekuensi:** File SourceBadge.tsx menjadi unused (orphan). DataBadge.tsx masih digunakan di PortfolioTracker dan DecisionAuditTrail.

## 2026-06-23 — Data Audit: RAW_STOCKS_DATA Stale + Sector Mismatch
**Keputusan:** Prioritaskan fix data integrity sebelum fitur baru. Temuan audit:
- 31 stock prices di `raw_stocks_data.ts` deviasi 30-147% dari data aktual `idx80_scan.json`
- 20/31 stocks punya sector mismatch antara RAW_STOCKS_DATA dan PF records di `marketData.ts`
- `MKT.ihsg.value` (5886) != data terbaru (6008)
- `MKT.usdidr.value` (17985) != record manapun di JSON (terakhir 17714)
- 2026 fundamentals kosong di `idx_fundamentals_all.json`
**Alasan:** Sidebar prices, portfolio, ranking, scoring semuanya pakai data basi. Sektor inkonsisten bikin filter/filtering rusak.

## 2026-06-24 — IDX API Menjadi Sumber Fundamental Utama
**Keputusan:** IDX API `/primary/DigitalStatistic/GetApiDataPaginated` menjadi primary source fundamental QuantBit, menggantikan Yahoo Fundamental, FMP, Sectors.app, dan Hash Fallback Fundamental.
**Alasan:**
- 60-month audit (2021-01 s.d. 2025-12) lulus 100% — 60/60 months available, schema konsisten, 0 error
- 947 companies, 32 fields — lebih lengkap dari semua sumber sebelumnya
- Sumber resmi IDX — data primer, bukan scraping pihak ketiga
- Cloudscraper bypass Cloudflare tanpa API key
**Konsekuensi:**
- Yahoo Fundamental, FMP, Sectors.app, Hash Fallback — DIHENTIKAN
- RTI/Stockbit — ditahan sebagai backfill 2015-2020 saja
- Arsitektur baru: IDX API → warehouse_fundamental_idx.parquet → Factor Engine
- Perlu build `collectors/fetch_idx_fundamental.py` untuk pull bulanan

## 2026-06-25 — Unified Crisis Signal (Hormati enableCrashProtection)
**Keputusan:** Semua komponen sekarang menggunakan `isCrisisMode()` dari `marketRegimeEngine.ts` sebagai satu-satunya sumber kebenaran untuk sinyal krisis, bukan hardcoded `MKT.ihsg.monthly < -10`.
**Alasan:** Saat user mematikan "Proteksi Crash" di settings, 5 dari 6 komponen masih menyalakan sinyal krisis (AlertBanner, Sidebar, MarketTab, SimulationTab, marketRegimeEngine) karena pakai threshold hardcoded yang mengabaikan `enableCrashProtection`. Hanya PortfolioTracker yang sudah benar.
**Konsekuensi:**
- Ditambahkan `setCrashProtectionEnabled(bool)` dan `isCrisisMode()` di `marketRegimeEngine.ts`
- `PortfolioTracker.tsx` memanggil `setCrashProtectionEnabled(engineConfig.enableCrashProtection)` di useEffect
- `computeMarketRegime()` sekarang cek `_crashProtectionEnabled` sebelum masuk mode GOLD/CASH DEFENSE
- 4 komponen (App, AppSidebar, MarketTab, SimulationTab) diubah dari `MKT.ihsg.monthly < -10` → `isCrisisMode()`
- `isCrisisMode()` menggunakan 60-day drawdown (bukan monthly return) agar konsisten dengan `evaluateStrategy()` di engine
