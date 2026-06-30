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

## Architecture Rules (DOX)

- **No AI for financial math** — semua kalkulasi keuangan deterministic
- **DB = single source of truth** — SEMUA engine (Portfolio, Backtest, Market) baca dari DB. Live prices hanya boleh digunakan sebagai fallback display, BUKAN untuk decision engine.
- **Daily cron (06:30 UTC = 13:30 WIB)** — satu-satunya update pipeline. Fetch Yahoo EOD → upsert `stock_daily` + `daily_overview` → commit.
- **No real-time live price** — bukan scalping, cukup data harian.
- **No refactor without DOX pass**
- **Ask before adding dependencies**

## Source of Truth
| Item | Location |
|------|----------|
| State DB | Cloudflare D1 (`quantbit-db`) / local `historical_market.sqlite` |
| Market Data | `daily_overview`, `stock_daily`, `stock_fundamentals`, `engine_snapshots` (0003 migration) |
| Config | `.env`, `wrangler.toml`, `tsconfig.json`, `vite.config.ts` |
| Schema | `db/migrations/` (sequential NNNN_name.sql) |
| Stock List | `data/DaftarSaham.csv` (830 IDX stocks) |
| Fallback | `data/years/*.json` (year files, only when DB unavailable) |

## Production
| Aspect | Detail |
|--------|--------|
| Branch | `main` |
| Version | 1.0.0 |
| Host | Cloudflare Pages |
| API | Cloudflare Pages Functions + local Express (port 3001) |
| Repo | https://github.com/InitialJawa/QUANTBIT |
