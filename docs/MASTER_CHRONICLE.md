# MASTER CHRONICLE

## V1.0.0 — Initial Release
React 19 + Vite 6 + Tailwind 4 scaffold. Multi-factor quantitative engine. Market regime engine (5 regimes). Yahoo Finance data fetching + Express proxy. Backtesting engine with IDX rules. Portfolio tracker. Asset rotation (Cash/Gold). Gemini AI integration. Cloudflare Pages + D1 deployment.

## 2026-06-21 — Deterministic Engine (No AI for Math)
Semua kalkulasi keuangan deterministic. AI hanya untuk narrative summarization.

## 2026-06-22 — AI Context Persistence + DOX Setup
DOX Framework + Context Persistence (docs/, handover/, child AGENTS.md).

## 2026-06-22 — UI Overhaul
True black (#000) + cyan accent (#06b6d4) + floating AI chat widget (Intercom-style).

## 2026-06-23 — Data Integrity Fix (P0)
RAW_STOCKS_DATA 31 prices stale (30-147% deviasi), 20 sector mismatches, MKT values basi — semua difix.

## 2026-06-24 — IDX Fundamental API (Game Changer)
Endpoint IDX `/primary/DigitalStatistic/GetApiDataPaginated` ditemukan via reverse engineering. 60-month audit 100% pass. IDX API menjadi primary source fundamental — Yahoo/FMP/Sectors/Hash Fallback dihentikan.

## 2026-06-24 — Weight Profile System
EngineConfigContext rewritten with `profiles[]` + `WeightProfile` interface + CRUD ops. ManageProfilesModal, profile selector di AppSidebar, backward compat.

## 2026-06-24 — Strategy Sync Engine PRD-009 (v1)
7 phases: Context consolidation → Core engine (`src/engine/`) → SimulationTab refactor → Sync to Portfolio → Portfolio refactor → Market/Notification integration → AI integration. BacktestContext.tsx dihapus. 20+ files changed.

## 2026-06-24 — Strategy Sync Engine v2 (Completed)
Portfolio = Strategy Control Center. Custom mode + universe, SYNC TO PORTO real, Portfolio cascade, Notification rules, Market filter, AI exit logic — semua diimplementasi.

## 2026-06-24 — Docs Cleanup + Final P0 Tasks
Direktori docs dirapikan: 22 → 12 files (+ subfolder audit/ archive/). CURRENT_STATE + ACTIVE_TASK merged, NEXT_ACTION stripped, MASTER_CHRONICLE trimmed. Custom mode toggle + custom universe picker di AppSidebar. Notification rules (4) wired ke PortfolioTracker via useNotifications. Strategy exit banner added.
