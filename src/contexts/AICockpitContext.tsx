// ─────────────────────────────────────────────────────────────
// AICockpitContext — jembatan antara tombol "Jelaskan ini" (❓) di
// panel mana pun dengan kolom AICockpit. Panel manggil requestExplain
// (label panel), cockpit mendengarkan & otomatis bertanya ke AI.
// ─────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

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
}

const AICockpitContext = createContext<AICockpitContextType | null>(null);

export function AICockpitProvider({ children }: { children: ReactNode }) {
  const [pendingExplain, setPendingExplain] = useState<ExplainRequest | null>(null);
  const [isOpen, setOpen] = useState(true);

  const requestExplain = useCallback((label: string) => {
    setPendingExplain({ id: Date.now(), label });
    setOpen(true);
  }, []);

  const clearExplain = useCallback(() => setPendingExplain(null), []);

  return (
    <AICockpitContext.Provider value={{ pendingExplain, requestExplain, clearExplain, isOpen, setOpen }}>
      {children}
    </AICockpitContext.Provider>
  );
}

export function useAICockpit(): AICockpitContextType {
  const ctx = useContext(AICockpitContext);
  if (!ctx) throw new Error("useAICockpit must be used within AICockpitProvider");
  return ctx;
}
