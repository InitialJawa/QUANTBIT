# Fase 4 — PRD

## User Personas

### Persona 1: Rudi (34, Trader Aktif)
- Pekerjaan: Freelance developer
- Portofolio: Rp200jt di Stockbit + Ajaib
- Pain: Aplikasi broker error pas market buka, puyeng tracking 2 broker
- Butuh: Unified view + decision engine buat eksekusi cepet
- Teknologi: Power user, nyaman di desktop

### Persona 2: Sari (28, Investor Jangka Panjang)
- Pekerjaan: Marketing manager
- Portofolio: Rp50jt di Bibit + Stockbit
- Pain: Gak ngerti saham mana yang outperformed, bingung rebalancing
- Butuh: Backtest + AI yang jelasin pake bahasa sederhana
- Teknologi: Casual user, mostly mobile

## Fitur — Prioritas

### Must Have (MVP)
1. **Portfolio tracker** — input manual, valuation real-time, unified view lintas broker
2. **Decision engine** — BPS + factor ranking + crash detection + market regime
3. **Backtest** — config profile, run, lihat hasil (terbatas di free)
4. **Market overview** — IHSG, gold, gainers/losers, regime status

### Should Have (Sprint 1-2)
5. **AI chat** — portfolio-aware, structured output (terbatas di free)
6. **Watchlist** — pantau saham favorit
7. **Portfolio vs IHSG chart** — benchmark comparison
8. **Settings** — profile preferences, subscription management

### Nice to Have (Post-MVP)
9. **Notifications** — price alert, regime change
10. **Dividend tracking** — forward dividend forecast
11. **Admin panel** — ticker manager, pipeline monitor

## Fitur yang DIHAPUS (dari v1)
- MCP Server
- Proactive AI Agent (L4)
- Adaptive weights
- Multiple AI providers
- Strategy comparison
- WebSocket real-time
- Email notifications

## Freemium Split

| Fitur | Free | Pro (Rp99rb) | Quant (Rp199rb) |
|-------|------|--------------|-----------------|
| Market overview | ✅ | ✅ | ✅ |
| Portfolio (max) | 10 holdings | Unlimited | Unlimited |
| BPS score | ✅ | ✅ | ✅ |
| Factor ranking | ❌ | ✅ | ✅ |
| Crash detection | ❌ | ✅ | ✅ |
| AI chat | 5 msg/bln | Unlimited | Unlimited |
| Backtest (years) | 2 yr | 5 yr | Unlimited |
| Backtest config | 1 config | Unlimited | Unlimited |
| Multi-portfolio | ❌ | ❌ | ✅ |
| Priority support | ❌ | ❌ | ✅ |
| Export/import | ❌ | ❌ | ✅ |
