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
// Provider chain (priority order, lower number = higher priority):
//   1. Groq compound (`groq/compound`)  — agent model, no daily cap
//   2. Google Gemma 4 26B              — 1500 RPD, unlimited TPM
//   3. Google Gemma 4 31B              — 1500 RPD, fallback if 26B 429s
//   4. Groq llama-3.3-70b-versatile    — 30 RPM, fast backup
//   5. OpenRouter (free model)         — last resort (rate-limited)
//
// Circuit breaker: when a provider returns 429/403, we mark it as
// "cooling down" for COOLDOWN_429_MS / COOLDOWN_403_MS. While
// cooling down, we skip it and try the next provider. On success,
// the cooldown is cleared.
//
// All providers are OpenAI-compatible. We use direct fetch — no SDK
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
  const lines = memoryBlock.split("\n");
  const header = lines.slice(0, 4);
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
  /** Override default Groq model. Default: "groq/compound" (no daily cap, agent). */
  GROQ_MODEL?: string;
  /** Fallback Groq model. Default: "llama-3.3-70b-versatile". */
  GROQ_FALLBACK_MODEL?: string;
  /** Override default Gemini model. Default: "gemma-4-26b-a4b-it" (1500 RPD, unlimited TPM). */
  GEMINI_MODEL?: string;
  /** Fallback Gemini model. Default: "gemma-4-31b-it". */
  GEMINI_FALLBACK_MODEL?: string;
  /** Override default OpenRouter model. Default: "meta-llama/llama-3.3-70b-instruct:free". */
  OPENROUTER_MODEL?: string;
  /** Cooldown duration after 429 (ms). Default: 5 minutes. */
  COOLDOWN_429_MS?: string;
  /** Cooldown duration after 401/403 (ms). Default: 15 minutes. */
  COOLDOWN_403_MS?: string;
}

export interface ProviderStatus {
  name: string;
  configured: boolean;
  hasEnvVar: boolean;
  /** Model currently configured (or default). */
  model?: string;
  /** Whether provider is in cooldown right now. */
  coolingDown?: boolean;
  /** Milliseconds until cooldown ends (0 if not in cooldown). */
  cooldownMsLeft?: number;
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
        cooldowns: { provider: string; msLeft: number }[];
      };
    };

export function isAiError(r: AiChatResult): r is Extract<AiChatResult, { ok: false }> {
  return !r.ok;
}

function isKeySet(value: string | undefined | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

// ── Circuit breaker ────────────────────────────────────────

/** Per-process cooldown registry: provider name → epoch ms when cooldown ends. */
const cooldownState = new Map<string, number>();

/** Cooldown duration after rate limit (429). 5 minutes default. */
function cooldown429Ms(env: AiEnv): number {
  return parseInt(env.COOLDOWN_429_MS || "") || 5 * 60 * 1000;
}

/** Cooldown duration after auth error (401/403). 15 minutes default. */
function cooldown403Ms(env: AiEnv): number {
  return parseInt(env.COOLDOWN_403_MS || "") || 15 * 60 * 1000;
}

/** Check if a provider is currently cooling down. Returns ms until
 *  cooldown ends (0 if not in cooldown or cooldown expired). */
export function getCooldownMsLeft(provider: string): number {
  const until = cooldownState.get(provider);
  if (!until) return 0;
  if (Date.now() >= until) {
    cooldownState.delete(provider);
    return 0;
  }
  return until - Date.now();
}

function setCooldown(provider: string, ms: number): void {
  if (ms <= 0) return;
  const until = Date.now() + ms;
  cooldownState.set(provider, until);
  // Auto-cleanup after cooldown expires (in case no further requests).
  // Using setTimeout in Workers/Node — both support it. Unref is best-effort.
  const timer = setTimeout(() => cooldownState.delete(provider), ms + 1000);
  if (typeof (timer as any).unref === "function") {
    (timer as any).unref();
  }
}

function clearCooldown(provider: string): void {
  cooldownState.delete(provider);
}

/** Clear all cooldowns. Useful for test isolation and admin reset. */
export function clearAllCooldowns(): void {
  cooldownState.clear();
}

/** Get all current cooldowns — used for status endpoint + error messages. */
function getAllCooldowns(): { provider: string; msLeft: number }[] {
  const out: { provider: string; msLeft: number }[] = [];
  for (const [provider, until] of cooldownState) {
    const msLeft = until - Date.now();
    if (msLeft > 0) out.push({ provider, msLeft });
    else cooldownState.delete(provider);
  }
  return out;
}

/** Classify an HTTP error to decide cooldown duration. */
function classifyError(errMsg: string): { type: "rate_limit" | "quota" | "auth" | "other"; status: number } {
  const m = errMsg.match(/\b(\d{3})\b/);
  const status = m ? parseInt(m[1], 10) : 0;
  if (status === 429) {
    if (/quota|exhausted|free.?tier|limit.*reached/i.test(errMsg)) return { type: "quota", status };
    return { type: "rate_limit", status };
  }
  if (status === 401 || status === 403) return { type: "auth", status };
  return { type: "other", status };
}

// ── Provider status (safe — no key values) ────────────────

/** Default models per provider — exposed for status endpoint. */
const DEFAULTS = {
  openrouter: "meta-llama/llama-3.3-70b-instruct:free",
  groq: "groq/compound",
  "groq-fallback": "llama-3.3-70b-versatile",
  gemini: "gemma-4-26b-a4b-it",
  "gemini-fallback": "gemma-4-31b-it",
} as const;

export function getProviderStatus(env: AiEnv): ProviderStatus[] {
  return [
    {
      name: "groq",
      hasEnvVar: "GROQ_API_KEY" in env,
      configured: isKeySet(env.GROQ_API_KEY),
      model: env.GROQ_MODEL || DEFAULTS.groq,
      coolingDown: getCooldownMsLeft("groq") > 0,
      cooldownMsLeft: getCooldownMsLeft("groq"),
    },
    {
      name: "gemini",
      hasEnvVar: "GEMINI_API_KEY" in env,
      configured: isKeySet(env.GEMINI_API_KEY),
      model: env.GEMINI_MODEL || DEFAULTS.gemini,
      coolingDown: getCooldownMsLeft("gemini") > 0,
      cooldownMsLeft: getCooldownMsLeft("gemini"),
    },
    {
      name: "openrouter",
      hasEnvVar: "OPENROUTER_API_KEY" in env,
      configured: isKeySet(env.OPENROUTER_API_KEY),
      model: env.OPENROUTER_MODEL || DEFAULTS.openrouter,
      coolingDown: getCooldownMsLeft("openrouter") > 0,
      cooldownMsLeft: getCooldownMsLeft("openrouter"),
    },
  ];
}

// ── Provider functions ──────────────────────────────────────

async function tryProvider(
  name: string,
  fn: () => Promise<string>,
  errors: string[],
  env: AiEnv,
): Promise<{ content: string; provider: string } | null> {
  // Skip if cooling down
  const msLeft = getCooldownMsLeft(name);
  if (msLeft > 0) {
    errors.push(`${name}: cooling down (${Math.ceil(msLeft / 1000)}s remaining)`);
    return null;
  }
  try {
    const content = await fn();
    if (content) {
      clearCooldown(name);
      return { content, provider: name };
    }
    errors.push(`${name}: empty response`);
    return null;
  } catch (e: any) {
    const msg = e?.message || String(e);
    errors.push(`${name}: ${msg}`);
    const cls = classifyError(msg);
    if (cls.type === "rate_limit" || cls.type === "quota") {
      setCooldown(name, cooldown429Ms(env));
    } else if (cls.type === "auth") {
      setCooldown(name, cooldown403Ms(env));
    }
    return null;
  }
}

/** OpenAI-compatible POST to /chat/completions. Used by OpenRouter + Groq. */
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
  if (!text) throw new Error(`${url} returned empty response`);
  return text;
}

/** Google Gemini REST API — tries primary model, then fallback model
 *  on quota/rate-limit error. Both fall under the "gemini" provider
 *  cooldown (shared quota pool per Google's billing account). */
async function chatGemini(
  system: string,
  messages: ChatMessage[],
  apiKey: string,
  primaryModel: string,
  fallbackModel: string,
): Promise<string> {
  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body = JSON.stringify({
    contents,
    systemInstruction: { role: "user", parts: [{ text: system }] },
  });

  // Try primary model (REST endpoint)
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${primaryModel}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body },
    );
    if (resp.ok) {
      const data: any = await resp.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } else if (resp.status === 429 || resp.status === 404) {
      // Quota/rate-limit OR model not found → try fallback
      const fallback = await tryGeminiFallback(system, messages, apiKey, fallbackModel, body);
      if (fallback) return fallback;
      throw new Error(`Gemini ${resp.status}: ${await resp.text()}`);
    } else {
      throw new Error(`Gemini ${resp.status}: ${await resp.text()}`);
    }
  } catch (e: any) {
    // Network error etc. — try fallback before giving up.
    if (e?.message?.includes("Gemini ")) throw e;
    const fallback = await tryGeminiFallback(system, messages, apiKey, fallbackModel, body);
    if (fallback) return fallback;
    throw e;
  }
  // Should not reach here
  throw new Error("Gemini all attempts failed");
}

async function tryGeminiFallback(
  _system: string,
  _messages: ChatMessage[],
  apiKey: string,
  model: string,
  body: string,
): Promise<string | null> {
  try {
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body },
    );
    if (!resp.ok) return null;
    const data: any = await resp.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}

// ── Provider list builder ──────────────────────────────────

/** Build provider list based on which keys are configured (non-empty),
 *  filter out cooling-down providers, sort by priority. */
function buildProviderList(
  env: AiEnv,
  system: string,
  messages: ChatMessage[],
): { name: string; run: () => Promise<string> }[] {
  const all: { name: string; priority: number; run: () => Promise<string> }[] = [];

  if (isKeySet(env.GROQ_API_KEY)) {
    all.push({
      name: "groq",
      priority: 1,
      run: () => chatOpenAICompatible(
        "https://api.groq.com/openai/v1/chat/completions",
        env.GROQ_MODEL || DEFAULTS.groq,
        env.GROQ_API_KEY!,
        system,
        messages,
      ),
    });
  }

  if (isKeySet(env.GEMINI_API_KEY)) {
    all.push({
      name: "gemini",
      priority: 2,
      run: () => chatGemini(
        system,
        messages,
        env.GEMINI_API_KEY!,
        env.GEMINI_MODEL || DEFAULTS.gemini,
        env.GEMINI_FALLBACK_MODEL || DEFAULTS["gemini-fallback"],
      ),
    });
  }

  if (isKeySet(env.GROQ_API_KEY)) {
    all.push({
      name: "groq-fallback",
      priority: 3,
      run: () => chatOpenAICompatible(
        "https://api.groq.com/openai/v1/chat/completions",
        env.GROQ_FALLBACK_MODEL || DEFAULTS["groq-fallback"],
        env.GROQ_API_KEY!,
        system,
        messages,
      ),
    });
  }

  if (isKeySet(env.OPENROUTER_API_KEY)) {
    all.push({
      name: "openrouter",
      priority: 4,
      run: () => chatOpenAICompatible(
        "https://openrouter.ai/api/v1/chat/completions",
        env.OPENROUTER_MODEL || DEFAULTS.openrouter,
        env.OPENROUTER_API_KEY!,
        system,
        messages,
        { "HTTP-Referer": "https://quantbit.pages.dev", "X-Title": "Quantbit" },
      ),
    });
  }

  // Filter out providers that are in cooldown, sort by priority.
  return all
    .filter((p) => getCooldownMsLeft(p.name) === 0)
    .sort((a, b) => a.priority - b.priority)
    .map((p) => ({ name: p.name, run: p.run }));
}

// ── Error message builder ─────────────────────────────────

function buildErrorMessage(
  statuses: ProviderStatus[],
  errors: string[],
  cooldowns: { provider: string; msLeft: number }[],
  isDev: boolean,
): string {
  const configured = statuses.filter((s) => s.configured);
  const lines: string[] = [];
  lines.push("Maaf, AI sedang tidak tersedia.\n");

  // Status block
  lines.push("**Status API key (server-side):**");
  if (configured.length === 0) {
    lines.push("❌ Tidak ada API key yang dikonfigurasi di server.");
  } else {
    for (const s of statuses) {
      if (!s.hasEnvVar) continue;  // skip non-existent env vars to keep output clean
      const mark = s.configured ? "✅" : "❌";
      const cdMark = s.coolingDown ? " ⏳" : "";
      const envName = s.name === "openrouter" ? "OPENROUTER_API_KEY"
        : s.name === "groq" ? "GROQ_API_KEY"
        : s.name === "gemini" ? "GEMINI_API_KEY"
        : `${s.name.toUpperCase()}_API_KEY`;
      lines.push(`${mark} \`${envName}\` (${s.model || "default"})${cdMark} ${s.configured ? "configured" : "NOT set"}`);
    }
  }
  lines.push("");

  // Cooldown block
  if (cooldowns.length > 0) {
    lines.push("**Provider cooldown (skipping temporarily):**");
    for (const c of cooldowns) {
      const minLeft = Math.ceil(c.msLeft / 60000);
      const secLeft = Math.ceil(c.msLeft / 1000);
      const timeStr = minLeft >= 1 ? `${minLeft}m` : `${secLeft}s`;
      lines.push(`- ⏳ ${c.provider}: ${timeStr} remaining`);
    }
    lines.push("");
  }

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
  } else if (cooldowns.length > 0 && cooldowns.length === configured.length) {
    lines.push(`**Diagnosis:** Semua ${configured.length} provider sedang cooling down (rate-limited / quota exceeded). Tunggu cooldown selesai, atau tambah provider baru.`);
  } else if (errors.length > 0 && configured.length > 0) {
    lines.push(`**Diagnosis:** ${configured.length} provider sudah configured, ${errors.length} attempts gagal. Kemungkinan: rate limit, quota, atau key invalid.`);
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
  lines.push("**Rekomendasi**: `GROQ_API_KEY` (free tier `groq/compound` model = no daily cap, agent capabilities).");
  lines.push("");
  lines.push("Untuk testing tanpa API key, aktifkan **Use Dev Mock** di Settings → AI Agent (dev only).");

  return lines.join("\n");
}

// ── Main entry point ───────────────────────────────────────

export interface RunAiChatOptions {
  isDev?: boolean;
  memory?: MemoryMessage[];
}

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
      diagnostic: { configuredProviders: [], attemptedProviders: [], errors: [], isDev, cooldowns: [] },
    };
  }

  const baseSystem = buildSystemPrompt(context);
  const memoryBlock = formatMemoryBlock(options.memory ?? []);
  const system = memoryBlock
    ? baseSystem + truncateToMemoryBudget(baseSystem, memoryBlock)
    : baseSystem;
  const errors: string[] = [];
  const providers = buildProviderList(env, system, messages);

  for (const p of providers) {
    const result = await tryProvider(p.name, p.run, errors, env);
    if (result) {
      return {
        ok: true,
        content: result.content,
        provider: result.provider,
      };
    }
  }

  // All providers failed or in cooldown. Build diagnostic.
  const statuses = getProviderStatus(env);
  const configured = statuses.filter((s) => s.configured).map((s) => s.name);
  const attempted = providers.map((p) => p.name);
  const cooldowns = getAllCooldowns();
  const content = buildErrorMessage(statuses, errors, cooldowns, isDev);

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
      cooldowns,
    },
  };
}

export function getAiStatus(env: AiEnv, isDev: boolean = false) {
  const statuses = getProviderStatus(env);
  return {
    isDev,
    providers: statuses,
    anyConfigured: statuses.some((s) => s.configured),
    configuredCount: statuses.filter((s) => s.configured).length,
    cooldowns: getAllCooldowns(),
  };
}
