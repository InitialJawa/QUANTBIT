import type { ReactNode, ButtonHTMLAttributes } from "react";

interface GlassButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  variant?: "primary" | "link" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function GlassButton({
  variant = "ghost",
  size = "md",
  icon,
  children,
  className = "",
  ...props
}: GlassButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer font-body";

  const variants = {
    primary:
      "bg-[#EEEAE0] text-[#0A0F0C] rounded-full hover:bg-[#EEEAE0]/90 active:scale-[0.98]",
    link:
      "text-[var(--text-secondary)] rounded-full hover:text-[var(--text-primary)] hover:bg-white/[0.04]",
    ghost:
      "text-[var(--text-secondary)] rounded-lg hover:text-[var(--text-primary)] hover:bg-white/[0.04]",
  };

  const sizes = {
    sm: "px-2.5 py-1 text-caption",
    md: "px-3.5 py-2 text-body",
    lg: "px-[15.2px] py-[15.2px] text-label-md",
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {icon && <span className="w-4 h-4 flex items-center justify-center shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
