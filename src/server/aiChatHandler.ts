// ─────────────────────────────────────────────────────────────
// AI Chat handler — pure logic, runtime-agnostic.
//
// Shared by:
//   - functions/api/[[path]].ts (Cloudflare Pages Functions, prod)
//   - server.ts (Express, local dev)
//
// Returns a structured result that both runtimes can adapt to their
// own Response shape. No fetch, no Request/Response types, no D1.
//
// Provider chain (priority order):
//   1. OpenRouter (free, no geo restriction) — preferred
//   2. Groq (Llama 3.3, fast, no geo restriction)
//   3. Gemini (direct, often geo-blocked from CF edge)
//
// All three are OpenAI-compatible. We use direct fetch — no SDK
// required — so the same code works in Cloudflare Workers, Node
// Express, and Deno.
// ─────────────────────────────────────────────────────────────
import { buildSystemPrompt, type AILiveContext } from "../ai/systemKnowledge";
import { getRecentMemory, type MemoryMessage } from "./aiMemory";

/** Max characters of memory to inject into system prompt.
 *  20 messages × ~500 chars/msg = ~10K chars budget. */
export const MEMORY_MAX_CHARS = 10_000;

/** Truncate memory block to fit within MEMORY_MAX_CHARS, keeping the
 *  most recent messages. Strips oldest entries first. */
function truncateToMemoryBudget(baseSystem: string, memoryBlock: string): string {
  if (memoryBlock.length <= MEMORY_MAX_CHARS) return memoryBlock;
  // Truncate by removing lines from the start (oldest messages)
  const lines = memoryBlock.split("\n");
  const header = lines.slice(0, 4);  // title + intro
  const entries = lines.slice(4);
  let budget = MEMORY_MAX_CHARS - header.join("\n").length;
  const kept: string[] = [];
  for (let i = entries.length - 1; i >= 0 && budget > 0; i--) {
    if (entries[i].length + 1 <= budget) {
      kept.unshift(entries[i]);
      budget -= entries[i].length + 1;
    } else {
      break;
    }
  }
  const truncNote = kept.length < entries.length
    ? `\n... (${entries.length - kept.length} older messages omitted for brevity)\n`
    : "";
  return [...header, ...kept].join("\n") + truncNote;
}

/** Format memory messages as a context block for the system prompt. */
function formatMemoryBlock(messages: MemoryMessage[]): string {
  if (messages.length === 0) return "";
  const lines: string[] = [
    "",
    "## 15. CONVERSATION MEMORY (recent past sessions)",
    "User has chatted with you before. Below is a summary of recent exchanges.",
    "Use this to recall context, references, and preferences. Do NOT repeat the same greetings.",
    "If user asks 'what did we discuss', reference specific messages here.",
    "",
  ];
  for (const m of messages) {
    const role = m.role === "user" ? "User" : m.role === "assistant" ? "You" : "[Tool]";
    const date = m.created_at.slice(0, 16).replace("T", " ");
    const sess = m.session_title ? ` (${m.session_title})` : "";
    const content = m.content.length > 400
      ? m.content.slice(0, 397) + "..."
      : m.content;
    lines.push(`- [${date}${sess}] ${role}: ${content}`);
  }
  return lines.join("\n");
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AiEnv {
  OPENROUTER_API_KEY?: string;
  GROQ_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

export interface ProviderStatus {
  /** Provider name (e.g. "openrouter", "groq", "gemini") */
  name: string;
  /** True iff the env var is set AND non-empty. */
  configured: boolean;
  /** Whether the env var is set (regardless of value) — helps
   *  distinguish "user has a key but it failed" from "no key set". */
  hasEnvVar: boolean;
}

export type AiChatResult =
  | {
      ok: true;
      content: string;
      provider: string;
    }
  | {
      ok: false;
      content: string;
      provider: "none" | "error";
      status: number;
      diagnostic: {
        configuredProviders: string[];
        attemptedProviders: string[];
        errors: string[];
        isDev: boolean;
      };
    };

/** Type guard for the error variant. Helps with narrowing inside
 *  `if (!result.ok)` blocks when the discriminated union doesn't
 *  narrow automatically. */
export function isAiError(r: AiChatResult): r is Extract<AiChatResult, { ok: false }> {
  return !r.ok;
}

/** Treat undefined, null, empty string, or whitespace-only as "not configured". */
function isKeySet(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/** Get provider status from env — safe to expose (no key values). */
export function getProviderStatus(env: AiEnv): ProviderStatus[] {
  return [
    { name: "openrouter", hasEnvVar: "OPENROUTER_API_KEY" in env, configured: isKeySet(env.OPENROUTER_API_KEY) },
    { name: "groq", hasEnvVar: "GROQ_API_KEY" in env, configured: isKeySet(env.GROQ_API_KEY) },
    { name: "gemini", hasEnvVar: "GEMINI_API_KEY" in env, configured: isKeySet(env.GEMINI_API_KEY) },
  ];
}

/** Try a single provider's chat. Returns the text response or null. */
async function tryProvider(
  name: string,
  fn: () => Promise<string>,
  errors: string[],
): Promise<{ content: string; provider: string } | null> {
  try {
    const content = await fn();
    if (content) return { content, provider: name };
    errors.push(`${name}: empty response`);
    return null;
  } catch (e: any) {
    errors.push(`${name}: ${e?.message || String(e)}`);
    return null;
  }
}

/** OpenAI-compatible POST to /chat/completions (Groq, OpenRouter). */
async function chatOpenAICompatible(
  url: string,
  model: string,
  apiKey: string,
  system: string,
  messages: ChatMessage[],
  extraHeaders: Record<string, string> = {},
): Promise<string> {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: system }, ...messages],
      temperature: 0.4,
    }),
  });
  if (!resp.ok) throw new Error(`${url} ${resp.status}: ${await resp.text()}`);
  const data: any = await resp.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${name(url)} returned empty response`);
  return text;
}

function name(url: string) {
  if (url.includes("groq")) return "Groq";
  if (url.includes("openrouter")) return "OpenRouter";
  return "OpenAI-compat";
}

/** Google Gemini REST API — two endpoint fallbacks (REST + OpenAI-compat). */
async function chatGemini(
  system: string,
  messages: ChatMessage[],
  apiKey: string,
): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body = JSON.stringify({
    contents,
    systemInstruction: { role: "user", parts: [{ text: system }] },
  });
  let lastErr: Error | null = null;

  // Try 1: REST endpoint
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body },
    );
    if (resp.ok) {
      const data: any = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
      lastErr = new Error("Gemini returned empty response");
    } else {
      lastErr = new Error(`Gemini ${resp.status}: ${await resp.text()}`);
    }
  } catch (e: any) {
    lastErr = e;
  }

  // Try 2: OpenAI-compatible endpoint (works from some edge locations)
  if (lastErr) {
    try {
      const resp = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: "gemini-2.5-flash", messages: [{ role: "system", content: system }, ...messages] }),
        },
      );
      if (resp.ok) {
        const data: any = await resp.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch {
      /* lastErr already set */
    }
  }
  throw lastErr || new Error("Gemini all endpoints failed");
}

/** Build provider list based on which keys are configured (non-empty). */
function buildProviderList(env: AiEnv, system: string, messages: ChatMessage[]) {
  const providers: { name: string; run: () => Promise<string> }[] = [];

  if (isKeySet(env.OPENROUTER_API_KEY)) {
    providers.push({
      name: "openrouter",
      run: () => chatOpenAICompatible(
        "https://openrouter.ai/api/v1/chat/completions",
        "qwen/qwen3-next-80b-a3b-instruct:free",
        env.OPENROUTER_API_KEY!,
        system,
        messages,
        { "HTTP-Referer": "https://quantbit.pages.dev", "X-Title": "Quantbit" },
      ),
    });
  }
  if (isKeySet(env.GROQ_API_KEY)) {
    providers.push({
      name: "groq",
      run: () => chatOpenAICompatible(
        "https://api.groq.com/openai/v1/chat/completions",
        "llama-3.3-70b-versatile",
        env.GROQ_API_KEY!,
        system,
        messages,
      ),
    });
  }
  if (isKeySet(env.GEMINI_API_KEY)) {
    providers.push({
      name: "gemini",
      run: () => chatGemini(system, messages, env.GEMINI_API_KEY!),
    });
  }

  return providers;
}

/** Build a context-rich error message tailored to the user's situation. */
function buildErrorMessage(
  statuses: ProviderStatus[],
  errors: string[],
  isDev: boolean,
): string {
  const configured = statuses.filter((s) => s.configured).map((s) => s.name);
  const failed = statuses.filter((s) => s.configured).map((s) => s.name);
  const noKey = statuses.filter((s) => !s.configured).map((s) => s.name);

  const lines: string[] = [];
  lines.push("Maaf, AI sedang tidak tersedia.\n");

  // Status block — show which keys are SET vs NOT SET
  lines.push("**Status API key (server-side):**");
  if (configured.length === 0) {
    lines.push("❌ Tidak ada API key yang dikonfigurasi di server.");
  } else {
    for (const s of statuses) {
      const mark = s.configured ? "✅" : "❌";
      const envName = s.name === "openrouter" ? "OPENROUTER_API_KEY"
        : s.name === "groq" ? "GROQ_API_KEY"
        : "GEMINI_API_KEY";
      lines.push(`${mark} \`${envName}\` ${s.configured ? "(configured)" : "(NOT set)"}`);
    }
  }
  lines.push("");

  // Error block
  if (errors.length) {
    lines.push("**Penyebab error:**");
    lines.push("```");
    lines.push(errors.join(" | "));
    lines.push("```");
    lines.push("");
  }

  // Diagnosis
  if (configured.length === 0) {
    lines.push("**Diagnosis:** Server tidak punya API key sama sekali. Setting env var wajib diisi sebelum AI bisa dipakai.");
  } else if (errors.length > 0 && configured.length > 0) {
    lines.push(`**Diagnosis:** ${configured.length} provider sudah configured, tapi semua gagal. Kemungkinan: key tidak valid (cek di dashboard provider), atau region diblock.`);
  }
  lines.push("");

  // Solution
  if (isDev) {
    lines.push("**Solusi (dev mode):**");
    lines.push("1. Edit file `.env.local` di root project");
    lines.push("2. Tambah salah satu:");
    lines.push("   ```");
    lines.push("   OPENROUTER_API_KEY=sk-or-v1-...");
    lines.push("   GROQ_API_KEY=gsk_...");
    lines.push("   GEMINI_API_KEY=AIza...");
    lines.push("   ```");
    lines.push("3. Restart `npm run dev` (atau `npm run serve-api` + Vite)");
    lines.push("");
  } else {
    lines.push("**Solusi (production — Cloudflare Dashboard):**");
    lines.push("1. Buka https://dash.cloudflare.com → Pages → quantbit-terminal → Settings → Environment Variables");
    lines.push("2. Tambah salah satu:");
    lines.push("   - `OPENROUTER_API_KEY` = `sk-or-v1-...` (https://openrouter.ai/keys)");
    lines.push("   - `GROQ_API_KEY` = `gsk_...` (https://console.groq.com/keys)");
    lines.push("   - `GEMINI_API_KEY` = `AIza...` (https://aistudio.google.com/app/apikey)");
    lines.push("3. Save → automatic redeploy");
    lines.push("");
  }
  lines.push("**Rekomendasi**: `OPENROUTER_API_KEY` (gratis, **tanpa geo-restriction**, proxy ke banyak model termasuk Gemini).");
  lines.push("");
  lines.push("Untuk testing tanpa API key, aktifkan **Use Dev Mock** di Settings → AI Agent (dev only).");

  return lines.join("\n");
}

export interface RunAiChatOptions {
  /** Whether this is running in dev mode. Affects error message
   *  recommendations (dev = .env.local, prod = CF dashboard). */
  isDev?: boolean;
  /** Recent memory messages from past sessions (per-user). When provided,
   *  they are formatted and injected into the system prompt as
   *  "CONVERSATION MEMORY". Truncated to MEMORY_MAX_CHARS total. */
  memory?: MemoryMessage[];
}

/** Main entry point — try each provider in order, return the first success. */
export async function runAiChat(
  messages: ChatMessage[],
  context: AILiveContext | undefined,
  env: AiEnv,
  options: RunAiChatOptions = {},
): Promise<AiChatResult> {
  const isDev = !!options.isDev;

  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      ok: false,
      content: "messages array required",
      provider: "error",
      status: 400,
      diagnostic: { configuredProviders: [], attemptedProviders: [], errors: [], isDev },
    };
  }

  const baseSystem = buildSystemPrompt(context);
  // Append memory block to system prompt (truncated to fit budget).
  const memoryBlock = formatMemoryBlock(options.memory ?? []);
  const system = memoryBlock
    ? baseSystem + truncateToMemoryBudget(baseSystem, memoryBlock)
    : baseSystem;
  const errors: string[] = [];
  const providers = buildProviderList(env, system, messages);

  for (const p of providers) {
    const result = await tryProvider(p.name, p.run, errors);
    if (result) {
      return {
        ok: true,
        content: result.content,
        provider: result.provider,
      };
    }
  }

  // All providers failed (or none configured). Build diagnostic.
  const statuses = getProviderStatus(env);
  const configured = statuses.filter((s) => s.configured).map((s) => s.name);
  const attempted = providers.map((p) => p.name);

  const content = buildErrorMessage(statuses, errors, isDev);

  return {
    ok: false,
    content,
    provider: "none",
    status: 200,
    diagnostic: {
      configuredProviders: configured,
      attemptedProviders: attempted,
      errors,
      isDev,
    },
  };
}

/** Returns safe diagnostic info — which providers have valid keys. */
export function getAiStatus(env: AiEnv, isDev: boolean = false) {
  const statuses = getProviderStatus(env);
  return {
    isDev,
    providers: statuses,
    anyConfigured: statuses.some((s) => s.configured),
    configuredCount: statuses.filter((s) => s.configured).length,
  };
}
