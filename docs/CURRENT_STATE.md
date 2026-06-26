# CURRENT STATE

| Field | Value |
|-------|-------|
| Tanggal | 2026-06-26 |
| Status | Development |
| Progress | ~97% |
| Sprint | Profile Overhaul — AMAN, DIVIDEN, AGRESIF |

## Active Architecture

```
EngineConfigContext (source of truth for LIVE strategy)
  ├── profiles[] — AMAN, AGRESIF, DIVIDEN, Custom N (weight profiles)
  ├── activeProfileId — profile aktif (getter: activeProfile)
  ├── activeConfig — backward compat getter (profile id string)
  ├── topNCount, universe, crash/crossover settings
  ├── simulationMode: "algo" | "custom" | "adaptive_dca"
  ├── customUniverse: string[] (exclusive, custom mode)
   └── enableAdaptiveWeights: boolean (auto-adjust weights)
       │
       ├── AppSidebar → 3-button mode toggle + custom panel
       ├── └── renderBacktestContent → uses backtestConfig (draft, NOT engineConfig)
       ├── SimulationTab → runStrategy() with backtestConfig (draft)
       ├── PortfolioTracker → reads engineConfig (live, only updated via SYNC)
       ├── MarketTab → cascade filter from engineConfig
       └── AI Chat → profile-aware context (AMAN/AGRESIF/DIVIDEN)

backtestConfig (draft, isolated from engineConfig)
  ├── Full EngineConfig copy for backtest experimentation
  ├── Modified by Backtest sidebar inputs (no effect on Portfolio)
  ├── Auto-run useEffect fires on backtestConfig changes
  └── syncFromBacktest() copies backtestConfig → engineConfig on SYNC click
```

## Current Focus

**Session 2026-06-26 (session 8): 3 Faktor Investasi — AMAN, AGRESIF, DIVIDEN**

### 🟢 3 Faktor Baru Hasil Backtest
- **Masalah**: Hanya 2 profil (QM/BG) — Value terbukti negative-alpha, Momentum terlalu dominan. User butuh opsi jelas: konservatif, growth, atau dividen.
- **Backtest**: `scripts/backtest_optimize_weights.ts` — step 0.05, data 2015-2026, IDX80 Top 5. Masing-masing punya score function sendiri:
  - **AMAN**: Sharpe × 10 - DD/8 + Sortino × 5 + CAGR × 0.5 — prioritas risk-adjusted
  - **AGRESIF**: CAGR × 3 + Return/100 + Sharpe × 5 — growth-heavy
  - **DIVIDEN**: Sharpe × 8 - DD/8 + Sortino × 4 + CAGR × 0.3 — dividend yield
- **3 profil final**:
  - **AMAN** — Q30/G45/V10/M0/D15: konservatif, growth sebagai engine, quality sebagai safety, dividen kecil sebagai buffer
  - **AGRESIF** — Q20/G60/V10/M10/D0: growth-heavy, momentum kecil untuk timing, tanpa dividen
  - **DIVIDEN** — Q15/G20/V5/M0/D60: fokus dividend yield, growth moderate, quality sebagai safety net

### 🔴 QM/BG → AMAN/AGRESIF/DIVIDEN
- `prod`(QM) / `res`(BG) dihapus. 3 profil baru (default baris 37-41 `EngineConfigContext.tsx`).
- **`activeConfig` type**: dari `"prod" | "res"` → `string` (profile id).
- **`CW_QM`/`CW_BG`** → **`CW_AMAN`/`CW_AGRESIF`/`CW_DIVIDEN`** + `CW_MAP` lookup di `marketData.ts`.
- **Scoring engine**: tetap 5 sub-weight (Q/G/V/M/D) per profile — dividend fixed, tidak di-adaptif.
- **`calcDividend()`** di `sync_engine.ts` — scoring dari `dividendYield` Yahoo Finance.

### 🔴 Dividend Cache Dipisah
- `setDividendCache()` dan `getDividendPerShare()` dipindah dari `core.ts` ke `src/engine/dividendCache.ts`.

### Files Changed (21 files, +169/-133)

### Verification
- `tsc --noEmit` — perlu dicek
- `vite build` — perlu dicek

## Remaining (P2/Deferred)
- Profile UX (ticker-level overrides, import/export)
- Notification persistence — TTL not enforced
- Telegram bot
- Pre-2021 data backfill (IDX warehouse collector perlu historical archive)
- Bootstrap `npm run build` / `npm run split-data` untuk fresh data
- Proactive alert chip in chat (uses AICockpitContext.proactiveAlerts which is wired but not yet rendered)
- Auto-execute BPS recommendation (Level 5, requires UX decision)
- CI workflow untuk Playwright E2E (`.github/workflows/e2e.yml`)
- Cross-browser E2E (Firefox, WebKit)

## Known Gap
`shouldTriggerExit` per-ticker exit evaluation exists in engine but not yet wired per-portfolio-item in the notification loop.
