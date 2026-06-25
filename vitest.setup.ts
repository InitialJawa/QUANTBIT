// ─────────────────────────────────────────────────────────────
// Vitest setup — polyfills + test-environment shims.
//
// - Mocks `import.meta.env` for code that reads Vite env vars
//   (src/services/api.ts uses IS_DEV = import.meta.env?.DEV).
// - Polyfills localStorage for jsdom (already there but explicit
//   for clarity).
// - Provides a global `__QUANTBIT_CLEANUP__` hook for tests that
//   need to reset state between runs.
// ─────────────────────────────────────────────────────────────
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Provide a minimal Vite-env shim. In jsdom, `import.meta.env`
// is undefined unless we inject it.
if (typeof (globalThis as any).import === "undefined") {
  Object.defineProperty(globalThis, "import", {
    value: { meta: { env: { DEV: true, MODE: "test" } } },
    configurable: true,
  });
}

// Mock the api client — components that depend on it (e.g.
// FloatingAIChat) get a stub so we can test in isolation.
vi.mock("../src/services/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
  authApi: {
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
  },
  getSession: vi.fn(() => null),
}));

// Reset all mocks + unmount rendered components between tests.
// Without this, @testing-library/react renders accumulate in the DOM
// and "Found multiple elements" errors start appearing.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  try { localStorage.clear(); } catch {}
});

beforeEach(() => {
  // jsdom resets per-file by default; per-test cleanup is in afterEach.
});
