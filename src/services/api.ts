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
    return { user: { id: "dev-user", email: body.email, name: body.email?.split("@")[0] || "Dev", cash: 100000000, theme: "dark", data_feed: "yahoo", active_config: "prod" }, session: "dev-session" };
  }
  if (path === "/api/auth/signup" && options.method === "POST") {
    if (!IS_DEV) throw new Error("Dev mock disabled in production");
    const body = JSON.parse(options.body as string);
    return { user: { id: "dev-user", email: body.email, name: body.name || body.email?.split("@")[0] || "Dev", cash: 100000000, theme: "dark", data_feed: "yahoo", active_config: "prod" }, session: "dev-session" };
  }
  if (path === "/api/auth/me") {
    if (IS_DEV && getSession() === "dev-session") {
      return { user: { id: "dev-user", email: "demo@quantbit.local", name: "Demo", cash: 100000000, theme: "dark", data_feed: "yahoo", active_config: "prod", engine_config: "{}" } };
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
    return {
      content: "📊 Mode dev lokal — data dari file statis. Untuk live data, deploy ke Cloudflare Pages atau jalankan Express server.",
      provider: "dev-mock",
    };
  }
  if (path === "/api/yahoo/live-prices") {
    return {
      success: true,
      prices: {
        "IHSG": { close: 6101, change: -15.89, pct: -0.26 },
        "USDIDR": { close: 17840, change: 46.38, pct: 0.26 },
        "GOLD": { close: 4135, change: -8.28, pct: -0.2 },
        "BBCA": { close: 6125, change: 25, pct: 0.41 },
        "BBRI": { close: 2910, change: -10, pct: -0.34 },
        "BMRI": { close: 4120, change: 20, pct: 0.49 },
        "TLKM": { close: 2540, change: -15, pct: -0.59 },
        "ASII": { close: 4680, change: 30, pct: 0.64 },
        "ADRO": { close: 2290, change: -5, pct: -0.22 },
        "PTBA": { close: 2480, change: 10, pct: 0.40 },
        "ESSA": { close: 660, change: 0, pct: 0 },
        "GOTO": { close: 50, change: -2, pct: -3.85 },
      },
      source: "Dev Mock",
    };
  }
  if (path === "/api/fundamentals") {
    return { success: true, data: [], count: 0 };
  }
  if (path === "/api/engine/idx80") {
    const stocks = [
      { ticker: "BBCA.JK", quality: 82, growth: 65, value: 45, momentum: 72, currentPrice: 6125, changePercent: 0.41, peRatio: 18.5, pbRatio: 2.8, marketCap: 1200000 },
      { ticker: "BBRI.JK", quality: 75, growth: 55, value: 50, momentum: 68, currentPrice: 2910, changePercent: -0.34, peRatio: 12.3, pbRatio: 1.5, marketCap: 850000 },
      { ticker: "BMRI.JK", quality: 78, growth: 60, value: 48, momentum: 70, currentPrice: 4120, changePercent: 0.49, peRatio: 14.1, pbRatio: 1.8, marketCap: 920000 },
      { ticker: "TLKM.JK", quality: 70, growth: 35, value: 55, momentum: 40, currentPrice: 2540, changePercent: -0.59, peRatio: 15.2, pbRatio: 2.1, marketCap: 650000 },
      { ticker: "ASII.JK", quality: 68, growth: 40, value: 52, momentum: 55, currentPrice: 4680, changePercent: 0.64, peRatio: 10.8, pbRatio: 1.2, marketCap: 580000 },
    ];
    return { success: true, stocks, lastUpdated: new Date().toISOString() };
  }
  throw new Error("No dev mock for " + path);
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
