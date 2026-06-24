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

## 2026-06-24 — Backtest Panel UI Cleanup + Profile Weight Fixes
- Mode toggle 3→2 ([Algo] [Custom]), Custom = old Single + renamed
- Config F vs B fix: activeProfileId di BacktestConfig, rank key selection benar
- Fine-tune sliders: read/write via activeProfile + updateProfile
- mock data: stockNormScores generated untuk dev mode
- Comma input fix: defaultValue + onBlur untuk customTickers/customUniverse
- Duplicate config row (Parameter/F/B/Jalankan) dihapus dari SimulationTab header
- PortfolioTracker: fix stale dependency engineConfig.activeProfile → activeProfile

## 2026-06-24 — Full Audit Fix: Custom Mode Crash Detection + peak60 + Dead Code Removal
13 bugs resolved across codebase:

**🔴 Critical Engine Fixes:**
- Custom mode crash/recovery now uses IHSG-based detection (was using single-stock)
- `peak60` wired through entire chain: `getIhsgDrawdown60()` → `evaluateStrategy()` → notification rules → AI
- AI `strategyEvaluation` no longer hardcoded `shouldExit: false`; uses real drawdown
- Custom mode alerts: universe-based breach/exit + buy suggestions for unowned members

**🟡 UI/Config Fixes:**
- Portfolio sidebar: custom panel with fine-tune sliders + universe summary
- localStorage: legacy `"single"` → `"custom"` auto-migration
- AnalyticsTab: activeProfileId used directly (no lossy downcast)
- FloatingAIChat: receives missing props
- server.ts: bridgeHistoricalData() added

**🟢 Dead Code Removed:**
- `"single"` type union removed from types, context, systemKnowledge
- Dead single-mode branches removed from core.ts, PortfolioTracker.tsx, AppSidebar.tsx, notificationRules.ts, aiClient.ts
- Engine index: unused exports cleaned up (detectCrashSingle, detectRecoverySingle, rule_singleModeTrigger)
- Missing import `shouldTriggerExit` in PortfolioTracker.tsx — removed (was unused after dead code deletion in prior session)
