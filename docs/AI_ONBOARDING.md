# AI ONBOARDING
Sebelum melakukan apapun:
1. Baca PROJECT_MASTER.md
2. Baca CURRENT_STATE.md (SOT untuk state project + current tasks)
3. Baca NEXT_ACTION.md (priority queue)
4. Baca DECISIONS.md (append-only log keputusan arsitektur)
5. Baca KNOWN_ISSUES.md (status issue open/investigating/fixed)
6. Baca MASTER_CHRONICLE.md (milestone arsitektur mayor)
7. Baca ADR-*.md yang relevan (immutable setelah accepted)
8. Baca root AGENTS.md
9. Baca child AGENTS.md relevan (src/, docs/, functions/)
10. Baca handover/ file terbaru (HANDOVER_YYYY_MM_DD_Sn.md) untuk konteks sesi terakhir

## 🚨 CRITICAL — Source of Truth (Sesi 12 / ADR-011)

**`engineConfig` adalah SATU-SATUNYA sumber kebenaran untuk strategy fields.**

- Portfolio, BPS Dashboard, AI Agent, real-time signals → semua baca `engineConfig`
- `backtestConfig` = DRAFT SANDBOX saja (tidak sinkron otomatis)
- **DEFAULT**: backtest = `engineConfig` (coherent by default via `backtestUseLiveStrategy=true`)
- **Sandbox mode**: toggle OFF → user bisa edit `backtestConfig`, klik "↑ PROMOTE TO PORTFOLIO" untuk apply

**Settings UI**: SELALU gunakan `<StrategySettingsPanel>` untuk 10 strategy fields. Identik di Portfolio + Backtest sidebar. Adaptive Weights SUDAH DIHAPUS.

**Detail lengkap**: `docs/ADR-011.md` (just created di Sesi 12). Lihat juga `docs/docs/AGENTS.md` untuk SOT flow diagram.

## Dilarang
- Mengubah logika kalkulasi keuangan tanpa deterministic verification
- Menambahkan dependensi tanpa konfirmasi
- Menggunakan AI untuk menghitung metrik finansial (harus deterministic engine)
- Melakukan refactor besar tanpa DOX pass
- Edit `engineConfig` strategy fields dari Backtest (harus via PROMOTE TO PORTFOLIO, atau toggle ke Live mode)
- Pakai inline settings UI di sidebar (harus `<StrategySettingsPanel>`)

## ⚠️ CLOSEOUT — WAJIB DIJALANKAN SETIAP SELESAI SESI
Tidak ada sesi yang dianggap selesai sebelum closeout dijalankan.

### Setelah Selesai
1. Update CURRENT_STATE.md — pindahkan completed → In Progress, update tanggal
2. Update NEXT_ACTION.md — hapus completed, update priority
3. Update DECISIONS.md — jika ada keputusan arsitektur baru
4. Update MASTER_CHRONICLE.md — log perubahan besar sesi ini
5. Buat ADR baru untuk setiap keputusan arsitektur signifikan (format: `docs/ADR-NNN.md`)
6. Buat handover baru ke `handover/` format: `HANDOVER_YYYY_MM_DD_Sn.md`
7. Update root `AGENTS.md` + relevant child `AGENTS.md` jika child index berubah
8. Hapus stale/contradictory text jika ada

## Test Commands
- `npx tsc --noEmit` — type check (PASS 0 errors required)
- `npx vitest run` — 18 unit + component tests
- `npx vite build` — production build (~12s)
- `npm test` (optional) — full test suite (170 tests)
