// ─────────────────────────────────────────────────────────────
// AICockpitContext — jembatan antara tombol "Jelaskan ini" (❓) di
// panel mana pun dengan kolom AICockpit. Panel manggil requestExplain
// (label panel), cockpit mendengarkan & otomatis bertanya ke AI.
//
// Plus: Level 3+4 state — pendingActions queue (AI action approval
// cards) and proactiveAlerts queue (Level 4 proactive notifications).
// ─────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { PendingAction, ProactiveAlert } from "../types/ai";

export interface ExplainRequest {
  id: number;
  label: string;
}

interface AICockpitContextType {
  pendingExplain: ExplainRequest | null;
  requestExplain: (label: string) => void;
  clearExplain: () => void;
  isOpen: boolean;
  setOpen: (v: boolean) => void;
  /** Level 3 — AI-suggested actions awaiting user [Approve] / [Reject]. */
  pendingActions: PendingAction[];
  addPendingAction: (action: PendingAction) => void;
  approveAction: (id: string) => void;
  rejectAction: (id: string) => void;
  /** Level 4 — Proactive agent alerts (BPS threshold crosses). */
  proactiveAlerts: ProactiveAlert[];
  addProactiveAlert: (alert: ProactiveAlert) => void;
  dismissProactiveAlert: (id: string) => void;
  /** When true, the chat auto-opens when a proactive alert fires. */
  openChatWithPrompt: string | null;
  setOpenChatWithPrompt: (text: string | null) => void;
}

const AICockpitContext = createContext<AICockpitContextType | null>(null);

export function AICockpitProvider({ children }: { children: ReactNode }) {
  const [pendingExplain, setPendingExplain] = useState<ExplainRequest | null>(null);
  const [isOpen, setOpen] = useState(true);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [proactiveAlerts, setProactiveAlerts] = useState<ProactiveAlert[]>([]);
  const [openChatWithPrompt, setOpenChatWithPrompt] = useState<string | null>(null);

  const requestExplain = useCallback((label: string) => {
    setPendingExplain({ id: Date.now(), label });
    setOpen(true);
  }, []);

  const clearExplain = useCallback(() => setPendingExplain(null), []);

  const addPendingAction = useCallback((action: PendingAction) => {
    setPendingActions((prev) => [...prev, action]);
    setOpen(true);
  }, []);

  const approveAction = useCallback((id: string) => {
    setPendingActions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const rejectAction = useCallback((id: string) => {
    setPendingActions((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const addProactiveAlert = useCallback((alert: ProactiveAlert) => {
    setProactiveAlerts((prev) => [alert, ...prev].slice(0, 20));
  }, []);

  const dismissProactiveAlert = useCallback((id: string) => {
    setProactiveAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return (
    <AICockpitContext.Provider value={{
      pendingExplain, requestExplain, clearExplain,
      isOpen, setOpen,
      pendingActions, addPendingAction, approveAction, rejectAction,
      proactiveAlerts, addProactiveAlert, dismissProactiveAlert,
      openChatWithPrompt, setOpenChatWithPrompt,
    }}>
      {children}
    </AICockpitContext.Provider>
  );
}

export function useAICockpit(): AICockpitContextType {
  const ctx = useContext(AICockpitContext);
  if (!ctx) throw new Error("useAICockpit must be used within AICockpitProvider");
  return ctx;
}
