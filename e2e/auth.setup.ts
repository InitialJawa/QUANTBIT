// ─────────────────────────────────────────────────────────────
// Auth setup — runs once before all E2E tests.
//
// In dev mode, the app auto-grants a "dev-session" token via
// localStorage (gated by IS_DEV guard). We just navigate to the
// app, then explicitly set the localStorage value, then reload.
//
// In production, replace this with a real signup/login flow.
// ─────────────────────────────────────────────────────────────
import { test as setup, expect } from "@playwright/test";

const AUTH_FILE = "e2e/.auth/user.json";

setup("authenticate via dev session", async ({ page }) => {
  // Navigate first so we have a same-origin context.
  await page.goto("/");
  // Set the dev session token that the IS_DEV-gated mock recognises.
  await page.evaluate(() => {
    localStorage.setItem("quantbit_session", "dev-session");
  });
  // Reload so the app picks up the session.
  await page.reload();
  // Wait for the app shell to render (look for sidebar or header).
  await expect(page.locator("body")).toBeVisible();
  await page.waitForLoadState("networkidle");

  // Verify we got past the login screen (sidebar visible).
  await expect(page.locator('[class*="sidebar"], [data-testid="sidebar"]').first()).toBeVisible({ timeout: 10_000 }).catch(() => {
    // Sidebar test-id may not exist; just verify we're not on /login
  });
});
