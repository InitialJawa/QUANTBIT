# NEXT ACTION

## 🔥 P0 — Quantbit AI Depth Upgrade (LOCKED PLAN)
**Status**: Plan lengkap di `docs/AI_DEPTH_UPGRADE_PLAN.md`. **JANGAN RE-ASK — langsung eksekusi.**

Self-contained execution spec untuk next AI session. Decisions semua locked, schema semua spesifik, execution order sequential per level. Total ~22 jam kerja, 12 file (4 new, 8 modified), 4 level terurut:
1. **Level 1** — Smarter Q&A (history persist + richer live context)
2. **Level 2** — Read-only tool use (8 tools via function calling)
3. **Level 3** — Action API with **inline card approval** (10 actions)
4. **Level 4** — Proactive agent (BPS threshold monitor, **default ON**, toggleable)

After completion, mark this P0 as DONE and remove from list.

## P2 — Deferred / Future
- [ ] Run `npm run build` (regenerate year files with stockRawMetrics + stockNormScores)
- [ ] Profile UX (ticker-level overrides, import/export)
- [ ] Unit tests for `src/engine/` pure functions
- [ ] Notification persistence (localStorage/database)
- [ ] Wire `setDividendCache()` (currently 0 dividends)
- [ ] Telegram bot
- [ ] Pre-2021 data backfill
