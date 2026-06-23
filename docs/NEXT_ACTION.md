# NEXT ACTION

## Priority Queue
### P0 — Fix RAW_STOCKS_DATA Stale Prices + Sector Mismatch
- Sync 31 stock prices dari idx80_scan.json ke raw_stocks_data.ts
- Fix 20 sector mismatches between RAW_STOCKS_DATA sectors vs PF (marketData.ts) sectors
- Update stale MKT.ihsg.value (5886→6008) & MKT.usdidr.value (17985→17714)

### P1 — Data Pipeline
- Run IDX scraper untuk fundamentals 2026 (current: 0 records)
- Jakarta holiday calendar-aware gap detection (128 gaps mostly libur, verify)

### P2 — Telegram Bot
### P3 — MCP Server

## Completed This Session (2026-06-23)
- **Comprehensive data audit** — checked all data sources: historical JSON (✅), yearly JSON (✅), scan data (✅), marketData.ts (🟡 stale), stock prices (🔴 stale 30-147%), sectors (🔴 20 mismatch), fundamentals 2026 (🔴 0 records)
- See `docs/KNOWN_ISSUES.md` for full audit findings

## Setelah Selesai
1. Update CURRENT_STATE.md
2. Update ACTIVE_TASK.md
3. Update KNOWN_ISSUES.md
4. Buat handover baru
