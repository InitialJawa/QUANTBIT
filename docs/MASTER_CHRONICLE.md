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
