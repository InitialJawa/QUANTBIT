# AGENTS.md — QUANTBIT

## Code Structure

Gunakan **graphify** untuk navigasi codebase:
```bash
graphify query "apa fungsi backtest engine?"
graphify explain "StockData"
graphify path "core.ts" "FloatingAIChat.tsx"
```

Graph output: `graphify-out/graph.json` + `graphify-out/graph.html`

## Rules

- **No AI for financial math** — semua kalkulasi deterministic di `src/engine/`
- **DB = single source of truth** — semua data dari D1 via CF Functions
- **Full Serverless** — CF Pages Functions + D1 + GH Actions. No Express di production.
- **AI = presentation only** — `src/ai/` hanya untuk interface, bukan kalkulasi
- **AI actions require approval** — semua `AIAction` wajib user klik [Approve]
- **Ask before adding dependencies**
- **Update docs setiap sesi**

## Dev Mode

```bash
npm run dev    # Express (API :3001) + Vite (UI :5173)
```

## Key Files

| File | Fungsi |
|------|--------|
| `src/engine/core.ts` | Strategy runner (runStrategy) |
| `src/engine/ranker.ts` | Scoring & ranking |
| `src/engine/buyPressure.ts` | BPS algorithm |
| `src/engine/crashDetector.ts` | Crash detection |
| `src/marketRegimeEngine.ts` | Market regime |
| `src/marketData.ts` | Runtime data store |
| `src/components/FloatingAIChat.tsx` | AI chat UI |
| `src/ai/aiClient.ts` | AI client |
| `src/contexts/EngineConfigContext.tsx` | Strategy config |
| `src/hooks/usePortfolioManager.ts` | Portfolio state |
| `functions/api/[[path]].ts` | CF Functions (API) |
| `scripts/pipeline-sync.ts` | Data pipeline |

## SEO & Landing Pages

### Static Files (public/)
| File | Fungsi |
|------|--------|
| `public/robots.txt` | Izin crawl untuk Google/Bing |
| `public/sitemap.xml` | 20 URLs (homepage + 15 ticker + 4 landing) |
| `public/og-image.png` | Preview image 1200×630 untuk share link |
| `public/_headers` | Content-Type untuk sitemap.xml & robots.txt |
| `public/pages/panduan-backtest/index.html` | Landing: "cara backtest saham idx gratis" |
| `public/pages/screening-saham/index.html` | Landing: "screening saham idx kuantitatif" |
| `public/pages/strategi-dca/index.html` | Landing: "strategi dca saham indonesia" |
| `public/pages/tentang/index.html` | Landing: "tentang quantbit terminal saham" |

### SEO Rules
- Semua URL canonical ke `https://quantbit.pro`
- Landing pages pakai struktur SEO-AEO (narrative arc: Hero → Problem → Solution → Features → Social Proof → CTA → How It Works → Comparison → FAQ → Trust → CTA)
- FAQ: 6+ entries, jawaban <50 words, standalone
- Semua page punya: `color-scheme: dark`, semantic HTML, skip link, `aria-label`, `focus-visible`, `touch-action: manipulation`, `prefers-reduced-motion`
- Hindari: "revolutionary", "game-changing", "best-in-class", `transition: all`

### Deploy
```bash
npm run build && npx wrangler pages deploy dist --commit-dirty=true
```
Landing pages di `public/` otomatis ter-copy ke `dist/` oleh Vite tanpa perlu ubah `vite.config.ts`.

### Backlink Content (backlink/)
Draft konten untuk backlink. Publish manual ke platform masing-masing.

| File | Platform | Target Keyword |
|------|----------|---------------|
| `backlink/01-medium-backtest-saham.md` | Medium | "backtest saham indonesia gratis" |
| `backlink/02-devto-quantitative-screening.md` | Dev.to | "quantitative stock screening indonesia" |
| `backlink/03-reddit-r-indonesia.md` | Reddit r/indonesia | brand awareness |
| `backlink/04-reddit-r-investing.md` | Reddit r/investing | international audience |
| `backlink/05-quora-answers.md` | Quora | "cara backtest saham", "screening saham" |

Backlink strategy:
- Setiap artikel punya 1-2 link natural ke quantbit.pro (body text, bukan footer)
- Konten harus genuine dan bermanfaat, bukan spam
- Reply semua komentar dengan honest
- Jangan post lebih dari 1x per subreddit

### Search Engine Submission
- **IndexNow**: Key file di `public/92b8f2e40db134213d0a9c6ec5f39780.txt`
- Submit via: `POST https://api.indexnow.org/indexnow` (Bing, Yandex, DuckDuckGo)
- Google Search Console: submit manual via https://search.google.com/search-console
- Script submit: `scripts/submit-urls.js`

## Session Start

```
Read docs/TASK.md and continue the project.
```

## Archived Files

Historical docs dipindah ke `archive/`:
- `archive/handover/` — session handover records
- `archive/research/` — v1 audit (20 docs)
- `archive/v2-blueprint/` — v2 planning (33 docs)
- `archive/roadmap/` — roadmap phases (8 docs)
