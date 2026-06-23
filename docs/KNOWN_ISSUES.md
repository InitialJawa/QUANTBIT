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
**Status:** CLOSED (no data from IDX)
**Details:** `data/idx_fundamentals_all.json` punya 0 record untuk tahun 2026. Sudah di-scrape ulang — IDX belum publish data fundamental 2026.
**Fix:** Periodic re-run via daily pipeline; IDX biasanya rilis data fundamental tahun berjalan di H2.

## 9. live_market.json Gold Unit Mismatch
**Status:** FIXED (2026-06-23)
**Details:** Gold di `live_market.json` 2376240 (IDR/gram dari stale cache) tidak konsisten. `post_process_live_market.py` gak dapet GC=F (tidak di scan IDX) → fallback stale.
**Fix:** `post_process_live_market.py` sekarang fetch GC=F langsung dari Yahoo API + konversi USD/oz→IDR/gram. MKT gold sync. Semua layer konsisten IDR/gram.

## 10. IHSG Jan 2026 Spike Suspect
**Status:** VERIFIED (no issue)
**Details:** Data backtest menunjukkan IHSG 8748 pada 2026-01-02. Sudah dicek raw Yahoo `^JKSE` — data valid. IHSG beneran rally ke 9134 (Jan 20) lalu crash ke 8232 (Jan 29). Bukan error data.
**Fix:** Tidak perlu fix — data real.

## 11. 9/87 Tickers with Real Fundamentals
**Status:** PARTIALLY RESOLVED (2026-06-23)
**Details:** Expanded dari 9 ke 18 ticker dengan hardcoded fundamental snapshots (2018-2025). Tick baru: BBNI, INDF, INTP, ICBP, KLBF, UNTR, AKRA, PGAS, SMGR. 69 ticker lainnya masih pakai deterministic hash fallback.
**Fix:** Tambahan hardcoded snapshots dari public financial reports. Sisa 69 ticker bisa diupgrade via API fundamental (EODHD/Sectors.app).

## 12. Gold/USDIDR Historical Fallback — Yearly Averages
**Status:** OPEN
**Details:** Script `fetch_historical_data.ts` pakai `HISTORICAL_GOLD_USD` dan `HISTORICAL_USDIDR` hardcoded yearly averages sebagai fallback saat Yahoo gagal. Bukan daily real data.
**Fix:** Run patch_gold_data.py untuk isi gap dengan historical averages yang lebih granular.

## 13. force-sync Random Scores (FIXED)

## 14. Carry-Forward Labeling (FIXED)

## 15. Daily Data Pipeline Belum Pernah Jalan
**Status:** FIXED (2026-06-23)
**Details:** Workflow `daily-data-pipeline.yml` ditambah di commit 00538d8 tapi belum pernah triggered. Penyebab: secrets CF tidak diset, step `fetch_historical_data.ts` bakal fail (rate limit Yahoo), dan `scrape_idx_fundamentals.py` terlalu berat buat daily CI.
**Fix:** 
- Hapus `fetch_historical_data.ts` dari daily pipeline (jadi manual-trigger-only via `workflow_dispatch`)
- Hapus `scrape_idx_fundamentals.py` dari daily pipeline (manual-trigger-only)
- Ganti strategi deploy: commit & push ke main → CF Pages auto-build dari git (no CF secrets needed)
- `post_process_live_market.py` tetep jalan tiap hari buat update gold price
- `[skip ci]` di commit message biar gak infinite loop
**Status:** DONE (2026-06-23)
**Details:** Data hasil bridge (weekend/libur) sebelumnya tidak ditandai → terlihat seperti data live.
**Fix:** Backend sekarang set `isCarriedForward: true` di response. `DataStatus.CARRIED_FORWARD` enum added di frontend. Data di `setIhsgHistory`/`getIhsgData` pass through flag.
**Status:** FIXED (2026-06-23)
**Details:** `runIdx80Scan()` di CF function pake `Math.random() * 40 + 60` untuk quality/value/growth/momentum. Produksi ranking saham acak.
**Fix:** Diganti compute deterministik dari chart data Yahoo 6 bulan. Momentum dari MA cross, quality dari stabilitas harga, value dari percentile posisi harga, growth dari total return 6mo. Untuk fundamental akurat, perlu `quoteSummary` endpoint (saat ini pake `chart` API).
