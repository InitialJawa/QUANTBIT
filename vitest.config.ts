// ─────────────────────────────────────────────────────────────
// Vitest config — component / DOM-level tests for AI components.
//
// Mirrors the Vite build config so the test environment matches
// what runs in the browser. Uses jsdom for DOM emulation and
// @testing-library/react for component queries.
// ─────────────────────────────────────────────────────────────
/// <reference types="vitest" />
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/**/*.test.{ts,tsx}",
      "src/**/__tests__/**/*.test.{ts,tsx}",
    ],
    exclude: [
      "src/engine/__tests__/**",  // Engine tests use node:test
      "src/ai/__tests__/**",      // AI tool-parser tests use node:test
      "src/hooks/__tests__/useAITools.test.ts",  // Pure hook tests use node:test
      "src/hooks/__tests__/proactiveCooldown.test.ts",  // Pure hook tests use node:test
      "src/server/__tests__/**",  // AI chat handler tests use node:test
      "node_modules/**",
      "dist/**",
    ],
    coverage: {
      provider: "v8",
      include: [
        "src/components/AIActionApprovalCard.tsx",
        "src/components/FloatingAIChat.tsx",
        "src/ai/toolCallParser.ts",
        "src/hooks/useAITools.ts",
        "src/hooks/useProactiveAgent.ts",
      ],
      reporter: ["text", "html"],
    },
  },
});
