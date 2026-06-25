// ─────────────────────────────────────────────────────────────
// Unit tests for src/server/aiChatHandler.ts — runAiChat
// provider chain + error reporting.
//
// Provider HTTP calls are mocked via global fetch spy.
// ─────────────────────────────────────────────────────────────
import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { runAiChat } from "../aiChatHandler.ts";

interface MockResp {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
  json: () => Promise<any>;
}

const origFetch = globalThis.fetch;
let fetchSpy: ReturnType<typeof mock.fn>;

function mockJsonResponse(ok: boolean, body: any, status = 200): MockResp {
  return {
    ok,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  };
}

function mockTextResponse(ok: boolean, text: string, status = 200): MockResp {
  return {
    ok,
    status,
    text: async () => text,
    json: async () => { throw new Error("not json"); },
  };
}

beforeEach(() => {
  fetchSpy = mock.fn(async () => mockJsonResponse(true, { choices: [{ message: { content: "ok" } }] }));
  globalThis.fetch = fetchSpy as any;
});

afterEach(() => {
  globalThis.fetch = origFetch;
  mock.restoreAll();
});

describe("runAiChat — input validation", () => {
  it("returns error when messages is missing", async () => {
    const r = await runAiChat([], undefined, {});
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.provider, "error");
      assert.equal(r.status, 400);
      assert.ok(r.content.includes("messages"));
    }
  });

  it("returns error when messages is not an array", async () => {
    const r = await runAiChat(null as any, undefined, {});
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.status, 400);
    }
  });
});

describe("runAiChat — no provider configured", () => {
  it("returns diagnostic message when no keys set", async () => {
    const r = await runAiChat(
      [{ role: "user", content: "halo" }],
      undefined,
      {},
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.provider, "none");
      assert.equal(r.status, 200);
      assert.ok(r.content.includes("AI sedang tidak tersedia"));
      assert.ok(r.content.toLowerCase().includes("tidak ada provider"));
      assert.ok(r.content.includes("OPENROUTER"));
      assert.ok(r.content.includes("GROQ"));
      assert.ok(r.content.includes("GEMINI"));
    }
  });

  it("mentions Dev Mock as fallback option", async () => {
    const r = await runAiChat(
      [{ role: "user", content: "halo" }],
      undefined,
      {},
    );
    if (!r.ok) {
      assert.ok(r.content.includes("Dev Mock"));
    }
  });
});

describe("runAiChat — OpenRouter provider", () => {
  it("calls OpenRouter when OPENROUTER_API_KEY is set", async () => {
    const r = await runAiChat(
      [{ role: "user", content: "hi" }],
      undefined,
      { OPENROUTER_API_KEY: "or-test-key" },
    );
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.provider, "openrouter");
      assert.equal(r.content, "ok");
    }
    // Verify fetch was called with the right URL
    assert.equal(fetchSpy.mock.calls.length, 1);
    const [url] = fetchSpy.mock.calls[0].arguments as [string, RequestInit];
    assert.ok(url.includes("openrouter.ai"));
  });

  it("includes HTTP-Referer and X-Title headers for OpenRouter", async () => {
    await runAiChat(
      [{ role: "user", content: "hi" }],
      undefined,
      { OPENROUTER_API_KEY: "or-test" },
    );
    const [, init] = fetchSpy.mock.calls[0].arguments as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    assert.equal(headers["HTTP-Referer"], "https://quantbit.pages.dev");
    assert.equal(headers["X-Title"], "Quantbit");
    assert.equal(headers["Authorization"], "Bearer or-test");
  });
});

describe("runAiChat — Groq provider", () => {
  it("calls Groq when only GROQ_API_KEY is set", async () => {
    const r = await runAiChat(
      [{ role: "user", content: "hi" }],
      undefined,
      { GROQ_API_KEY: "gq-test" },
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.provider, "groq");
    const [url] = fetchSpy.mock.calls[0].arguments as [string, RequestInit];
    assert.ok(url.includes("groq.com"));
  });

  it("prefers OpenRouter over Groq when both keys set", async () => {
    const r = await runAiChat(
      [{ role: "user", content: "hi" }],
      undefined,
      { OPENROUTER_API_KEY: "or", GROQ_API_KEY: "gq" },
    );
    if (r.ok) assert.equal(r.provider, "openrouter");
    assert.equal(fetchSpy.mock.calls.length, 1);
  });
});

describe("runAiChat — Gemini provider", () => {
  it("calls Gemini when only GEMINI_API_KEY is set", async () => {
    const r = await runAiChat(
      [{ role: "user", content: "hi" }],
      undefined,
      { GEMINI_API_KEY: "gm-test" },
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.provider, "gemini");
    const [url] = fetchSpy.mock.calls[0].arguments as [string, RequestInit];
    assert.ok(url.includes("generativelanguage.googleapis.com"));
  });

  it("falls back to OpenAI-compat endpoint on REST 400", async () => {
    // First call (REST) fails with 400, second call (OpenAI-compat) succeeds
    let callCount = 0;
    fetchSpy = mock.fn(async (url: string) => {
      callCount++;
      if (callCount === 1) {
        return mockTextResponse(false, "400 Bad Request", 400);
      }
      return mockJsonResponse(true, { choices: [{ message: { content: "fallback-ok" } }] });
    });
    globalThis.fetch = fetchSpy as any;

    const r = await runAiChat(
      [{ role: "user", content: "hi" }],
      undefined,
      { GEMINI_API_KEY: "gm" },
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.content, "fallback-ok");
    assert.equal(callCount, 2);
  });
});

describe("runAiChat — fallback chain", () => {
  it("falls back to Groq when OpenRouter returns error", async () => {
    let callCount = 0;
    fetchSpy = mock.fn(async () => {
      callCount++;
      if (callCount === 1) {
        return mockTextResponse(false, "401 Unauthorized", 401);
      }
      return mockJsonResponse(true, { choices: [{ message: { content: "groq-ok" } }] });
    });
    globalThis.fetch = fetchSpy as any;

    const r = await runAiChat(
      [{ role: "user", content: "hi" }],
      undefined,
      { OPENROUTER_API_KEY: "or", GROQ_API_KEY: "gq" },
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.provider, "groq");
    assert.equal(callCount, 2);
  });

  it("falls back to Gemini when OpenRouter + Groq fail", async () => {
    let callCount = 0;
    fetchSpy = mock.fn(async () => {
      callCount++;
      if (callCount <= 2) {
        return mockTextResponse(false, "err", 500);
      }
      return mockJsonResponse(true, { candidates: [{ content: { parts: [{ text: "gemini-ok" }] } }] });
    });
    globalThis.fetch = fetchSpy as any;

    const r = await runAiChat(
      [{ role: "user", content: "hi" }],
      undefined,
      { OPENROUTER_API_KEY: "or", GROQ_API_KEY: "gq", GEMINI_API_KEY: "gm" },
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.provider, "gemini");
    assert.equal(callCount, 3);
  });

  it("returns diagnostic when all 3 providers fail", async () => {
    fetchSpy = mock.fn(async () => mockTextResponse(false, "fail", 500));
    globalThis.fetch = fetchSpy as any;

    const r = await runAiChat(
      [{ role: "user", content: "hi" }],
      undefined,
      { OPENROUTER_API_KEY: "or", GROQ_API_KEY: "gq", GEMINI_API_KEY: "gm" },
    );
    assert.equal(r.ok, false);
    if (!r.ok) {
      const errResult = r as Extract<typeof r, { ok: false }>;
      assert.equal(errResult.provider, "none");
      assert.ok(errResult.errors.length >= 3);
      assert.ok(errResult.errors[0].includes("openrouter"));
      assert.ok(errResult.content.includes("gagal"));
    }
  });
});

describe("runAiChat — system prompt integration", () => {
  it("includes live context in system prompt", async () => {
    let capturedSystem = "";
    fetchSpy = mock.fn(async (_url: string, init: any) => {
      const body = JSON.parse(init.body);
      capturedSystem = body.messages[0].content;
      return mockJsonResponse(true, { choices: [{ message: { content: "ok" } }] });
    });
    globalThis.fetch = fetchSpy as any;

    await runAiChat(
      [{ role: "user", content: "berapa BPS saya?" }],
      {
        market: { ihsg: 6800, ihsgMonthly: -5.2 },
        regime: { status: "RISK_OFF", risk: 70 },
      },
      { OPENROUTER_API_KEY: "or" },
    );
    // The system knowledge Section 13 (TOOL CATALOG) should be in the prompt
    assert.ok(capturedSystem.includes("TOOL CATALOG"));
    assert.ok(capturedSystem.includes("IHSG=6800"));
    assert.ok(capturedSystem.includes("status=RISK_OFF"));
  });
});

describe("runAiChat — error reporting", () => {
  it("captures per-provider error messages", async () => {
    fetchSpy = mock.fn(async () => {
      throw new Error("Network unreachable");
    });
    globalThis.fetch = fetchSpy as any;

    const r = await runAiChat(
      [{ role: "user", content: "hi" }],
      undefined,
      { OPENROUTER_API_KEY: "or" },
    );
    if (!r.ok) {
      const errResult = r as Extract<typeof r, { ok: false }>;
      assert.ok(errResult.errors.some((e) => e.includes("openrouter")));
      assert.ok(errResult.errors.some((e) => e.includes("Network unreachable")));
    }
  });

  it("records the tried provider in error diagnostic", async () => {
    fetchSpy = mock.fn(async () => mockTextResponse(false, "401", 401));
    globalThis.fetch = fetchSpy as any;

    const r = await runAiChat(
      [{ role: "user", content: "hi" }],
      undefined,
      { OPENROUTER_API_KEY: "or" },
    );
    if (!r.ok) {
      assert.ok(r.content.includes("openrouter"));
      assert.ok(r.content.includes("gagal"));
    }
  });
});
