# NEXT ACTION

## ✅ P0 — Quantbit AI Depth Upgrade (DONE 2026-06-25, Sesi 6)
**Status**: All 4 levels shipped. Lihat `docs/DECISIONS.md` 2026-06-25 "Quantbit AI Depth Upgrade" + `handover/HANDOVER_2026_06_25_S6.md`.

Delivered:
- **Level 1**: Chat history persist (localStorage, cap 100) + richer live context (bps, backtestConfig, alerts)
- **Level 2**: 8 read-only tools (get_portfolio_state, get_bps_now, get_regime_details, get_ticker_metrics, get_market_history, get_backtest_config, get_engine_config, get_active_universe) — JSON-block function calling, semua provider compatible
- **Level 3**: 10 actions + inline `AIActionApprovalCard` (Approve/Reject) — zero auto-execute, deterministic handlers re-used
- **Level 4**: `useProactiveAgent` hook + 6 BPS rules + 5-min cooldown per rule, default ON, Settings toggle

**Verification**: tsc --noEmit PASS, vite build PASS. Bundle +0.7 KB.

## ✅ P0 — Test Coverage 4-Lapis (DONE 2026-06-25, Sesi 7)
**Status**: 170 automated tests across 4 lapis. Lihat `docs/DECISIONS.md` 2026-06-25 "Test Coverage for AI Features" + `handover/HANDOVER_2026_06_25_S7.md`.

Delivered:
- **Lapis 1** (95 unit tests): `extractToolCalls` regex parser, `formatLiveContext`, `ACTION_REGISTRY` (10 actions), `buildPendingActionFromContext`, `shouldFireRule` cooldown gate
- **Lapis 2** (18 component tests): `AIActionApprovalCard` render/click/error, `FloatingAIChat` localStorage persist
- **Lapis 3** (manual + harness): `MANUAL_TEST_GUIDE.md` (30+ cases) + `AITestHarness` dev panel (Tools/Actions/Cooldown/Storage tabs)
- **Lapis 4** (17 E2E tests discoverable): Playwright Chromium tests for chat, action approval, settings, proactive cooldown

**Refactor side-effects**: Fixed off-by-one bug di `extractToolCalls` regex (gagal parse `{"args": {}}` empty-object case).

**Verification**: `npm test` 152/152, `npm run test:ui` 18/18, `tsc --noEmit` 0 errors, `vite build` PASS.

## P2 — Deferred / Future
- [ ] Run `npm run build` (regenerate year files with stockRawMetrics + stockNormScores)
- [ ] Profile UX (ticker-level overrides, import/export)
- [ ] Notification persistence — already persists, but TTL not enforced
- [ ] Wire `setDividendCache()` (currently 0 dividends)
- [ ] Telegram bot
- [ ] Pre-2021 data backfill
- [ ] Proactive alert chip in chat (uses AICockpitContext.proactiveAlerts which is wired but not yet rendered)
- [ ] Auto-execute BPS recommendation (Level 5, requires UX decision)
- [ ] CI workflow untuk Playwright E2E (`.github/workflows/e2e.yml`)
- [ ] Cross-browser E2E (Firefox, WebKit)
