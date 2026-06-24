# CURRENT STATE

| Field | Value |
|-------|-------|
| Tanggal | 2026-06-24 |
| Status | Development |
| Progress | ~96% |
| Sprint | Platform Stabilization & MCP |

## Active Architecture

```
EngineConfigContext (source of truth for LIVE strategy)
  ├── profiles[] — F, B, Custom N (weight profiles)
  ├── activeProfileId — profile aktif (getter: activeProfile)
  ├── activeConfig — backward compat getter ("prod"/"res")
  ├── topNCount, universe, crash/crossover settings
  ├── simulationMode: "algo" | "custom"
  ├── customUniverse: string[] (exclusive, custom mode)
  └── customTickers: string[] (forced holdings, algo mode)
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

**Session 2026-06-24 (session 2): Backtest/Portfolio isolation + Custom mode fixes** — Backtest config draft separated from engineConfig:

### 🔴 Bug 1 Fix: Backtest Auto-Sync ke Porto
- **`backtestConfig` draft state** ditambahkan di `EngineConfigContext` — terpisah dari `engineConfig` (live)
- **`updateBacktestValue()`** — function untuk modify draft tanpa sentuh live config
- **`renderBacktestContent()`** di `AppSidebar` — semua input baca/tulis `backtestConfig` (bukan `engineConfig`)
- **`SimulationTab.tsx`** — auto-run useEffect, `handleRunAlgoBacktest()`, dan SYNC button semua pakai `backtestConfig`
- **PortfolioTracker tetap baca `engineConfig`** — tidak kena perubahan backtest sampai SYNC diklik
- **`syncFromBacktest()`** — satu-satunya jalan draft → engineConfig (via SYNC TO PORTO button)

### 🟢 Data Fix: stockNormScores — Profile Weights Sekarang Berfungsi
- **Akar masalah**: `stockNormScores` tidak ada di `data/historical_market_data.json` → engine selalu fallback ke `stockRanksProd` fixed → profile weights slider tidak berpengaruh
- **Fix**: Migration script `scripts/migrate-normscores.ts` — komputasi quality (ROE), growth (EPS growth), value (inverse PER/PBV), momentum (20d price return) dari IDX warehouse + normalized min-max per hari
- **6482/6582** records enriched (2000-2026). Semua year files update. Build pass.

### 🔴 Bug 2 Fix: Custom Mode Gagal Total
- **`BacktestConfig.activeProfileId`** — type diubah dari `"prod" | "res"` → `string` (engine/types.ts)
- **`core.ts`** — handle custom profile ID: fallback ke `stockRanksProd` untuk non-"res" ID
- **Dead `"single"` branches dihapus** — `core.ts` (crash/recovery/reentry), `detectCrashSingle`/`detectRecoverySingle` imports
- **Legacy field di custom sidebar dihapus** — `singleTicker`, `singleSellTrigger`, `singleBuyTrigger` tidak muncul lagi di custom mode
- **`MarketTab.tsx`** — dead `"single"` checks dihapus

## Verification
- `tsc --noEmit` — passes (0 errors)
- `vite build` — passes (0 errors)

## Remaining (P2/Deferred)
- `npm run build` to regenerate year files with raw metrics
- Profile UX (ticker-level overrides, import/export)
- Unit tests for `src/engine/`
- Notification persistence (localStorage/database)
- `setDividendCache()` wiring
- Telegram bot
- Pre-2021 data backfill

## Known Gap
`shouldTriggerExit` per-ticker exit evaluation exists in engine but not yet wired per-portfolio-item in the notification loop.

## Archive — Legacy Cleanup
- `BacktestContext.tsx` — deleted, config migrated to EngineConfigContext
- `STOCK_FACTORS` — removed
- `generateFallbackFundamentals` — removed (hash-based, replaced by warehouse)
- Pre-2021 year data — deleted from `data/years/`
- `simulationMode: "single"` — removed across codebase
