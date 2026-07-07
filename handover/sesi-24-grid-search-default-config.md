# Handover Sesi 24 — Grid Search + Default Config Update

**Date**: 2026-07-07
**Author**: AI Agent

## Completed

### 1. Grid Search (scripts/find-best-config.ts)
- 7,008 backtest simulations across 1,323 days × 79 tickers
- PASS 1 (5,280 combos): tested all 16 profiles × 11 topN × 5 thresholds × emergency × 3 freqs
- PASS 2 (1,728 combos): refined top profiles with crash sensitivity, safe haven, smooth EMA, trailing stop
- Runtime: ~5 min total (PASS 1: 203s, PASS 2: 94s)

### 2. Default Config Updated
- **Profile**: Growth-heavy (Q10 G70 V5 M10 D5) — avg return 172.90%, best 339.24%
- **TopN**: 4 → avg 85.14% across all configs, best 330.38%
- **SafeHaven**: kas (avg 146.31%, best 345.34%)
- **CrashSensitivity**: 10
- **Crossover**: false (quarterly-style rebalancing)

### 3. 6 Files Updated
- `EngineConfigContext.tsx` — profile + defaults
- `StrategySettingsPanel.tsx` — listing + type
- `ManageProfilesModal.tsx` — isDefault check
- `engine/core.ts` — rank key mapping + display name
- `SimulationTab.tsx` — API configType + display name
- `PortfolioTracker.tsx` — display name fallback
- `devMockAI.ts` — AI profile mapping

## Key Findings (actionable)

| Feature | Verdict | Impact |
|---------|---------|--------|
| Smooth EMA (5/10/20d) | **GAGAL** | Beda 0.00% |
| Trailing Stop (15/20/25%) | **MERUSAK** | OFF: 173.78%, TS 15%: 131.04% |
| Threshold (7-∞) | **TIDAK NGARUH** | Sama semua |
| Emergency flag | **TIDAK NGARUH** | Sama semua |
| Safe Haven Emas | **SETARA Kas** | Tapi Sharpe=0 di beberapa sim buggy |
| Crash Sensitivity 15 | **LEBIH BAIK** | Best 345.34% vs 10% → 340.98% |
| Dual Momentum | **BELUM DITES** | Matrix terlalu besar |
| Vol Weight | **BELUM DITES** | Matrix terlalu besar |

## Pending
- Domain `quantbit.pro` masih pending propagation (sudah set nameserver Cloudflare)
- Dual Momentum + Vol Weight belum dites di grid search
- Revert Lucid design (commit efa14fb) — only YAxis fix active
- Script `scripts/find-best-config.ts` masih ada di repo
