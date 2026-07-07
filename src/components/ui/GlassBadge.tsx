import type { ReactNode } from "react";

interface GlassBadgeProps {
  children: ReactNode;
  variant?: "accent" | "success" | "warning" | "danger" | "neutral";
  className?: string;
}

export function GlassBadge({ children, variant = "neutral", className = "" }: GlassBadgeProps) {
  const variants = {
    accent: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    neutral: "bg-white/5 text-[var(--text-secondary)] border-white/10",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label font-medium border ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
