# AI Onboarding — QUANTBIT

## Dev Mode

Jalankan **satu** command untuk menjalankan kedua server sekaligus:

```bash
npm run dev
```

Ini menggunakan `concurrently` untuk menjalankan:
- **Express API** (`npm run serve-api`) di `http://localhost:3001` — backend data + AI endpoint
- **Vite dev server** di `http://localhost:5173` — React frontend dengan HMR

Vite proxy otomatis forward `/api/*` ke Express.

> Jangan lupa `npm install` dulu jika `concurrently` belum terinstall.

## AI Chat

- Komponen: `src/components/FloatingAIChat.tsx`
- Context: `src/contexts/AICockpitContext.tsx`
- Client: `src/ai/aiClient.ts`
- System prompt: `src/ai/systemKnowledge.ts`

AI Chat panel hanya terbuka jika user mengklik tombol floating AI Chat — tidak auto-trigger oleh event lain.

## Notes

- Source of truth: `docs/TASK.md`
- Semua data dari D1 via CF Functions (dev mode via Express + SQLite lokal)
- Semua kalkulasi deterministic — NO AI untuk financial math
