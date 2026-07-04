# AGENTS.md — DOX Root

Ini adalah root DOX rail untuk project **QUANTBIT**. Semua AI agent WAJIB membaca ini dan mengikuti DOX chain.

---

## Bagian 1 — DOX Framework

### Core Contract

- AGENTS.md adalah binding work contracts untuk subtree masing-masing
- Work products, source materials, instructions, records, assets, dan durable docs harus bisa dipahami dari AGENTS.md terdekat plus semua parent AGENTS.md di atasnya

### Read Before Editing

1. Baca root `AGENTS.md`
2. Identifikasi semua file/folder yang akan disentuh
3. Jalan dari root ke setiap target path
4. Baca semua `AGENTS.md` yang ditemukan di sepanjang route
5. Jika parent AGENTS.md me-list child AGENTS.md yang scope-nya mencakup path, baca child itu dan lanjut
6. Gunakan AGENTS.md terdekat sebagai local contract dan parent docs untuk aturan repo-wide
7. Jika docs konflik, doc yang lebih dekat mengontrol detail kerja lokal, tapi tidak ada child doc yang boleh melemahkan DOX

Jangan andalkan memori. Baca ulang DOX chain yang berlaku di session ini sebelum editing.

### Update After Editing

Setiap perubahan berarti WAJIB menjalani DOX pass sebelum task selesai.

Update AGENTS.md terdekat saat perubahan mempengaruhi:
- purpose, scope, ownership, atau responsibilities
- durable structure, contracts, workflows, atau operating rules
- required inputs, outputs, permissions, constraints, side effects, atau artifacts
- user preferences tentang behavior, communication, process, organization, atau quality
- pembuatan, penghapusan, pemindahan, rename, atau index AGENTS.md

Update parent docs saat parent-level structure, ownership, workflow, atau child index berubah. Update child docs saat parent berubah dan mengubah local rules. Hapus teks stale atau kontradiktif segera. Edit kecil yang tidak mengubah behavior atau contracts boleh leave docs unchanged, tapi DOX pass tetap harus dilakukan.

### Hierarchy

- Root AGENTS.md adalah DOX rail: project-wide instructions, global preferences, durable workflow rules, dan top-level Child DOX Index
- Child AGENTS.md memiliki domain-specific instructions dan Child DOX Index sendiri
- Setiap parent menjelaskan apa yang direct children-nya cover dan apa yang tetap dipegang parent
- Semakin dekat doc ke work, semakin spesifik dan praktis harusnya

### Closeout

1. Re-check changed paths terhadap DOX chain
2. Update nearest owning docs dan affected parents/children
3. Refresh setiap affected Child DOX Index
4. Hapus stale atau contradictory text
5. Jalankan existing verification jika relevan
6. Report docs yang sengaja tidak diubah dan why

### Child DOX Index

- `src/` — React UI components, hooks, contexts, engine, AI client, types, utils
- `scripts/` — Pipeline scripts: pipeline-sync.ts (Yahoo → D1 prices+scores+momentum), seed-local-db.ts (local SQLite dev DB)
- `docs/` — TASK.md (session SOT), research/ (V2 blueprint)
- `handover/` — session snapshots
- `research/` — V2 blueprint (33 docs)
- `roadmap/` — fase roadmap (1-6)
- `external/` — git submodules (idx-api)

---

## Bagian 2 — Sesion Start

Awal sesi baru:
```
Read docs/TASK.md and continue the project.
```

---

## Bagian 3 — Project-Wide Rules

- **No AI for financial math** — semua kalkulasi deterministic
- **DB = single source of truth** — semua engine baca dari D1, bukan file/in-memory
- **Ask before adding dependencies**
- **No refactor without DOX pass**
- **Update docs setiap sesi**
- **Buat handover setelah sesi berakhir**
