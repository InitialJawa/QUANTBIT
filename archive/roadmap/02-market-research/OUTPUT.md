# Fase 2 — Market Research

## Kompetitor Langsung

| Aplikasi | Tipe | Kekuatan | Kelemahan |
|----------|------|----------|-----------|
| **Stockbit** | Broker + sosial + analisis | Data fundamental gratis, komunitas, fee rendah | Error jam sibuk, fitur Pro berbayar, fokus mobile |
| **RTI Business** | Data provider | Data terlengkap, real-time | **Berbayar** (Rp150rb/bln), delay 10 menit untuk free |
| **Ajaib** | Broker multi-aset | Fee rendah, 3jt+ user, multi-produk | Delay 10-15 menit, error berulang, kasus keamanan Rp1.8M |
| **IPOT** | Broker + robo trading | Shared access, multi-account, robo trading | UI rumit, fee agak tinggi |
| **Pluang** | Broker multi-aset | 2000+ produk, fee 0%, Aura AI | Bukan khusus analisis |

## Open Source / Niche

| Tool | Stack | USP |
|------|-------|-----|
| **Panen** | Go + Svelte | Desktop decision engine, Graham Number, crash playbook |
| **stockai** | Python CLI | Multi-agent AI, 6-gate filter, hedge fund scoring |
| **Pulse CLI** | TUI | Bandarmology, SAPTA ML engine, AI analisis |
| **PortSyncro** | Web | Portfolio sync lintas broker |
| **IDX-UI** | Deno | Screener composite score |

## Pain Point Utama (dari 20+ sumber)

1. **Aplikasi error pas market buka** — Stockbit/Ajaib error berhari-hari di jam krusial
2. **Data delay** — Ajaib delay 10-15 menit, RTI bayar 150rb/bulan
3. **Portfolio terpecah** — Investor punya saham di 3 broker, gak ada unified view
4. **Gak ada decision engine** — Semua tools cuma kasi data, bukan keputusan
5. **Desktop experience buruk** — Stockbit/Ajaib fokus mobile
6. **Keamanan** — Kasus Ajaib Rp1.8M transaksi tak sah

## Market Trend

- **50.645 investor baru/hari** di 2026 (total 26.12 juta SID)
- AI-assisted investment makin populer
- Multi-platform diversification (investor punya >1 broker buat safety)

## SWOT QuantBit

**Strengths:**
- BPS, factor ranking, crash detection — genuine IP
- Terminal aesthetic (differentiator visual)
- Arsitktur bersih (D1 single SOT, Zod)

**Weaknesses:**
- Brand awareness dari 0
- Single developer
- Bukan broker (user tetep perlu Stockbit/Ajaib)

**Opportunities:**
- 50k+ investor baru/hari butuh tools
- Stockbit/Ajaib error → user cari alternatif
- RTI paywall → user frustrasi
- Gak ada kompetitor dengan decision engine+backtest+AI

**Threats:**
- Stockbit bisa add portfolio analytics
- Pluang (Aura AI) makin mature
- User might not want "another app"
- IDX data access restrictions

## Kesimpulan

**Gak perlu pivot.** Posisi QuantBit unik: decision engine + portfolio tracker + backtest + AI. Kompetitor langsung gak ada.
