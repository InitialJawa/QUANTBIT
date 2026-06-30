# PROJECT MASTER

## Identity
| Field | Value |
|-------|-------|
| Project | QUANTBIT — Quantitative Stock Terminal |
| Owner | @InitialJawa |
| Goal | Quantitative stock terminal dengan deterministic engine, AI narrative, real-time IHSG data, dan portfolio rebalancing otomatis. UI/UX koheren lintas 4 tab (Pasar/Portofolio/Backtest/Analitik) via single source of truth (engineConfig). |
| Stack | TypeScript, React 19, Vite 6, Tailwind CSS 4, Express 4, Cloudflare Pages + D1, Gemini AI |
| Type | Full-stack financial terminal |

## Architecture

```
[Yahoo Finance / IDX / GoAPI]  →  [Deterministic Engine]  →  [Numbers & Charts]
                                        (No AI here)                    |
                                                                   [Gemini 2.5 Flash]
                                                                         |
                                                                  [Executive Summary]
```

## Source of Truth
| Item | Location |
|------|----------|
| State DB | Cloudflare D1 (`quantbit-db`) / local `*.sqlite` |
| Config | `.env`, `wrangler.toml`, `tsconfig.json`, `vite.config.ts` |
| Schema | `db/schema.sql` |
| Stock List | `data/DaftarSaham.csv` (830 IDX stocks) |

## Production
| Aspect | Detail |
|--------|--------|
| Branch | `main` |
| Version | 1.0.0 |
| Host | Cloudflare Pages |
| API | Cloudflare Pages Functions + local Express (port 3001) |
| Repo | https://github.com/InitialJawa/QUANTBIT |
