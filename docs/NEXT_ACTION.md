# NEXT ACTION

## Priority Queue
### P2 — Data Validation
- **Verify IHSG Jan 2026 spike** — IHSG 8748 di 2026-01-02 (vs ~7000 akhir 2025). Cek raw Yahoo `^JKSE` data
- **Run IDX scraper** untuk fundamentals 2026 (current: 0 records)
- **Refresh `live_market.json`** — stale sejak 2026-06-11, IHSG 5886 vs backtest 6101
- **Gold unit mismatch** — `live_market.json` gold: 4347 (USD/oz) vs MKT gold value (IDR/gram)

### P3 — Backtest Integrity
- Label carry-forward data dengan `DataStatus.CARRIED_FORWARD`
- Jakarta holiday calendar-aware gap detection

### P4 — Telegram Bot / MCP Server (Deferred)

## Completed This Session (2026-06-23)
- **Data Validation Audit** — full pipeline traced: daily live feed, idx80_scan, backtest year files, carry-forward ratio (6%)
- **Findings documented** — see `docs/AUDIT_DATA_SINTETIS.md` + `docs/DATA_AUDIT_NOTES.md`

## Setelah Selesai
1. Update CURRENT_STATE.md
2. Update ACTIVE_TASK.md
3. Update KNOWN_ISSUES.md
4. Buat handover baru
