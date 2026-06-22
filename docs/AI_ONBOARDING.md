# AI ONBOARDING
Sebelum melakukan apapun:
1. Baca PROJECT_MASTER.md
2. Baca CURRENT_STATE.md
3. Baca ACTIVE_TASK.md
4. Baca DECISIONS.md
5. Baca KNOWN_ISSUES.md
6. Baca NEXT_ACTION.md
7. Baca MASTER_CHRONICLE.md
8. Baca root AGENTS.md
9. Baca child AGENTS.md relevan

## Dilarang
- Mengubah logika kalkulasi keuangan tanpa deterministic verification
- Menambahkan dependensi tanpa konfirmasi
- Menggunakan AI untuk menghitung metrik finansial (harus deterministic engine)
- Melakukan refactor besar tanpa DOX pass

## ⚠️ CLOSEOUT — WAJIB DIJALANKAN SETIAP SELESAI SESI
Tidak ada sesi yang dianggap selesai sebelum closeout dijalankan.

### Setelah Selesai
1. Update CURRENT_STATE.md — pindahkan completed → In Progress, update tanggal
2. Update ACTIVE_TASK.md — update sprint + task statuses
3. Update NEXT_ACTION.md — hapus completed, update priority
4. Update DECISIONS.md — jika ada keputusan arsitektur baru
5. Update MASTER_CHRONICLE.md — log perubahan besar sesi ini
6. Buat handover baru ke handover/ format: HANDOVER_YYYY_MM_DD_Sn.md
7. Hapus stale/contradictory text jika ada
