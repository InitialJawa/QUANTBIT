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
