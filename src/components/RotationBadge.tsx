interface RotationBadgeProps {
  label: string;
  status: string;
}

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; icon: string }> = {
  up: { bg: "bg-emerald-600/15", text: "text-emerald-400", border: "border-emerald-600/25", icon: "\u2191" },
  stable: { bg: "bg-yellow-600/15", text: "text-yellow-400", border: "border-yellow-600/25", icon: "\u2192" },
  down: { bg: "bg-rose-600/15", text: "text-rose-400", border: "border-rose-600/25", icon: "\u2193" },
};

export function RotationBadge({ label, status }: RotationBadgeProps) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.stable;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <span className="text-[11px]">{c.icon}</span>
      {label}
    </span>
  );
}
