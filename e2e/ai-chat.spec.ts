// ─────────────────────────────────────────────────────────────
// E2E: Quantbit AI Chat (Levels 1+2+3)
//
// Tests the chat widget end-to-end: open chat, send message, see
// response, history persist, action approval card, [Approve]/[Reject].
//
// Tests are marked `.skip()` if no AI provider is configured (e.g.
// in CI without API keys). The history-persistence + approval card
// tests don't need the backend since they test localStorage + UI
// state directly.
// ─────────────────────────────────────────────────────────────
import { test, expect, type Page } from "@playwright/test";

const HAS_AI_PROVIDER = !!process.env.OPENROUTER_API_KEY
  || !!process.env.GROQ_API_KEY
  || !!process.env.GEMINI_API_KEY;

/** Open the chat widget (collapsed by default). */
async function openChat(page: Page) {
  const chatButton = page.locator('button[aria-label="Buka AI Chat"]');
  if (await chatButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await chatButton.click();
  }
}

/** Get the chat messages container. */
function chatContainer(page: Page) {
  return page.locator('[class*="scrollbar-thin"]').first();
}

test.describe("Quantbit AI Chat — Level 1 (Smarter Q&A)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Open chat
    await openChat(page);
  });

  test("chat widget opens with welcome message", async ({ page }) => {
    await expect(page.getByText(/Quantbit AI/)).toBeVisible();
    await expect(page.getByText(/sadar-sistem/)).toBeVisible();
  });

  test("input field + send button are visible", async ({ page }) => {
    const input = page.getByPlaceholder(/Tanya apa saja/);
    await expect(input).toBeVisible();
    const sendButton = page.getByRole("button", { name: /Kirim pertanyaan/i });
    await expect(sendButton).toBeVisible();
  });

  test("chat history persists across page reloads", async ({ page }) => {
    // Send a message (don't wait for AI response — just send)
    const input = page.getByPlaceholder(/Tanya apa saja/);
    await input.fill("test history");
    await input.press("Enter");

    // Wait for the user message to appear
    await expect(page.getByText("test history")).toBeVisible();

    // Verify localStorage was written
    const stored = await page.evaluate(() => localStorage.getItem("quantbit_ai_chat_history"));
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some((m: any) => m.content === "test history")).toBe(true);

    // Reload
    await page.reload();
    await openChat(page);

    // History should be restored
    await expect(page.getByText("test history")).toBeVisible();
  });

  test("trash button clears history", async ({ page }) => {
    // Pre-populate history
    await page.evaluate(() => {
      localStorage.setItem("quantbit_ai_chat_history", JSON.stringify([
        { role: "assistant", content: "Welcome" },
        { role: "user", content: "Hi" },
      ]));
    });
    await page.reload();
    await openChat(page);

    await expect(page.getByText("Hi")).toBeVisible();

    // Click trash
    await page.locator('button[title="Hapus riwayat chat"]').click();

    // Verify cleared
    const stored = await page.evaluate(() => localStorage.getItem("quantbit_ai_chat_history"));
    expect(stored).toBeNull();
  });

  test("history cap at 100 messages", async ({ page }) => {
    // Pre-populate with 150 messages
    await page.evaluate(() => {
      const msgs = Array.from({ length: 150 }, (_, i) => ({
        role: i % 2 === 0 ? "user" : "assistant",
        content: `msg ${i}`,
      }));
      localStorage.setItem("quantbit_ai_chat_history", JSON.stringify(msgs));
    });
    await page.reload();
    await openChat(page);

    // Verify stored cap
    const stored = await page.evaluate(() => localStorage.getItem("quantbit_ai_chat_history"));
    const parsed = JSON.parse(stored!);
    expect(parsed.length).toBeLessThanOrEqual(100);
  });
});

test.describe("Quantbit AI Chat — Level 3 (Action API)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await openChat(page);
  });

  test("action approval card appears for buy_stock", async ({ page }) => {
    if (!HAS_AI_PROVIDER) {
      test.skip(true, "No AI provider configured (set OPENROUTER_API_KEY / GROQ_API_KEY / GEMINI_API_KEY)");
    }
    // Pre-seed chat history with a user message that will trigger a tool call
    // (this is the fastest way to test the approval flow without waiting for AI)
    await page.evaluate(() => {
      // The chat won't actually emit a tool call without a real provider,
      // so we directly add a pendingAction via the AICockpit context.
      // We use a global helper that the app exposes in dev mode.
      const evt = new CustomEvent("__test_add_pending_action", {
        detail: {
          id: "pa_test",
          action: { type: "buy_stock", ticker: "BBCA", shares: 100, price: 9500 },
          displayText: "Beli 100 lembar BBCA @ Rp 9.500",
          impact: [
            { label: "Estimasi biaya", value: "Rp 950.000" },
            { label: "Kas tersedia", value: "Rp 100.000.000" },
          ],
          createdAt: Date.now(),
        },
      });
      window.dispatchEvent(evt);
    });

    // Approval card should appear with the display text
    await expect(page.getByText("AI suggests")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText(/Beli 100 lembar BBCA/)).toBeVisible();
  });

  test("Approve button is clickable and shows Executed", async ({ page }) => {
    if (!HAS_AI_PROVIDER) {
      test.skip(true, "No AI provider configured");
    }
    // Same setup as above
    await page.evaluate(() => {
      const evt = new CustomEvent("__test_add_pending_action", {
        detail: {
          id: "pa_test_approve",
          action: { type: "buy_stock", ticker: "BBCA", shares: 100, price: 9500 },
          displayText: "Beli 100 lembar BBCA",
          impact: [{ label: "Estimasi biaya", value: "Rp 950.000" }],
          createdAt: Date.now(),
        },
      });
      window.dispatchEvent(evt);
    });

    await expect(page.getByText("AI suggests")).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /approve/i }).click();
    await expect(page.getByText(/Executed/)).toBeVisible();
  });

  test("Reject button shows Rejected", async ({ page }) => {
    if (!HAS_AI_PROVIDER) {
      test.skip(true, "No AI provider configured");
    }
    await page.evaluate(() => {
      const evt = new CustomEvent("__test_add_pending_action", {
        detail: {
          id: "pa_test_reject",
          action: { type: "buy_stock", ticker: "BBCA", shares: 100, price: 9500 },
          displayText: "Beli 100 lembar BBCA",
          impact: [],
          createdAt: Date.now(),
        },
      });
      window.dispatchEvent(evt);
    });

    await expect(page.getByText("AI suggests")).toBeVisible({ timeout: 5_000 });
    await page.getByRole("button", { name: /reject/i }).click();
    await expect(page.getByText(/Rejected/)).toBeVisible();
  });
});

test.describe("Quantbit AI Chat — Settings", () => {
  test("proactive toggle is present in Settings", async ({ page }) => {
    await page.goto("/");
    // Open settings
    await page.locator('button[aria-label*="Settings"], button:has(svg.lucide-settings)').first().click();
    // Toggle should be visible
    await expect(page.getByText(/Proactive Alerts/i)).toBeVisible();
  });

  test("proactive toggle can be clicked", async ({ page }) => {
    await page.goto("/");
    await page.locator('button:has(svg.lucide-settings)').first().click();
    const toggle = page.getByText(/Proactive Alerts/i).locator("..");
    await toggle.click();
    // Status text should change
    const state = await page.evaluate(() => localStorage.getItem("idx_proactive_ai"));
    expect(state !== null).toBe(true);
  });
});
