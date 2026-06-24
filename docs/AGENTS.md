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

## Child DOX Index
(None — all files are managed directly by this AGENTS.md)
