# NEXT ACTION
## P0 — VERIFY (2026-06-26, Sesi 9)
**Status**: Code changes done, docs updated, tsc + vitest + vite build all green.

Delivered (Sesi 9 — UI/UX Polish + Color Consolidation):
- **Wallet + AI → emerald** (10 file: FloatingWallet, FloatingAIChat, AITestHarness, AIActionApprovalCard, BuyPressureDashboard, dst)
- **Light theme CSS remap diperluas** untuk semua cyan/blue opacities
- **Light theme text contrast** (text-muted, text-tertiary, text-secondary dinaikkan)
- **9 UX Quick Wins** (Phase 1): tab labels ID, sub-tab style unified, back-to-top button, empty state CTA, EMAS tooltip, sub-tab rename, crisis badge, sub-tab persist

**Verification**:
- [x] `npx tsc --noEmit` — PASS 0 errors
- [x] `npx vite build` — PASS 14.5s
- [x] `npx vitest run` — 18/18 passing
- [ ] `npm run test:e2e` — Playwright E2E (17 tests)

## P1 — UX Phase 2 (next sprint)
- [ ] A2 — Keyboard shortcuts (1/2/3/4 tabs, / search, Esc close)
- [ ] A3 — Total Wealth pill on mobile (compact variant)
- [ ] A4 — "Last updated" timestamp chip
- [ ] A7 — Empty states for other tabs (Market, Backtest)
- [ ] A10 — Confirmation modals for destructive actions
- [ ] A13 — Group Settings dropdown into sections
- [ ] A14 — Notification bell panel
- [ ] B1 — Portfolio section anchors + mini TOC
- [ ] B2 — Holdings table: sort/filter/sticky thead
- [ ] B4 — Sticky action menu (Buy/Sell/Top-up/Move to Gold)
- [ ] B5 — Dismissable alerts
- [ ] C1 — News as Market sub-tab
- [ ] C4 — Inline "+ Watch" on ticker cards
- [ ] C6 — Data feed switcher in header
- [ ] D1 — "Jalankan Backtest" button inside tab
- [ ] D2 — Backtest progress indicator
- [ ] D7 — "Config changed, klik Jalankan" banner
- [ ] E5 — CSV export on Analytics sub-tabs
- [ ] F1 — Sidebar collapsible sections
- [ ] F4 — "Danger Zone" group in sidebar

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
- [ ] A5 — Command palette (Cmd+K)
- [ ] A9 — Table sort/filter/pagination
- [ ] A12 — Search results UI

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
- ✅ CSS: Bump light theme text contrast (text-muted CBD5E1→94A3B8, text-tertiary 94A3B8→64748B, text-secondary 475569→334155)
- ✅ A1: Tab labels Market→Pasar, Portfolio→Portofolio
- ✅ A6: Unify sub-tab style to border-bottom emerald (SimulationTab)
- ✅ A7: Portfolio empty state with "Beli Pertama" CTA
- ✅ A11: BackToTop component
- ✅ B10: EMAS/GOLD lot=gram tooltip
- ✅ D6: Backtest sub-tab rename (Backtester→Strategi, Simulasi→Historis)
- ✅ E1: "Krisis" badge on Recovery sub-tab
- ✅ E2: "Risk" → "Proteksi Modal"
- ✅ E4: AnalyticsTab sub-tab localStorage persist
