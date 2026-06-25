# Code Health Audit — 2026-06-25

> Comprehensive static audit of QUANTBIT codebase. Identifies bugs, sync gaps, misses,
> inefficiencies, and documentation drift. **No code changes made in this session** —
> semua fix dijadwalkan untuk sprint berikutnya.

## Executive Summary

| Kategori | Count | Severity | Sprint Target |
|----------|------:|----------|---------------|
| Critical Bugs (A) | 5 | 🔴 High | Sprint 1 (A1-A3 user-facing) + Sprint 2 (A4-A5 engine) |
| Sync Issues (B) | 5 | 🟡 Medium | Sprint 2 |
| Misses (C) | 12 | 🟢 Low | Sprint 3-5 |
| Inefficiencies (D) | 12 | 🟠 Low | Sprint 4 |
| Documentation Drift (E) | 5 | ⚪ Trivial | Sprint 5 |

**Fix approach decisions** (per session 2026-06-25):
- **B2 source-of-truth**: IDX warehouse fields langsung (`roe`, `1/per`, `eps change`).
- **A3 fix approach**: Extract sync logic ke `src/hooks/useMarketRegimeSync.ts`.
- **C3 fix approach**: Update `vite.config.ts` agar `data/years/*.json` ter-copy ke `dist/`.

Lihat `docs/DECISIONS.md` entry 2026-06-25 untuk detail.

---

## A. Critical Bugs (5)

### A1. `useDataFeed` priceFluctuations dead code
**File**: `src/hooks/useDataFeed.ts:114`
```ts
const newOffset = offset + 0;  // selalu 0 → priceFluctuations tidak pernah berubah
```
**Dampak**:
- Polling 3-detik berjalan sia-sia (100+ saham di-loop tiap 3s)
- Harga live tidak ber-fluktuasi (display issue)
- Performance: constant re-render
**Test**:
```bash
grep -n "newOffset" src/hooks/useDataFeed.ts
```
**Fix plan**: Replace dengan small random walk atau hapus interval seluruhnya.

### A2. `SimulationTab` hardcoded `configType=prod`
**File**: `src/components/SimulationTab.tsx:197`
```ts
api.get<{...}>("/api/backtest-data?configType=prod")  // hardcoded!
```
**Dampak**: User pilih BG profile, dapat data QM. Hasil backtest BG salah total karena ranks-nya beda.
**Test**: Jalankan backtest BG, bandingkan dengan run via fetch langsung `configType=res`.
**Fix plan**: Ganti `"prod"` → `` `configType=${backtestConfig.activeProfileId === "res" ? "res" : "prod"}` ``

### A3. `AppSidebar` toggle `enableCrashProtection` not synced
**File**: `src/components/AppSidebar.tsx:740-752`
**Root cause**: `setCrashProtectionEnabled()` hanya dipanggil di `PortfolioTracker.tsx:109`.
Toggle di sidebar (visible di semua tab) **tidak propagate** ke regime engine.
**Dampak**: User nonaktifkan proteksi crash di sidebar → `AlertBanner` & `RS.status` masih pakai `enableCrashProtection=true` sampai user buka tab Portfolio.
**Fix approach** (decided 2026-06-25): Extract sync logic ke `src/hooks/useMarketRegimeSync.ts`:
```ts
export function useMarketRegimeSync() {
  const { engineConfig, activeProfile } = useEngineConfig();
  useEffect(() => {
    setActiveUniverse(engineConfig.universe as ...);
    setCrashSensitivity(engineConfig.crashSensitivity ?? 10);
    setCrashProtectionEnabled(engineConfig.enableCrashProtection);
    setActiveConfig({ ...activeProfile weights ... });
    refreshRSFromRegime();
  }, [engineConfig.universe, engineConfig.crashSensitivity,
      engineConfig.enableCrashProtection, activeProfile]);
}
```
Mount sekali di `App.tsx`. Hapus duplikasi dari `PortfolioTracker.tsx`.

### A4. `core.ts` `activeProfileKey` fallback wrong for custom profile
**File**: `src/engine/core.ts:28`
```ts
const activeProfileKey = config.activeProfileId === "res" ? "stockRanksRes" : "stockRanksProd";
// custom_abc123 → silently uses stockRanksProd (salah)
```
**Dampak**: Custom profile jalankan backtest dengan rank QM, bukan bobot user.
**Fix plan**:
- Opsi A: Fallback ke `d.stockNormScores` + recompute via `computeDayRankings(currentWeights)` setiap hari
- Opsi B: Simpan rank per profile_id di data (tapi membengkak)
- Recommended: Opsi A (lebih scalable)

### A5. `core.ts` O(n²) IHSG window rebuild
**File**: `src/engine/core.ts:200, 233`
```ts
const ihsgPricesWindow = filtered.slice(0, stepIndex + 1).map(d => d.ihsgPrice);
```
**Dampak**: O(n²) untuk backtest panjang. 1500 hari = 1.125M iterasi hanya untuk window IHSG.
**Fix plan**: Maintain incremental `_lastIhsgPrices` array — push current price, slice last 60 untuk window.

---

## B. Sync Issues (5)

### B1. `FUNDAMENTAL_SNAPSHOTS` drift dari `KNOWN_ISSUES #11`
**File**: `scripts/fetch_historical_data.ts:54-145`
**Drift**: `KNOWN_ISSUES.md #11` menulis "Expanded dari 9 ke 18 ticker" — tapi `FUNDAMENTAL_SNAPSHOTS` hanya punya 9 ticker (BBCA, BBRI, BMRI, TLKM, ASII, ADRO, PTBA, ESSA, GOTO). 9 ticker tambahan (BBNI, INDF, INTP, ICBP, KLBF, UNTR, AKRA, PGAS, SMGR) **tidak ada** di script.
**Rekomendasi**: Tambah 9 ticker baru ke `FUNDAMENTAL_SNAPSHOTS` untuk backup (Priority 2 fallback).

### B2. Dua formula value & growth di dua script
**Files**: `scripts/fetch_historical_data.ts:443-498` vs `scripts/migrate-normscores.ts:117-205`

| Aspek | `fetch_historical_data.ts` | `migrate-normscores.ts` |
|-------|---------------------------|------------------------|
| Quality | `roe = profitAttrOwner/equity` | `roe = fund.roe` (langsung) |
| Value | `1/pb` (priceBV) | `1/per` else `1/priceBV` |
| Growth | `roe - prev_roe` (ROE change) | `eps change annualized` else `sales change` |
| Normalisasi | linear 40-95 | rank-based 0-95 |

**Dampak**: `stockRanksProd/Res` yang di-compute beda tergantung script mana yang terakhir jalan.
**Source of truth decision (2026-06-25)**: IDX warehouse fields langsung (`roe`, `1/per`, `eps change`).
**Fix plan**:
- `fetch_historical_data.ts` di-update pakai formula `migrate-normscores.ts`
- ADR-009 scoring tetap (rank-based 0-95)
- Test: re-run fetch → migrate bandingkan `stockRanksProd` harus identik

### B3. Dua sumber sinyal krisis
**Files**: `src/marketRegimeEngine.ts:78-82` (`isCrisisMode`) vs `src/marketRegimeEngine.ts:205` (`computeMarketRegime`)

- `isCrisisMode()`: 60-day drawdown (untuk AlertBanner di `App.tsx:77`)
- `computeMarketRegime()`: IHSG bulanan (untuk `RS.status` di sidebar)
- Keduanya bisa **konflik**: drawdown -8% tapi monthly +2% → tidak crisis (drawdown) vs safe (monthly)

**Fix plan** (bukan untuk sprint ini, hanya dokumentasi):
- AlertBanner → pakai `isCrisisMode()` (drawdown) — sudah benar
- Regime status → pakai `computeMarketRegime()` (monthly) — sudah benar
- Tapi user bingung karena label bisa beda
- Rekomendasi: tambah tooltip penjelasan di kedua UI

### B4. Custom profile weights tidak propagate ke `marketRegimeEngine`
**File**: `src/marketRegimeEngine.ts:48`
**Issue**: `_activeWeights` ada tapi tidak ada pemanggil yang set dari `activeProfile` (custom).
**Dampak**: Radar/breadth scoring di sidebar pakai QM/BG defaults, bukan custom weights user.
**Fix plan**:
- Update `useMarketRegimeSync` hook (A3) untuk set `setActiveConfig({q,g,v,m})` dari `activeProfile`
- Test: pilih custom profile → radar scoring berubah

### B5. `_prevRanks` memory leak di `marketData.ts`
**File**: `src/marketData.ts:154`
```ts
let _prevRanks: Record<string, number> = {};
```
**Issue**: Entries ditambahkan setiap `getProcessedLeaders` call, tidak pernah di-clear.
**Dampak**: Untuk long-running session (>1000 calls), memory tumbuh unbounded.
**Fix plan**:
- Trim `_prevRanks` ke top 100 tickers aktif
- Atau pindah ke LRU cache dengan max 200 entries

---

## C. Misses (12)

### C1. MCP server dead code
**File**: `src/mcp/index.ts:161`
```ts
await server.connect(transport);  // top-level, auto-run on import
```
**Issue**: Tidak ada `if (isMain)` check seperti `sync_engine.ts:193`. Tidak ada npm script.
**Fix plan**: Wrap dengan `if (isMain)` check atau refactor ke factory function + CLI entry point.

### C2. `getSession` imported tapi tidak dipakai
**File**: `src/components/SimulationTab.tsx:29`
**Issue**: `import { getSession, api } from "../services/api";` — `getSession` tidak direferensikan.
**Fix plan**: Hapus import.

### C3. `data/years/` tidak ter-deploy ke CF Pages
**File**: `functions/api/[[path]].ts:306`
**Issue**: `env.ASSETS.fetch("/data/years/{y}.json")` — tapi `data/` di-gitignore (`data/AGENTS.md`) dan Vite tidak otomatis copy non-`public/` files.
**Dampak**: Production API return 503 "No historical data available" di CF Pages.
**Fix approach (decided 2026-06-25)**: Update `vite.config.ts`:
```ts
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  plugins: [{
    name: 'copy-data-assets',
    closeBundle() {
      const files = [
        'data/years',
        'data/idx80_scan.json',
        'data/fundamental_idx_all.json',
        'data/live_market.json',
      ];
      const distDataDir = resolve('dist/data');
      if (!existsSync(distDataDir)) mkdirSync(distDataDir, { recursive: true });
      // copy each file/dir recursively
    }
  }]
});
```

### C4. `run_backtest_comparison.cjs` orphaned
**File**: `scripts/run_backtest_comparison.cjs`
**Issue**: File ada tapi tidak di-index di `scripts/AGENTS.md`. Digunakan saat rebalancing fix tapi sekarang unreferenced.
**Fix plan**: Tambah ke `scripts/AGENTS.md` Child DOX Index atau hapus jika obsolete.

### C5. `Active Universe` count selalu 0 untuk algo mode
**File**: `src/engine/core.ts:502-507`
**Issue**: `getActiveUniverse(config)` returns `[]` untuk `simulationMode === "algo"`. Sidebar menampilkan "CUSTOM (N)" tapi user bingung kalau pilih algo.
**Fix plan**: Untuk algo mode, return top N dari `processedLeaders` (sintesis universe).

### C6. Notification `firedRules` Set tidak pernah expire
**File**: `src/contexts/NotificationContext.tsx:50`
**Issue**: `firedRules` di localStorage, tidak ada cleanup. User tidak akan pernah di-notify lagi untuk event yang sama.
**Fix plan**: Tambah TTL (e.g. 7 days) atau expose "reset" button di NotificationCenter UI.

### C7. `ErrorBoundary` tidak di-wrap di App
**File**: `src/ErrorBoundary.tsx` (exists), `src/App.tsx` (not used)
**Fix plan**: Wrap `<App />` di `main.tsx` dengan `<ErrorBoundary>`.

### C8. D1 `idx_scan_data` tidak ada retention
**File**: `functions/api/[[path]].ts:821-823`
**Issue**: `INSERT INTO idx_scan_data` tanpa DELETE → grow unbounded.
**Fix plan**: Cron cleanup hapus rows > 7 hari, atau replace-only (DELETE + INSERT).

### C9. AUTH: dev session `dev-session` accept token apapun
**File**: `src/services/api.ts:24-29`
**Issue**: Token `dev-session` = any user. Production: jika ada `dev-session` di localStorage, auth bypass.
**Fix plan**: Tambah check `process.env.NODE_ENV !== "production"` di `devMock`.

### C10. `dividendCache` default 0 untuk semua ticker non-tracked
**File**: `src/engine/core.ts:438-441`
**Issue**: Dividend payout selalu 0 kecuali ticker ada di `idx80_scan.json` & punya `dividendYield > 0`.
**Status**: Sudah di-list di `NEXT_ACTION.md` P2.
**Fix plan**: Pull dividend dari `fundamental_idx_all.json` (IDX warehouse).

### C11. `shouldTriggerExit` per-ticker not wired di notification loop
**File**: `src/engine/core.ts:475-500`
**Issue**: Function exists tapi tidak dipanggil di `PortfolioTracker.tsx` notification rules.
**Status**: Sudah di-list di `KNOWN_ISSUES` "Known Gap".
**Fix plan**: Panggil `shouldTriggerExit` di rule engine untuk setiap portfolio item.

### C12. `emailNotifier.ts` (services/) tidak dipakai
**File**: `src/services/emailNotifier.ts`
**Issue**: File exists tapi import-nya tidak ada. Email pakai Resend API di CF function.
**Fix plan**: Hapus file atau refactor jadi fallback untuk dev.

---

## D. Inefficiencies (12)

### D1. `getProcessedLeaders` tidak di-memoize
**File**: `src/components/PortfolioTracker.tsx:219`
**Issue**: Dipanggil per-render. Sort O(n log n) + multiple maps.
**Fix plan**: Wrap dengan `useMemo([activeProfile, engineConfig.universe])`.

### D2. `activeAlerts` IIFE tidak dimemoize
**File**: `src/components/PortfolioTracker.tsx:384-593`
**Issue**: 200+ lines logic di setiap render, depend pada `getProcessedLeaders` (D1).
**Fix plan**: Extract ke custom hook `useActiveAlerts()` + memoize.

### D3. `useEffect` dependencies risk loop
**File**: `src/components/PortfolioTracker.tsx:293`
```ts
}, [engineConfig, portfolio, processedLeaders, notif]);
```
**Issue**: `notif` = object reference baru per render → risk infinite rule-fire loop.
**Fix plan**: Use `useNotifications()` destructure, depend pada primitives saja.

### D4. `useDataFeed` 3-second interval
**File**: `src/hooks/useDataFeed.ts:100-122`
**Issue**: 100+ saham di-loop tiap 3s, 99% sia-sia (A1 dead code).
**Fix plan**: Hapus interval (A1) atau naikkan ke 30s.

### D5. Mutating `const` arrays di `marketData.ts`
**File**: `src/marketData.ts:67, 71, 232, 257`
```ts
export const EX: ExitStock[] = [...]  // const export
// ...
EX.length = 0;  // mutating
EX.push(...);
```
**Fix plan**: Ganti `const` ke `let`, atau gunakan module-level mutable holders.

### D6. `getSession` re-export tidak perlu
**File**: `src/services/api.ts:172`
**Issue**: `export { getSession };` — duplikat dengan `authApi.getSession`.
**Fix plan**: Hapus atau dokumentasikan backward compat reason.

### D7. `MARKET_TICKERS` hardcoded di CF function
**File**: `functions/api/[[path]].ts:765-778`
**Issue**: 79 tickers hardcoded, berbeda dengan `src/constants/idx80.ts:COMBINED_TICKERS` (lebih lengkap).
**Fix plan**: Share constant antara frontend & CF function, atau fetch dari DB.

### D8. `SimulationTab` fetch setiap mount
**File**: `src/components/SimulationTab.tsx:196-202`
**Issue**: Tidak ada caching. `historicalData` re-fetched per mount.
**Fix plan**: Cache dengan TTL di localStorage atau SWR pattern.

### D9. `marketRegimeEngine` module-level state
**File**: `src/marketRegimeEngine.ts:45-50`
**Issue**: `_lastIhsgData`, `_activeUniverse`, dll globals — race conditions di React StrictMode.
**Fix plan**: Encapsulate ke class atau context.

### D10. `api.ts:devMock` detect HTML fragile
**File**: `src/services/api.ts:108-110`
```ts
if (text.startsWith("<!DOCTYPE") || text.startsWith("<html") || text.startsWith("<!doctype")) {
  return devMock(path, options);
}
```
**Issue**: Bisa salah detect kalau server balikin HTML untuk error legitimate (mis. 404 page).
**Fix plan**: Tambah explicit error check (e.g. status >= 400) sebelum fallback.

### D11. `getStockRankAndScore` linear search
**File**: `src/components/PortfolioTracker.tsx:295-303`
**Issue**: O(portofolio × leaders) per render. Untuk 50 holdings × 80 leaders = 4000 comparisons.
**Fix plan**: Build `Map<ticker, rank>` sekali per render.

### D12. `_activeWeights` di regime engine unreachable
**File**: `src/marketRegimeEngine.ts:48`
**Issue**: API supports custom weights, tapi callers selalu kirim string.
**Fix plan**: Wire di `useMarketRegimeSync` (A3).

---

## E. Documentation Drift (5)

### E1. `BACKTEST_RANK_TABLE` tidak didokumentasikan
**File**: `src/components/SimulationTab.tsx:920`
**Issue**: Stockbit-style "Rank ≥7" reference tapi tidak ada ADR/doc tentang threshold ini.
**Fix plan**: Tambah ADR atau note di `MASTER_CHRONICLE`.

### E2. `AGENTS.md` tidak list `run_backtest_comparison.cjs`
**File**: `scripts/AGENTS.md`
**Issue**: File exists tapi orphan di Child DOX Index.
**Fix plan**: Tambah ke index atau hapus file.

### E3. Custom profile handling di `core.ts` tidak ada ADR
**File**: `src/engine/core.ts:28`
**Issue**: `activeProfileId` bisa `"custom_xxx"`, fallback behavior tidak didokumentasikan.
**Fix plan**: ADR baru atau note di MASTER_CHRONICLE.

### E4. `.github/workflows/` mungkin masih refer deprecated scripts
**File**: `.github/workflows/daily-data-pipeline.yml` (?)
**Issue**: Setelah KNOWN_ISSUES #15 closed, perlu cross-check apakah workflows sudah di-cleanup.
**Fix plan**: Review workflows, remove dead references.

### E5. `data/data.js` status unclear
**File**: `data/data.js`
**Issue**: CURRENT_STATE mention "data.js" updated untuk CW_B/CW_F, tapi status legacy/active unclear.
**Fix plan**: Move ke `data/archive/` atau hapus.

---

## Recommended Fix Order

### Sprint 1 (next session) — User-facing critical bugs
- [ ] **A1** `useDataFeed` priceFluctuations dead code
- [ ] **A2** `SimulationTab` hardcoded `configType=prod`
- [ ] **A3** `enableCrashProtection` sidebar sync (extract ke `useMarketRegimeSync`)

### Sprint 2 — Engine correctness
- [ ] **A4** `core.ts` `activeProfileKey` fallback (handle custom profile)
- [ ] **A5** `core.ts` O(n²) IHSG window (incremental)
- [ ] **B1** Add 9 missing tickers ke `FUNDAMENTAL_SNAPSHOTS`
- [ ] **B2** Unify formulas di `fetch_historical_data.ts` (source of truth: IDX warehouse)
- [ ] **B3** Documentation tooltip untuk 2 crisis signals

### Sprint 3 — Production deployment
- [ ] **C3** `vite.config.ts` copy `data/` ke `dist/`
- [ ] **B4** Custom weights propagate ke `marketRegimeEngine` (via `useMarketRegimeSync`)
- [ ] **C8** D1 `idx_scan_data` retention policy

### Sprint 4 — Performance
- [ ] **D1** `getProcessedLeaders` memoize
- [ ] **D2** `activeAlerts` extract ke hook + memoize
- [ ] **D3** `useEffect` dependencies cleanup
- [ ] **D4** Remove 3-second interval (atau naikkan ke 30s)
- [ ] **D11** `getStockRankAndScore` Map-based

### Sprint 5 — Cleanup
- [ ] **C1** MCP server fix (factory + CLI)
- [ ] **C2** Hapus unused `getSession` import
- [ ] **C4** `run_backtest_comparison.cjs` index atau hapus
- [ ] **C5** `getActiveUniverse` untuk algo mode
- [ ] **C6** Notification `firedRules` TTL
- [ ] **C7** Wrap `<ErrorBoundary>` di `main.tsx`
- [ ] **C9** Dev mode guard
- [ ] **C10** Dividend cache dari IDX warehouse
- [ ] **C11** `shouldTriggerExit` wire ke notification loop
- [ ] **C12** Hapus `emailNotifier.ts`
- [ ] **D5** Mutating const arrays fix
- [ ] **D6** Hapus `getSession` re-export
- [ ] **D7** Share `MARKET_TICKERS` constant
- [ ] **D8** `SimulationTab` fetch caching
- [ ] **D9** Regime engine encapsulation
- [ ] **D10** `api.ts:devMock` HTML detect fix
- [ ] **D12** `_activeWeights` wire
- [ ] **B5** `_prevRanks` LRU cache
- [ ] **E1-E5** Documentation drift

---

## Verification Checklist

Setelah sprint fix:
```bash
# 1. Type check
npm run lint
tsc --noEmit

# 2. Build
npm run build

# 3. Manual tests
# - BG backtest: jalankan dengan activeProfileId="res", bandingkan data dengan configType=res manual fetch
# - Crash protection: toggle di sidebar, AlertBanner & RS.status harus reflect
# - Custom profile: buat profile custom, jalankan backtest, pastikan rank bukan QM/BG default
# - Data/years deployment: npm run build, cek dist/data/years/2025.json exists

# 4. Performance
# - React DevTools Profiler: PortfolioTracker tidak boleh re-render > 50ms
# - useDataFeed: setInterval count harus 1 (bukan 3)

# 5. Integration
# - Deploy ke CF Pages, hit /api/backtest-data, harus return 200
# - Login flow: dev session tidak boleh accept di production
```

---

## References
- `docs/DECISIONS.md` entry 2026-06-25 — fix approach decisions
- `docs/KNOWN_ISSUES.md` #20-#30 — issue tracking
- `docs/CURRENT_STATE.md` audit section — state summary
- `docs/MASTER_CHRONICLE.md` 2026-06-25 entry — milestone
- `AGENTS.md` Bagian 1 — DOX framework (process used for this audit)
- `src/AGENTS.md` — engine contracts
- `scripts/AGENTS.md`, `collectors/AGENTS.md`, `data/AGENTS.md`, `functions/AGENTS.md` — DOX chain
