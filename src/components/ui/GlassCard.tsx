import type { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
  shell?: boolean;
  accent?: "emerald" | "amber" | "rose" | "none";
}

export function GlassCard({ children, className = "", gradient, shell, accent = "none" }: GlassCardProps) {
  const accentBorder = accent === "emerald"
    ? "border-[rgba(159,216,189,0.25)]"
    : accent === "amber"
    ? "border-[rgba(226,163,86,0.25)]"
    : accent === "rose"
    ? "border-[rgba(248,113,113,0.25)]"
    : "border-[var(--border-default)]";

  const gradientClass = gradient ? "bg-card-gradient" : "";

  if (shell) {
    return (
      <div className="gradient-shell" style={{ borderRadius: "inherit" }}>
        <div className="shell-content glass-surface rounded-[inherit]">
          <div className={`${gradientClass} ${accentBorder} rounded-[inherit]`}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-surface rounded-xl ${gradientClass} ${accentBorder} ${className}`}>
      {children}
    </div>
  );
}
