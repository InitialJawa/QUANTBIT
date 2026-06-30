// server.ts
import express from "express";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createTransport } from "nodemailer";
import { execSync } from "child_process";
import { handleYahooRequest } from "./src/server/yahooApi";
import { runAiChat, getAiStatus, getAiStatusWithQuota, isAiError, type ChatMessage } from "./src/server/aiChatHandler";

// Node 18 compat: load .env.local manually (--env-file requires Node >=20.12)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, "..", ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3001;

function getEmailTransport() {
  const host = process.env.EMAIL_HOST;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!host || !user || !pass) return null;
  return createTransport({
    host,
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true",
    auth: { user, pass },
  });
}

app.post("/api/send-notification", async (req, res) => {
  try {
    const transport = getEmailTransport();
    if (!transport) {
      res.status(503).json({ error: "Email not configured (set EMAIL_HOST, EMAIL_USER, EMAIL_PASS)" });
      return;
    }
    const { subject, body } = req.body;
    if (!subject || !body) {
      res.status(400).json({ error: "Missing subject or body" });
      return;
    }
    const to = process.env.EMAIL_TO || process.env.EMAIL_USER;
    await transport.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject: `[QuantBit] ${subject}`,
      text: body,
    });
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/yahoo", handleYahooRequest);

// Local dev live prices — mirrors functions/api/[[path]].ts:handleYahooPrices
// so useDataFeed.ts gets real IHSG/USDIDR/GOLD prices in dev mode.
let _lastYahooPrices: Record<string, { close: number; change: number; pct: number }> | null = null;
app.get("/api/yahoo/live-prices", async (_req, res) => {
  try {
    const tickers = ["BBCA.JK","BBRI.JK","BMRI.JK","TLKM.JK","ASII.JK","ADRO.JK","PTBA.JK","ESSA.JK","GOTO.JK","^JKSE","USDIDR=X","GC=F"];
    const resp = await fetch(`https://query1.finance.yahoo.com/v8/finance/spark?symbols=${tickers.join(",")}`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", Accept: "application/json" },
    });
    if (!resp.ok) throw new Error(`Yahoo HTTP ${resp.status}`);
    const apiRes: any = await resp.json();
    const prices: Record<string, { close: number; change: number; pct: number }> = {};
    for (const [symRaw, item] of Object.entries(apiRes)) {
      let sym = (symRaw as string).split(".")[0];
      if (symRaw === "^JKSE") sym = "IHSG";
      if (symRaw === "USDIDR=X") sym = "USDIDR";
      if (symRaw === "GC=F") sym = "GOLD";
      const d = item as any;
      if (d?.close?.length) {
        const closes = d.close.filter((c: any) => typeof c === "number");
        const lc = closes[closes.length - 1];
        const prev = d.previousClose || lc || 1;
        prices[sym] = { close: Number(lc || 0), change: Number((lc || 0) - prev), pct: Number(((lc || 0) - prev) / prev * 100) };
      }
    }
    _lastYahooPrices = prices;
    res.json({ success: true, prices, source: "Yahoo Finance (Live)" });
  } catch (e: any) {
    if (_lastYahooPrices) return res.json({ success: true, prices: _lastYahooPrices, source: "Yahoo Finance (Cached)" });
    res.json({ success: false, error: e.message, source: "Offline Mock" });
  }
});

// Local dev AI chat — same logic as Cloudflare Pages Functions
// (functions/api/[[path]].ts) but reads API keys from process.env.
// Provider chain: Groq → Gemini → Groq-fallback → OpenRouter.
// See src/server/aiChatHandler.ts.
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { messages, context, sessionId, userId } = req.body || {};
    const effectiveUserId = userId || "dev-user";
    // Fetch recent memory (excluding current session).
    const memory = sessionId
      ? memGetRecent(effectiveUserId, 20, sessionId)
      : undefined;
    const result = await runAiChat(
      (messages || []) as ChatMessage[],
      context,
      {
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        COHERE_API_KEY: process.env.COHERE_API_KEY,
        MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
        GROQ_MODEL: process.env.GROQ_MODEL,
        GROQ_FALLBACK_MODEL: process.env.GROQ_FALLBACK_MODEL,
        GEMINI_MODEL: process.env.GEMINI_MODEL,
        GEMINI_FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL,
        OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
        OPENROUTER_MODEL_2: process.env.OPENROUTER_MODEL_2,
        OPENROUTER_MODEL_3: process.env.OPENROUTER_MODEL_3,
        OPENROUTER_MODEL_4: process.env.OPENROUTER_MODEL_4,
        COHERE_MODEL: process.env.COHERE_MODEL,
        MISTRAL_MODEL: process.env.MISTRAL_MODEL,
        COOLDOWN_429_MS: process.env.COOLDOWN_429_MS,
        COOLDOWN_403_MS: process.env.COOLDOWN_403_MS,
      },
      { isDev: true, memory },
    );
    if (result.ok) {
      res.json({ content: result.content, provider: result.provider });
    } else if (isAiError(result)) {
      res.status(result.status).json({
        content: result.content,
        provider: result.provider,
        diagnostic: result.diagnostic,
      });
    } else {
      res.status(500).json({ content: "Unknown error", provider: "error" });
    }
  } catch (err: any) {
    res.status(500).json({ content: `Maaf, terjadi kendala: ${err.message}`, provider: "error" });
  }
});

// Diagnostic endpoint — shows which API keys are configured (no key values)
// + OpenRouter quota if key set.
app.get("/api/ai/status", async (_req, res) => {
  try {
    const status = await getAiStatusWithQuota({
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      COHERE_API_KEY: process.env.COHERE_API_KEY,
      MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
      GROQ_MODEL: process.env.GROQ_MODEL,
      GROQ_FALLBACK_MODEL: process.env.GROQ_FALLBACK_MODEL,
      GEMINI_MODEL: process.env.GEMINI_MODEL,
      GEMINI_FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL,
      OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
      OPENROUTER_MODEL_2: process.env.OPENROUTER_MODEL_2,
      OPENROUTER_MODEL_3: process.env.OPENROUTER_MODEL_3,
      OPENROUTER_MODEL_4: process.env.OPENROUTER_MODEL_4,
      COHERE_MODEL: process.env.COHERE_MODEL,
      MISTRAL_MODEL: process.env.MISTRAL_MODEL,
      COOLDOWN_429_MS: process.env.COOLDOWN_429_MS,
      COOLDOWN_403_MS: process.env.COOLDOWN_403_MS,
    }, true);
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── AI Memory endpoints (local dev: in-memory store) ───────

app.get("/api/ai/sessions", (req, res) => {
  const userId = (req.query.userId as string) || "dev-user";
  res.json({ sessions: memListSessions(userId, 20) });
});

app.post("/api/ai/sessions", (req, res) => {
  const userId = (req.body?.userId as string) || "dev-user";
  const title = req.body?.title as string | undefined;
  const firstMessage = req.body?.firstMessage as string | undefined;
  const id = memCreateSession(userId, title, firstMessage);
  res.json({ sessionId: id, title: firstMessage ? firstMessage.replace(/\s+/g, " ").trim().slice(0, 57) : title ?? null });
});

app.get("/api/ai/sessions/:id/messages", (req, res) => {
  const userId = (req.query.userId as string) || "dev-user";
  res.json({ sessionId: req.params.id, messages: memGetSessionMessages(req.params.id, userId) });
});

app.post("/api/ai/messages", (req, res) => {
  const { sessionId, userId, role, content, toolCalls, metadata } = req.body || {};
  if (!sessionId || !role || !content) {
    res.status(400).json({ error: "sessionId, role, content required" });
    return;
  }
  const id = memAppendMessage({
    sessionId,
    userId: userId || "dev-user",
    role,
    content,
  });
  res.json({ id, ok: true });
});

app.post("/api/ai/sessions/title", (req, res) => {
  const { sessionId, title } = req.body || {};
  const sess = memStore.sessions.get(sessionId);
  if (sess) {
    const trimmed = (title || "").replace(/\s+/g, " ").trim().slice(0, 57);
    sess.title = trimmed + ((title || "").length > 57 ? "..." : "");
  }
  res.json({ ok: true, title: sess?.title });
});

app.delete("/api/ai/sessions/:id", (req, res) => {
  const userId = (req.query.userId as string) || "dev-user";
  memDeleteSession(req.params.id, userId);
  res.json({ ok: true });
});

// ── In-memory memory store (local dev only) ───────────────

interface MemSession { id: string; user_id: string; title: string | null; message_count: number; created_at: string; last_message_at: string }
interface MemMessage { id: string; session_id: string; user_id: string; role: "user" | "assistant" | "tool"; content: string; tool_calls: string | null; metadata: string | null; created_at: string }
const memStore: { sessions: Map<string, MemSession>; messages: Map<string, MemMessage[]> } = {
  sessions: new Map(),
  messages: new Map(),
};
const newMemId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

function memCreateSession(userId: string, title?: string, firstMessage?: string): string {
  const id = newMemId();
  const now = new Date().toISOString();
  const autoTitle = firstMessage
    ? firstMessage.replace(/\s+/g, " ").trim().slice(0, 57) + (firstMessage.length > 57 ? "..." : "")
    : null;
  const sess: MemSession = { id, user_id: userId, title: title ?? autoTitle, message_count: 0, created_at: now, last_message_at: now };
  memStore.sessions.set(id, sess);
  memStore.messages.set(id, []);
  return id;
}
function memListSessions(userId: string, limit: number): MemSession[] {
  return Array.from(memStore.sessions.values())
    .filter((s) => s.user_id === userId)
    .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at))
    .slice(0, limit);
}
function memAppendMessage(params: { sessionId: string; userId: string; role: "user" | "assistant" | "tool"; content: string }): string {
  const id = newMemId();
  const msg: MemMessage = {
    id,
    session_id: params.sessionId,
    user_id: params.userId,
    role: params.role,
    content: params.content,
    tool_calls: null,
    metadata: null,
    created_at: new Date().toISOString(),
  };
  const arr = memStore.messages.get(params.sessionId) || [];
  arr.push(msg);
  memStore.messages.set(params.sessionId, arr);
  const sess = memStore.sessions.get(params.sessionId);
  if (sess) {
    sess.message_count++;
    sess.last_message_at = msg.created_at;
  }
  return id;
}
function memGetSessionMessages(sessionId: string, _userId: string): MemMessage[] {
  return memStore.messages.get(sessionId) || [];
}
function memGetRecent(userId: string, limit: number, excludeSessionId: string) {
  const all = Array.from(memStore.messages.values())
    .flat()
    .filter((m) => m.user_id === userId && m.session_id !== excludeSessionId)
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .slice(-limit);
  return all.map((m) => {
    const sess = memStore.sessions.get(m.session_id);
    return {
      role: m.role,
      content: m.content,
      created_at: m.created_at,
      session_id: m.session_id,
      session_title: sess?.title ?? null,
    };
  });
}
function memDeleteSession(sessionId: string, userId: string): void {
  const sess = memStore.sessions.get(sessionId);
  if (sess && sess.user_id === userId) {
    memStore.sessions.delete(sessionId);
    memStore.messages.delete(sessionId);
  }
}
function getAiStatusFromEnv() {
  return getAiStatus(
    {
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      COHERE_API_KEY: process.env.COHERE_API_KEY,
      MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
      GROQ_MODEL: process.env.GROQ_MODEL,
      GROQ_FALLBACK_MODEL: process.env.GROQ_FALLBACK_MODEL,
      GEMINI_MODEL: process.env.GEMINI_MODEL,
      GEMINI_FALLBACK_MODEL: process.env.GEMINI_FALLBACK_MODEL,
      OPENROUTER_MODEL: process.env.OPENROUTER_MODEL,
      OPENROUTER_MODEL_2: process.env.OPENROUTER_MODEL_2,
      OPENROUTER_MODEL_3: process.env.OPENROUTER_MODEL_3,
      OPENROUTER_MODEL_4: process.env.OPENROUTER_MODEL_4,
      COHERE_MODEL: process.env.COHERE_MODEL,
      MISTRAL_MODEL: process.env.MISTRAL_MODEL,
      COOLDOWN_429_MS: process.env.COOLDOWN_429_MS,
      COOLDOWN_403_MS: process.env.COOLDOWN_403_MS,
    },
    true,
  );
}

// ── DB-backed backtest data (replaces file-based JSON) ────

const DB_SCRIPT = join(process.cwd(), "scripts", "export-backtest-json.py");

/** Load all historical data from SQLite DB (via Python bridge). */
function loadBacktestDataFromDb(startDate: string, endDate: string): any[] {
  try {
    // Try python3 first (Linux/Mac), then fallback to python (Windows)
    const pythonCmd = process.platform === "win32" ? "python" : "python3";
    const stdout = execSync(
      `${pythonCmd} "${DB_SCRIPT}" "${startDate}" "${endDate}"`,
      { encoding: "utf-8", timeout: 30000 },
    );
    const result = JSON.parse(stdout);
    if (result && typeof result === "object" && "error" in result) {
      throw new Error(result.error);
    }
    console.log(`✓ Loaded ${result.length} days from DB (${startDate} to ${endDate})`);
    return result as any[];
  } catch (err: any) {
    console.error("DB load failed, falling back to file-based:", err.message);
    // Fallback: read from year files (legacy path)
    const allData: any[] = [];
    const yStart = parseInt(startDate.slice(0, 4));
    const yEnd = parseInt(endDate.slice(0, 4));
    for (let y = yStart; y <= yEnd; y++) {
      const yearPath = join(process.cwd(), "data", "years", `${y}.json`);
      if (existsSync(yearPath)) {
        try {
          const chunk = JSON.parse(readFileSync(yearPath, "utf-8"));
          allData.push(...chunk);
          console.log(`✓ Loaded ${chunk.length} days from ${yearPath}`);
        } catch (e) {
          console.warn(`Failed to parse ${yearPath}:`, (e as any).message);
        }
      }
    }
    if (allData.length === 0) {
      throw new Error(`No historical data found for ${startDate} to ${endDate}`);
    }
    return allData;
  }
}

app.get("/api/backtest-data", (req, res) => {
  try {
    const configType = (req.query.configType as string) === "res" ? "res" : "prod";
    const yearStart = parseInt(req.query.from as string) || 2000;
    const yearEnd = parseInt(req.query.to as string) || 2026;
    const startDate = `${yearStart}-01-01`;
    const endDate = `${yearEnd}-12-31`;

    console.log(`[API] /api/backtest-data requested: ${startDate} to ${endDate}, configType=${configType}`);

    const allData = loadBacktestDataFromDb(startDate, endDate);
    if (allData.length === 0) {
      console.error(`[API] No historical data available for ${startDate} to ${endDate}`);
      res.status(503).json({ success: false, error: "No historical data available" });
      return;
    }
    const bridged = bridgeHistoricalData(allData);
    const data = bridged.map((day: any) => ({
      date: day.date,
      ihsgPrice: day.ihsgPrice,
      goldPrice: day.goldPrice,
      stockPrices: day.stockAdjPrices || day.stockPrices,
      stockAdjPrices: day.stockAdjPrices || day.stockPrices,
      stockRanks: configType === "prod" ? day.stockRanksProd : day.stockRanksRes,
      stockRanksProd: day.stockRanksProd,
      stockRanksRes: day.stockRanksRes,
      stockRawMetrics: day.stockRawMetrics ?? null,
      stockNormScores: day.stockNormScores ?? null,
      isCarriedForward: day.isCarriedForward || false,
    }));
    const defaultWeights = {
      prod: { quality: 0.45, growth: 0.1, value: 0.05, momentum: 0.40 },
      res: { quality: 0.40, growth: 0.25, value: 0.05, momentum: 0.30 },
    };
    console.log(`[API] Returning ${data.length} days (bridged from ${allData.length})`);
    res.json({
      success: true, count: data.length, configType,
      weights: defaultWeights,
      data,
    });
  } catch (err: any) {
    console.error(`[API] /api/backtest-data error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

function bridgeHistoricalData(rawData: any[]): any[] {
  if (rawData.length === 0) return rawData;
  const last = rawData[rawData.length - 1];
  const lastDate = new Date(last.date);
  const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const todayStr = now.toISOString().slice(0, 10);
  if (last.date >= todayStr) return rawData;

  const bridged = [...rawData];
  const curr = new Date(lastDate.getTime() + 86400000);
  while (curr <= now) {
    const dow = curr.getDay();
    if (dow !== 0 && dow !== 6) {
      const ds = curr.toISOString().slice(0, 10);
      if (ds <= todayStr) bridged.push({ ...last, date: ds, isCarriedForward: true });
    }
    curr.setDate(curr.getDate() + 1);
  }
  return bridged;
}

app.listen(PORT, () => {
  console.log(`Dev API server listening on http://localhost:${PORT}`);
});
