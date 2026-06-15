---
name: testing-data-source-badges
description: Test the DataSourceBadge transparency labels (SIMULASI / DATA STATIS / ESTIMASI / FEED PARSIAL) across the QUANTBIT UI. Use when verifying data-transparency badge UI or tooltip changes.
---

# Testing DataSourceBadge transparency labels

The `DataSourceBadge` component (`src/components/DataSourceBadge.tsx`) marks UI surfaces whose data is not real. Each badge shows a short label and, on hover, a tooltip with three parts: the data name, a `Kenapa:` line (why it's not real), and a `Solusi:` line (how to make it real). The tooltip text is also mirrored into the element's `title` attribute, so it can be read from the DOM without hovering.

## Running the app locally

```bash
npm install
npm run dev   # serves http://localhost:3000
```

Type/build checks:
```bash
npx tsc --noEmit   # 2 preexisting errors in functions-entry.ts (firebase-functions module) are unrelated
npx vite build
```
There is no CI workflow in this repo; Vercel deployment is separate and may show errors unrelated to the frontend UI.

## Auth gate bypass for testing

The app gates the dashboard behind Firebase auth, and the committed Firebase config is a placeholder, so login can't complete with real credentials. To render the dashboard for UI testing, temporarily bypass auth in `src/App.tsx` by setting a fake user in the auth `useEffect` (e.g. `setUser({ uid: "preview-uid", email: "preview@quantbit.local" }); setAuthLoading(false);`). Mark it clearly (e.g. `// __PREVIEW_BYPASS__`) and REVERT it before finishing — do NOT commit the bypass.

If the real Firebase project credentials become available, prefer logging in normally over the bypass.

## Badge locations to verify

1. **Order Book** (Market tab, default) — heading "Kedalaman Pasar (Order Book)" → amber **SIMULASI**; tooltip cites `Math.random()`.
2. **Header price feed** (top-right, near the "LIVE Yahoo/GoAPI/Simulasi" pill) → orange **FEED PARSIAL**; tooltip mentions ~9 emiten riil + random walk.
3. **Stock drawer** (click any stock row): "Historical Price Trend" → amber **SIMULASI** (chart `Math.random()`); switch to the "Balance Sheet" tab → "Audited Financial Statement" shows violet **ESTIMASI** (numbers synthesized from market cap × fixed multiplier).
4. **Leaders tab** heading → **DATA STATIS** + **SIMULASI**; DATA STATIS tooltip cites the 2026-06-11 snapshot + ticker-hash synthesis.
5. **Portal Berita** (left sidebar) → **DATA STATIS** (hardcoded news list).

## Tips

- A broken badge would either not render or have a tooltip missing the `Kenapa:`/`Solusi:` lines. Verify both the visible label and the tooltip text.
- The tooltip is CSS hover-driven (opacity/translate on group-hover). To read it reliably without flaky hover, inspect the badge element's `title` attribute in the DOM.
- The dashboard updates prices via a random walk every 3 seconds, so numbers shift on screen — this is expected and is itself part of what the badges disclose.

## Devin Secrets Needed

- None required for local UI testing (auth is bypassed). Real end-to-end auth would need valid Firebase web config / a test account, which are not currently provisioned.
