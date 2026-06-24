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
- `docs/` — AI Context Persistence System (project master, state, decisions, ADRs)
- `handover/` — session snapshots
- `scripts/` — data pipeline scripts (fetch, build, split, scrape)
- `collectors/` — data collectors (IDX fundamental, market data)
- `functions/` — Cloudflare Pages Functions (production API)
- `data/` — raw datasets, historical market data, caches
- `db/` — database schema and migrations
- `external/` — git submodules (idx-api)

---

## Bagian 2 — InsForge Backend

<!-- INSFORGE:START -->
This project uses [InsForge](https://insforge.dev): an all-in-one, open-source Postgres-based backend (BaaS) that gives this app a database, authentication, file storage, edge functions, realtime, an AI model gateway, and payments through one platform.

- **Project:** **My First Project** (API base `https://7k97rmp5.us-east.insforge.app`)
- **Skills:** these InsForge skills are installed for supported coding agents. Reach for them before implementing any InsForge feature instead of guessing the API:
  - `insforge`: app code with the `@insforge/sdk` client (database CRUD, auth, storage, edge functions, realtime, AI, email, and Stripe payments).
  - `insforge-cli`: backend and infrastructure via the `insforge` CLI (projects, SQL, migrations, RLS policies, storage buckets, functions, secrets, payment setup, schedules, deploys).
  - `insforge-debug`: diagnosing failures (SDK/HTTP errors, RLS denials, auth and OAuth issues) and running security or performance audits.
  - `insforge-integrations`: wiring external auth providers (Clerk, Auth0, WorkOS, Better Auth, etc.) for JWT-based RLS, or the OKX x402 payment facilitator.
  - `find-skills`: discovering additional skills on demand.
- **Credentials:** app code reads keys from `.env.local`; the CLI reads `.insforge/project.json`. Never hardcode or commit keys.

Key patterns:

- Database inserts take an array: `insert([{ ... }])`.
- Reference users with `auth.users(id)`; use `auth.uid()` in RLS policies.
- For storage uploads, persist both the returned `url` and `key`.
<!-- INSFORGE:END -->

---

## Bagian 3 — AI Context Persistence

### Command Standar

```
/project-status
→ baca: docs/PROJECT_MASTER.md + docs/CURRENT_STATE.md + docs/ACTIVE_TASK.md + docs/NEXT_ACTION.md
```

Awal sesi baru:
```
Read docs/AI_ONBOARDING.md and continue the project.
```

### Sesi Berikutnya
```bash
Read docs/AI_ONBOARDING.md and continue the project.
```

---

## Bagian 4 — Project-Wide Rules

- **No AI for financial math** — semua kalkulasi keuangan deterministic
- **Ask before adding dependencies**
- **No refactor without DOX pass**
- **Update docs after setiap sesi**
- **Buat handover setelah sesi berakhir**
