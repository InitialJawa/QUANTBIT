/// <reference types="@cloudflare/workers-types" />
// ─────────────────────────────────────────────────────────────
// Quantbit API — Cloudflare Pages Functions (D1-based)
// Replaces: Express server + Firebase Auth + Firestore + RTDB
// ─────────────────────────────────────────────────────────────
import { type AILiveContext } from "../../src/ai/systemKnowledge";
import { runAiChat, isAiError, type ChatMessage as SharedChatMessage } from "../../src/server/aiChatHandler";

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" },
    key, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function error(msg: string, status = 400): Response {
  return json({ error: msg }, status);
}

// ── Auth helpers ────────────────────────────────────────────

function extractToken(request: Request): string | null {
  // Try Authorization header first
  const auth = request.headers.get("Authorization");
  if (auth) {
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (m) return m[1];
  }
  // Fallback: Cookie header
  const cookie = request.headers.get("Cookie");
  if (cookie) {
    return cookie.split(";").map(c => c.trim()).find(c => c.startsWith("session="))?.slice(8) || null;
  }
  return null;
}

async function getUserFromSession(env: Env, token: string | null): Promise<string | null> {
  if (!token) return null;
  const row = await env.DB.prepare(
    "SELECT user_id FROM sessions WHERE id = ? AND expires_at > datetime('now')"
  ).bind(token).first<{ user_id: string }>();
  return row?.user_id ?? null;
}

// ── Router ──────────────────────────────────────────────────

export async function onRequest(context: EventContext<Env, string, unknown>) {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "");
    const method = request.method;
    const userId = await getUserFromSession(env, extractToken(request));

  // ── Public routes ───────────────────────────────────────

  // GET /api/health
  if (path === "/api/health" && method === "GET") {
    return json({ status: "healthy", timestamp: new Date().toISOString() });
  }

  // POST /api/auth/signup
  if (path === "/api/auth/signup" && method === "POST") {
    const { email, password, name } = await request.json() as any;
    if (!email || !password) return error("Email and password required");
    const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (existing) return error("Email already registered", 409);
    const id = makeId();
    const salt = makeId();
    const hash = await hashPassword(password, salt);
    await env.DB.prepare(
      "INSERT INTO users (id, email, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))"
    ).bind(id, email, salt + ":" + hash, name || "").run();
    const sessionId = makeId();
    await env.DB.prepare(
      "INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, datetime('now'), datetime('now', '+30 days'))"
    ).bind(sessionId, id).run();
    return json({ user: { id, email, name: name || "" }, session: sessionId }, 201);
  }

  // POST /api/auth/login
  if (path === "/api/auth/login" && method === "POST") {
    const { email, password } = await request.json() as any;
    if (!email || !password) return error("Email and password required");
    const row = await env.DB.prepare(
      "SELECT id, password_hash, name FROM users WHERE email = ?"
    ).bind(email).first<{ id: string; password_hash: string; name: string }>();
    if (!row) return error("Invalid email or password", 401);
    const parts = row.password_hash.split(":");
    if (parts.length !== 2) return error("Invalid credentials", 401);
    const hash = await hashPassword(password, parts[0]);
    if (hash !== parts[1]) return error("Invalid email or password", 401);
    const sessionId = makeId();
    await env.DB.prepare(
      "INSERT INTO sessions (id, user_id, created_at, expires_at) VALUES (?, ?, datetime('now'), datetime('now', '+30 days'))"
    ).bind(sessionId, row.id).run();
    return json({ user: { id: row.id, email, name: row.name }, session: sessionId });
  }

  // GET /api/auth/me
  if (path === "/api/auth/me" && method === "GET") {
    if (!userId) return error("Not authenticated", 401);
    const row = await env.DB.prepare(
      "SELECT id, email, name, cash, theme, data_feed, active_config, engine_config, created_at FROM users WHERE id = ?"
    ).bind(userId).first();
    return json({ user: row });
  }

  // POST /api/auth/logout
  if (path === "/api/auth/logout" && method === "POST") {
    const sessionToken = extractToken(request);
    if (sessionToken) {
      await env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(sessionToken).run();
    }
    return json({ success: true });
  }

  // ── Protected routes (require userId) ───────────────────

  if (!userId) return error("Not authenticated", 401);

  // GET/POST /api/engine/state
  if (path === "/api/engine/state") {
    if (method === "GET") {
      const row = await env.DB.prepare(
        "SELECT data FROM engine_state WHERE key = ?"
      ).bind("user:" + userId).first<{ data: string }>();
      if (row) return json(JSON.parse(row.data));
      // Return default state
      const defaultState = {
        portfolio: [
          { ticker: "BBCA", shares: 500, buyPrice: 9900, addedAt: new Date().toISOString() },
          { ticker: "BBRI", shares: 1000, buyPrice: 4900, addedAt: new Date().toISOString() },
        ],
        watchlist: [{ ticker: "BBCA", addedAt: new Date().toISOString() }],
        cash: 100000000,
        config: {
          activeConfig: "prod", safeHavenAsset: "emas", topNCount: 5,
          qualityWeight: 0.45, growthWeight: 0.10, valueWeight: 0.05, momentumWeight: 0.40,
          enableCrashProtection: true, crashSensitivity: 10, enableCrossover: true,
          reserveBufferPct: 10, simulationMode: "algo", singleTicker: "BBCA",
          singleSellTrigger: 8, singleBuyTrigger: 5,
        },
        tradeLogs: [],
      };
      return json(defaultState);
    }
    if (method === "POST") {
      const body = await request.json();
      await env.DB.prepare(
        "INSERT OR REPLACE INTO engine_state (key, data, updated_at) VALUES (?, ?, datetime('now'))"
      ).bind("user:" + userId, JSON.stringify(body)).run();
      return json({ success: true, message: "Engine state saved" });
    }
  }

  // CRUD: Watchlist
  if (path === "/api/watchlist") {
    if (method === "GET") {
      const rows = await env.DB.prepare(
        "SELECT id, ticker, added_at FROM watchlists WHERE user_id = ? ORDER BY added_at DESC"
      ).bind(userId).all();
      return json({ watchlist: rows.results });
    }
    if (method === "POST") {
      const { ticker } = await request.json() as any;
      if (!ticker) return error("Ticker required");
      const id = makeId();
      await env.DB.prepare(
        "INSERT INTO watchlists (id, user_id, ticker, added_at) VALUES (?, ?, ?, ?)"
      ).bind(id, userId, ticker.toUpperCase(), new Date().toISOString()).run();
      return json({ success: true, id }, 201);
    }
    if (method === "DELETE") {
      const { ticker } = await request.json() as any;
      if (!ticker) return error("Ticker required");
      await env.DB.prepare(
        "DELETE FROM watchlists WHERE user_id = ? AND ticker = ?"
      ).bind(userId, ticker.toUpperCase()).run();
      return json({ success: true });
    }
  }

  // CRUD: Portfolio
  if (path === "/api/portfolio") {
    if (method === "GET") {
      const rows = await env.DB.prepare(
        "SELECT id, ticker, shares, buy_price, added_at FROM portfolios WHERE user_id = ? ORDER BY added_at DESC"
      ).bind(userId).all();
      return json({ portfolio: rows.results });
    }
    if (method === "POST") {
      const { ticker, shares, buyPrice } = await request.json() as any;
      if (!ticker || shares == null) return error("Ticker and shares required");
      const id = makeId();
      await env.DB.prepare(
        "INSERT INTO portfolios (id, user_id, ticker, shares, buy_price, added_at) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(id, userId, ticker.toUpperCase(), shares, buyPrice || 0, new Date().toISOString()).run();
      return json({ success: true, id }, 201);
    }
    if (method === "DELETE") {
      const { ticker } = await request.json() as any;
      if (!ticker) return error("Ticker required");
      await env.DB.prepare(
        "DELETE FROM portfolios WHERE user_id = ? AND ticker = ?"
      ).bind(userId, ticker.toUpperCase()).run();
      return json({ success: true });
    }
  }

  // CRUD: Trade logs
  if (path === "/api/trade-logs") {
    if (method === "GET") {
      const rows = await env.DB.prepare(
        "SELECT id, type, ticker, shares, price, timestamp, simulated FROM trade_logs WHERE user_id = ? ORDER BY timestamp DESC"
      ).bind(userId).all();
      return json({ tradeLogs: rows.results });
    }
    if (method === "POST") {
      const body = await request.json() as any;
      const id = body.id || makeId();
      await env.DB.prepare(
        "INSERT OR REPLACE INTO trade_logs (id, user_id, type, ticker, shares, price, timestamp, simulated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(id, userId, body.type, body.ticker, body.shares, body.price, body.timestamp || new Date().toISOString(), body.simulated ? 1 : 0).run();
      return json({ success: true, id }, 201);
    }
    if (method === "DELETE") {
      const { id } = await request.json() as any;
      if (!id) return error("Log id required");
      await env.DB.prepare("DELETE FROM trade_logs WHERE id = ? AND user_id = ?").bind(id, userId).run();
      return json({ success: true });
    }
  }

  // Cached reports
  if (path === "/api/cached-reports") {
    if (method === "GET") {
      const rows = await env.DB.prepare(
        "SELECT ticker, data, updated_at FROM cached_reports WHERE user_id = ? ORDER BY updated_at DESC"
      ).bind(userId).all();
      const reports: Record<string, any> = {};
      for (const r of rows.results as any[]) {
        reports[r.ticker] = { data: JSON.parse(r.data), updatedAt: r.updated_at };
      }
      return json({ reports });
    }
    if (method === "POST") {
      const { ticker, data } = await request.json() as any;
      if (!ticker) return error("Ticker required");
      await env.DB.prepare(
        "INSERT OR REPLACE INTO cached_reports (user_id, ticker, data, updated_at) VALUES (?, ?, ?, datetime('now'))"
      ).bind(userId, ticker.toUpperCase(), JSON.stringify(data)).run();
      return json({ success: true });
    }
  }

  // User profile update
  if (path === "/api/user/profile" && method === "PATCH") {
    const body = await request.json() as any;
    const updates: string[] = [];
    const values: any[] = [];
    for (const key of ["cash", "theme", "data_feed", "active_config", "engine_config"]) {
      if (body[key] !== undefined) {
        updates.push(`${key} = ?`);
        values.push(typeof body[key] === "object" ? JSON.stringify(body[key]) : body[key]);
      }
    }
    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      await env.DB.prepare(
        `UPDATE users SET ${updates.join(", ")} WHERE id = ?`
      ).bind(...values, userId).run();
    }
    return json({ success: true });
  }

  // ── Public API proxies (authenticated) ──────────────────

  // GET /api/backtest-data
  if (path === "/api/backtest-data" && method === "GET") {
    const configType = (url.searchParams.get("configType") === "res" ? "res" : "prod") as string;
    try {
      const yearStart = parseInt(url.searchParams.get("from") || "2021");
      const yearEnd = parseInt(url.searchParams.get("to") || "2026");
      const allData: any[] = [];
      for (let y = yearStart; y <= yearEnd; y++) {
        const resp = await env.ASSETS.fetch(new URL(`/data/years/${y}.json`, url));
        if (resp.ok) {
          const chunk: any[] = await resp.json();
          allData.push(...chunk);
        }
      }
      if (allData.length === 0) {
        return error("No historical data available", 503);
      }
      const bridged = bridgeHistoricalData(allData);
      const data = bridged.map((day: any) => ({
        date: day.date, ihsgPrice: day.ihsgPrice, goldPrice: day.goldPrice,
        stockPrices: day.stockAdjPrices, stockAdjPrices: day.stockAdjPrices,
        stockRanks: configType === "prod" ? day.stockRanksProd : day.stockRanksRes,
        stockRanksProd: day.stockRanksProd, stockRanksRes: day.stockRanksRes,
        stockRawMetrics: day.stockRawMetrics ?? null,
        stockNormScores: day.stockNormScores ?? null,
        isCarriedForward: day.isCarriedForward || false,
      }));
      const defaultWeights = {
        prod: { quality: 0.45, growth: 0.1, value: 0.05, momentum: 0.40 },
        res: { quality: 0.40, growth: 0.25, value: 0.05, momentum: 0.30 },
      };
      return json({ success: true, count: data.length, configType, weights: defaultWeights, data });
    } catch (err: any) {
      return error(err.message, 500);
    }
  }

  // GET /api/fundamentals
  if (path === "/api/fundamentals" && method === "GET") {
    try {
      const resp = await env.ASSETS.fetch(new URL("/data/idx_fundamentals_all.json", url));
      if (!resp.ok) return json({ success: false, count: 0, data: [] });
      const raw = await resp.json();
      const data = Array.isArray(raw) ? raw : [];
      return json({ success: true, count: data.length, data });
    } catch {
      return json({ success: false, count: 0, data: [] });
    }
  }

  // GET /api/engine/idx80
  if (path === "/api/engine/idx80" && method === "GET") {
    try {
      const row = await env.DB.prepare(
        "SELECT data, last_updated FROM idx_scan_data ORDER BY id DESC LIMIT 1"
      ).first<{ data: string; last_updated: string }>();
      if (row) return json({ stocks: JSON.parse(row.data), lastUpdated: row.last_updated });
      // Fallback to static file
      const resp = await env.ASSETS.fetch(new URL("/data/idx80_scan.json", url));
      if (resp.ok) return resp.clone();
      return json({ stocks: [], lastUpdated: null });
    } catch {
      return json({ stocks: [], lastUpdated: null });
    }
  }

  // ALL /api/engine/force-sync
  if (path === "/api/engine/force-sync") {
    try {
      const results = await runIdx80Scan(env);
      return json({ success: true, count: results.length, message: "Scan completed" });
    } catch (e: any) {
      return error(e.message, 500);
    }
  }

  // POST /api/send-notification (unauthenticated — triggered from client)
  if (path === "/api/send-notification" && method === "POST") {
    try {
      const resendKey = env.RESEND_API_KEY;
      if (!resendKey) return error("Email not configured (set RESEND_API_KEY)", 503);
      const { subject, body } = await request.json() as any;
      if (!subject || !body) return error("Missing subject or body", 400);
      const from = env.EMAIL_FROM || "QuantBit <onboarding@resend.dev>";
      const to = env.EMAIL_TO || env.EMAIL_USER || "user@example.com";
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to, subject: `[QuantBit] ${subject}`, text: body }),
      });
      if (!resp.ok) return error(`Resend API error ${resp.status}: ${await resp.text()}`, 500);
      return json({ ok: true });
    } catch (e: any) {
      return error(e.message, 500);
    }
  }

  // POST /api/market/sync
  if (path === "/api/market/sync" && method === "POST") {
    return json({ success: false, error: "Direct market sync not available in cloud environment. Run sync locally and redeploy." });
  }

  // Unified context-aware AI analyst (system-knowledge + provider fallback)
  if (path === "/api/ai/chat" && method === "POST") return handleAiChat(request, env, userId ?? undefined);
  if (path === "/api/ai/status" && method === "GET") return handleAiStatus(request, env);
  if (path === "/api/ai/sessions" && method === "GET") return handleAiListSessions(request, env, userId);
  if (path === "/api/ai/sessions" && method === "POST") return handleAiCreateSession(request, env, userId);
  if (path === "/api/ai/messages" && method === "POST") return handleAiAppendMessage(request, env, userId);
  if (path === "/api/ai/sessions/title" && method === "POST") return handleAiSetSessionTitle(request, env, userId);
  if (path.startsWith("/api/ai/sessions/") && path.endsWith("/messages") && method === "GET") {
    return handleAiGetSessionMessages(request, env, userId, path);
  }
  if (path.startsWith("/api/ai/sessions/") && method === "DELETE") {
    return handleAiDeleteSession(request, env, userId, path);
  }

  // Gemini AI proxies (legacy — kept for backward-compat / fallback)
  if (path === "/api/gemini/analyze" && method === "POST") return handleGeminiAnalyze(request, env);
  if (path === "/api/gemini/market-summary" && method === "POST") return handleGeminiMarketSummary(request, env);
  if (path === "/api/gemini/chat" && method === "POST") return handleGeminiChat(request, env);

  // External price proxies
  if (path === "/api/goapi/live-prices" && method === "GET") return handleGoapiPrices(env);
  if (path === "/api/yahoo/live-prices" && method === "GET") return handleYahooPrices(env);

  return error("Not found", 404);
  } catch (e: any) {
    return json({ error: "Internal error: " + (e.message || e.stack || "Unknown") }, 500);
  }
}

// ── External API Handlers ───────────────────────────────────

async function callAI(prompt: string, system: string, env: Env): Promise<string> {
  const key = env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: { role: "user", parts: [{ text: system }] },
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Gemini API error ${resp.status}: ${text}`);
  }
  const data: any = await resp.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
}

async function handleGeminiAnalyze(request: Request, env: Env): Promise<Response> {
  try {
    const { stock, customFocus } = await request.json() as any;
    if (!stock) return json({ error: "Stock data required" }, 400);
    const system = `You are a premier senior equity research analyst specializing in the Indonesia Stock Exchange (IDX / BEI). 
Return a strict JSON object with: ticker, summary, strengths, weaknesses, swotAnalysis, keyRatios, fairValue, stance, growthOutlook, timestamp.`;
    const prompt = `Analyze PT ${stock.name} (${stock.ticker}) in Sector: ${stock.sector} / Subsector: ${stock.subSector}.
Description: ${stock.description}
Recent financials: ${JSON.stringify(stock.metrics || {})}
Current Price: IDR ${stock.currentPrice}, P/E: ${stock.peRatio}, P/B: ${stock.pbRatio}, ROE: ${stock.roe}%, DER: ${stock.der}, Div Yield: ${stock.dividendYield}%
${customFocus ? `User focus: ${customFocus}` : ""}`;
    const text = await callAI(prompt, system, env);
    return json(JSON.parse(text.trim()));
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
}

async function handleGeminiMarketSummary(request: Request, env: Env): Promise<Response> {
  try {
    const { mkt, rs, stocks } = await request.json() as any;
    const stockSummary = stocks && Array.isArray(stocks)
      ? stocks.map((s: any) => `${s.ticker}: IDR ${s.currentPrice} (${s.change >= 0 ? "+" : ""}${s.change}%)`).join(", ")
      : "No stock data";
    const system = `You are a macroeconomic strategist for IDX. Return strict JSON: { rationale, bullishFactors, bearishFactors, scenarioAnalysis }. Answer in Indonesian.`;
    const prompt = `Market: IHSG ${mkt?.ihsg?.value || "N/A"} (${mkt?.ihsg?.daily_pct || 0}%), USD/IDR ${mkt?.usdidr?.value || "N/A"}, Gold $${mkt?.gold?.value || "N/A"}
Status: ${rs?.status || "N/A"} (Health: ${rs?.market_health || 50}/100, Opportunity: ${rs?.opportunity || 50}/100, Risk: ${rs?.risk || 40}/100)
Stocks: ${stockSummary}`;
    const text = await callAI(prompt, system, env);
    return json(JSON.parse(text.trim()));
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
}

async function handleGeminiChat(request: Request, env: Env): Promise<Response> {
  try {
    const { messages, selectedStock } = await request.json() as any;
    if (!messages || !Array.isArray(messages)) return json({ error: "Messages array required" }, 400);
    const lastMsg = messages[messages.length - 1];
    const history = messages.slice(0, -1).map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const key = env.GEMINI_API_KEY;
    if (!key) throw new Error("GEMINI_API_KEY not configured");
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [...history, { role: "user", parts: [{ text: lastMsg.content }] }],
          systemInstruction: {
            role: "user",
            parts: [{ text: "Kamu adalah analis saham Indonesia yang ramah. Berikan analisis objektif dengan konteks makroekonomi. Gunakan bahasa Indonesia." }],
          },
        }),
      }
    );
    const data: any = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, sedang ada kendala teknis.";
    return json({ content: text });
  } catch (e: any) {
    return json({ content: "Maaf, sedang ada kendala teknis." });
  }
}

// ── Unified AI analyst ──────────────────────────────────────
// One endpoint. System-knowledge aware (knows the app's own formulas) +
// live-context aware + provider fallback chain (Gemini → Groq → OpenRouter).

type ChatMsg = { role: "user" | "assistant"; content: string };

async function handleAiChat(request: Request, env: Env, userId: string | undefined): Promise<Response> {
  try {
    const body = await request.json() as { messages?: ChatMsg[]; context?: AILiveContext; sessionId?: string };
    // Fetch recent memory from past sessions (if user is authenticated).
    let memory: any[] | undefined;
    if (userId && body.sessionId) {
      const { getRecentMemory } = await import("../../src/server/aiMemory");
      memory = await getRecentMemory(d1Deps(env), userId, {
        limit: 20,
        excludeSessionId: body.sessionId,
      });
    }
    const result = await runAiChat(
      (body.messages || []) as SharedChatMessage[],
      body.context,
      {
        OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
        GROQ_API_KEY: env.GROQ_API_KEY,
        GEMINI_API_KEY: env.GEMINI_API_KEY,
      },
      { isDev: false, memory },  // CF Pages Functions = production
    );
    if (result.ok) {
      return json({ content: result.content, provider: result.provider });
    }
    if (isAiError(result)) {
      return json({
        content: result.content,
        provider: result.provider,
        diagnostic: result.diagnostic,
      }, result.status);
    }
    return json({ content: "Unknown error", provider: "error" }, 500);
  } catch (e: any) {
    return json({ content: `Maaf, terjadi kendala: ${e.message}`, provider: "error" }, 200);
  }
}

async function handleAiStatus(_request: Request, env: Env): Promise<Response> {
  // Diagnostic endpoint — shows which API keys are configured (no values).
  // Visit /api/ai/status in browser to debug "AI not working".
  const { getAiStatus } = await import("../../src/server/aiChatHandler");
  const status = getAiStatus(
    {
      OPENROUTER_API_KEY: env.OPENROUTER_API_KEY,
      GROQ_API_KEY: env.GROQ_API_KEY,
      GEMINI_API_KEY: env.GEMINI_API_KEY,
    },
    false,  // CF Pages = production
  );
  return json(status);
}

// ── AI Memory (D1-backed) ──────────────────────────────────

/** Adapter that bridges CF D1 PreparedStatement to our memory
 *  module's `query`/`exec` contract. */
function d1Deps(env: Env) {
  return {
    query: async <T = any>(sql: string, params: any[]): Promise<T[]> => {
      const stmt = env.DB.prepare(sql);
      const result = await stmt.bind(...params).all<T>();
      return result.results || [];
    },
    exec: async (sql: string, params: any[]) => {
      const stmt = env.DB.prepare(sql);
      const result = await stmt.bind(...params).run();
      return { changes: result.meta?.changes ?? 0 };
    },
  };
}

async function handleAiListSessions(
  _request: Request,
  env: Env,
  userId: string | null,
): Promise<Response> {
  if (!userId) return json({ error: "Not authenticated" }, 401);
  const { listSessions } = await import("../../src/server/aiMemory");
  const sessions = await listSessions(d1Deps(env), userId, 20);
  return json({ sessions });
}

async function handleAiCreateSession(
  request: Request,
  env: Env,
  userId: string | null,
): Promise<Response> {
  if (!userId) return json({ error: "Not authenticated" }, 401);
  const { createSession, suggestTitle } = await import("../../src/server/aiMemory");
  const body = await request.json() as { title?: string; firstMessage?: string };
  const title = body.title
    ?? (body.firstMessage ? suggestTitle(body.firstMessage) : null);
  const id = await createSession(d1Deps(env), userId, title ?? undefined);
  return json({ sessionId: id, title });
}

async function handleAiGetSessionMessages(
  _request: Request,
  env: Env,
  userId: string | null,
  path: string,
): Promise<Response> {
  if (!userId) return json({ error: "Not authenticated" }, 401);
  const { getSessionMessages } = await import("../../src/server/aiMemory");
  // path = /api/ai/sessions/<id>/messages
  const id = path.split("/")[4];
  const messages = await getSessionMessages(d1Deps(env), id, userId);
  return json({ sessionId: id, messages });
}

async function handleAiDeleteSession(
  _request: Request,
  env: Env,
  userId: string | null,
  path: string,
): Promise<Response> {
  if (!userId) return json({ error: "Not authenticated" }, 401);
  const { deleteSession } = await import("../../src/server/aiMemory");
  // path = /api/ai/sessions/<id>
  const id = path.split("/")[4];
  await deleteSession(d1Deps(env), id, userId);
  return json({ ok: true });
}

async function handleAiAppendMessage(
  request: Request,
  env: Env,
  userId: string | null,
): Promise<Response> {
  // Allow unauthenticated dev-mode message saves (userId defaults to "dev-user").
  const effectiveUserId = userId || "dev-user";
  const body = await request.json() as {
    sessionId: string;
    role: "user" | "assistant" | "tool";
    content: string;
    toolCalls?: any[];
    metadata?: Record<string, any>;
  };
  if (!body.sessionId || !body.role || !body.content) {
    return json({ error: "sessionId, role, content required" }, 400);
  }
  const { appendMessage } = await import("../../src/server/aiMemory");
  const id = await appendMessage(d1Deps(env), {
    sessionId: body.sessionId,
    userId: effectiveUserId,
    role: body.role,
    content: body.content,
    toolCalls: body.toolCalls,
    metadata: body.metadata,
  });
  return json({ id, ok: true });
}

async function handleAiSetSessionTitle(
  request: Request,
  env: Env,
  userId: string | null,
): Promise<Response> {
  const effectiveUserId = userId || "dev-user";
  const body = await request.json() as { sessionId: string; title: string };
  if (!body.sessionId || !body.title) {
    return json({ error: "sessionId and title required" }, 400);
  }
  const { setSessionTitle } = await import("../../src/server/aiMemory");
  const trimmed = body.title.replace(/\s+/g, " ").trim().slice(0, 57);
  const final = trimmed + (body.title.length > 57 ? "..." : "");
  await setSessionTitle(d1Deps(env), body.sessionId, effectiveUserId, final);
  return json({ ok: true, title: final });
}

async function handleGoapiPrices(env: Env): Promise<Response> {
  try {
    const key = env.GOAPI_API_KEY;
    if (!key) return json({ success: false, error: "GOAPI_API_KEY missing" });
    const resp = await fetch(`https://api.goapi.io/stock/idx/prices?api_key=${key}`);
    if (!resp.ok) throw new Error(`GoAPI HTTP ${resp.status}`);
    const data: any = await resp.json();
    if (data.status === "success" && data.data?.results) {
      const prices: Record<string, { close: number; change: number; pct: number }> = {};
      for (const item of data.data.results) {
        const sym = item.symbol || item.ticker || "";
        if (["BBCA", "BBRI", "BMRI", "TLKM", "ASII", "ADRO", "PTBA", "ESSA", "GOTO"].includes(sym)) {
          prices[sym] = { close: Number(item.close || item.price || 0), change: Number(item.change || 0), pct: Number(item.percent_change || item.change_percent || 0) };
        }
      }
      return json({ success: true, prices, source: "GoAPI.id (Live)" });
    }
    return json({ success: false, error: "Invalid GoAPI response", source: "Offline Mock" });
  } catch (e: any) {
    return json({ success: false, error: e.message, source: "Offline Mock" });
  }
}

let _lastYahooPrices: Record<string, { close: number; change: number; pct: number }> | null = null;

async function handleYahooPrices(env: Env): Promise<Response> {
  try {
    const tickers = ["BBCA.JK", "BBRI.JK", "BMRI.JK", "TLKM.JK", "ASII.JK", "ADRO.JK", "PTBA.JK", "ESSA.JK", "GOTO.JK", "^JKSE", "USDIDR=X", "GC=F"];
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
    return json({ success: true, prices, source: "Yahoo Finance (Live)" });
  } catch (e: any) {
    if (_lastYahooPrices) return json({ success: true, prices: _lastYahooPrices, source: "Yahoo Finance (Cached)" });
    return json({ success: false, error: e.message, source: "Offline Mock" });
  }
}

// ── IDX80 Scanner ──────────────────────────────────────────

function computeMomentum(closes: number[]): number {
  const valid = closes.filter(c => typeof c === "number" && c > 0);
  if (valid.length < 5) return 50;
  const recent = valid.slice(-5);
  const older = valid.slice(0, Math.min(15, valid.length - 5));
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  if (olderAvg === 0) return 50;
  const pctDiff = ((recentAvg - olderAvg) / olderAvg) * 100;
  return Math.min(100, Math.max(1, Math.round(50 + pctDiff * 7)));
}

function computeQualityFromStats(closes: number[], volume: number[]): number {
  const validCloses = closes.filter(c => typeof c === "number" && c > 0);
  if (validCloses.length < 10) return 50;
  const sorted = [...validCloses].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const latest = validCloses[validCloses.length - 1];
  const stability = 1 - Math.abs(latest - median) / median;
  return Math.min(100, Math.max(1, Math.round(50 + stability * 30)));
}

function computeValue(closes: number[]): number {
  const valid = closes.filter(c => typeof c === "number" && c > 0);
  if (valid.length < 5) return 50;
  const maxP = Math.max(...valid);
  const minP = Math.min(...valid);
  const current = valid[valid.length - 1];
  const percentile = maxP !== minP ? (current - minP) / (maxP - minP) : 0.5;
  return Math.min(100, Math.max(1, Math.round((1 - percentile) * 60 + 20)));
}

function computeGrowth(closes: number[]): number {
  const valid = closes.filter(c => typeof c === "number" && c > 0);
  if (valid.length < 20) return 50;
  const first = valid[0];
  const last = valid[valid.length - 1];
  const totalReturn = first > 0 ? ((last - first) / first) * 100 : 0;
  return Math.min(100, Math.max(1, Math.round(50 + totalReturn * 2)));
}

async function runIdx80Scan(env: Env): Promise<any[]> {
  const tickers = [
    "ADRO.JK", "AKRA.JK", "AMRT.JK", "ANTM.JK", "ARTO.JK", "ASII.JK", "ASRI.JK",
    "BBCA.JK", "BBNI.JK", "BBRI.JK", "BBTN.JK", "BDMN.JK", "BESS.JK", "BFIN.JK",
    "BMRI.JK", "BRIS.JK", "BRPT.JK", "BSDE.JK", "BUKA.JK", "CPIN.JK", "CUAN.JK",
    "DOID.JK", "EMTK.JK", "ENRG.JK", "ERAA.JK", "ESSA.JK", "EXCL.JK", "FILM.JK",
    "GGRM.JK", "GOTO.JK", "GJTL.JK", "HEAL.JK", "HRMY.JK", "ICBP.JK", "INCO.JK",
    "INDF.JK", "INDY.JK", "INKP.JK", "INTP.JK", "ISAT.JK", "ITMG.JK", "JPFA.JK",
    "JSMR.JK", "KAEF.JK", "KLBF.JK", "LPKR.JK", "LSIP.JK", "MAPI.JK", "MDKA.JK",
    "MEDC.JK", "MIKA.JK", "MLPL.JK", "MNCN.JK", "MTEL.JK", "MYOR.JK", "NCKL.JK",
    "PGAS.JK", "PGEO.JK", "PTBA.JK", "PTMP.JK", "PTPP.JK", "PWON.JK", "SCMA.JK",
    "SIDO.JK", "SMGR.JK", "SMRA.JK", "SRTG.JK", "SSMS.JK", "TBIG.JK", "TINS.JK",
    "TKIM.JK", "TLKM.JK", "TMAS.JK", "TOWR.JK", "TPIA.JK", "UNTR.JK", "UNVR.JK",
    "WIKA.JK", "WSBP.JK", "WSKT.JK",
  ];

  const results: any[] = [];
  const pool = [...tickers];

  const worker = async () => {
    while (pool.length > 0) {
      const ticker = pool.shift();
      if (!ticker) break;
      try {
        const qResp = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=6mo&interval=1wk`,
          { headers: { "User-Agent": "Mozilla/5.0" } }
        );
        if (!qResp.ok) continue;
        const qData: any = await qResp.json();
        const result = qData?.chart?.result?.[0];
        const meta = result?.meta;
        if (!meta) continue;

        const closes: number[] = result?.indicators?.quote?.[0]?.close || [];
        const volumes: number[] = result?.indicators?.quote?.[0]?.volume || [];

        const symbol = (meta.symbol || ticker).replace(".JK", "");
        results.push({
          ticker: symbol, currentPrice: meta.regularMarketPrice || 0,
          previousClose: meta.previousClose || 0,
          changePercent: meta.regularMarketPrice && meta.previousClose
            ? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100 : 0,
          lastUpdated: new Date().toISOString(),
          companyName: symbol,
          quality: computeQualityFromStats(closes, volumes),
          value: computeValue(closes),
          growth: computeGrowth(closes),
          momentum: computeMomentum(closes),
        });
      } catch { /* skip ticker */ }
    }
  };

  await Promise.all(Array.from({ length: 15 }, () => worker()));

  if (results.length > 0) {
    // C8 fix: replace-only retention. The scan table only needs the latest
    // snapshot — historical scans would just be re-running state. Insert
    // would grow unbounded at 1 row per 15-min cron.
    await env.DB.prepare("DELETE FROM idx_scan_data").run();
    await env.DB.prepare(
      "INSERT INTO idx_scan_data (data, last_updated) VALUES (?, datetime('now'))"
    ).bind(JSON.stringify(results)).run();
  }

  return results;
}

// ── Bridge historical data ──────────────────────────────────

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

// ── Types ───────────────────────────────────────────────────

interface Env {
  DB: D1Database;
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  GEMINI_API_KEY?: string;
  GROQ_API_KEY?: string;
  OPENROUTER_API_KEY?: string;
  GOAPI_API_KEY?: string;
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_TO?: string;
  EMAIL_USER?: string;
}
