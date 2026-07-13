# Fase 6 — Wireframe

> Layout tiap halaman QuantBit V2. Terminal aesthetic, single page app.

---

## 0. Halaman Registrasi / Login

```
┌─────────────────────────────────────────────┐
│  ╔═════════════════════════════════════════╗ │
│  ║      ██████╗ ██╗   ██╗ █████╗ ███╗   ██╗║ │
│  ║      ██╔══██╗██║   ██║██╔══██╗████╗  ██║║ │
│  ║      ██████╔╝██║   ██║███████║██╔██╗ ██║║ │
│  ║      ██╔══██╗██║   ██║██╔══██║██║╚██╗██║║ │
│  ║      ██████╔╝╚██████╔╝██║  ██║██║ ╚████║║ │
│  ║      ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝║ │
│  ║              command center               ║ │
│  ╚═════════════════════════════════════════╝ │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │  Email                                │   │
│  └──────────────────────────────────────┘   │
│  ┌──────────────────────────────────────┐   │
│  │  Password                             │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  ┌──────────────────────────────────────┐   │
│  │         LOGIN →                      │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  Belum punya akun? [Register]               │
│                                             │
│  ─── tau portofolio lo ───                  │
│  ─── bandingin sama IHSG ───                │
│  ─── AI yang ngerti saham lo ───            │
└─────────────────────────────────────────────┘
```

---

## 1. Market Tab

```
┌─────────────────────────────────────────────────┐
│  QUANTBIT v2              [⚙️] [👤]             │
│  ─────────────────────────────────────────────  │
│  IHSG 7.186 ▲ +0.32%   GOLD 1.342.000 ▼ -0.1%  │
│  USD/IDR 16.325 ▼ -0.05%                        │
├─────────────────────────────────────────────────┤
│  Regime: [RISK_ON ☀️]   Breadth: 65% >score 60  │
│  ─────────────────────────────────────────────  │
│  ┌─────────────────┐  ┌──────────────────────┐  │
│  │ IHSG Chart       │  │ Top Movers           │  │
│  │ [1m][3m][1y][5y] │  │ ▲ BBCA  +2.3%  85   │  │
│  │ ╱╲    ╱╲         │  │ ▲ BBRI  +1.8%  72   │  │
│  │╱  ╲══╱  ╲══      │  │ ▼ TLKM  -0.5%  45   │  │
│  │      ╲    ╲╱     │  │ ▼ ASII  -1.2%  38   │  │
│  └─────────────────┘  └──────────────────────┘  │
│  ┌──────────────────────────────────────────┐   │
│  │ Stock Table: [Search...]           [🔍]  │   │
│  │ ┌────┬──────┬──────┬────┬────┬────┬────┐│   │
│  │ │Code│Price │Chg%  │Vol │BPS │Rank│Reg ││   │
│  │ ├────┼──────┼──────┼────┼────┼────┼────┤│   │
│  │ │BBCA│10.250│+2.3% │2.1M│ 85 │ #2 │🟢  ││   │
│  │ │BBRI│ 5.670│+1.8% │4.5M│ 72 │ #5 │🟢  ││   │
│  │ │TLKM│ 3.200│-0.5% │1.2M│ 45 │#15 │🟡  ││   │
│  │ │ASII│ 6.800│-1.2% │0.8M│ 38 │#22 │🔴  ││   │
│  │ └────┴──────┴──────┴────┴────┴────┴────┘│   │
│  └──────────────────────────────────────────┘   │
│                                                 │
├─────────────────────────────────────────────────┤
│  [📊 Market] [💼 Portfolio] [🔬 Backtest] [🤖 AI]│
└─────────────────────────────────────────────────┘
```

---

## 2. Stock Drawer (Slide dari kanan — pas klik saham)

```
┌─────────────────────────────────────────────────┐
│  [X] Close                             BBCA     │
│  ─────────────────────────────────────────────  │
│  Harga: 10.250   ▲ +2.3%   DataStatus: LIVE 🟢 │
│  ─────────────────────────────────────────────  │
│  BPS: 85 — HIGH_BUY 🟢                          │
│  [Val ██████████░░ 30%] [Mom ████████░░░ 25%]   │
│  [Breadth ████░░░░░░ 15%] [DD ██████░░░░░ 20%]  │
│  [Fear ███░░░░░░░░░ 10%]                        │
│  ─────────────────────────────────────────────  │
│  Ranking: #2 dari 95 IDX80  |  Sektor: Perbankan│
│  Profile Match: AMAN 🟢  AGRESIF 🟡  DIVIDEN 🟢 │
│  ─────────────────────────────────────────────  │
│  [1m Chart] [3m Chart] [1y Chart] [5y Chart]   │
│  ┌──────────────────────────────────────────┐   │
│  │ ╱╲    ╱╲    ╱╲    ╱╲                     │   │
│  │╱  ╲══╱  ╲══╱  ╲══╱  ╲══                 │   │
│  └──────────────────────────────────────────┘   │
│  ─────────────────────────────────────────────  │
│  Fundamentals:                                  │
│  PER: 15.2x  |  PBV: 2.1x  |  ROE: 18.5%       │
│  EPS: 675     |  DER: 1.2x  |  Div Yield: 3.2% │
│  ─────────────────────────────────────────────  │
│  Sektor: Perbankan  |  MCap: 850T               │
│  Rank #2 di sektor  |  Score: 85/100            │
│  ─────────────────────────────────────────────  │
│  [Tambah ke Watchlist]  [AI: "Analisa saham ini"]│
└─────────────────────────────────────────────────┘
```

---

## 3. Portfolio Tab

```
┌─────────────────────────────────────────────────┐
│  💼 Portfolio                    [Sync] [Export] │
│  ─────────────────────────────────────────────  │
│  Wallet: Rp 150.000.000                         │
│  Portfolio: Rp 187.500.000  ▲ +12.3% vs IHSG   │
│  Cash: Rp 25.000.000  |  Gold: Rp 12.500.000   │
│  ─────────────────────────────────────────────  │
│  BPS Dashboard: 68 — MODERATE 🟡                │
│  Active Holdings: 5  |  Total Trades: 23        │
│  ─────────────────────────────────────────────  │
│  Holdings:                                      │
│  ┌────┬─────┬───────┬──────┬──────┬──────┬────┐ │
│  │Code│Lot  │Avg Px │Price │P&L   │BPS   │Rank│ │
│  ├────┼─────┼───────┼──────┼──────┼──────┼────┤ │
│  │BBCA│  10 │ 9.800 │10.250│+4.5% │  85  │ #2 │ │
│  │BBRI│  20 │ 5.200 │ 5.670│+9.0% │  72  │ #5 │ │
│  │TLKM│  15 │ 3.500 │ 3.200│-8.6% │  45  │#15 │ │
│  │ASII│   5 │ 7.200 │ 6.800│-5.6% │  38  │#22 │ │
│  │SMGR│   8 │ 4.500 │ 4.800│+6.7% │  55  │#10 │ │
│  └────┴─────┴───────┴──────┴──────┴──────┴────┘ │
│  ─────────────────────────────────────────────  │
│  Portfolio vs IHSG Chart:                        │
│  ┌──────────────────────────────────────────┐   │
│  │ Portfolio ╱╲  ─── IHSG ╱╲                │   │
│  │╱╲      ╱  ╲   ╱╲    ╱  ╲                │   │
│  │  ╲  ╱╲   ╱   ╱  ╲  ╱    ╲               │   │
│  │   ╲╱  ╲╱   ╱    ╲╱      ╲               │   │
│  └──────────────────────────────────────────┘   │
│  ─────────────────────────────────────────────  │
│  Rebalance Suggestions:                         │
│  ⚠️ TLKM ranking #15 — pertimbangkan exit       │
│  💡 Top candidate: UNVR (#3, BPS 78)            │
│  ─────────────────────────────────────────────  │
│  [Tambah Manual]  [Trade Log]  [Dividen]        │
├─────────────────────────────────────────────────┤
│  [📊 Market] [💼 Portfolio] [🔬 Backtest] [🤖 AI]│
└─────────────────────────────────────────────────┘
```

---

## 4. Backtest Tab

```
┌──────────────────┬──────────────────────────────┐
│ 🔬 Backtest      │                              │
│ ─────────────────│                              │
│ Config:          │   Results                    │
│ ┌──────────────┐ │   ─────────────────          │
│ │ Profile      │ │   CAGR:   14.2%              │
│ │ [AMAN ▼]     │ │   Sharpe:  1.24              │
│ └──────────────┘ │   Max DD: -8.5%              │
│ ┌──────────────┐ │   Win Rate: 68%              │
│ │ Start        │ │   Total Return: Rp 48.7jt    │
│ │ [2021-01-01] │ │   Final Capital: Rp 148.7jt  │
│ └──────────────┘ │   vs IHSG: +4.2% outperform  │
│ ┌──────────────┐ │                              │
│ │ End          │ │   ┌──────────────────────┐   │
│ │ [2026-07-03] │ │   │ Portfolio vs IHSG    │   │
│ └──────────────┘ │   │ ╱╲╱╲  ─── IHSG       │   │
│ ┌──────────────┐ │   │╱    ╲╱  ╲            │   │
│ │ Capital      │ │   └──────────────────────┘   │
│ │ [100.000.000]│ │                              │
│ └──────────────┘ │   Top Holdings Akhir:         │
│                  │   BBCA: 35% | BBRI: 25%       │
│ ⚙️ [Advanced]    │   TLKM: 0% | ASII: 10%       │
│                  │   UNVR: 20% | Cash: 10%       │
│ ┌──────────────┐ │                              │
│ │  RUN         │ │   [Sync to Portfolio]         │
│ │  BACKTEST →  │ │   [Download CSV]              │
│ └──────────────┘ │                              │
│                  │   ── Draft Mode [ON/OFF] ──  │
│ Draft: [ON]      │   (ON = gak ngaruh ke real)  │
│                  │                              │
├──────────────────┴──────────────────────────────┤
│  [📊 Market] [💼 Portfolio] [🔬 Backtest] [🤖 AI]│
└─────────────────────────────────────────────────┘
```

---

## 5. AI Chat (Floating — overlap semua halaman)

```
┌─────────────────────────────────────────────────┐
│  🤖  AI Assistant           [Free: 5/5] [−] [+X]│
├─────────────────────────────────────────────────┤
│  🕐 Halo! Aku siap bantu analisa portofolio lo.  │
│     Mau tau performa saham atau butuh saran      │
│     rebalancing?                                 │
│                                                 │
│  🕐 **Rudi**                                     │
│     > Apakah BBRI masih worth dipegang?          │
│                                                 │
│  🕐 **AI** (melihat portofolio lo...)            │
│     BBRI ada di portfolio lo dengan BPS 72       │
│     (MODERATE) dan ranking #5 dari 95 IDX80.     │
│     Saran gue: **HOLD**. Alasan:                 │
│     • Momentum score masih positif (+1.8%)      │
│     • Fundamental bagus (ROE 16.2%, PER 12x)    │
│     • Tapi pantau support 5.400 — kalau break   │
│       pertimbangkan exit.                        │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │  Ketik pesan...                    [Kirim]│   │
│  └──────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

---

## 6. Settings Tab

```
┌─────────────────────────────────────────────────┐
│  ⚙️ Settings                                     │
│  ─────────────────────────────────────────────  │
│  Profile                    Subscription        │
│  ┌────────────────────┐    ┌─────────────────┐  │
│  │ Nama: Rudi         │    │ Plan: Pro       │  │
│  │ Email: rudi@...    │    │ Active until:    │  │
│  │ Theme: Terminal     │    │ 01-Aug-2026     │  │
│  └────────────────────┘    │ [Manage →]      │  │
│                            └─────────────────┘  │
│  ─────────────────────────────────────────────  │
│  Strategy Preferences                            │
│  ┌──────────────────────────────────────────┐   │
│  │ Profile: [AMAN ▼]                        │   │
│  │ Crash Sensitivity: [10% █░░░░░░░░░]      │   │
│  │ Risk-free Rate: [5.0%]                   │   │
│  │ Benchmark: [60/40 IHSG/Gold]             │   │
│  └──────────────────────────────────────────┘   │
│  ─────────────────────────────────────────────  │
│  Notifications                                   │
│  ┌──────────────────────────────────────────┐   │
│  │ [✓] Regime change alert                  │   │
│  │ [ ] Daily portfolio summary               │   │
│  │ [ ] AI suggestions                        │   │
│  └──────────────────────────────────────────┘   │
│  ─────────────────────────────────────────────  │
│  Data Sources                                    │
│  ┌──────────────────────────────────────────┐   │
│  │ Yahoo Finance: ✅ Connected               │   │
│  │ Last sync: 03 Jul 2026 09:30 WIB         │   │
│  │ [Force Sync]                              │   │
│  └──────────────────────────────────────────┘   │
├─────────────────────────────────────────────────┤
│  [📊 Market] [💼 Portfolio] [🔬 Backtest] [🤖 AI]│
└─────────────────────────────────────────────────┘
```

---

## 7. Admin Tab — Hanya untuk admin/owner

```
┌─────────────────────────────────────────────────┐
│  ⚙️ Admin Panel                        [🔒]     │
│  ─────────────────────────────────────────────  │
│  Ticker Manager                                  │
│  ┌────┬──────┬───────┬──────┬───────┬──────┐   │
│  │Code│Name  │Sektor │Score │Status │Sync  │   │
│  ├────┼──────┼───────┼──────┼───────┼──────┤   │
│  │BBCA│BCA   │Bank   │ 85   │✅     │🟢    │   │
│  │BBRI│BRI   │Bank   │ 72   │✅     │🟢    │   │
│  │TLKM│Telkom│Telco  │ 48   │⚠️     │🟡    │   │
│  └────┴──────┴───────┴──────┴───────┴──────┘   │
│  ─────────────────────────────────────────────  │
│  Pipeline Monitor                                │
│  ┌──────────────────────────────────────────┐   │
│  │ Last Run: 03 Jul 2026 09:30:00 ✅ OK     │   │
│  │ Stocks synced: 95/95                      │   │
│  │ Scores computed: 95/95                    │   │
│  │ Duration: 4.2s                            │   │
│  └──────────────────────────────────────────┘   │
│  ─────────────────────────────────────────────  │
│  System Health                                   │
│  ┌────────┬──────────┬──────────┬───────────┐   │
│  │ Service│ Status   │ Response │ Last Err  │   │
│  ├────────┼──────────┼──────────┼───────────┤   │
│  │ D1     │ 🟢 OK    │ 12ms     │ -         │   │
│  │ KV     │ 🟢 OK    │ 3ms      │ -         │   │
│  │ Yahoo  │ 🟢 OK    │ 850ms    │ -         │   │
│  │ AI     │ 🟢 OK    │ 1.2s     │ -         │   │
│  └────────┴──────────┴──────────┴───────────┘   │
│  ─────────────────────────────────────────────  │
│  Users: 47  |  Active today: 12  |  Pro: 3      │
├─────────────────────────────────────────────────┤
│  [📊 Market] [💼 Portfolio] [🔬 Backtest] [🤖 AI]│
└─────────────────────────────────────────────────┘
```

---

## User Flow — Navigasi

```
┌──────────┐
│  Login   │
└────┬─────┘
     │
     ▼
┌──────────┐
│  Market  │ ← landing page (IHSG, stock table, regime)
└────┬─────┘
     │
     ├── Klik saham → Drawer (detail, score, chart)
     │
     ▼
┌──────────┐
│Portfolio │ ← holdings, BPS dashboard, wallet
└────┬─────┘
     │
     ├── Klik saham → Drawer (sama seperti market)
     ├── Tambah Manual → Modal form
     │
     ▼
┌──────────┐
│ Backtest │ ← config left, results right
└────┬─────┘
     │
     ├── Run → spinner → results
     ├── Sync to Portfolio → konfirmasi → portfolio update
     │
     ▼
┌──────────┐
│   AI     │ ← floating, bisa diakses dari mana aja
└──────────┘
```

---

## Tab Bar (Muncul di semua halaman — fixed bottom)

```
┌─────────────────────────────────────────────────┐
│  [📊 Market] [💼 Portfolio] [🔬 Backtest] [🤖 AI]│
└─────────────────────────────────────────────────┘
```

- Tab aktif **highlighted** (warna berbeda)
- Admin tab (⚙️) muncul di samping AI, cuma visible kalau user adalah admin
- Ikon + label, gak pake ikon aja (clear buat user)
- Settings via ikon gear di header kanan atas

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `1` | Market tab |
| `2` | Portfolio tab |
| `3` | Backtest tab |
| `4` | AI chat (toggle) |
| `s` | Search stocks |
| `Esc` | Tutup drawer/modal |
| `r` | Run backtest (di tab Backtest) |

---

## Mobile Responsive

- **Mobile (<768px):** Stock table → card grid. Side-by-side → stacked. Drawer full screen.
- **Desktop (≥768px):** Full layout dengan tab bar bawah.

---

## Checklist

- [x] Login/Registrasi halaman
- [x] Market tab + stock table + IHSG chart
- [x] Stock Drawer (detail, BPS breakdown, chart, fundamentals)
- [x] Portfolio tab + holdings + BPS dashboard + chart
- [x] Backtest tab (config + results side by side)
- [x] AI Chat (floating)
- [x] Settings/Profile tab
- [x] Admin tab (hidden untuk non-admin)
- [x] User flow navigasi
- [x] Tab bar
- [x] Keyboard shortcuts
- [ ] High fidelity design (Fase 7)
