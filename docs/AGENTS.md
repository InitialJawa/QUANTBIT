# AGENTS.md — docs/

## Purpose
AI Context Persistence System — menyimpan state project, keputusan arsitektur, onboarding, dan history.

## Ownership
- Root AGENTS.md governs structure and update rules
- This file governs all files under `docs/`

## Local Contracts
- **PROJECT_MASTER.md** — never deleted, updated only on major changes
- **CURRENT_STATE.md** — update setiap selesai sesi
- **ACTIVE_TASK.md** — sprint tracker, update real-time
- **DECISIONS.md** — append-only log keputusan arsitektur
- **KNOWN_ISSUES.md** — update saat status issue berubah
- **NEXT_ACTION.md** — update setiap sesi
- **AI_ONBOARDING.md** — update saat project-wide rules berubah
- **MASTER_CHRONICLE.md** — append-only log perubahan besar
- **ADR-*.md** — Architecture Decision Records, immutable setelah accepted
- **REPORT-*.md** — Research reports & discoveries
- **audit_*.json** — Audit results & metrics

## Work Guidance
- DOX pass wajib dilakukan setiap kali edit di project
- Update CURRENT_STATE.md dan NEXT_ACTION.md di akhir setiap sesi
- Buat ADR baru untuk setiap keputusan arsitektur signifikan

## Verification
- Pastikan semua docs references valid
- Pastikan tidak ada stale/contradictory text

## Active Strategy — Single Source of Truth (PRD-009 v2)

EngineConfigContext adalah **single source of truth** untuk SEMUA setting strategi user.
Portfolio adalah **strategy control center** yang menerima settingan via SYNC TO PORTO dan
mencascade settingan tersebut ke SEMUA modul lain (Market, Notifications, AI, Rekomendasi).

**Flow:**
```
[Backtest] → user configures → runStrategy() → result
         ↓
[SYNC TO PORTO] → copy snapshot to engineConfig
         ↓
[Portfolio] → reads engineConfig → drives Market, Notifications, AI
```

**Key contracts:**
- Setting Backtest = Setting Portfolio (sama persis setelah SYNC)
- Portfolio edit setting → cascade ke semua modul
- Notification rules membaca dari `engineConfig` (threshold-based, bukan real-time)
- AI context berisi `engineConfig` lengkap untuk menjawab "kenapa exit?" / "harus beli X?"
- Mode baru: `"custom"` (exclusive universe, bukan forced holding)

## Child DOX Index
(None — all files are managed directly by this AGENTS.md)
