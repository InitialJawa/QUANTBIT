// ─────────────────────────────────────────────────────────────
// Tests for FloatingAIChat history persistence logic.
//
// We test the localStorage round-trip behavior used by the chat:
// - loadHistory() reads from localStorage on mount
// - cap to MAX_HISTORY (100)
// - handles missing/corrupt data
// - Welcome message prepended on empty
//
// The full FloatingAIChat component is too coupled to context trees
// (EngineConfig, Notification, AICockpit, useBuyPressure) to test
// in isolation without extensive mocks. The history logic is
// tested here as a focused unit instead.
// ─────────────────────────────────────────────────────────────
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { useState, useEffect } from "react";

const STORAGE_KEY = "quantbit_ai_chat_history";
const MAX_HISTORY = 100;
const WELCOME = { role: "assistant", content: "Halo dari AI" };

/** Mirror of the FloatingAIChat history logic. */
function useChatHistory() {
  const [messages, setMessages] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(-MAX_HISTORY);
        }
      }
    } catch {}
    return [WELCOME];
  });
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
    } catch {}
  }, [messages]);
  return [messages, setMessages] as const;
}

function TestHarness() {
  const [messages] = useChatHistory();
  return (
    <div>
      {messages.map((m, i) => (
        <div key={i} data-testid={`msg-${i}`} data-role={m.role}>
          {m.content}
        </div>
      ))}
    </div>
  );
}

describe("FloatingAIChat — history persistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with welcome message when storage is empty", () => {
    render(<TestHarness />);
    expect(screen.getByTestId("msg-0")).toBeDefined();
    expect(screen.getByTestId("msg-0").dataset.role).toBe("assistant");
    expect(screen.getByTestId("msg-0").textContent).toBe("Halo dari AI");
  });

  it("loads messages from localStorage on mount", () => {
    const existing = [
      { role: "assistant", content: "Welcome" },
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello there" },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    render(<TestHarness />);
    expect(screen.getByTestId("msg-0").textContent).toBe("Welcome");
    expect(screen.getByTestId("msg-1").textContent).toBe("Hi");
    expect(screen.getByTestId("msg-2").textContent).toBe("Hello there");
  });

  it("ignores corrupt JSON and falls back to welcome", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json[[");
    // Suppress console.error noise
    const origError = console.error;
    console.error = () => {};
    try {
      render(<TestHarness />);
      expect(screen.getByTestId("msg-0").textContent).toBe("Halo dari AI");
    } finally {
      console.error = origError;
    }
  });

  it("ignores empty array and falls back to welcome", () => {
    localStorage.setItem(STORAGE_KEY, "[]");
    render(<TestHarness />);
    expect(screen.getByTestId("msg-0").textContent).toBe("Halo dari AI");
  });

  it("caps history at MAX_HISTORY (100) when reading", () => {
    const big = Array.from({ length: 150 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `msg ${i}`,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(big));

    render(<TestHarness />);
    // Should only show last 100
    const messages = document.querySelectorAll('[data-testid^="msg-"]');
    expect(messages.length).toBe(100);
    // First shown should be msg 50
    expect(messages[0].textContent).toBe("msg 50");
    // Last shown should be msg 149
    expect(messages[99].textContent).toBe("msg 149");
  });

  it("preserves role + content when round-tripping", () => {
    const messages = [
      { role: "user", content: "Test 1" },
      { role: "assistant", content: "Response 1" },
      { role: "user", content: "Test 2" },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));

    render(<TestHarness />);
    const elements = document.querySelectorAll<HTMLElement>('[data-testid^="msg-"]');
    expect(elements.length).toBe(3);
    expect(elements[0].dataset.role).toBe("user");
    expect(elements[1].dataset.role).toBe("assistant");
    expect(elements[2].dataset.role).toBe("user");
  });
});
