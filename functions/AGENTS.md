# AGENTS.md — functions/

## Purpose
Cloudflare Pages Functions — production API endpoints for auth, data CRUD, AI chat, and engine operations.

## Ownership
- Root AGENTS.md governs project-wide rules
- InsForge backend rules apply (see root AGENTS.md Bagian 2)

## Local Contracts
- Functions run on Cloudflare Pages edge runtime (Workers)
- D1 database binding: `quantbit-db`
- Auth using PBKDF2 (server-side)
- AI chat via Gemini/Groq/OpenRouter
- No Express-specific APIs (that's local dev only via `src/server/`)

## Work Guidance
- Deploy via `npx wrangler pages deploy`
- Test locally via `npx wrangler pages dev dist`
- Environment variables via Cloudflare dashboard or `.env`

## Verification
- `npm run build` — builds functions + frontend
- `npm start` — local preview via Wrangler

## Child DOX Index
- `functions/api/` — API route handlers
