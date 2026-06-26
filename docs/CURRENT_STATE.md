# CURRENT STATE

| Field | Value |
|-------|-------|
| Tanggal | 2026-06-26 |
| Status | Development |
| Progress | ~99% |
| Sprint | Sync + Simplification Pass (selesai 2026-06-26) |

## Active Architecture

```
EngineConfigContext (source of truth for LIVE strategy)
  ├── profiles[] — AMAN, AGRESIF, DIVIDEN, Custom N (weight profiles)
  ├── activeProfileId — profile aktif (getter: activeProfile)
  ├── topNCount, universe, crash/crossover settings
  ├── simulationMode: "algo" | "custom" | "adaptive_dca"
  ├── customUniverse: string[] (exclusive, custom mode)
   └── enableAdaptiveWeights: boolean (auto-adjust weights)
        │
        ├── AppSidebar → 3-button mode toggle + chips
        ├── SimulationTab → backtestConfig (draft, eksplisit run)
        ├── PortfolioTracker → reads engineConfig (live, only via SYNC)
        ├── MarketTab → cascade filter from engineConfig
        └── AI Chat → profile-aware context (AMAN/AGRESIF/DIVIDEN)
```

**Single Source of Truth (ADR-003)**: `engineConfig.activeProfileId` adalah SATU-SATUNYA sumber
kebenaran untuk active profile. `ui.activeConfig` (UIState) sudah dihapus (2026-06-26). ConfigSync
bridge dihapus.

## Current Focus

**Session 2026-06-26 (session 8): Sync Drift + Feature Overhaul — COMPLETED**

### 🟢 5 Sync Drifts Diperbaiki
- **FASE 1.1 — Crisis Detection**: Unifikasi rumus ke 60d-drawdown. Sebelumnya ada 4 rumus
  (60d-drawdown, IHSG monthly hardcoded -15.42%, dll) di marketRegimeEngine + useProactiveAgent.
  Sekarang konsisten di `marketRegimeEngine.ts:isCrisisMode()` dan `marketRegimeEngine.ts:computeMarketRegime()`.
- **FASE 1.2 — IHSG Monthly Computed**: `MKT.ihsg.monthly/weekly/daily` sekarang dihitung
  dari `_lastIhsgData` (historical IHSG) via `getIhsgMonthlyReturn()` di `marketRegimeEngine.ts`.
  Hardcoded values di `marketData.ts` jadi fallback 0.
- **FASE 1.3 — Portfolio Value Standard**: `enrichedPortfolio` di PortfolioTracker tidak filter
  EMAS lagi. Formula seragam: `shares × (currentPrice ?? buyPrice)` di semua tempat.
- **FASE 1.4 — Total Wealth**: Helper `totalWealth(portfolio, cash, getDynamicStock)` di
  `src/utils/portfolioValue.ts`. Tampil di AppHeader (sticky pill, emerald). Klik = buka tab
  Portfolio. Single source of truth = stocks + cash + gold.
- **FASE 1.5 — Watchlist Count Rename**: `RS.radar_context.watchlist_count` → `idx_universe_size`
  (field baru) untuk menghilangkan misleading label. Update di MarketTab, MarketOverviewCharts,
  aiClient, useAITools, buyPressure.

### 🟢 9 Feature Simplifications
- **FASE 2.1 — 7 Dead Components Removed**: DashboardGrid, BottomNav, NavDrawer,
  DiagnosticsTab, AIAssistant, DeepReport, AICockpit (~470 LOC cleanup).
- **FASE 2.2 — NotificationContext Slim**: Hapus `removeNotification`, `clearAll`,
  `shouldFireRule`, `markRuleFired`, `resetRule` (dead API). `fireRule` tetap karena dipakai
  PortfolioTracker. Context API jadi 3 method: `notifications`, `addNotification`, `fireRule`.
- **FASE 2.3 — Fine-Tune Sliders Removed from Sidebar**: 2 blok (custom + algo mode) dihapus.
  Edit profil hanya via `ManageProfilesModal` (sidebar "Edit Profiles" button).
- **FASE 2.4 — Advanced Safeguards Collapsed**: Crash protection + Buffer kas di-wrap `<details>`
  "Pengaturan Lanjutan". Default closed.
- **FASE 2.5 — Settings Dropdown Profile Picker Removed**: Duplicate "Config" section di
  AppHeader Settings dropdown dihapus. Profile hanya diubah via sidebar chips.
- **FASE 2.6 — SSOT activeProfileId**: `useUIState.activeConfig` + `idx_activeconfig`
  localStorage dihapus. `engineConfig.activeProfileId` adalah single source of truth.
  ConfigSync bridge dihapus.
- **FASE 2.7 — Backtest Tidak Auto-run Lagi**: `useEffect` di SimulationTab:530-557 yang
  trigger handleRunAlgoBacktest() setiap config change dihapus. Hanya run saat historicalData
  pertama kali dimuat (initial). User klik tombol "Jalankan Backtest" eksplisit di sidebar.
- **FASE 2.8 — Sticky Buy CTA**: "Beli Cepat" pill di top Portfolio tab (sticky, emerald).
  Klik → scroll + focus ke form.
- **FASE 2.9 — Jargon Simplified**:
  - "BPS Config (Live)" → "Profil Strategi Aktif"
  - "Sandi Saham (Ticker)" → "Pilih Saham"
  - "Custom Trade" → "Beli Manual"
  - "Eksekusi Beli Saham" → "Beli Sekarang"
  - "Hapus Semua" → "Reset Portofolio"
  - "Bersihkan Entri" → "Hapus Riwayat"

## Verification
- ✅ `npx tsc --noEmit` PASS 0 errors
- [ ] `npx vite build` — perlu dicek
- [ ] `npm test` — full test suite

## Known Gap (Pre-existing)
`shouldTriggerExit` per-ticker exit evaluation exists in engine but not yet wired per-portfolio-item
in the notification loop. (Tidak berubah dari sesi sebelumnya.)

## New Files
- `src/utils/portfolioValue.ts` — shared helpers: positionValue, stocksValue, totalCost,
  totalReturnPercent, goldValue, totalWealth, formatRupiahShort.
- `src/components/_archive/DashboardGrid.tsx` — archived dead code.

## Files Modified
- `src/marketRegimeEngine.ts` — unified crisis detection, added getIhsgMonthlyReturn/etc.
- `src/marketData.ts` — removed hardcoded MKT.ihsg.monthly, added idx_universe_size field.
- `src/hooks/useProactiveAgent.ts` — Rule 6 pakai 60d-drawdown bukan monthly.
- `src/hooks/useDataFeed.ts` — (call sites updated).
- `src/hooks/useUIState.ts` — removed activeConfig state.
- `src/contexts/NotificationContext.tsx` — slim API.
- `src/components/AppHeader.tsx` — Total Wealth pill, removed Settings Config section.
- `src/components/AppSidebar.tsx` — Fine-Tune removed, safeguards collapsed, removed Profile picker from Portfolio content.
- `src/components/PortfolioTracker.tsx` — EMAS no longer filtered, sticky Buy CTA, labels simplified.
- `src/components/SimulationTab.tsx` — backtest no longer auto-run, useRef import added.
- `src/components/MarketTab.tsx` — idx_universe_size.
- `src/components/MarketOverviewCharts.tsx` — idx_universe_size.
- `src/ai/aiClient.ts` — idx_universe_size.
- `src/hooks/useAITools.ts` — idx_universe_size.
- `src/engine/buyPressure.ts` — idx_universe_size.
- `src/App.tsx` — removed ConfigSync, wired engineConfig.activeProfileId.
- `src/components/AITestHarness.tsx` — removed idx_activeconfig from STORAGE_KEYS.

## Removed Files
- `src/components/BottomNav.tsx`
- `src/components/NavDrawer.tsx`
- `src/components/DiagnosticsTab.tsx`
- `src/components/AIAssistant.tsx`
- `src/components/DeepReport.tsx`
- `src/components/AICockpit.tsx`
- `DashboardGrid.tsx` (moved to _archive)
