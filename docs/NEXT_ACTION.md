# NEXT ACTION

## P0 — VERIFY (2026-06-26, Sesi 8)
**Status**: Code changes done, docs updated. Perlu verification.

Delivered:
- **5 sync drifts fixed** (FASE 1.1-1.5)
- **9 feature simplifications** (FASE 2.1-2.9)
- **7 dead components removed** (~470 LOC)
- **Single source of truth** untuk activeProfileId (ADR-003)

**Verification**:
- [x] `npx tsc --noEmit` — PASS 0 errors
- [ ] `npx vite build` — harus PASS
- [ ] `npm test` — full test suite
- [ ] `npm run test:ui` — component tests

## P2 — Deferred / Future
- [ ] Run `npm run build` (regenerate year files)
- [ ] Profile UX (ticker-level overrides, import/export)
- [ ] Notification persistence — TTL not enforced
- [ ] Telegram bot
- [ ] Pre-2021 data backfill
- [ ] Proactive alert chip in chat (wired but not yet rendered)
- [ ] Auto-execute BPS recommendation (Level 5, requires UX decision)
- [ ] CI workflow untuk Playwright E2E
- [ ] Cross-browser E2E (Firefox, WebKit)

## Done Recently (Sesi 8)
- ✅ FASE 1.1 — Crisis detection unified to 60d-drawdown
- ✅ FASE 1.2 — MKT.ihsg.monthly computed (not hardcoded)
- ✅ FASE 1.3 — Portfolio value calculation standardized
- ✅ FASE 1.4 — Total Wealth view (stocks + cash + gold) in AppHeader
- ✅ FASE 1.5 — watchlist_count → idx_universe_size
- ✅ FASE 2.1 — 7 dead components removed
- ✅ FASE 2.2 — NotificationContext slimmed (3 methods instead of 8)
- ✅ FASE 2.3 — Fine-Tune sliders removed from sidebar
- ✅ FASE 2.4 — Advanced safeguards collapsed into `<details>`
- ✅ FASE 2.5 — Settings dropdown profile picker removed
- ✅ FASE 2.6 — SSOT activeProfileId (removed ui.activeConfig + idx_activeconfig)
- ✅ FASE 2.7 — Backtest no longer auto-runs (explicit button only)
- ✅ FASE 2.8 — Sticky "Beli Cepat" CTA in Portfolio
- ✅ FASE 2.9 — Jargon labels simplified
