const SESSION_KEY = "quantbit_session";

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
    const body = JSON.parse(options.body as string);
    return { user: { id: "dev-user", email: body.email, name: body.email?.split("@")[0] || "Dev", cash: 100000000, theme: "dark", data_feed: "yahoo", active_config: "prod" }, session: "dev-session" };
  }
  if (path === "/api/auth/signup" && options.method === "POST") {
    const body = JSON.parse(options.body as string);
    return { user: { id: "dev-user", email: body.email, name: body.name || body.email?.split("@")[0] || "Dev", cash: 100000000, theme: "dark", data_feed: "yahoo", active_config: "prod" }, session: "dev-session" };
  }
  if (path === "/api/auth/me") {
    if (getSession() === "dev-session") {
      return { user: { id: "dev-user", email: "demo@quantbit.local", name: "Demo", cash: 100000000, theme: "dark", data_feed: "yahoo", active_config: "prod", engine_config: "{}" } };
    }
    throw new Error("No dev session");
  }
  if (path === "/api/auth/logout") {
    return {};
  }
  if (path.startsWith("/api/user/profile") && options.method === "PATCH") {
    return {};
  }
  if (path === "/api/ai/chat") {
    return {
      content: "🔌 AI belum aktif di mode dev lokal. AI live butuh Cloudflare Functions + GEMINI_API_KEY (atau GROQ/OPENROUTER). Jalankan via `npm start` setelah build, atau deploy ke Pages.",
      provider: "dev-mock",
    };
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
  // Dev fallback: API route returned HTML (no backend running)
  if (text.startsWith("<!DOCTYPE") || text.startsWith("<html") || text.startsWith("<!doctype")) {
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
