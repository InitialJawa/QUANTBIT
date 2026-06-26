# NEXT ACTION
## P0 — VERIFY (2026-06-26, Sesi 10)
**Status**: Code changes done, docs updated, tsc + vitest + vite build all green.

Delivered (Sesi 10 — UX Phase 2 Power Features):
- **A2** Keyboard shortcuts (1/2/3/4) + kbd badges
- **A3** Total Wealth pill on mobile
- **A4** LastUpdatedChip component
- **A7** Backtest empty state CTA
- **A10** ConfirmModal component (danger/warning/info)
- **B2** Holdings table sort/filter/sticky thead
- **B5** Dismissable portfolio warnings (per-row + bulk)
- **D1** "Jalankan Backtest" button inside tab
- **D7** "Config changed" amber banner
- **E5** CSV export on 3 Analytics sub-tabs
- **F4** "Danger Zone" group in sidebar

**Verification**:
- [x] `npx tsc --noEmit` — PASS 0 errors
- [x] `npx vitest run` — 18/18 passing
- [x] `npx vite build` — PASS 10.9s

## P1 — UX Phase 3 (next sprint)
- [ ] A5 — Command palette (Cmd+K)
- [ ] A9 — Table pagination (after B2 sort/filter, add paging)
- [ ] A12 — Search results UI (categorized dropdown)
- [ ] A13 — Group Settings dropdown into sections
- [ ] A14 — Notification bell panel (list + mark read)
- [ ] B1 — Portfolio section anchors + mini TOC
- [ ] B4 — Sticky action menu (Buy/Sell/Top-up/Move to Gold)
- [ ] C1 — News as Market sub-tab (currently in sidebar)
- [ ] C4 — Inline "+ Watch" on Top Movers cards in sidebar
- [ ] C6 — Data feed switcher in header (Y/G/S popover)
- [ ] D2 — Backtest progress indicator (phased labels)
- [ ] F1 — Sidebar collapsible sections

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
- [ ] PWA / install prompt

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

## Done Recently (Sesi 9 — UI/UX Polish + Color)
- ✅ Color: Wallet + AI + BuyPressure → emerald
- ✅ Color: Decorative blue/indigo → emerald
- ✅ CSS: Extend cyan/blue remap rules (all opacities)
- ✅ CSS: Bump light theme text contrast
- ✅ A1: Tab labels Market→Pasar, Portfolio→Portofolio
- ✅ A6: Unify sub-tab style to border-bottom emerald (SimulationTab)
- ✅ A7: Portfolio empty state with "Beli Pertama" CTA
- ✅ A11: BackToTop component
- ✅ B10: EMAS/GOLD lot=gram tooltip
- ✅ D6: Backtest sub-tab rename
- ✅ E1: "Krisis" badge on Recovery sub-tab
- ✅ E2: "Risk" → "Proteksi Modal"
- ✅ E4: AnalyticsTab sub-tab localStorage persist

## Done Recently (Sesi 10 — UX Phase 2 Power Features)
- ✅ A2: Keyboard shortcuts (1/2/3/4) + kbd badges
- ✅ A3: Total Wealth pill on mobile
- ✅ A4: LastUpdatedChip component
- ✅ A7: Backtest empty state CTA
- ✅ A10: ConfirmModal component (3 variants)
- ✅ B2: Holdings table sort/filter/sticky thead
- ✅ B5: Dismissable portfolio warnings
- ✅ D1: "Jalankan Backtest" button in tab
- ✅ D7: "Config changed" amber banner
- ✅ E5: CSV export on Leaders/Recovery/Capital
- ✅ F4: "Danger Zone" group in sidebar

