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
**Status:** CRITICAL — FIX IN PROGRESS
**Root Cause:** 31 stock prices di `src/data/raw_stocks_data.ts` tidak pernah diupdate sejak ~mid-2025. Data aktual di `idx80_scan.json` (currentPrice) dan `data/years/2026.json` sudah berbeda jauh.
**Impact:** Sidebar stock prices, portfolio value, ranking, scoring — semuanya pake data basi.
**Workaround:** idx80_scan.json sudah punya currentPrice akurat untuk 95 stocks. Fix: mapping 31 RAW stocks ke scan data.

## 6. Sector Mismatch RAW vs PF (20/31 stocks)
**Status:** CRITICAL — FIX IN PROGRESS
**Root Cause:** RAW_STOCKS_DATA pakai sektor berbeda dari PF (marketData.ts company profiles).
**Impact:** Stock bisa muncul dengan sektor berbeda tergantung code path mana yang resolve data-nya.
**Fix:** Sync RAW_STOCKS_DATA sector strings dengan PF records.

## 7. MKT Object Values Stale
**Status:** HIGH — FIX IN PROGRESS
**Details:**
- MKT.ihsg.value = 5886.03 (data terbaru 2026-06-15: 6008)
- MKT.usdidr.value = 17985 (data terbaru: 17714 — tidak cocok dengan record manapun)
- MKT.last_update = "2026-06-11" tapi gold value 2,466,698 berasal dari record 2026-06-15
**Fix:** Update hardcoded values di `src/marketData.ts` lines 111-118.

## 8. 2026 Fundamentals Empty
**Status:** MEDIUM
**Details:** `data/idx_fundamentals_all.json` punya 0 record untuk tahun 2026. 2021-2025 sudah lengkap (769-958 record/tahun).
**Fix:** Run IDX scraper script (`scripts/scrape_idx_fundamentals.py`).
