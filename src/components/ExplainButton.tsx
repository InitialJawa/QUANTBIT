// ─────────────────────────────────────────────────────────────
// ExplainButton (❓) — taruh di pojok panel mana pun. Saat diklik,
// AICockpit otomatis menjelaskan panel itu (apa & dari mana hitungnya).
// ─────────────────────────────────────────────────────────────
import { HelpCircle } from "lucide-react";
import { useAICockpit } from "../contexts/AICockpitContext";

interface ExplainButtonProps {
  /** Label panel, mis. "Skor Risk", "Regime Status", "Mesin Kuantitatif". */
  label: string;
  className?: string;
}

export function ExplainButton({ label, className }: ExplainButtonProps) {
  const { requestExplain } = useAICockpit();
  return (
    <button
      type="button"
      aria-label={`Jelaskan ${label} dengan AI`}
      title={`Jelaskan: ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        requestExplain(label);
      }}
      className={
        className ??
        "inline-flex items-center justify-center w-5 h-5 rounded-full text-tertiary hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
      }
    >
      <HelpCircle className="w-3.5 h-3.5" />
    </button>
  );
}
