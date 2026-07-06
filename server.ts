// server.ts
import express from "express";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createTransport } from "nodemailer";
import { execSync } from "child_process";
import { handleYahooRequest } from "./src/server/yahooApi";
import { runAiChat, getAiStatus, getAiStatusWithQuota, isAiError, type ChatMessage } from "./src/server/aiChatHandler";
import { ensureSchema, queryAll, queryOne } from "./src/server/db";
import cron from "node-cron";

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
    if (!apiRes) throw new Error("Yahoo returned empty response");
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

// ── D1-backed endpoints ─────────────────────────────────────

// Init D1 schema on first request
let _d1Initialized = false;
async function ensureD1() {
  if (_d1Initialized) return;
  try {
    await ensureSchema();
    _d1Initialized = true;
    console.log("[D1] Schema ready");
  } catch (e: any) {
    console.warn("[D1] Schema init failed:", e.message);
  }
}

// ── Stock scores ──
app.get("/api/stocks/scores", async (_req, res) => {
  try {
    await ensureD1();
    const rows = await queryAll(
      "SELECT ticker,quality,growth,value,dividend,momentum,score_date FROM stock_scores WHERE score_date=(SELECT MAX(score_date) FROM stock_scores) ORDER BY ticker"
    );
    const stocks = rows.map((r: any, i: number) => ({
      rank: String(i + 1),
      ticker: r.ticker + ".JK",
      quality: String(r.quality ?? 50),
      growth: String(r.growth ?? 50),
      value: String(r.value ?? 50),
      momentum: String(r.momentum ?? 50),
      dividend: String(r.dividend ?? 50),
      final_score: String(Math.round(
        (r.quality ?? 50) * 0.25 + (r.growth ?? 50) * 0.25 + (r.value ?? 50) * 0.25 + (r.momentum ?? 50) * 0.25
      )),
    }));
    res.json({ success: true, count: stocks.length, stocks, lastUpdated: rows[0]?.score_date || null });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Ticker profiles ──
app.get("/api/stocks/profiles", async (_req, res) => {
  try {
    await ensureD1();
    const rows = await queryAll("SELECT ticker,name,sector,industry,is_idx80 FROM tickers WHERE is_active=1 ORDER BY ticker");
    const profiles: Record<string, any> = {};
    for (const r of rows) {
      profiles[r.ticker] = { name: r.name, sector: r.sector, industry: r.industry };
    }
    res.json({ success: true, data: profiles, count: Object.keys(profiles).length });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Fundamentals ──
app.get("/api/stocks/fundamentals", async (_req, res) => {
  try {
    await ensureD1();
    const rows = await queryAll(
      "SELECT s.ticker,s.quality,s.growth,s.value,s.dividend,s.momentum,t.sector,t.industry FROM stock_scores s LEFT JOIN tickers t ON s.ticker=t.ticker WHERE s.score_date=(SELECT MAX(score_date) FROM stock_scores) ORDER BY s.ticker"
    );
    const data: Record<string, any> = {};
    for (const r of rows) {
      data[r.ticker + ".JK"] = {
        roe: null, net_margin: null, operating_margin: null,
        debt_to_equity: null, free_cash_flow: null,
        pe_ratio: null, pb_ratio: null, dividend_yield: null,
        roa: null, market_cap: null, revenue_growth: null, earnings_growth: null,
        quality_score: r.quality, growth_score: r.growth,
        value_score: r.value, momentum_score: r.momentum, dividend_score: r.dividend,
        sector: r.sector, industry: r.industry,
      };
    }
    res.json({ success: true, data, count: Object.keys(data).length });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Engine/idx80 (scan data for dashboard) ──
app.get("/api/engine/idx80", async (_req, res) => {
  try {
    await ensureD1();
    const rows = await queryAll(
      "SELECT s.ticker,s.quality,s.growth,s.value,s.dividend,s.momentum,t.sector,t.industry,t.name FROM stock_scores s LEFT JOIN tickers t ON s.ticker=t.ticker WHERE s.score_date=(SELECT MAX(score_date) FROM stock_scores) ORDER BY s.ticker"
    );
    const stocks = rows.map((r: any) => ({
      ticker: r.ticker + ".JK",
      quality: r.quality ?? 50,
      growth: r.growth ?? 50,
      value: r.value ?? 50,
      momentum: r.momentum ?? 50,
      dividend: r.dividend ?? 50,
      currentPrice: 0,
      changePercent: 0,
      companyName: r.name || r.ticker,
      sector: r.sector,
      industry: r.industry,
    }));
    res.json({ success: true, stocks, lastUpdated: new Date().toISOString() });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── DB sync status ──
app.get("/api/db-sync-status", async (_req, res) => {
  try {
    await ensureD1();
    const row = await queryOne("SELECT MAX(date) as latest FROM market_daily") as any;
    const latestDate = row?.latest || null;
    const stale = latestDate
      ? (Date.now() - new Date(latestDate + "T23:59:59+07:00").getTime()) > 86400000 * 2
      : true;
    res.json({ success: true, latestDate, stale, source: "D1" });
  } catch {
    res.json({ success: true, latestDate: null, stale: true, source: "D1" });
  }
});

app.post("/api/market/sync", async (_req, res) => {
  try {
    const syncScript = join(process.cwd(), "scripts", "pipeline-sync.ts");
    execSync(`npx tsx "${syncScript}"`, { encoding: "utf-8", timeout: 300000, cwd: process.cwd() });
    res.json({ success: true, message: "Sync selesai" });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── D1-backed backtest data ──
app.get("/api/backtest-data", async (req, res) => {
  try {
    await ensureD1();
    const configType = (req.query.configType as string) === "res" ? "res" : "prod";
    const yearStart = parseInt(req.query.from as string) || 2021;
    const yearEnd = parseInt(req.query.to as string) || 2026;
    const isLight = req.query.light !== undefined;

    // Load market daily
    const marketRows = await queryAll(
      "SELECT date,ihsg_close,gold_close,usdidr_rate FROM market_daily WHERE date >= ? AND date <= ? ORDER BY date",
      [`${yearStart}-01-01`, `${yearEnd}-12-31`]
    ) as any[];

    if (marketRows.length === 0) {
      res.status(503).json({ success: false, error: "No historical data available" });
      return;
    }

    if (isLight) {
      const data = marketRows.map((m: any) => ({
        date: m.date, ihsgPrice: m.ihsg_close, goldPrice: m.gold_close, usdidrRate: m.usdidr_rate,
      }));
      res.json({ success: true, count: data.length, configType, data });
      return;
    }

    // Load stock daily (all tickers, all dates)
    const stockRows = await queryAll(
      "SELECT date,ticker,close,adj_close FROM stock_daily WHERE date >= (SELECT MIN(date) FROM market_daily) ORDER BY date,ticker"
    ) as any[];

    // Group stock prices by date
    const stockByDate: Record<string, Record<string, number>> = {};
    for (const sr of stockRows) {
      if (!stockByDate[sr.date]) stockByDate[sr.date] = {};
      stockByDate[sr.date][sr.ticker] = sr.close;
    }
    const stockAdjByDate: Record<string, Record<string, number>> = {};
    for (const sr of stockRows) {
      if (!stockAdjByDate[sr.date]) stockAdjByDate[sr.date] = {};
      stockAdjByDate[sr.date][sr.ticker] = sr.adj_close ?? sr.close;
    }

    // Load scores
    const scoreDate = await queryOne("SELECT MAX(score_date) as sd FROM stock_scores") as any;
    const scoreRows = scoreDate?.sd
      ? await queryAll("SELECT ticker,quality,growth,value,dividend,momentum FROM stock_scores WHERE score_date=?", [scoreDate.sd]) as any[]
      : [];
    const scoreMap: Record<string, any> = {};
    for (const sr of scoreRows) {
      scoreMap[sr.ticker] = sr;
    }

    // Build backtest data
    const data = marketRows.map((m: any) => {
      const stockPrices = stockByDate[m.date] || {};
      const stockAdj = stockAdjByDate[m.date] || {};
      const stockNormScores: Record<string, any> = {};
      for (const [tkr, close] of Object.entries(stockAdj)) {
        const sc = scoreMap[tkr];
        if (sc) {
          stockNormScores[tkr] = {
            quality: sc.quality ?? 50,
            growth: sc.growth ?? 50,
            value: sc.value ?? 50,
            momentum: sc.momentum ?? 50,
            dividend: sc.dividend ?? 50,
          };
        }
      }

      return {
        date: m.date,
        ihsgPrice: m.ihsg_close,
        goldPrice: m.gold_close,
        usdidrRate: m.usdidr_rate,
        stockAdjPrices: stockAdj,
        stockPrices,
        stockNormScores: Object.keys(stockNormScores).length > 0 ? stockNormScores : undefined,
      };
    });

    // Bridge to today
    const last = data[data.length - 1];
    const lastDate = new Date(last.date);
    const now = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const todayStr = now.toISOString().slice(0, 10);
    if (last.date < todayStr) {
      const curr = new Date(lastDate.getTime() + 86400000);
      while (curr <= now) {
        const dow = curr.getDay();
        if (dow !== 0 && dow !== 6) {
          const ds = curr.toISOString().slice(0, 10);
          if (ds <= todayStr) data.push({ ...last, date: ds, isCarriedForward: true } as any);
        }
        curr.setDate(curr.getDate() + 1);
      }
    }

    const defaultWeights = {
      prod: { quality: 0.45, growth: 0.1, value: 0.05, momentum: 0.40 },
      res: { quality: 0.40, growth: 0.25, value: 0.05, momentum: 0.30 },
    };
    res.json({ success: true, count: data.length, configType, weights: defaultWeights, data });
  } catch (err: any) {
    console.error(`[API] /api/backtest-data error:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Cron: pipeline harian ──
// Jadwal: setiap hari kerja jam 16:30 WIB (09:30 UTC)
cron.schedule("30 9 * * 1-5", async () => {
  const pipelineScript = join(process.cwd(), "scripts", "pipeline-sync.ts");
  try {
    console.log("[cron] Starting pipeline...");
    execSync(`npx tsx "${pipelineScript}"`, { encoding: "utf-8", timeout: 300000, cwd: process.cwd() });
    console.log("[cron] Pipeline OK");
  } catch (e: any) {
    console.warn("[cron] Pipeline skipped (dev mode):", e.message);
  }
});

app.listen(PORT, () => {
  console.log(`Dev API server listening on http://localhost:${PORT}`);
});
