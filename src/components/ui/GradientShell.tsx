import type { ReactNode } from "react";

interface GradientShellProps {
  children: ReactNode;
  className?: string;
  as?: "div" | "span";
}

export function GradientShell({ children, className = "", as: Tag = "div" }: GradientShellProps) {
  return (
    <Tag className="gradient-shell rounded-xl">
      <Tag className="shell-content rounded-xl overflow-hidden">
        {children}
      </Tag>
    </Tag>
  );
}
