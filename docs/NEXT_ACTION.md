# NEXT ACTION

## P0 — 3 Faktor Investasi — AMAN, AGRESIF, DIVIDEN (2026-06-26, Sesi 8)
**Status**: Code changes done, docs updated. Perlu verification.

Delivered:
- **3 profil baru hasil backtest**: AMAN (Q30/G45/V10/M0/D15), AGRESIF (Q20/G60/V10/M10/D0), DIVIDEN (Q15/G20/V5/M0/D60)
- **`activeConfig` type**: `"prod" | "res"` → `string` (profile id) — backward compat via `CW_MAP` lookup
- **Dividend Cache** dipisah ke `src/engine/dividendCache.ts`
- **Adaptive Weights**: dividend fixed, hanya 4 sub-weight lain yang di-adjust
- **AI Context**: `dividendWeight` di `AILiveContext` + prompt updated

**Verification**:
- [ ] `npx tsc --noEmit` — harus PASS 0 errors
- [ ] `npx vite build` — harus PASS
- [ ] `npm test` — full test suite

## P2 — Deferred / Future
- [ ] Run `npm run build` (regenerate year files with stockRawMetrics + stockNormScores)
- [ ] Profile UX (ticker-level overrides, import/export)
- [ ] Notification persistence — already persists, but TTL not enforced
- [ ] Telegram bot
- [ ] Pre-2021 data backfill (IDX warehouse collector perlu historical archive)
- [ ] Proactive alert chip in chat (uses AICockpitContext.proactiveAlerts which is wired but not yet rendered)
- [ ] Auto-execute BPS recommendation (Level 5, requires UX decision)
- [ ] CI workflow untuk Playwright E2E (`.github/workflows/e2e.yml`)
- [ ] Cross-browser E2E (Firefox, WebKit)
