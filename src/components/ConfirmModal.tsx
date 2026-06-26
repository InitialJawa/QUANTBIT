import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { ReactNode } from "react";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string | ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_STYLES = {
  danger: {
    icon: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    button: "bg-rose-600 hover:bg-rose-500 text-white",
  },
  warning: {
    icon: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    button: "bg-amber-600 hover:bg-amber-500 text-white",
  },
  info: {
    icon: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    button: "bg-emerald-500 hover:bg-emerald-400 text-black",
  },
} as const;

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "danger",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const style = VARIANT_STYLES[variant];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-5 max-w-md w-full shadow-2xl"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className={`p-2 rounded-lg ${style.bg} ${style.border} border shrink-0`}>
                <AlertTriangle className={`w-5 h-5 ${style.icon}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-body font-bold text-white uppercase tracking-widest font-mono">
                  {title}
                </h3>
                <div className="text-caption text-white/60 mt-2 leading-relaxed font-sans">
                  {message}
                </div>
              </div>
              <button
                onClick={onCancel}
                className="text-white/30 hover:text-white p-1 rounded transition-colors"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
              <button
                onClick={onCancel}
                className="px-3 py-2 text-caption font-bold uppercase tracking-widest rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onCancel();
                }}
                className={`px-3 py-2 text-caption font-bold uppercase tracking-widest rounded-lg ${style.button} transition-colors`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
