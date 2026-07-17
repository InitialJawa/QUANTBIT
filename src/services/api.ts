/// <reference types="vite/client" />
const SESSION_KEY = "quantbit_session";

/** C9 fix: dev-mode guard. The `dev-session` shortcut must NEVER grant
 *  access in production builds, even if localStorage was somehow seeded
 *  with that value (e.g. a previous dev session left over after switching
 *  environments, or a user manually setting it to probe the app). */
const IS_DEV = import.meta.env?.DEV === true;

function getSession(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

function setSession(token: string) {
  localStorage.setItem(SESSION_KEY, token);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function devMock(path: string, options: RequestInit): any {
  if (path === "/api/auth/login" && options.method === "POST") {
    if (!IS_DEV) throw new Error("Dev mock disabled in production");
    const body = JSON.parse(options.body as string);
    return { user: { id: "dev-user", email: body.email, name: body.email?.split("@")[0] || "Dev", cash: 100000000, theme: "dark", data_feed: "yahoo", active_config: "aman" }, session: "dev-session" };
  }
  if (path === "/api/auth/signup" && options.method === "POST") {
    if (!IS_DEV) throw new Error("Dev mock disabled in production");
    const body = JSON.parse(options.body as string);
    return { user: { id: "dev-user", email: body.email, name: body.name || body.email?.split("@")[0] || "Dev", cash: 100000000, theme: "dark", data_feed: "yahoo", active_config: "aman" }, session: "dev-session" };
  }
  if (path === "/api/auth/me") {
    if (IS_DEV && getSession() === "dev-session") {
      return { user: { id: "dev-user", email: "demo@quantbit.local", name: "Demo", cash: 100000000, theme: "dark", data_feed: "yahoo", active_config: "aman", engine_config: "{}" } };
    }
    // C9 fix: in production, never accept the dev-session shortcut.
    throw new Error("Not authenticated");
  }
  if (path === "/api/auth/logout") {
    return {};
  }
  if (path.startsWith("/api/user/profile") && options.method === "PATCH") {
    return {};
  }
  if (path === "/api/ai/chat") {
    if (IS_DEV) {
      // Dev mode: backend AI (Express on port 3001) is not reachable.
      return {
        content:
          "⚠ Backend AI tidak reachable. " +
          "Kemungkinan: `npm run serve-api` belum jalan di terminal lain (port 3001).\n\n" +
          "**Solusi dev mode:**\n" +
          "1. Terminal 1: `npm run serve-api` (Express server, baca `OPENROUTER_API_KEY` dari `.env.local`)\n" +
          "2. Terminal 2: `npm run dev` (Vite di port 5173)\n\n" +
          "**Atau tanpa API key:**\n" +
          "- Settings → AI Agent → **Use Dev Mock** → ON (pattern-matching canned responses, support tool calls)\n\n" +
          "Lihat `docs/AI_ONBOARDING.md` untuk detail.",
        provider: "dev-mock",
      };
    }
    // Production: AI backend is not configured. Return user-friendly message.
    return {
      content:
        "Maaf, layanan AI sedang tidak tersedia saat ini. " +
        "Anda tetap bisa menggunakan fitur analisis, portofolio, dan backtest secara langsung di aplikasi.\n\n" +
        "Coba lagi nanti atau gunakan analisis ringkas dari halaman yang sedang dibuka.",
      provider: "none",
    };
  }
  // Data endpoints removed — production uses CF Pages Functions.
  // Dev mode uses Express (port 3001) proxied via Vite.
  // No devMock = no fake data, no random walk. Data stays at fallback values
  // when API is offline, clearly indicating "disconnected" state.
  console.warn("[devMock] No mock for", path, "→ returning fallback");
  return { success: false, error: "No dev mock" };
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (session) {
    headers["Authorization"] = `Bearer ${session}`;
  }

  let res: Response;
  let fetchFailed = false;
  try {
    res = await fetch(path, { ...options, headers });
  } catch {
    fetchFailed = true;
  }

  if (fetchFailed) {
    return devMock(path, options);
  }

  if (res.status === 401) {
    clearSession();
    window.dispatchEvent(new Event("session-expired"));
    throw new Error("Session expired");
  }

  const text = await res.text();
  // D10 fix: dev fallback triggers when the API route is not actually
  // serving JSON — could be HTML (Vite SPA fallback, no backend running)
  // or a 5xx error page. In production, devMock is already gated by
  // IS_DEV so this branch won't grant dev access to real users.
  const looksLikeHtml = text.startsWith("<!DOCTYPE") || text.startsWith("<html") || text.startsWith("<!doctype");
  const isServerError = res.status >= 500;
  if (IS_DEV && (looksLikeHtml || isServerError)) {
    return devMock(path, options);
  }
  try {
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (e: any) {
    if (e instanceof SyntaxError) {
      return devMock(path, options);
    }
    throw e;
  }
}

export const api = {
  get: <T = any>(path: string) => request<T>(path),
  post: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined, headers: { "Content-Type": "application/json" } }),
  patch: <T = any>(path: string, body: any) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } }),
  del: <T = any>(path: string, body?: any) =>
    request<T>(path, { method: "DELETE", body: body ? JSON.stringify(body) : undefined, headers: { "Content-Type": "application/json" } }),
};

export interface User {
  id: string;
  email: string;
  name: string;
  cash?: number;
  theme?: string;
  data_feed?: string;
  active_config?: string;
  engine_config?: any;
  created_at?: string;
}

export const authApi = {
  async signup(email: string, password: string, name?: string): Promise<User> {
    const data = await api.post<{ user: User; session: string }>("/api/auth/signup", { email, password, name });
    setSession(data.session);
    return data.user;
  },
  async login(email: string, password: string): Promise<User> {
    const data = await api.post<{ user: User; session: string }>("/api/auth/login", { email, password });
    setSession(data.session);
    return data.user;
  },
  async me(): Promise<User | null> {
    try {
      const data = await api.get<{ user: User }>("/api/auth/me");
      return data.user;
    } catch {
      clearSession();
      return null;
    }
  },
  async logout() {
    try { await api.post("/api/auth/logout"); } catch { /* ignore */ }
    clearSession();
  },
  getSession,
};

export { getSession };
