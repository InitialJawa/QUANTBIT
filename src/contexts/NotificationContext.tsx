import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

const STORAGE_KEY = "quantbit_notifications";
const FIRED_RULES_KEY = "quantbit_fired_rules";

function loadPersisted<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persist(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable */
  }
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  rule?: string;
  timestamp: number;
}

export interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id" | "timestamp">) => void;
  /** Fire a rule — dedupes via firedRules set, then adds notification. Returns true if fired. */
  fireRule: (rule: string, notification: Omit<Notification, "id" | "timestamp" | "rule">) => boolean;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() => loadPersisted<Notification[]>(STORAGE_KEY, []));
  const [firedRules, setFiredRules] = useState<Set<string>>(() => new Set(loadPersisted<string[]>(FIRED_RULES_KEY, [])));

  useEffect(() => {
    persist(STORAGE_KEY, notifications);
  }, [notifications]);

  useEffect(() => {
    persist(FIRED_RULES_KEY, [...firedRules]);
  }, [firedRules]);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "timestamp">) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
    };
    setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
  }, []);

  const fireRule = useCallback((rule: string, notification: Omit<Notification, "id" | "timestamp" | "rule">) => {
    if (firedRules.has(rule)) return false;
    addNotification({ ...notification, rule });
    setFiredRules((prev) => {
      const next = new Set(prev);
      next.add(rule);
      return next;
    });
    return true;
  }, [firedRules, addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        fireRule,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}
