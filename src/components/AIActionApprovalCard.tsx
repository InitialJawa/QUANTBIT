// ─────────────────────────────────────────────────────────────
// AIActionApprovalCard — inline card shown in chat when the model
// emits an action tool call. User must click [Approve] or [Reject]
// before the deterministic handler is invoked. Never auto-executes.
// ─────────────────────────────────────────────────────────────
import { useState, type FC } from "react";
import { Check, X, Loader2, Sparkles } from "lucide-react";
import type { PendingAction } from "../types/ai";

export interface AIActionApprovalCardProps {
  pending: PendingAction;
  /** Async — resolves when the action has been dispatched (or throws). */
  onApprove: (pending: PendingAction) => Promise<void> | void;
  onReject: (pending: PendingAction) => void;
}

export const AIActionApprovalCard: FC<AIActionApprovalCardProps> = ({ pending, onApprove, onReject }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<"approved" | "rejected" | "error" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleApprove = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    setErrorMsg(null);
    try {
      await onApprove(pending);
      setResult("approved");
    } catch (e: any) {
      setResult("error");
      setErrorMsg(e?.message || "Eksekusi gagal");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleReject = () => {
    if (isExecuting) return;
    onReject(pending);
    setResult("rejected");
  };

  return (
    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 my-2 space-y-2 max-w-[96%]">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-caption text-cyan-300 font-bold uppercase tracking-widest font-mono">
            AI suggests
          </p>
          <p className="text-caption text-white/90 font-sans mt-1 break-words">
            {pending.displayText}
          </p>
          {pending.impact.length > 0 && (
            <ul className="text-label text-white/60 font-mono mt-1 space-y-0.5">
              {pending.impact.map((i, idx) => (
                <li key={idx}>• {i.label}: {i.value}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {result === null && (
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleApprove}
            disabled={isExecuting}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-md text-caption font-bold uppercase tracking-widest transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isExecuting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Approve
          </button>
          <button
            onClick={handleReject}
            disabled={isExecuting}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-md text-caption font-bold uppercase tracking-widest transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
            Reject
          </button>
        </div>
      )}
      {result === "approved" && (
        <p className="text-label text-emerald-400 font-bold font-mono">✓ Executed</p>
      )}
      {result === "rejected" && (
        <p className="text-label text-white/40 font-bold font-mono">✗ Rejected</p>
      )}
      {result === "error" && (
        <p className="text-label text-rose-400 font-bold font-mono">✗ {errorMsg || "Gagal"}</p>
      )}
    </div>
  );
};
