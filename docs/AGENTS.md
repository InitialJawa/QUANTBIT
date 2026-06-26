# AGENTS.md — docs/

## Purpose
AI Context Persistence System — menyimpan state project, keputusan arsitektur, onboarding, dan history.

## Ownership
- Root AGENTS.md governs structure and update rules
- This file governs all files under `docs/`

## Local Contracts
- **PROJECT_MASTER.md** — never deleted, updated only on major changes
- **CURRENT_STATE.md** — single source untuk state project + current tasks (update setiap sesi)
- **NEXT_ACTION.md** — priority queue (update setiap sesi, hapus completed items)
- **DECISIONS.md** — append-only log keputusan arsitektur
- **KNOWN_ISSUES.md** — update saat status issue berubah
- **AI_ONBOARDING.md** — update saat project-wide rules berubah
- **MASTER_CHRONICLE.md** — milestone arsitektur mayor (append-only)
- **ADR-*.md** — Architecture Decision Records, immutable setelah accepted
- **audit/** — research reports, audit reports, audit data (referenced, not read daily)
- **archive/** — task lists, old ACTIVE_TASK (historical reference)

## Work Guidance
- DOX pass wajib dilakukan setiap kali edit di project
- Update CURRENT_STATE.md dan NEXT_ACTION.md di akhir setiap sesi
- Buat ADR baru untuk setiap keputusan arsitektur signifikan
- Audit files di `audit/` hanya dibaca saat relevan

## Verification
- Pastikan semua docs references valid
- Pastikan tidak ada stale/contradictory text

## Active Strategy — Single Source of Truth (PRD-009 v2)

EngineConfigContext adalah **single source of truth** untuk SEMUA setting strategi user.
Portfolio adalah **strategy control center** yang menerima settingan via SYNC TO PORTO dan
mencascade settingan tersebut ke SEMUA modul lain (Market, Notifications, AI, Rekomendasi).

**Flow (Sesi 12 — ADR-011 update):**
```
[Portfolio Tab]  ←  user changes engineConfig  ←  StrategySettingsPanel (write)
        ↓
[engineConfig]  ───  single source of truth  ───  consumed by ALL engines
        ↓                                                 ↓
[AppSidebar StrategySettingsPanel (Portfolio)]   [Backtest handleRunAlgoBacktest]
        ↓                                                 ↓
[Live evaluation: evaluateStrategy()]            [effectiveConfig = engineConfig if
 [Notification rules, AI context, BPS]              backtestUseLiveStrategy else draft]
        ↓                                                 ↓
[Real-time signals: Strategy Says banner]         [runStrategy() with effectiveConfig]
                                                          ↓
[Backtest Tab]  ←  results COHERENT with Portfolio  ←  SAME engine, SAME config
        │
[Optional: toggle OFF → DRAFT mode → eksperimen → PROMOTE TO PORTFOLIO → engineConfig]
```

**Key contracts:**
- Setting Portfolio = Setting Backtest (selalu, saat `backtestUseLiveStrategy=true`)
- Portfolio edit setting → cascade ke semua modul + auto-update backtest
- Backtest di Mode Live TIDAK BISA edit strategy fields (greyed, tooltip "Locked ke Strategi Portofolio")
- Backtest di Mode DRAFT bisa edit + tombol "↑ PROMOTE TO PORTFOLIO" untuk apply
- Notification rules membaca dari `engineConfig` (threshold-based, bukan real-time)
- AI context berisi `engineConfig` lengkap untuk menjawab "kenapa exit?" / "harus beli X?"
- Mode: `"algo"`, `"custom"`, `"adaptive_dca"`
- Adaptive Weights: DEPRECATED (Sesi 12, lihat ADR-011)

## Child DOX Index
- `audit/` — Research reports (REPORT-IDX-API-001), audit notes, audit data
- `archive/` — Historical task lists, old ACTIVE_TASK
