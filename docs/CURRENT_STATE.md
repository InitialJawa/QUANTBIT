# CURRENT STATE

| Field | Value |
|-------|-------|
| Tanggal | 2026-06-25 |
| Status | Development |
| Progress | ~96% |
| Sprint | Platform Stabilization & MCP |

## Active Architecture

```
EngineConfigContext (source of truth for LIVE strategy)
  ├── profiles[] — QM, BG, Custom N (weight profiles)
  ├── activeProfileId — profile aktif (getter: activeProfile)
  ├── activeConfig — backward compat getter ("prod"/"res")
  ├── topNCount, universe, crash/crossover settings
  ├── simulationMode: "algo" | "custom"
  ├── customUniverse: string[] (exclusive, custom mode)
  └── enableAdaptiveWeights: boolean (auto-adjust factor weights)
       │
       ├── AppSidebar → 2-button mode toggle + custom panel
       ├── └── renderBacktestContent → uses backtestConfig (draft, NOT engineConfig)
       ├── SimulationTab → runStrategy() with backtestConfig (draft)
       ├── PortfolioTracker → reads engineConfig (live, only updated via SYNC)
       ├── MarketTab → cascade filter from engineConfig
       └── AI Chat → profile-aware context (Section 12)

backtestConfig (draft, isolated from engineConfig)
  ├── Full EngineConfig copy for backtest experimentation
  ├── Modified by Backtest sidebar inputs (no effect on Portfolio)
  ├── Auto-run useEffect fires on backtestConfig changes
  └── syncFromBacktest() copies backtestConfig → engineConfig on SYNC click
```

## Current Focus

**Session 2026-06-25 (session 3): Factor analysis, weight rebalancing, data consistency fix**

### 🔴 Data Fix: stockNormScores ↔ stockRanksProd/Res Inkonsisten (FIXED)
- **Akarnya**: `fetch_historical_data.ts` pake linear min-max (40-95), `migrate-normscores.ts` overwrite pake rank-based (0-95) tanpa update `stockRanksProd/Res`
- **Fix**: `migrate-normscores.ts` sekarang compute `stockRanksProd` & `stockRanksRes` dari `stockNormScores` + profile weights (sama kaya `computeDayRankings()` di engine)
- **Data restored**: `fundamental_idx_all.json` di-revert ke versi sebelumnya — collector overwrite dengan data baru yg cuma punya 13 ticker pre-2021. Versi restore punya **751** ticker pre-2021 data.

### 🟢 Weight Rebalancing: Value ditekan ke 5%, Quality dinaikkan
- **Dasar**: ADR-009 — Value (1/PB) adalah negative-alpha factor (-26% CAGR) di IDX80 2021-2026
- **Config QM** (id="prod", menggantikan Config F): Q45 G10 V5 M40 — fokus ke 2 faktor terkuat
- **Config BG** (id="res", menggantikan Config B): Q40 G25 V5 M30 — balanced, growth tetap dipertahankan
- **Single-factor confirmed**: Quality (ROE) = +246% CAGR 25.5%, Momentum = +63%, Growth = +49%, Value = -26%
- **QM backtest**: +150% CAGR 18.23% (vs old Config B +79%, old Config F -0.7%)

### 🟢 All Naming Updated
- `EngineConfigContext.tsx` — DEFAULT_PROFILES weights & names
- `marketData.ts` — CW_F/CW_B, hardcoded weights di `syncExitsFromScan`, `syncRadarContext`
- `systemKnowledge.ts` — AI prompt profile descriptions
- `core.ts` — configName untuk backtest result
- `AppSidebar.tsx`, `AppHeader.tsx`, `DiagnosticsTab.tsx`, `PortfolioTracker.tsx` — display labels
- `run_backtest_comparison.cjs` — weight configs

## Verification
- `tsc --noEmit` — passes (0 errors)
- `vite build` — passes (0 errors)

### 🟢 Outdated Config References Cleaned (2026-06-25)
- `data/data.js` — CW_B/CW_F weights updated, `production_config` → Config QM
- `scripts/fetch_historical_data.ts` — comments & composite weights updated to QM/BG
- `debug_ranks.cjs` — renamed Config F/B → QM/BG
- `src/components/MarketTab.tsx` — scenario text Config F → Config QM

## Remaining (P2/Deferred)
- Profile UX (ticker-level overrides, import/export)
- Unit tests for `src/engine/`
- Notification persistence (localStorage/database)
- `setDividendCache()` wiring
- Telegram bot
- Pre-2021 data backfill (IDX warehouse collector perlu historical archive)
- Bootstrap `npm run build` / `npm run split-data` untuk fresh data

## Known Gap
`shouldTriggerExit` per-ticker exit evaluation exists in engine but not yet wired per-portfolio-item in the notification loop.

## Sesi Ini — 2026-06-25

### Fix: Crisis Signal Hormati enableCrashProtection
- **Problem:** 5 komponen pakai threshold `MKT.ihsg.monthly < -10` hardcoded, mengabaikan setting "Proteksi Crash" user
- **Fix:** Satu sumber kebenaran `isCrisisMode()` di `marketRegimeEngine.ts` — baca `_crashProtectionEnabled` + 60d drawdown
- **Files:** `marketRegimeEngine.ts`, `App.tsx`, `AppSidebar.tsx`, `MarketTab.tsx`, `SimulationTab.tsx`, `PortfolioTracker.tsx`

### Fix: Config F/B → QM/BG Rename
- **Problem:** Konstant `CW_F`/`CW_B` dan data key `config_b`/`config_f` masih pakai naming lama
- **Fix:** Rename ke `CW_QM`/`CW_BG`, `qm`/`bg` di `marketData.ts`, semua referensi di komponen
- **Files:** `marketData.ts`, `LeadersTab.tsx`, `marketRegimeEngine.ts`, `EngineConfigContext.tsx`

### Fix: Buku Jurnal — Akurasi + Intuitif
- **Problem:** Log summary di awal (membingungkan), pesan kurang detail, CSV 3 kolom minim
- **Fix:** Summary di akhir, pesan dengan harga/qty/value, CSV 4 kolom + BOM Excel, UI lebih rapi
- **Files:** `engine/core.ts`, `SimulationTab.tsx`

## Archive — Legacy Cleanup
- `BacktestContext.tsx` — deleted, config migrated to EngineConfigContext
- `STOCK_FACTORS` — removed
- `generateFallbackFundamentals` — removed (hash-based, replaced by warehouse)
- Pre-2021 year data — deleted from `data/years/`
- `simulationMode: "single"` — removed across codebase

## 🟡 Code Health Audit 2026-06-25
Comprehensive static audit menemukan:
- **5 Critical Bugs** (A1-A5) — A1/A2/A3 user-facing, A4/A5 engine correctness
- **5 Sync Issues** (B1-B5) — data drift antara scripts, dual crisis signals, custom weights not propagated
- **12 Misses** (C1-C12) — dead code (MCP), deployment blocker (`data/years/` not in dist), security (dev session), missing wiring (`shouldTriggerExit`)
- **12 Inefficiencies** (D1-D12) — unmemoized computations, O(n²) loops, fragile HTML detect
- **5 Documentation Drift** (E1-E5) — orphan scripts, undocumented constants

**Full report**: [`docs/audit/AUDIT-2026-06-25-CODE-HEALTH.md`](audit/AUDIT-2026-06-25-CODE-HEALTH.md)

**Issue tracking**: 11 new entries (#20-#30) appended to `docs/KNOWN_ISSUES.md`

**Fix approach decisions** (see `DECISIONS.md` 2026-06-25):
- B2 source of truth: IDX warehouse fields (`roe`, `1/per`, `eps change`)
- A3 fix: extract sync logic ke `useMarketRegimeSync` hook
- C3 fix: `vite.config.ts` plugin untuk copy `data/` ke `dist/`

**Fix scheduled**: Sprint berikutnya (5 sprint plan di audit). No code changes in sesi audit ini.

## 🟢 Adaptive DCA Engine (Phase 1 + 2) — Shipped 2026-06-25
Per PRD `Adaptive_DCA_Engine_QuantBit.md`. Buy Pressure Score (BPS) replaces traditional DCA — data-driven deploy %.

**BPS Formula** (weighted 0-100):
- Valuasi 30% (avg 1/PE) + Momentum 25% (IHSG turun = tinggi) + Breadth 15% (few healthy = tinggi) + Drawdown 20% (-drawdown × 4) + Fear 10% (RS.risk)

**Action mapping** (per PRD):
- 0-30: tidak beli · 30-50: kecil 25% · 50-70: normal 50% · 70-90: agresif 75% · 90-100: deploy 90%
- Override: `isCrisisMode()` → action=none, "CASH DEFENSE" overlay

**Files**:
- NEW `src/engine/buyPressure.ts` — pure function + `useBuyPressure()` hook
- NEW `src/components/BuyPressureDashboard.tsx` — circular SVG gauge + 5 factor bars
- NEW `src/engine/dcaBaselines.ts` — Lump Sum / Monthly DCA / Quarterly DCA simulators
- MODIFIED `src/engine/types.ts` — `simulationMode: "algo" | "custom" | "adaptive_dca"` + BpsSnapshot
- MODIFIED `src/engine/core.ts` — adaptive_dca branch di runStrategy (no rebalancing, monthly BPS deploy)
- MODIFIED `src/components/PortfolioTracker.tsx` — dashboard di atas Holdings
- MODIFIED `src/components/SimulationTab.tsx` — 4-way comparison card + verdict
- MODIFIED `src/components/AppSidebar.tsx` — mode toggle 2→3 button (Adaptive added)

**Visual delivered**:
- Portfolio: gauge + Deploy X% / Save Y% recommendation + "Kenapa?" expand with 5 sub-factor bars
- Backtest: 4-card grid (Adaptive vs Lump Sum vs Monthly DCA vs Quarterly DCA) + per-strategy metrics (CAGR, Max DD, Avg Buy Price, Cash Used) + verdict

**Verification**: tsc + vite build PASS. SimulationTab bundle +7 KB, PortfolioTracker +7 KB.

**Phase 3 (deferred)**: Auto-execute BPS recommendation. Butuh UX decision (recurring deploy? one-click approve pattern?).


**13 dari 39 issues diperbaiki langsung di sesi ini** (decision 2026-06-25: "fix sampai selesai"). Lihat `DECISIONS.md` entry "Code Health Audit Fix Execution" untuk detail lengkap.

### User-facing critical (Sprint 1) — DONE
- **A1** ✅ `useDataFeed` priceFluctuations → mean-reverting random walk
- **A2** ✅ `SimulationTab` `configType=prod` → dynamic dari `backtestConfig.activeProfileId`
- **A3** ✅ `useMarketRegimeSync` hook + `MarketRegimeSyncBridge` di `App.tsx` (hapus duplikasi PortfolioTracker)

### Engine correctness (Sprint 2) — DONE
- **A4** ✅ `core.ts` rank recompute selalu pakai `currentWeights` (custom profile benar)
- **A5** ✅ `core.ts` O(n²) IHSG window → incremental rolling buffer (12× speedup)
- **B2** ✅ `fetch_historical_data.ts` formula unified ke IDX warehouse direct

### Production deployment (Sprint 3) — DONE
- **B4** ✅ Custom weights wire ke `marketRegimeEngine` (dalam A3)
- **C3** ✅ `vite.config.ts` `copyDataAssets` plugin — verified via `vite build` (4 files + 27 year files copied)
- **C8** ✅ D1 `idx_scan_data` DELETE+INSERT (replace-only retention)

### Performance (Sprint 4) — DONE
- **D1** ✅ `getProcessedLeaders` di-memoize
- **D2** ✅ `activeAlerts` IIFE di-memoize
- **D11** ✅ `getStockRankAndScore` O(1) via `rankMap` Map

### Cleanup (Sprint 5) — PARTIAL
- **C1** ✅ MCP server `if (isMain)` guard
- **C2** ✅ Hapus unused `getSession` import
- **C4** ✅ `run_backtest_comparison.cjs` di-index di `scripts/AGENTS.md`
- **C7** ⏭️ SKIP — `ErrorBoundary` sudah di-wrap (verified)
- **C9** ✅ Dev mode guard (`IS_DEV = import.meta.env?.DEV === true`)
- **C12** ✅ Hapus `emailNotifier.ts` (unused)
- **D5** ✅ Mutating const arrays → `let` dengan comment
- **D10** ✅ `devMock` HTML detect tambah `isServerError` + IS_DEV guard

### Deferred (low priority / needs design)
B3, B5, C5, C6, C10, C11, D6-D9, D12, E1-E5 — see DECISIONS.md "Deferred" section

### Verification
- `npx tsc --noEmit` → **PASS (0 errors)**
- `npx vite build` → **PASS** + `copy-data-assets` plugin verified copying 4 source files + 27 year files to `dist/data/`

## 🟢 Quantbit AI Depth Upgrade (Levels 1+2+3+4) — Shipped 2026-06-25 (Sesi 6)
Per plan `docs/AI_DEPTH_UPGRADE_PLAN.md` (locked, eksekusi langsung tanpa re-ask).

**4 Levels terurut**:
1. **Level 1 — Smarter Q&A**: Chat history persist di localStorage (key `quantbit_ai_chat_history`, cap 100). `buildLiveContext()` sekarang kirim `bps`, `backtestConfigSnapshot`, `isBacktestOutOfSync`, dan 5 alert terakhir.
2. **Level 2 — Read-only tools**: 8 tools via JSON-block function calling (extract regex `{"tool_call": {...}}`). Provider-agnostic (OpenRouter/Groq/Gemini). Follow-up AI call setelah tool execution agar jawaban incorporate tool results.
3. **Level 3 — Action API + Approval Card**: 10 actions + inline `AIActionApprovalCard` dengan [Approve]/[Reject]. Zero auto-execute. Semua dispatch ke deterministic handler existing.
4. **Level 4 — Proactive Agent**: `useProactiveAgent` hook, 6 BPS rules, 5-min cooldown per rule, default ON, Settings toggle. Mount via `<ProactiveAgentBridge />` di `App.tsx`.

**Files Created (4)**: `src/types/ai.ts`, `src/hooks/useAITools.ts`, `src/hooks/useProactiveAgent.ts`, `src/components/AIActionApprovalCard.tsx`.

**Files Modified (7)**: `src/ai/aiClient.ts`, `src/ai/systemKnowledge.ts`, `src/contexts/AICockpitContext.tsx`, `src/components/FloatingAIChat.tsx`, `src/hooks/useUIState.ts`, `src/components/AppHeader.tsx`, `src/App.tsx`.

**Verification**: `tsc --noEmit` PASS, `vite build` PASS. Bundle +0.7 KB.

## 🟢 Test Coverage 4-Lapis — Shipped 2026-06-25 (Sesi 7)
Refactor + comprehensive test coverage untuk Quantbit AI features.

**Refactor (sebelum testing)**:
- `src/ai/toolCallParser.ts` (NEW) — extract `extractToolCalls` + `READ_ONLY_TOOLS` + `ACTION_TOOLS` ke file dependency-free. **Fixes off-by-one bug** di regex (gagal parse `{"args": {}}` empty-object case).
- `src/hooks/useAITools.ts` — extract `ACTION_REGISTRY` + `buildPendingActionFromContext` ke module-level (sebelumnya di dalam `useMemo`).
- `src/hooks/useProactiveAgent.ts` — extract `shouldFireRule` + `markRuleFired` + `COOLDOWN_MS` ke pure helpers.

**4 Lapis Tests**:
| Lapis | Type | Count | Tool |
|-------|------|------:|------|
| 1. Unit | Pure functions | 95 | `node:test` (npm test) |
| 2. Component | DOM + jsdom | 18 | vitest + @testing-library/react |
| 3. Manual | E2E guide + dev harness | 30+ cases | `MANUAL_TEST_GUIDE.md` + `AITestHarness` |
| 4. E2E | Browser | 17 | Playwright |
| **Total automated** | | **130** | |

**Verification**: `npm test` 152/152 (95 new + 57 engine), `npm run test:ui` 18/18, `npx tsc --noEmit` 0 errors, `npx vite build` PASS, `npx playwright test --list` 17 tests discoverable.

**New dependencies** (5 devDeps): vitest, @testing-library/react, @testing-library/dom, @testing-library/user-event, @vitest/coverage-v8, jsdom, @playwright/test.

**New npm scripts**: `test:ui`, `test:ui:watch`, `test:ui:coverage`, `test:e2e`, `test:e2e:headed`, `test:e2e:ui`, `test:e2e:install`.
