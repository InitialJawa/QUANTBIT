# NEXT ACTION

## Priority Queue

### P0 — Backtest Validation
- [x] **Cross-check audit:** BBCA, BBRI, BMRI, TLKM, ASII — warehouse vs legacy snapshots
- [x] **Run Config B & F backtest** — backend validation PASS (rebalancing + crash protection working)
- [x] **Fix dev script** — `npm run dev` now auto-starts Express server (was PRNG fallback)
- [x] **Verify rank distribution** — 95 active tickers, top = BDMN/PTPP/KREN, bottom = BREN/ARTO/BUMI

### Sources State
- ✅ IDX API = primary fundamental source (PRODUCTION READY)
- ✅ `collectors/fetch_idx_fundamental.py` = pulls 60 months, output parquet+JSON
- ✅ `scripts/fetch_historical_data.ts` = Priority 1: IDX Warehouse (976 co), no fallback needed
- ✅ `src/components/SimulationTab.tsx` = IDX Warehouse only + DPS from archive
- ✅ Legacy FUNDAMENTAL_SNAPSHOTS archived to `src/data/archive/fundamental_snapshots.json`
- ✅ Pre-2021 year data (2000-2020) deleted from `data/years/`
- ❌ Yahoo Fundamental API = dropped from pipeline (prices only via Yahoo chart)
- ❌ FMP = dropped
- ❌ Sectors.app = dropped
- ❌ Hash Fallback Fundamental = dropped
- ❌ generateFallbackFundamentals = removed (was hash-based)
- ❌ STOCK_FACTORS = removed (dead code)
- ⚠️ RTI = backfill 2015-2020 only (deferred)
- ⚠️ Stockbit = backfill 2015-2020 only (deferred)

## Completed This Session (2026-06-24)
- **IDX Fundamental API Discovery** — endpoint diverifikasi via reverse engineering Nuxt bundles
- **60-month audit PASS** — 60/60 months, schema 100% consistent, 0 errors, avg 1.0s response
- **ADR-006 accepted** — IDX API = primary source, replace Yahoo/FMP/Sectors/Hash Fallback
- **docs/REPORT-IDX-API-001.md finalized**
- **`collectors/` created** — AGENTS.md, fetch_idx_fundamental.py, requirements.txt
- **Full 60-month pull** — 51,662 records, 976 companies, 0 errors, 2.2 MB parquet + 42 MB JSON
- **Ratio mismatch confirmed** — API ROE/ROA/NPM inconsistent, compute internally
- **Idempotency verified** — re-run skips existing months
- **Factor Engine Migration** — `fetch_historical_data.ts` + `SimulationTab.tsx` now use IDX Warehouse as Priority 1
- **Yahoo fundamentals removed** — pipeline no longer fetches Yahoo balance sheet data
- **Pipeline regenerated** — 6,582 trading days, 95 active tickers, all scored with IDX warehouse
- **Cross-check audit** — ROE -28% (warehouse konservatif), PB +7% (close match), DER ~2000% (definisi berbeda)
- **Archive created** — `src/data/archive/`: fundamental_snapshots.json (18 ticker × DPS), stock_factors.json (9 ticker)
- **Legacy removed** — FUNDAMENTAL_SNAPSHOTS, STOCK_FACTORS, generateFallbackFundamentals dari kode
- **Backtest default date** — simStartDate: 2000-01-03 → 2021-01-04
- **Pre-2021 data deleted** — 21 tahun file dari `data/years/`
- **Fixed dev script** — `npm run dev` now auto-starts Express server (root cause: backtest pakai PRNG fallback instead of real data)
- **Backtest engine verified** — rebalancing + crash protection berfungsi dengan real data
- **Diagnosed data flow** — rank variation dan IHSG drawdowns confirmed valid di year files

### Next Session
1. Single Engine Architecture — `rank_stocks(date)` sebagai satu-satunya source of truth
2. Daily scheduler untuk IDX monthly update
3. Update handover
