# E2E Tests (Playwright)

End-to-end tests for Quantbit AI (Levels 1-4) using Playwright.

## Running

```bash
# First time: install browsers
npx playwright install --with-deps chromium

# Run all E2E tests (auto-starts dev server)
npm run test:e2e

# Headed mode (see the browser)
npm run test:e2e:headed

# Interactive UI mode
npm run test:e2e:ui
```

## What's tested

### `ai-chat.spec.ts` — Levels 1, 2, 3
- **Level 1**: chat widget opens, welcome message, history persist, trash button, history cap (100)
- **Level 2**: live context enrichment (BPS, backtestConfig) — verified via inspection of the API request payload
- **Level 3**: action approval card renders, [Approve]/[Reject] click flow, status feedback
- **Settings**: proactive toggle in AppHeader

### `ai-proactive.spec.ts` — Level 4
- Proactive toggle persists in localStorage
- Fired rules tracked in localStorage
- Notifications persist
- 5-min cooldown logic verified (via `shouldFireRule()` pure function)
- Toast notification data structure

## Skipping AI-Provider-Dependent Tests

Tests that require a real AI provider (actual chat round-trip, tool calls)
are auto-skipped if no `OPENROUTER_API_KEY` / `GROQ_API_KEY` / `GEMINI_API_KEY`
is set in the environment. LocalStorage + UI state tests run regardless.

## CI Integration

```yaml
# .github/workflows/e2e.yml
- name: E2E tests
  env:
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
  run: npx playwright install --with-deps chromium && npm run test:e2e
```

## File Structure

```
e2e/
├── .auth/            # auth state cache (auto-generated)
├── auth.setup.ts     # login flow (runs once)
├── ai-chat.spec.ts   # Chat widget + Level 3 actions
└── ai-proactive.spec.ts  # Level 4 proactive agent
```
