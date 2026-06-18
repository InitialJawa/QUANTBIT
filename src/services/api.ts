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

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const session = getSession();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {}),
  };

  if (session) {
    headers["Authorization"] = `Bearer ${session}`;
  }

  const res = await fetch(path, { ...options, headers });

  if (res.status === 401) {
    clearSession();
    window.dispatchEvent(new Event("session-expired"));
    throw new Error("Session expired");
  }

  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (e: any) {
    if (e instanceof SyntaxError) {
      throw new Error(`API ${path}: expected JSON, got HTML (status ${res.status})`);
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
