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

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface AiEnv {
  OPENROUTER_API_KEY?: string;
  GROQ_API_KEY?: string;
  GEMINI_API_KEY?: string;
}

export type AiChatResult =
  | { ok: true; content: string; provider: string }
  | { ok: false; content: string; provider: "none" | "error"; status: number; errors: string[] };

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

/** Build provider list based on which keys are configured. */
function buildProviderList(env: AiEnv, system: string, messages: ChatMessage[]) {
  const providers: { name: string; run: () => Promise<string> }[] = [];

  if (env.OPENROUTER_API_KEY) {
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
  if (env.GROQ_API_KEY) {
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
  if (env.GEMINI_API_KEY) {
    providers.push({
      name: "gemini",
      run: () => chatGemini(system, messages, env.GEMINI_API_KEY!),
    });
  }

  return providers;
}

/** Main entry point — try each provider in order, return the first success. */
export async function runAiChat(
  messages: ChatMessage[],
  context: AILiveContext | undefined,
  env: AiEnv,
): Promise<AiChatResult> {
  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      ok: false,
      content: "messages array required",
      provider: "error",
      status: 400,
      errors: [],
    };
  }

  const system = buildSystemPrompt(context);
  const errors: string[] = [];
  const providers = buildProviderList(env, system, messages);

  for (const p of providers) {
    const result = await tryProvider(p.name, p.run, errors);
    if (result) return { ok: true, ...result };
  }

  // All providers failed (or none configured). Build diagnostic message.
  const tried: string[] = [];
  if (env.OPENROUTER_API_KEY) tried.push("openrouter");
  if (env.GROQ_API_KEY) tried.push("groq");
  if (env.GEMINI_API_KEY) tried.push("gemini");

  const noKeyConfigured = tried.length === 0;
  const reason = errors.length ? errors.join(" | ") : "No AI provider configured";

  const triedBlock = tried.length
    ? tried.map((p) => `- **${p}**: gagal`).join("\n")
    : "- Tidak ada provider yang dikonfigurasi";

  const content = `Maaf, AI sedang tidak tersedia.

**Provider yang dicoba:**
${triedBlock}

**Penyebab:** ${reason}

**Solusi:**
- **Local dev**: tambahkan API key di file .env.local (satu atau lebih: OPENROUTER_API_KEY, GROQ_API_KEY, GEMINI_API_KEY), lalu restart \`npm run serve-api\` + Vite.
- **Production (Cloudflare)**: tambah di Dashboard → quantbit-terminal → Settings → Environment Variables, lalu redeploy.

**Rekomendasi**: daftar gratis di https://openrouter.ai/keys (proxy banyak model termasuk Gemini, **tanpa geo restriction**).

Untuk testing tanpa API key, aktifkan **Use Dev Mock** di Settings → AI Agent (dev mode only).`;

  return { ok: false, content, provider: "none", status: 200, errors };
}
