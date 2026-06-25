// ─────────────────────────────────────────────────────────────
// Playwright config — E2E tests for Quantbit AI.
//
// Targets Chromium only by default (most users, fastest CI). Add
// Firefox/WebKit via `npx playwright test --project=firefox` if needed.
//
// Tests live in `e2e/` and use the dev server (Vite + Express).
// Auth setup is shared via `e2e/auth.setup.ts` so we only login once
// per run (faster + more reliable than per-test login).
// ─────────────────────────────────────────────────────────────
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,  // shared localStorage makes parallel risky
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [["github"], ["html"]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.E2E_NO_SERVER ? undefined : {
    command: "npm run dev:full",
    url: "http://localhost:5173",
    timeout: 60_000,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "pipe",
  },
});
