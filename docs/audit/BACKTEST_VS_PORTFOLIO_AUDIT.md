# Backtest vs Portfolio — Engine Comparison Audit

> Audit date: 2026-07-01
> Scope: Compare what `runStrategy()` (Backtest) vs `evaluateStrategy()` (Portfolio) read and calculate.

## Executive Summary

| Kategori | Count | Severity |
|----------|------:|----------|
| State machine gap | 1 | 🔴 High |
| Data source violation | 1 | 🔴 High |
| Feature gap | 3 | 🟡 Medium |

## 1. Common Ground

| Komponen | Backtest | Portfolio |
|---|---|---|
| Crash detection algo | `detectCrashAlgo()` + `detectRecoveryAlgo()` dari `crashDetector.ts` | **Sama** — fungsi identik |
| IHSG data source | `dayData[i].ihsgPrice` (dari API DB) | `MKT.ihsg.prices` (dari DB, via `marketRegimeEngine.ts`) |

## 2. Perbedaan Lengkap

### 🔴 Gap A — Crash State Machine

| Aspek | Backtest (`runStrategy()`:286-369) | Portfolio (`evaluateStrategy()`:597-636) |
|---|---|---|
| Cooldown 20 hari | ✅ Ada — `inCrashState` + `crashCooldown` | ❌ **Tidak ada** — stateless |
| Crash → Recovery → Crash cycle | ✅ State machine penuh | ❌ Tidak ada |
| Akibat | Backtest bisa di cooldown pasca-recovery (tidak crash lagi) | Portfolio bisa suruh "exit to safe haven" padahal backtest sudah recovery |

**Lokasi**: `src/engine/core.ts:286-369` (backtest state machine) vs `src/engine/core.ts:597-636` (portfolio stateless).

**Catatan**: `isCrisisMode()` di `src/marketRegimeEngine.ts:134-175` sudah punya state machine dengan hysteresis + fast-forward yang eksak sama dengan backtest. Tapi PortfolioTracker line 182 panggil `evaluateStrategy()` langsung (stateless), bukan `isCrisisMode()`.

### 🔴 Gap B — Stock Price Data Source

| Aspek | Backtest | Portfolio |
|---|---|---|
| Source | `day.stockPrices[ticker]` — historis per tanggal dari DB | `getDynamicStock(ticker).currentPrice` — **live prices Yahoo/GoAPI** |
| AGENTS.md compliance | ✅ Sesuai rule 4 (DB = SOT) | ❌ **Langgar rule 4** — live prices langsung, bukan DB |
| Akibat | Harga konsisten antar hari | Harga bisa berbeda dari kondisi historis DB |

**Lokasi**: `src/components/SimulationTab.tsx:461-494` (backtest) vs `src/components/PortfolioTracker.tsx:428-434` (portfolio valuation pakai `getDynamicStock`).

### 🟡 Gap C — No Ranking in Portfolio

| Aspek | Backtest | Portfolio |
|---|---|---|
| Rank computation | ✅ Setiap hari dari `stockNormScores` + `profileWeights` via `computeDayRankings()` | ❌ Tidak ada |
| Top N selection | ✅ `pickTopTickersByRank()` | ❌ Tidak ada |
| Rebalancing | ✅ Monthly rank-based crossover (rank ≥ 10/15) | ❌ Tidak ada |

### 🟡 Gap D — No Dividend Tracking in Portfolio

| Aspek | Backtest | Portfolio |
|---|---|---|
| Dividend credit | ✅ Annual, net 90% (10% WHT) via `dividendCache.ts` | ❌ Tidak ada |
| `dividendByTicker` | ✅ Di output `BacktestResult` | ❌ Tidak ada |

### 🟡 Gap E — No Adaptive DCA in Portfolio

| Aspek | Backtest | Portfolio |
|---|---|---|
| BPS-based deployment | ✅ Monthly deploy 0-90% cash | ❌ Tidak ada |
| `bpsHistory` tracking | ✅ | ❌ Tidak ada |

## 3. Data Flow Diagram

```
┌──────────────────────────────┐
│        DB (SQLite/D1)        │
│  daily_overview, stock_daily │
└──────┬───────────────────────┘
       │
       ├──→ API (/api/backtest-data) ──→ BacktestDayData[] ──→ runStrategy()
       │       (historical prices, ranks, scores per day)
       │
       └──→ MKT.ihsg.prices ← setIhsgHistory()
                │
                ├──→ isCrisisMode()     ──→ stateful crash √
                ├──→ isCrashActive()    ──→ stateless crash (UI only)
                └──→ evaluateStrategy() ──→ stateless crash ❌ Gap A
                                                    │
                ┌────────────────────────────────────┘
                ↓
         getDynamicStock() ──→ Yahoo/GoAPI live prices ❌ Gap B
```

## 4. Root Cause

**Gap A**: `evaluateStrategy()` di `core.ts:597` sengaja dibuat stateless dan lightweight untuk dipanggil real-time di UI. Tapi PortfolioTracker panggil ini langsung (`PortfolioTracker.tsx:182`), bukan `isCrisisMode()` yang sudah stateful dengan cooldown identik backtest.

**Gap B**: Portfolio selalu tampilkan live prices karena user ingin harga real-time. Tapi AGENTS.md rule 4 mewajibkan DB sebagai SOT untuk semua decision engine. Portfolio valuation (`stocksValue`) pakai `getDynamicStock` langsung tanpa fallback ke DB.

## 5. Recommendations

1. **Portfolio `evaluateStrategy()`** → ganti ke `isCrisisMode()` yang stateful, atau inject state machine (cooldown) ke `evaluateStrategy()`.
2. **Portfolio stock valuation** — tambah fallback: DB price jika `currentPrice` dari live data tidak tersedia atau STALE.
3. **Add warning comment** di `evaluateStrategy()`: "This function is stateless — for Portfolio use isCrisisMode() instead."
4. **Future**: Integrasi ranking engine ke Portfolio agar Strategy Says banner bisa bilang "Stock X dropped from top N" — pakai `getActiveUniverse()` + `computeDayRankings()` pada data DB terbaru.

## 6. Key File References

| File | Lines | What |
|---|---|---|
| `src/engine/core.ts` | 27-582 | `runStrategy()` — full backtest simulation |
| `src/engine/core.ts` | 286-369 | Backtest crash state machine (cooldown, liquidate, recovery re-entry) |
| `src/engine/core.ts` | 444-492 | Backtest monthly rebalancing (rank-based crossover) |
| `src/engine/core.ts` | 597-636 | `evaluateStrategy()` — Portfolio crash check, stateless |
| `src/engine/core.ts` | 638-663 | `shouldTriggerExit()` — per-ticker drawdown check |
| `src/engine/crashDetector.ts` | 6-34 | `detectCrashAlgo()` — shared by both |
| `src/engine/crashDetector.ts` | 53-71 | `detectRecoveryAlgo()` — shared by both |
| `src/engine/ranker.ts` | 3-29 | `computeDayRankings()` — composite score → rank |
| `src/marketRegimeEngine.ts` | 134-175 | `isCrisisMode()` — stateful crash, matches backtest |
| `src/marketRegimeEngine.ts` | 180+ | `isCrashActive()` — stateless (UI) |
| `src/components/PortfolioTracker.tsx` | 178-185 | Portfolio crash check + evaluateStrategy call |
| `src/components/PortfolioTracker.tsx` | 428-434 | Portfolio valuation with getDynamicStock |
| `src/components/SimulationTab.tsx` | 461-494 | Backtest runStrategy call |