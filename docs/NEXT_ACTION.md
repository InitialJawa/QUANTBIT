# NEXT ACTION

## Priority Queue
### P2 — Data Validation
- **Verify IHSG Jan 2026 spike** — IHSG 8748 di 2026-01-02 (vs ~7000 akhir 2025). Cek raw Yahoo `^JKSE` data
- **Gold unit mismatch** — `live_market.json` gold: 4347 (USD/oz) vs MKT gold value (IDR/gram). Standardisasi satuan di semua layer

### P3 — Backtest Integrity
- Jakarta holiday calendar-aware gap detection (current: all weekdays bridged)

### P4 — Telegram Bot / MCP Server (Deferred)

## Completed This Session (2026-06-23)
- **Data Validation Audit** — full pipeline traced: daily live feed, idx80_scan, backtest year files, carry-forward ratio (6%)
- **Findings documented** — see `docs/AUDIT_DATA_SINTETIS.md` + `docs/DATA_AUDIT_NOTES.md`
- **IDX scraper timeout fix** — connect 10s, read 30s, retry 3→2
- **MKT sync** — hardcoded values updated ke live_market.json (IHSG 6101, gold 2371593 IDR/gram)
- **devMock Yahoo prices** — `/api/yahoo/live-prices`, `/api/engine/idx80`, `/api/fundamentals` mock buat local dev
- **force-sync fix** — `Math.random()` diganti compute deterministik dari chart data (momentum, quality, value, growth)
- **live_market.json refreshed** — sudah up-to-date 2026-06-23
- **IHSG Jan 2026 spike verified** — 8748 confirmed real dari raw Yahoo data (peak 9134, crash 8232)
- **Gold unit mismatch fixed** — `post_process_live_market.py` sekarang fetch GC=F langsung + konversi USD/oz→IDR/gram
- **Carry-forward labeled** — `DataStatus.CARRIED_FORWARD` added, bridged data ditandai `isCarriedForward` di API response

## Setelah Selesai
1. Update CURRENT_STATE.md ✅
2. Update ACTIVE_TASK.md ✅
3. Update KNOWN_ISSUES.md ✅
4. Buat handover baru
