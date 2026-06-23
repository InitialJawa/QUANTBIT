# KNOWN ISSUES

## 1. Yahoo Finance Data Accuracy (Pre-2022)
**Status:** OPEN
**Root Cause:** Yahoo Finance API publik memiliki keterbatasan data historis. Data sebelum 2022 banyak yang corrupt atau bolong.
**Workaround:** Rekomendasi API premium (GoAPI, Bloomberg) untuk backtest jangka panjang. Engine siap diadaptasi.

## 2. Vite Chunk Size Warning
**Status:** INVESTIGATING
**Root Cause:** Bundle >500KB karena dependensi recharts, motion, lucide-react.
**Workaround:** Sudah ada manual chunk splitting di `vite.config.ts`. Optimasi lanjutan bisa dengan lazy loading komponen.

## 3. CSS Legacy Selectors
**Status:** FIXED (2026-06-21)
**Root Cause:** Selector `.bg-[#0A0A0A]` dan `.bg-[#0a0a0a]` duplikat yang menyebabkan warning Vite.
**Fix:** Dihapus. Semua styling glass-morphism menggunakan Tailwind arbitrary class.

## 4. Persistent AICockpit Provider Error
**Status:** FIXED (2026-06-23)
**Root Cause:** `<StockDrawer />` rendered outside `<AICockpitProvider>` in `src/App.tsx`, but its `<ExplainButton>` calls `useAICockpit()`.
**Fix:** Moved `<StockDrawer />` inside `<AICockpitProvider>` — right before `</AICockpitProvider>` closure.

## 5. RAW_STOCKS_DATA Prices Stale (30-147% deviasi)
**Status:** FIXED (2026-06-23)
**Root Cause:** 31 stock prices di `src/data/raw_stocks_data.ts` tidak pernah diupdate sejak ~mid-2025. Data aktual di `idx80_scan.json` (currentPrice) sudah berbeda jauh.
**Fix:** Sync 30/31 stock prices from `idx80_scan.json` scan data. HEAL not in scan — kept as-is.

## 6. Sector Mismatch RAW vs PF (20/31 stocks)
**Status:** RESOLVED (2026-06-23)
**Root Cause:** RAW_STOCKS_DATA pakai Yahoo Finance sectors, PF pakai IDX-style sectors. Beda klasifikasi.
**Fix:** RAW_STOCKS_DATA sektor disync ke scan data (Yahoo Finance GICS). PF tetap IDX classification — beda konteks (PF tidak di-import komponen lain).

## 7. MKT Object Values Stale
**Status:** FIXED (2026-06-23)
**Details:**
- MKT.ihsg.value 5886.03→6008
- MKT.usdidr.value 17985→17714
**Fix:** Update hardcoded values di `src/marketData.ts`.

## 8. 2026 Fundamentals Empty
**Status:** MEDIUM
**Details:** `data/idx_fundamentals_all.json` punya 0 record untuk tahun 2026. 2021-2025 sudah lengkap (769-958 record/tahun).
**Fix:** Run IDX scraper script (`scripts/scrape_idx_fundamentals.py`).

## 9. live_market.json Stale (12 hari)
**Status:** OPEN
**Details:** `data/live_market.json` last update 2026-06-11. IHSG 5886 vs actual di backtest ~6101. Gold tersimpan di USD/oz (4347) tidak konsisten dengan MKT IDR/gram. Hanya 9 stock prices.
**Fix:** Refresh dari idx80_scan.json. Standardisasi format gold (IDR/gram konsisten).

## 10. IHSG Jan 2026 Spike Suspect
**Status:** INVESTIGATING
**Details:** Data backtest menunjukkan IHSG 8748 pada 2026-01-02. Ini lonjakan signifikan dari level akhir 2025. IHSG turun ke 5342 (Jun) lalu recovery ke 6101. Perlu verifikasi raw Yahoo data.
**Fix:** Cek raw Yahoo `^JKSE` response untuk Jan 2026 vs validasi dengan sumber alternatif.

## 11. 9/87 Tickers with Real Fundamentals
**Status:** OPEN
**Details:** Hanya 9 ticker (BBCA, BBRI, BMRI, TLKM, ASII, ADRO, PTBA, ESSA, GOTO) punya hardcoded fundamental snapshots. 78 ticker lainnya pakai deterministic hash fallback.
**Fix:** Tambah hardcoded snapshots dari real data atau integrasi API fundamental (EODHD/Sectors.app).

## 12. Gold/USDIDR Historical Fallback — Yearly Averages
**Status:** OPEN
**Details:** Script `fetch_historical_data.ts` pakai `HISTORICAL_GOLD_USD` dan `HISTORICAL_USDIDR` hardcoded yearly averages sebagai fallback saat Yahoo gagal. Bukan daily real data.
**Fix:** Run patch_gold_data.py untuk isi gap dengan historical averages yang lebih granular.
