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
  removeNotification: (id: string) => void;
  clearAll: () => void;
  /** Check if a rule has been triggered (used by the UI to determine when to fire alerts) */
  shouldFireRule: (rule: string) => boolean;
  markRuleFired: (rule: string) => void;
  /** Fire a rule — dedupes via shouldFireRule + markRuleFired, then adds notification */
  fireRule: (rule: string, notification: Omit<Notification, "id" | "timestamp" | "rule" | "timestamp">) => boolean;
  /** Reset a fired rule so it can fire again */
  resetRule: (rule: string) => void;
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

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const shouldFireRule = useCallback((rule: string) => {
    return !firedRules.has(rule);
  }, [firedRules]);

  const markRuleFired = useCallback((rule: string) => {
    setFiredRules((prev) => {
      const next = new Set(prev);
      next.add(rule);
      return next;
    });
  }, []);

  const resetRule = useCallback((rule: string) => {
    setFiredRules((prev) => {
      const next = new Set(prev);
      next.delete(rule);
      return next;
    });
  }, []);

  const fireRule = useCallback((rule: string, notification: Omit<Notification, "id" | "timestamp" | "rule">) => {
    if (firedRules.has(rule)) return false;
    addNotification({ ...notification, rule });
    markRuleFired(rule);
    return true;
  }, [firedRules, addNotification, markRuleFired]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        clearAll,
        shouldFireRule,
        markRuleFired,
        fireRule,
        resetRule,
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
