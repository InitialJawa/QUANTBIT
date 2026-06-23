# MASTER CHRONICLE

## V1.0.0 — Initial Release
- React 19 + Vite 6 + Tailwind 4 scaffold
- Multi-factor quantitative engine (Quality, Growth, Value, Momentum)
- Market regime engine with 5 regimes
- Yahoo Finance data fetching + Express proxy
- Backtesting engine with IDX rules
- Portfolio tracker with P&L
- Asset rotation protocol (Cash/Gold)
- Gemini AI integration
- Cloudflare Pages + D1 deployment

## 2026-06-21 — Yahoo Finance API Server
**Masalah:** Library `yahoo-finance2` tidak bisa jalan di browser.
**Root Cause:** Membutuhkan Node.js runtime.
**Fix:** Dibuat Express server terpisah (`server.ts`) sebagai proxy API.

## 2026-06-21 — CSS Cleanup
**Masalah:** Selector duplikat menyebabkan warning Vite.
**Root Cause:** Selector `.bg-[#0A0A0A]` dan `.bg-[#0a0a0a]` redundan.
**Fix:** Dihapus, digantikan Tailwind arbitrary class.

## 2026-06-22 — AI Context Persistence + DOX Setup
**Masalah:** Project besar tanpa context persistence menyebabkan AI kehilangan konteks antar sesi.
**Fix:** Diimplementasikan DOX Framework + Context Persistence System (docs/, handover/, child AGENTS.md).

## 2026-06-22 — UI Overhaul (True Black + Cyan + Floating AI)
**Masalah:** UI masih emerald accent, tidak true black, AI chat di right-rail statis.
**Fix:** Overhaul total — true black (#000) + cyan accent (#06b6d4), floating AI chat widget di kanan bawah (Intercom-style), refined typography, semua komponen direstyling. Build sukses.

## 2026-06-23 — Market Cleanup: Remove Duplicate AI + DataSourcesBadges
**Masalah:** MarketTab punya 2 AI widget (Analisa Harian + AI Co-Pilot). StockDrawer menampilkan badge status data yang tidak berguna.
**Fix:** 
- Hapus AI Co-Pilot (AIAssistant) dari MarketTab — hanya Analisa AI Harian yang tersisa
- Hapus DataSourcesRow (price/fundamentals/charts/description badges) dari StockDrawer
- Hapus DataBadge dari watchlist MarketTab
- Redesign DeepReport (AI Intel): uniform bg #050505, cyan accent, simplified SWOT
- Sidebar widened w-56→w-72, font sizes bumped
- Wallet: added Coins/CreditCard icons, text-display balance, fixed rgba bug

## 2026-06-23 — Data Integrity Fix (P0)
**Masalah:** RAW_STOCKS_DATA 31 prices stale (30-147% deviasi), 20 sector mismatches, MKT values basi.
**Fix:**
- Synced 30/31 stock prices from `idx80_scan.json` scan data (HEAL not in scan — kept as-is)
- RAW_STOCKS_DATA sectors sync ke scan (Yahoo GICS classification)
- MKT.ihsg 5886→6008, MKT.usdidr 17985→17714

## 2026-06-23 — Full Data Pipeline Validation
**Masalah:** Belum ada audit komprehensif validasi data harian dan backtest.
**Temuan:**
- ✅ Backtest 2000-2026: 27 tahun data lengkap, carry-forward rendah (6%)
- ✅ idx80_scan.json: fresh 2026-06-23, 87 stocks real data
- ⚠️ live_market.json: stale 12 hari, gold unit mismatch
- ⚠️ IHSG Jan 2026 spike 8748 — perlu verifikasi
- ⚠️ 2026 fundamentals: 0 records
- ⚠️ 78/87 ticker pakai hash fallback untuk fundamental
**Docs updated:** CURRENT_STATE, ACTIVE_TASK, NEXT_ACTION, KNOWN_ISSUES

## 2026-06-23 — IDX Scraper + force-sync Fix + Local Dev Mock
**Masalah:**
- IDX scraper timeout 60s bikin stuck di "Scraping..."
- MKT hardcoded IHSG 6008 padahal live 6101
- Local dev (`npm run dev`) gak bisa update MKT karena `/api/yahoo/live-prices` gak di-proxy → silent error
- `runIdx80Scan()` di CF function pake `Math.random()` — ranking saham acak di production

**Fix:**
1. IDX scraper: timeout dipisah (connect 10s, read 30s), retry 3→2
2. MKT hardcoded: sync ke `live_market.json` (IHSG 6101, USDIDR 17840, gold 2376240)
3. devMock: tambah handler `/api/yahoo/live-prices`, `/api/fundamentals`, `/api/engine/idx80`
4. `runIdx80Scan()`: ganti `Math.random()` dengan compute deterministik dari chart data 6 bulan:
   - `computeMomentum()` — MA cross (recent 5wk vs older)
   - `computeQualityFromStats()` — stabilitas harga vs median
   - `computeValue()` — percentile posisi di rentang 6mo
   - `computeGrowth()` — total return 6mo
5. Range chart: `1mo&interval=1d` → `6mo&interval=1wk` untuk data lebih akurat

**Docs updated:** CURRENT_STATE, ACTIVE_TASK, NEXT_ACTION, KNOWN_ISSUES

## 2026-06-23 — CI/CD Pipeline Auto-Aktif + Fix Deploy Strategy
**Masalah:** Workflow `daily-data-pipeline.yml` belum pernah jalan otomatis. Secrets CF tidak diset, step `fetch_historical_data.ts` bakal fail (rate limit Yahoo 93 request), `scrape_idx_fundamentals.py` terlalu berat (27 tahun scraping).

**Fix:**
1. Ganti strategi deploy dari `wrangler-action` (butuh CF API token) → **git push + CF Pages auto-build** (no extra secrets needed)
2. `fetch_historical_data.ts` → jadi manual-trigger-only via `workflow_dispatch.inputs.run_fetch`
3. `scrape_idx_fundamentals.py` → jadi manual-trigger-only via `workflow_dispatch.inputs.run_fundamentals`
4. Daily pipeline cuma: `post_process_live_market.py` → `npm run build` (verify) → `git commit && git push`
5. `[skip ci]` di commit message biar gak infinite loop
6. Permissions: `contents: write` untuk push ke main

**Docs updated:** CURRENT_STATE, NEXT_ACTION, KNOWN_ISSUES, MASTER_CHRONICLE

## 2026-06-23 — Docs Cleanup: Fix Stale ACTIVE_TASK.md
**Masalah:** ACTIVE_TASK.md punya duplikat Task 20-24 (versi lama dan baru). Tasks 21 (IHSG spike verified), 23 (gold unit mismatch fixed), 24 (carry-forward labeled) masih tercatat PENDING padahal sudah DONE.
**Fix:**
1. Hapus duplikat Task 20-24 (consolidate ke versi final)
2. Update Task 21 status ke DONE — IHSG 8748 confirmed real
3. Update Task 23 status ke DONE — post_process_live_market.py fetch GC=F langsung
4. Update Task 24 status ke DONE — DataStatus.CARRIED_FORWARD added
5. Update CURRENT_STATE.md — In Progress section updated
6. Update NEXT_ACTION.md — completed session list updated

## 2026-06-23 — Feature Enhancements Session
**Top Movers Enhancement:**
- Added `MiniSparkline` SVG component — 20-day price trend mini chart per stock
- Added volume indicator (formatted K/M/B) alongside RSI and change histogram

**DeepReport Enhancement:**
- Added dot indicators to SWOT section headers
- Added 90-day price history chart (SVG with gradient fill, min/max labels)
- Added peer comparison table (sector-based, top 5 peers by market cap)
- Cleaned up 7 unused imports

**Bundle Optimization:**
- Lazy-loaded SimulationTab, AnalyticsTab, PortfolioTracker via `React.lazy()` + `Suspense`
- Main bundle: 732 kB → 612 kB (-16.5%)
- Lazy chunks: AnalyticsTab 36 kB, PortfolioTracker 36 kB, SimulationTab 51 kB

**Fundamentals Expansion:**
- Added 9 new hardcoded snapshots: BBNI, INDF, INTP, ICBP, KLBF, UNTR, AKRA, PGAS, SMGR
- Each with 8 years (2018-2025): ROE, PB, PE, DER, ROA, Net Margin, DPS
- Total: 18 tickers with real historical data (was 9)
