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
**Status:** OPEN
**Description:** Clicking on ticker or using ExplainButton still throws "useAICockpit must be used within AICockpitProvider" despite StockDrawer and FloatingAIChat being wrapped.
**Root Cause:** Some components (e.g., StockDrawer rendered outside provider) remain outside the AICockpitProvider hierarchy.
**Workaround:** Ensure all UI components that import `useAICockpit` are children of `<AICockpitProvider>`. Verify placement in `src/App.tsx` and move any stray `<StockDrawer />` etc. inside the provider.
